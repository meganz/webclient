/**
 * @property {*} mega.ui.quotaDialogs
 */
lazy(mega.ui, 'quotaDialogs', () => {
    'use strict';

    const MODES = freeze({
        ALL_PLANS: 1,
        ALL_PLANS_SELF: 2,
        RECOMMENDED: 3,
    });
    const perPageByMode = freeze({
        [MODES.ALL_PLANS]: 3,
        [MODES.ALL_PLANS_SELF]: 3,
        [MODES.RECOMMENDED]: 2
    });

    let navigating = false;
    let activeEvents = false;
    let closeCallback = false;
    let period = sessionStorage.getItem('pro.period') | 0 || 12;
    let lockPeriod = false;

    let planFilter = (plan) => !!plan;
    let recommendPlan = (plan, index) => index === 1;

    let activeMode = MODES.ALL_PLANS;
    let activeIsBandwidth = false;

    function emit(name, ...args) {
        const id = activeEvents && activeEvents[name];
        const value = typeof id === 'function' ? tryCatch(id)(activeMode, ...args) : id;
        if (value) {
            eventlog(value);
        }
    }

    function writeDOM(el, value) {
        el.textContent = '';
        if (typeof value === 'string') {
            el.textContent = value;
        }
        else if (value) {
            el.appendChild(value);
        }
    }

    function renderMarkup(el, markup) {
        el.textContent = '';
        if (markup) {
            el.appendChild(parseHTML(markup));
        }
    }

    class PlanCard extends MegaComponent {
        constructor(options) {
            super(options);

            this.addClass('plan-card');

            this.isBandwidth = options.isBandwidth;

            this.discountHeader = mCreateElement('div', { 'class': 'plan-discount' });
            this.domNode.appendChild(this.discountHeader);
            const body = mCreateElement('div', { 'class': 'plan-body' });
            this.domNode.appendChild(body);

            this.planName = mCreateElement('div', { 'class': 'plan-name sk-elm' });
            body.appendChild(this.planName);

            this.emphValue = mCreateElement('div', { 'class': 'plan-emph-value sk-elm' });
            body.appendChild(this.emphValue);

            let block = mCreateElement('div', { 'class': 'plan-use-outline sk-elm' });
            body.appendChild(block);
            this.usedChart = mCreateElement('div', { 'class': 'plan-curr-use' });
            block.appendChild(this.usedChart);

            this.usingVal = mCreateElement('div', { 'class': 'plan-curr-use-txt sk-elm' });
            body.appendChild(this.usingVal);

            block = mCreateElement('div', { 'class': 'plan-benefit-block' });
            body.appendChild(block);
            this.benefitValue = mCreateElement('div', { 'class': 'plan-benefit-txt sk-elm' });
            block.appendChild(mCreateElement('div', { 'class': 'plan-benefit-row' }, [
                mCreateElement('i', { 'class': 'sprite-fm-mono icon-check-thin-outline '}),
                this.benefitValue
            ]));
            this.secondaryBenefit = mCreateElement('div', { 'class': 'plan-benefit-row' }, [
                mCreateElement('i', { 'class': 'sprite-fm-mono icon-check-thin-outline '}),
                mCreateElement('div', { 'class': 'plan-benefit-txt sk-elm' }, [
                    document.createTextNode(l.pro_benefits_row)
                ])
            ]);
            block.appendChild(this.secondaryBenefit);

            this.pricingBlock = block = mCreateElement('div', { 'class': 'plan-pricing-block' });
            body.appendChild(block);
            this.priceHeader = mCreateElement('div', { 'class': 'price-header sk-elm' });
            block.appendChild(this.priceHeader);
            this.monthlyPrice = mCreateElement('div', { 'class': 'price-periodic sk-elm' });
            block.appendChild(this.monthlyPrice);
            this.monthlyValuePrice = mCreateElement('div', { 'class': 'price-periodic-value sk-elm' });
            block.appendChild(this.monthlyValuePrice);
            if (this.isBandwidth) {
                this.monthlyValuePrice.classList.add('hidden');
            }
            this.disclaimer = mCreateElement('div', { 'class': 'price-disclaimer' });
            block.appendChild(this.disclaimer);
            this.upgradeBtn = new MegaButton({
                parentNode: body,
                componentClassname: 'plan-upgrade outline',
                onClick: () => {
                    if (this.plan) {
                        emit('planClick', this.plan.level, period);
                        loadSubPage(this.plan.href);
                    }
                }
            });
            this.buttonClasses = ['outline'];

            if (options.plan) {
                this.update(options);
            }
        }

        update(options) {
            const { plan } = options;
            if (!plan) {
                return;
            }
            this.plan = plan;

            if (this.discountClass) {
                this.removeClass(this.discountClass);
            }
            this.discountClass = plan.discountClass || false;
            this.toggleClass('discount', !!this.discountClass);
            if (this.discountClass) {
                this.addClass(this.discountClass);
            }
            this.discountHeader.textContent = plan.discountText || '';

            this.planName.textContent = plan.name;
            writeDOM(this.emphValue, this.isBandwidth ? plan.bandwidth : plan.storage);
            this.usingVal.textContent = plan.using;
            this.usedChart.style.width = `${plan.usingPerc || 0}%`;
            this.usedChart.classList.remove('warning', 'errored');
            writeDOM(this.benefitValue, this.isBandwidth ? plan.storage : plan.bandwidth);
            this.secondaryBenefit.classList.remove('hidden');

            this.emphValue.classList.toggle('spacer', !!plan.isFlexi);
            this.toggleClass('current', !!plan.isCurrent);
            if (plan.isCurrent) {
                if (plan.isFree) {
                    this.pricingBlock.classList.add('hidden');
                    this.secondaryBenefit.classList.add('hidden');
                }
                else {
                    this.pricingBlock.classList.remove('hidden');
                    this.priceHeader.textContent = l[16463];
                    this.priceHeader.classList.remove('strikethrough');
                }
                if (plan.usingClass) {
                    this.usedChart.classList.add(plan.usingClass);
                }
                this.upgradeBtn.text = l.curr_plan;
            }
            else {
                this.pricingBlock.classList.remove('hidden');
                this.priceHeader.classList.toggle('strikethrough', !!plan.strikethroughPrice);
                this.priceHeader.textContent = plan.strikethroughPrice ||
                    plan.isFlexi && l.starting_from || l.only_price;
                this.upgradeBtn.disabled = false;
                this.upgradeBtn.text = l.upgrade_to_plan.replace('%s', plan.name);
            }
            if (plan.buttonClass) {
                this.upgradeBtn.removeClass(...this.buttonClasses);
                this.buttonClasses = plan.buttonClass;
                this.upgradeBtn.addClass(...this.buttonClasses);
            }
            if (!plan.isFree) {
                writeDOM(this.monthlyPrice, plan.monthlyPrice);
                this.monthlyValuePrice.textContent = plan.monthlyValuePrice || '';
                this.monthlyValuePrice.classList.toggle('hidden', !plan.monthlyValuePrice);
                writeDOM(this.disclaimer, plan.disclaimer);
                this.disclaimer.classList.toggle('hidden', !plan.disclaimer);
            }

            this.skLoading = false;
        }
    }

    const body = document.createElement('div');
    const headerTitle = mCreateElement('div', { 'class': 'quota-title' });
    const headerSubtitle = mCreateElement('div', { 'class': 'quota-subtitle' });
    const tabGroupWrap = mCreateElement('div', { 'class': 'mega-component tab-group tab-slider' });
    const header = mCreateElement('div', { 'class': 'quota-header' }, [
        headerTitle,
        headerSubtitle,
        tabGroupWrap
    ]);
    const tabs = new MegaTabGroup({
        tabs: [
            {
                parentNode: tabGroupWrap,
                text: l.recurring_monthly,
                tabid: 'm',
                selected: period === 1,
                onClick: () => {
                    period = 1;
                    tryCatch(() => {
                        sessionStorage.setItem('pro.period', '1');
                        sessionStorage.setItem('pro.initialDuration', '1');
                    })();
                    emit('periodChange', period);
                    redraw().catch(nop);
                }
            },
            {
                parentNode: tabGroupWrap,
                text: l.recurring_yearly,
                tabid: 'y',
                selected: period !== 1,
                onClick: () => {
                    period = 12;
                    tryCatch(() => {
                        sessionStorage.setItem('pro.period', '12');
                        sessionStorage.setItem('pro.initialDuration', '12');
                    })();
                    emit('periodChange', period);
                    redraw().catch(nop);
                }
            }
        ],
        slider: true,
    });
    const tabTip = mCreateElement('div', { 'class': 'tab-tooltip hidden' });
    tabGroupWrap.appendChild(tabTip);
    body.appendChild(header);
    const carousel = new MegaCarousel({
        parentNode: body,
        componentClassname: 'quota-dialog-carousel',
    });
    carousel.nextControl.rebind('click.qd', () => emit('carouselNext'));
    const dialogDisclaimer = mCreateElement('div', { 'class': 'quota-prices-disclaimer' }, [
        document.createTextNode(l.est_price_currency_note)
    ]);
    const viewAllPlans = mCreateElement('a', { 'class': 'clickurl', href: '/pro' }, [
        document.createTextNode(l.view_all_plans),
        mCreateElement('i', { 'class': 'sprite-fm-mono icon-arrow-right-regular-outline' })
    ]);
    viewAllPlans.addEventListener('click', () => emit('viewAllPlans'));
    body.appendChild(
        mCreateElement('div', { 'class': 'quota-footer' }, [
            dialogDisclaimer,
            viewAllPlans
        ])
    );

    let closeListener = false;

    function applyDiscount(entry, planObj) {
        const {
            months, price, currency, instantDiscount, hasYearlyDiscount, correlatedPlan, saveUpToPrecise
        } = planObj;

        const savings = [];

        if (hasYearlyDiscount) {
            entry.strikethroughPrice = correlatedPlan.getFormattedPrice(undefined, undefined, undefined, 1);
            savings.push(saveUpToPrecise);
        }

        if (instantDiscount) {
            const stacked = savings.length > 0;

            if (!entry.strikethroughPrice) {
                entry.strikethroughPrice = formatCurrency(price / months, currency, 'narrowSymbol');
            }
            savings.push(instantDiscount.percentage);

            if (stacked) {
                entry.discountClass = 'discount-stack';
                entry.discountText =
                    l.yearly_plan_saving.replace('%1', Math.round(pro.calculateSavings(savings) * 100));
            }
            else {
                entry.discountClass = 'discount-brand';
                entry.discountText = l.discount_save
                    .replace('%1', instantDiscount.name)
                    .replace('%2', formatPercentage(pro.calculateSavings(savings)));
            }
        }
    }

    function storageUnits(storage) {
        let unitBytes = pro.BYTES_PER_GB;
        let unitLabel = l[17696];
        if (storage >= pro.BYTES_PER_TB * 1024) {
            unitBytes = pro.BYTES_PER_TB * 1024;
            unitLabel = l[23061];
        }
        else if (storage >= pro.BYTES_PER_TB) {
            unitBytes = pro.BYTES_PER_TB;
            unitLabel = l[20160];
        }
        return { unitBytes, unitLabel };
    }

    function isStreaming() {
        const slideshowPreview = slideshowid && is_video(M.getNodeByHandle(slideshowid));
        return !dlmanager.isDownloading && (dlmanager.isStreaming || slideshowPreview);
    }

    function getDisclaimer(isFlexi, taxInfo, instantMult, months, isEuros, currency, price) {
        let disclaimer = '';
        const disclaimerVars = {
            '%1': '',
            '%2': '',
        };
        const taxed = pro.taxInfo && taxInfo;
        if (taxed) {
            const taxedPerMonth = taxInfo.taxedPrice * instantMult / months;
            if (isFlexi) {
                disclaimer = isEuros ? l.taxed_pay_per_usage_euro : l.taxed_pay_per_usage;
            }
            else {
                disclaimer = isEuros ? l.p_with_tax : l.taxed_monthly_price;
            }
            disclaimerVars['%1'] = formatCurrency(taxedPerMonth, currency, 'narrowSymbol');
        }
        else if (isFlexi) {
            disclaimer = l.pay_per_usage;
        }

        if (period === 12) {
            const yearlyCharge = formatCurrency(price * instantMult, currency, 'narrowSymbol');
            if (taxed) {
                disclaimer = isEuros ? l.taxed_yearly_price_euro : l.taxed_yearly_price;
            }
            else {
                disclaimer = isEuros ? l.charged_yearly_euro : l.charged_yearly;
            }
            disclaimerVars['%2'] = yearlyCharge;
        }
        return disclaimer ?
            disclaimer.replace('%1', disclaimerVars['%1']).replace('%2', disclaimerVars['%2']) :
            '';
    }

    function processPlan(planObj, usage, isBandwidth, isEuros) {
        const entry = Object.create(null);
        const { level, price, currency, months, storage, transfer, name, taxInfo, instantDiscount } = planObj;
        entry.name = name;
        entry.level = level;
        entry.href = `propay_${level}`;

        const instantMult = instantDiscount ? 1 - instantDiscount.percentage / 100 : 1;
        const perMonth = price / months * instantMult;

        entry.monthlyPrice = parseHTML(
            escapeHTML(isEuros ? l.monthly_price_euro : l.monthly_price)
                .replace('[S]', '<span>')
                .replace('[/S]', '</span>')
                .replace('%s', formatCurrency(perMonth, currency, 'narrowSymbol'))
        );
        entry.storage = bytesToSize(storage, 0);
        entry.transfer = bytesToSize(transfer, 0);

        if (!isBandwidth) {
            const { unitBytes, unitLabel } = storageUnits(storage);
            entry.monthlyValuePrice = l.monthly_value_price
                .replace('%1', unitLabel)
                .replace('%2', formatCurrency(perMonth / (storage / unitBytes), currency, 'narrowSymbol'));
        }
        entry.isFlexi = level === pro.ACCOUNT_LEVEL_PRO_FLEXI;
        const flexiMax = 10240 * pro.BYTES_PER_TB;

        const disclaimer = getDisclaimer(entry.isFlexi, taxInfo, instantMult, months, isEuros, currency, price);
        if (disclaimer) {
            entry.disclaimer = disclaimer;
        }
        if (entry.isFlexi) {
            entry.storage = entry.transfer = bytesToSize(flexiMax, 0);
        }

        entry.using = l.using_quota_of
            .replace('%1', bytesToSize(usage))
            .replace('%2', isBandwidth ? entry.transfer : entry.storage);
        entry.usingPerc = entry.isFlexi ?
            Math.min(100, Math.round(usage / flexiMax * 100)) :
            Math.min(100, Math.round(usage / (isBandwidth ? transfer : storage) * 100));
        if (entry.isFlexi) {
            entry.storage = parseHTML(
                escapeHTML(l.storage_avail_flexi)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', entry.storage)
            );
            entry.bandwidth = parseHTML(
                escapeHTML(l.transfer_avail_flexi)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', entry.transfer)
            );
        }
        else {
            entry.storage = parseHTML(
                escapeHTML(l.storage_avail)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', entry.storage)
            );
            entry.bandwidth = parseHTML(
                escapeHTML(l.transfer_avail)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', entry.transfer)
            );
        }

        applyDiscount(entry, planObj);

        return entry;
    }

    let quotaCache = Object.create(null);

    async function getQuota(isBandwidth) {
        const key = isBandwidth ? 't' : 's';
        if (!quotaCache[key]) {
            quotaCache[key] = isBandwidth ? await M.getTransferQuota() : await M.getStorageQuota();
        }
        return quotaCache[key];
    }

    function quotaUsed(quotaRes, isBandwidth) {
        return isBandwidth ? (quotaRes.caxfer || 0) + (quotaRes.csxfer || 0) : quotaRes.cstrg;
    }

    function getCurrentPlanCard(quotaRes, used, isBandwidth) {
        const level = u_attr && u_attr.p;
        const planObj = level && (pro.getPlanObj(level, period) || pro.getPlanObj(level));
        const almostThreshold = isBandwidth ? 90 : quotaRes.uslw / 100;

        if (planObj) {
            const entry = processPlan(planObj, used, isBandwidth, planObj.currency === 'EUR');
            entry.isCurrent = true;
            entry.usingClass = entry.usingPerc >= 100 && 'errored'
                || entry.usingPerc >= almostThreshold && 'warning' || '';
            entry.buttonClass = [...entry.buttonClass || [], 'disabled', 'outline'];
            return entry;
        }

        const entry = Object.create(null);
        const total = quotaRes.max || mega.bstrg;
        entry.isCurrent = true;
        entry.isFree = true;
        entry.name = pro.getProPlanName(level);

        if (isBandwidth) {
            entry.bandwidth = parseHTML(
                escapeHTML(l.limited_transfer)
                    .replace('[S]' ,'<span>')
                    .replace('[/S]', '</span>')
            );
            entry.storage = parseHTML(
                escapeHTML(l.storage_avail)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', bytesToSize(mega.bstrg, 0))
            );
            entry.using = l.using_quota.replace('%1', bytesToSize(used));
        }
        else {
            entry.storage = parseHTML(
                escapeHTML(l.storage_avail)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', bytesToSize(total, 0))
            );
            entry.bandwidth = l.pr_limited_trsf;
            entry.using = l.using_quota_of
                .replace('%1', bytesToSize(used))
                .replace('%2', bytesToSize(total, 0));
        }
        entry.usingPerc = total ? Math.min(100, Math.round(used / total * 100)) : 0;
        entry.usingClass = entry.usingPerc >= 100 && 'errored'
            || entry.usingPerc >= almostThreshold && 'warning' || '';
        entry.buttonClass = ['disabled', 'outline'];
        return entry;
    }

    function selectPlans(planArray, used, isBandwidth) {
        const eligibleByPeriod = { 1: [], 12: [] };
        for (let i = 0; i < planArray.length; i++) {
            const planObj = planArray[i];
            if (!planObj) {
                continue;
            }
            const isFlexi = planObj.level === pro.ACCOUNT_LEVEL_PRO_FLEXI;
            if (eligibleByPeriod[planObj.months]
                && (isFlexi || (isBandwidth ? planObj.transfer > used : planObj.storage > used))) {
                eligibleByPeriod[planObj.months].push(planObj);
            }
        }

        const hasMonthly = !!eligibleByPeriod[1].length;
        const hasYearly = !!eligibleByPeriod[12].length;

        tabGroupWrap.classList.toggle('hidden', !!lockPeriod || !(hasMonthly && hasYearly));
        if (lockPeriod && eligibleByPeriod[lockPeriod].length) {
            period = lockPeriod;
        }
        else if (!eligibleByPeriod[period].length && (hasMonthly || hasYearly)) {
            period = hasYearly ? 12 : 1;
        }
        tabs.selectTab(period === 1 ? 'm' : 'y');

        return eligibleByPeriod[period];
    }

    async function getPlanCards(viewMode, isBandwidth) {
        await pro.loadMembershipPlans();
        const quotaRes = quotaCache[isBandwidth ? 't' : 's'];

        let planArray = pro.membershipPlans.map(p => pro.getPlanObj(p));
        planArray = pro.sortPlansByStorage(
            planArray.filter(plan => plan.isIn('obqDialog')
                && plan.level !== (u_attr && u_attr.p)
                && (plan.level === pro.ACCOUNT_LEVEL_PRO_FLEXI || planFilter(plan)))
        );

        const isEuros = planArray[0] && planArray[0].currency === 'EUR';
        dialogDisclaimer.classList.toggle('hidden', !!isEuros);

        const used = quotaUsed(quotaRes, isBandwidth);
        const cardData = selectPlans(planArray, used, isBandwidth)
            .map(planObj => processPlan(planObj, used, isBandwidth, isEuros));

        const { maxYearlyDiscount } = pro.yearlyDiscount;
        tabTip.textContent = l.yearly_plan_disc.replace('%1', formatPercentage(maxYearlyDiscount));
        tabTip.classList.toggle('hidden', tabGroupWrap.classList.contains('hidden') || !maxYearlyDiscount);

        if (viewMode === MODES.RECOMMENDED) {
            return [cardData[0]];
        }

        return cardData;
    }

    async function getViewMode(isBandwidth) {
        planFilter = (plan) => !!plan;
        recommendPlan = (plan, index) => index === 1;
        lockPeriod = false;

        if (d && localStorage.qdt === '1') {
            return MODES.ALL_PLANS;
        }
        if (d && localStorage.qdt === '2') {
            return MODES.ALL_PLANS_SELF;
        }
        if (d && localStorage.qdt === '3') {
            return MODES.RECOMMENDED;
        }
        if (isBandwidth) {
            if (!u_attr || !u_attr.p) {
                // Free users to recommend Pro lite
                recommendPlan = (plan) => {
                    return plan.level === pro.ACCOUNT_LEVEL_PRO_LITE;
                };
            }
            else {
                // Pro II/III to recommend Pro Flexi
                recommendPlan = (plan, index) => {
                    if (u_attr.p === pro.ACCOUNT_LEVEL_PRO_II || u_attr.p === pro.ACCOUNT_LEVEL_PRO_III) {
                        return plan.level === pro.ACCOUNT_LEVEL_PRO_FLEXI;
                    }
                    return index === 1;
                };
            }
        }
        else {
            if (u_attr && u_attr.p) {
                recommendPlan = (plan, index) => {
                    // Essential users should only see a recommended plan on yearly for pro lite
                    if (u_attr.p === pro.ACCOUNT_LEVEL_ESSENTIAL && period === 1) {
                        return false;
                    }
                    return index === 1;
                };
                return MODES.ALL_PLANS_SELF;
            }
            // // Group B free users to see and recommend Pro I
            // if (GROUP_B.has(mega.ipcc)) {
            //     planFilter = (plan) => plan.level === pro.ACCOUNT_LEVEL_PRO_I && plan.months === 12;
            //     period = lockPeriod = 12;
            //     return MODES.RECOMMENDED;
            // }
            // // Group A free users to see all and recommend Pro I
            // if (GROUP_A.has(mega.ipcc)) {
            //     recommendPlan = (plan) => plan.level === pro.ACCOUNT_LEVEL_PRO_I;
            //     return MODES.ALL_PLANS_SELF;
            // }
            // // Remaining free users to see and recommend Essential, yearly only (Flexi is monthly-only)
            // planFilter = (plan) => plan.level === pro.ACCOUNT_LEVEL_ESSENTIAL && plan.months === 12;
            // period = lockPeriod = 12;
            // return MODES.RECOMMENDED;
        }

        if (!u_attr) {
            return MODES.ALL_PLANS;
        }
        return MODES.ALL_PLANS_SELF;
    }

    let lastOptions = false;
    const dispatcher = (options) => {
        navigating = false;
        options = options || lastOptions || {};
        activeEvents = options.events || false;
        closeCallback = () => emit('close');
        renderMarkup(headerTitle, options.title);
        renderMarkup(headerSubtitle, options.subtitle);
        mega.ui.sheet.show({
            name: 'quota-dialog',
            classList: [
                'quota-dialog',
                options.isBandwidth ? 'transfer-quota' : 'storage-quota',
                options.almost ? 'almost-overquota' : 'overquota'
            ],
            type: 'modal',
            showClose: true,
            contents: [body],
            onShow() {
                tabs.positionSlider();
                clickURLs();
            },
            onClose() {
                if (closeListener) {
                    mBroadcaster.removeListener(closeListener);
                    closeListener = false;
                }
                if (navigating) {
                    navigating = false;
                    return;
                }
                if (typeof options.beforeClose === 'function') {
                    onIdle(options.beforeClose);
                }
                else if (typeof closeCallback === 'function') {
                    closeCallback();
                    closeCallback = false;
                }
            },
        });
        lastOptions = options;
        closeListener = closeListener || mBroadcaster.addListener('beforepagechange', () => {
            closeListener = false;
            mega.ui.quotaDialogs.dismissDialog();
            return 0xDEAD;
        });
        if (window.u_attr) {
            viewAllPlans.removeAttribute('target');
        }
        else {
            viewAllPlans.setAttribute('target', '_blank');
        }
    };

    const showsCurrentPlan = (mode) =>
        !!u_attr && (mode === MODES.ALL_PLANS_SELF || mode === MODES.RECOMMENDED);

    function renderPlans(mode, plans, isBandwidth) {
        activeMode = mode;
        activeIsBandwidth = !!isBandwidth;

        carousel.clear();
        carousel.perPage = perPageByMode[mode] || perPageByMode[1];

        const planPageIds = [];
        if (showsCurrentPlan(mode) && !(plans[0] && plans[0].isCurrent)) {
            planPageIds.push(carousel.addPage({
                componentClass: PlanCard,
                componentOptions: { skLoading: true, isBandwidth }
            }));
        }
        for (let i = 0; i < plans.length; i++) {
            const plan = plans[i];
            planPageIds.push(carousel.addPage({
                componentClass: PlanCard,
                componentOptions: plan ? { plan, isBandwidth } : { skLoading: true, isBandwidth }
            }));
        }
        carousel.toggleClass('two-card', planPageIds.length === 2);
        return planPageIds;
    }

    function finishPlans(plans, planPageIds, mode, isBandwidth) {
        if (showsCurrentPlan(mode)) {
            const quotaRes = quotaCache[isBandwidth ? 't' : 's'];
            plans.unshift(getCurrentPlanCard(quotaRes, quotaUsed(quotaRes, isBandwidth), isBandwidth));
        }

        const recommended = plans.find((plan, index) => plan && recommendPlan(plan, index));
        if (recommended && !recommended.discountClass) {
            recommended.discountClass = 'recommended';
            recommended.discountText = l.plan_card_recommend;
            recommended.buttonClass = [];
        }

        if (plans.length === planPageIds.length) {
            for (let i = 0; i < planPageIds.length; i++) {
                if (plans[i]) {
                    carousel.updatePage(planPageIds[i], { plan: plans[i] });
                }
            }
        }
        else {
            renderPlans(mode, plans, isBandwidth);
        }
    }

    function renderSkeletons(mode, isBandwidth) {
        let length = perPageByMode[mode] || perPageByMode[MODES.ALL_PLANS];
        if (mode === MODES.ALL_PLANS_SELF || mode === MODES.RECOMMENDED) {
            length -= 1;
        }
        return renderPlans(mode, Array.from({ length }), isBandwidth);
    }

    async function prepare(isBandwidth) {
        quotaCache = Object.create(null);
        tabGroupWrap.classList.add('hidden');
        const [mode, quotaRes] = await Promise.all([getViewMode(isBandwidth), getQuota(isBandwidth)]);
        return { mode, quotaRes, planPageIds: renderSkeletons(mode, isBandwidth) };
    }

    async function finishDialog(mode, planPageIds, isBandwidth) {
        const plans = await getPlanCards(mode, isBandwidth);
        finishPlans(plans, planPageIds, mode, isBandwidth);
        return mode;
    }

    async function redraw() {
        const planPageIds = renderSkeletons(activeMode, activeIsBandwidth);
        return finishDialog(activeMode, planPageIds, activeIsBandwidth);
    }

    let remainderInterval = false;
    let remainderUntil = 0;
    let timerNode;
    function clearRemainderTimer() {
        if (remainderInterval) {
            clearInterval(remainderInterval);
            remainderInterval = false;
        }
        timerNode = false;
    }

    async function freeTransferTimeLeft() {
        if (u_attr && u_attr.p) {
            return;
        }
        const { result: res } = await api.req({ a: 'uq', xfer: 1, pro: 1 }, { cache: -10 });
        let timeLeft = 3600;

        if (typeof res === 'object' && Object(res.tah).length) {
            let add = 1;
            timeLeft = 3600 - (res.bt | 0) % 3600;

            for (let i = 0; i < res.tah.length; i++) {
                if (res.tah[i]) {
                    add = 0;
                }
                else if (add) {
                    timeLeft += 3600;
                }
            }
        }

        remainderUntil = unixtime() + timeLeft;
    }

    function bandwidthRemainder(streaming, exceeded) {
        clearRemainderTimer();

        emit('remainderShow');
        if (u_attr && u_attr.p) {
            let msg = '';
            if (exceeded) {
                msg = streaming ? l.quota_exceeded_pro_media : l.quota_exceeded_pro_dl;
            }
            else {
                msg = streaming ? l.quota_almost_pro_media : l.quota_almost_pro_dl;
            }
            msgDialog(
                `confirmation:!^${l.upgrade_later}!${l.view_plans}`,
                '',
                l.continue_no_upgrade,
                msg,
                (res) => {
                    if (res) {
                        emit('remainderClose');
                        if (typeof closeCallback === 'function') {
                            closeCallback();
                            closeCallback = false;
                        }
                    }
                    else {
                        emit('remainderStay');
                        onIdle(() => dispatcher());
                    }
                }
            );
            return;
        }

        const countdown = `<span class="quota-remainder-time">${secondsToTimeLong(remainderUntil - unixtime())}</span>`;
        msgDialog(
            `confirmation:!^${l.upgrade_later}!${l.view_plans}`,
            '',
            l.continue_no_upgrade,
            escapeHTML(streaming ? l.quota_exceeded_media : l.quota_exceeded_dl).replace('%s', countdown),
            (res) => {
                clearRemainderTimer();
                if (res) {
                    emit('remainderClose');
                    if (typeof closeCallback === 'function') {
                        closeCallback();
                        closeCallback = false;
                    }
                }
                else {
                    emit('remainderStay');
                    onIdle(() => dispatcher());
                }
            }
        );

        remainderInterval = setInterval(() => {
            timerNode = timerNode || document.querySelector('.quota-remainder-time');
            if (!timerNode) {
                clearRemainderTimer();
                return;
            }
            const time = secondsToTimeLong(remainderUntil - unixtime());
            if (time) {
                timerNode.textContent = time;
            }
            else {
                clearRemainderTimer();
                closeMsg();
            }
        }, 1000);
    }
    const quotaLink = 'https://help.mega.io/plans-storage/space-storage/transfer-quota';

    const EVENTS = freeze({
        storageAlmostFull: {
            planClick(variant, level) {
                const ids = {
                    [MODES.ALL_PLANS]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501274,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501275,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501276,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501277,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501278,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501279,
                    },
                    [MODES.ALL_PLANS_SELF]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501280,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501281,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501282,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501283,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501284,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501285,
                    },
                    [MODES.RECOMMENDED]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501286,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501287,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501288,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501289,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501290,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501291,
                    },
                }[variant];
                if (ids && ids[level]) {
                    eventlog(ids[level]);
                }
                return 500492;
            },
            periodChange(variant, period) {
                if (period === 1) {
                    eventlog(501266);
                    return 501142;
                }
                eventlog(501267);
                return 501141;
            },
            carouselNext: 501272,
            viewAllPlans: 501292,
            shown(variant) {
                return {
                    [MODES.ALL_PLANS]: 501260,
                    [MODES.ALL_PLANS_SELF]: 501261,
                    [MODES.RECOMMENDED]: 501262,
                }[variant];
            },
            close: 501263
        },
        storageFull: {
            planClick(variant, level) {
                const ids = {
                    [MODES.ALL_PLANS]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501265,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501295,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501296,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501297,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501298,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501299,
                    },
                    [MODES.ALL_PLANS_SELF]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501300,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501301,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501302,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501303,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501304,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501305,
                    },
                    [MODES.RECOMMENDED]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501306,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501307,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501308,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501309,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501310,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501311,
                    },
                }[variant];
                if (ids && ids[level]) {
                    eventlog(ids[level]);
                }
                return 500493;
            },
            periodChange(variant, period) {
                if (period === 1) {
                    eventlog(501360);
                    return 501142;
                }
                eventlog(501359);
                return 501141;
            },
            carouselNext: 501270,
            viewAllPlans: 501271,
            shown(variant) {
                return {
                    [MODES.ALL_PLANS]: 501293,
                    [MODES.ALL_PLANS_SELF]: 501294,
                    [MODES.RECOMMENDED]: 501264,
                }[variant];
            },
            close: 501140
        },
        bandwidthAlmostExceeded: {
            planClick(variant, level, period) {
                eventlog(99643);
                sessionStorage.fromOverquotaPeriod = period || pro.proplan.period;
                const ids = {
                    [MODES.ALL_PLANS]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501312,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501313,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501314,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501315,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501316,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501317,
                    },
                    [MODES.ALL_PLANS_SELF]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501318,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501319,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501320,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501321,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501322,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501323,
                    },
                    [MODES.RECOMMENDED]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501324,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501325,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501326,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501327,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501328,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501329,
                    },
                }[variant];
                if (ids && ids[level]) {
                    eventlog(ids[level]);
                }
                return {4: 501150, 1: 501151, 2: 501152, 3: 501153}[level];
            },
            periodChange(variant, period) {
                if (period === 12) {
                    eventlog(501356);
                    return 501147;
                }
                eventlog(501355);
                return 501148;
            },
            carouselNext: 501330,
            viewAllPlans: 501331,
            remainderShow: 501361,
            remainderStay: 501362,
            remainderClose: 501155,
            shown(variant) {
                return {
                    [MODES.ALL_PLANS]: 501268,
                    [MODES.ALL_PLANS_SELF]: 501269,
                    [MODES.RECOMMENDED]: 501273,
                }[variant];
            },
            close: 501156,
        },
        bandwidthExceeded: {
            planClick(variant, level, period) {
                dlmanager.onOverQuotaProClicked = true;
                delay('overquota:uqft', () => dlmanager._overquotaInfo(), 30000);
                eventlog(99640);
                sessionStorage.fromOverquotaPeriod = period || pro.proplan.period;
                const ids = {
                    [MODES.ALL_PLANS]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501337,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501338,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501339,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501340,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501341,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501342,
                    },
                    [MODES.ALL_PLANS_SELF]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501343,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501344,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501345,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501346,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501347,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501348,
                    },
                    [MODES.RECOMMENDED]: {
                        [pro.ACCOUNT_LEVEL_ESSENTIAL]: 501349,
                        [pro.ACCOUNT_LEVEL_PRO_LITE]: 501350,
                        [pro.ACCOUNT_LEVEL_PRO_I]: 501351,
                        [pro.ACCOUNT_LEVEL_PRO_II]: 501352,
                        [pro.ACCOUNT_LEVEL_PRO_III]: 501353,
                        [pro.ACCOUNT_LEVEL_PRO_FLEXI]: 501354,
                    },
                }[variant];
                if (ids && ids[level]) {
                    eventlog(ids[level]);
                }
                return {4: 501150, 1: 501151, 2: 501152, 3: 501153}[level];
            },
            periodChange(variant, period) {
                if (period === 12) {
                    eventlog(501358);
                    return 501147;
                }
                eventlog(501357);
                return 501148;
            },
            carouselNext: 501335,
            viewAllPlans: 501336,
            remainderShow: 501364,
            remainderStay: 501365,
            remainderClose: 501154,
            shown(variant) {
                return {
                    [MODES.ALL_PLANS]: 501332,
                    [MODES.ALL_PLANS_SELF]: 501333,
                    [MODES.RECOMMENDED]: 501334,
                }[variant];
            },
            close: 501149,
        }
    });

    return freeze({
        /**
         * @function mega.ui.quotaDialogs.storageAlmostFull
         * @param {*} [options] See mega.ui.quotaDialogs.EVENTS for relevant events.
         * @returns {Promise<boolean|void>} Resolves once shown, or false if skipped
         */
        async storageAlmostFull(options) {
            options = options || {};

            const seenKey = 'storageAlmostFullSeen';
            if (!options.isUserDriven) {
                const lastSeen = await M.getPersistentData(seenKey).catch(nop);
                if (lastSeen && Date.now() - lastSeen < 864e5) {
                    return false;
                }
                M.setPersistentData(seenKey, Date.now()).catch(nop);
            }

            const { mode, quotaRes, planPageIds } = await prepare(false);
            dispatcher({
                almost: true,
                title: escapeHTML(l.tfw_storage_exceeded_title)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', quotaRes.percent),
                subtitle: escapeHTML(l.storage_almost_subtitle),
                events: { ...EVENTS.storageAlmostFull, ...options.events },
            });
            await finishDialog(mode, planPageIds, false);
            emit('shown');
        },
        /**
         * @function mega.ui.quotaDialogs.storageFull
         * @param {*} [options] See mega.ui.quotaDialogs.EVENTS for relevant events.
         * @returns {Promise<void>} Resolves once shown
         */
        async storageFull(options) {
            options = options || {};
            const { mode, quotaRes, planPageIds } = await prepare(false);
            dispatcher({
                title: escapeHTML(l.tfw_storage_exceeded_title)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', quotaRes.percent),
                subtitle: escapeHTML(options.isUserDriven
                    ? l.storage_exceeded_subtitle_user : l.storage_exceeded_subtitle),
                events: { ...EVENTS.storageFull, ...options.events },
            });
            await finishDialog(mode, planPageIds, false);
            emit('shown');
        },
        /**
         * @function mega.ui.quotaDialogs.bandwidthAlmostExceeded
         * @param {*} [options] See mega.ui.quotaDialogs.EVENTS for relevant events.
         * @returns {Promise<void>} Resolves once shown
         */
        async bandwidthAlmostExceeded(options) {
            options = options || {};
            const [{ mode, quotaRes, planPageIds }] = await Promise.all([prepare(true), freeTransferTimeLeft()]);
            let title;
            if (u_attr && u_attr.p) {
                const { caxfer, csxfer, mxfer } = quotaRes;
                const used = (caxfer || 0) + (csxfer || 0);
                title = escapeHTML(l.transfer_almost_title_pro)
                    .replace('[S]', '<span>')
                    .replace('[/S]', '</span>')
                    .replace('%1', Math.floor(used * 100 / mxfer));
            }
            else {
                title = escapeHTML(l.transfer_almost_title);
            }
            const streaming = isStreaming();
            const subtitle = escapeHTML(streaming ? l.transfer_almost_subtext_media : l.transfer_almost_subtext_dl)
                .replace('[A]', `<a class="clickurl" href="${quotaLink}" target="_blank">`)
                .replace('[/A]', '</a>');
            dispatcher({
                isBandwidth: true,
                almost: true,
                title,
                subtitle,
                beforeClose: () => bandwidthRemainder(streaming),
                events: { ...EVENTS.bandwidthAlmostExceeded, ...options.events },
            });
            await finishDialog(mode, planPageIds, true);
            emit('shown');
        },
        /**
         * @function mega.ui.quotaDialogs.bandwidthExceeded
         * @param {*} [options] See mega.ui.quotaDialogs.EVENTS for relevant events.
         * @returns {Promise<void>} Resolves once shown
         */
        async bandwidthExceeded(options) {
            options = options || {};
            const [{ mode, planPageIds }] = await Promise.all([prepare(true), freeTransferTimeLeft()]);
            const streaming = isStreaming();
            const subtitle = escapeHTML(streaming ? l.transfer_exceed_subtext_media : l.transfer_exceed_subtext_dl)
                .replace('[A]', `<a class="clickurl" href="${quotaLink}" target="_blank">`)
                .replace('[/A]', '</a>');
            dispatcher({
                isBandwidth: true,
                title: escapeHTML(l[17]),
                subtitle,
                beforeClose: () => bandwidthRemainder(streaming, true),
                events: { ...EVENTS.bandwidthExceeded, ...options.events },
            });
            await finishDialog(mode, planPageIds, true);
            emit('shown');
        },
        /**
         * @function mega.ui.quotaDialogs.dismissDialog
         * @returns {void} void
         */
        dismissDialog() {
            if (mega.ui.sheet.name === 'quota-dialog') {
                navigating = true;
                mega.ui.sheet.hide();
                closeCallback = false;
                if (lastOptions) {
                    lastOptions.beforeClose = false;
                }
            }
        },
        EVENTS,
    });
});
