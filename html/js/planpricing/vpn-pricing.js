lazy(pro.proplan2, 'feature', () => {
    'use strict';

    /**
     * @param {Array<String>?} c Array of classes to add or null
     * @param {String} [t] Optional text
     * @param {'div'|'i'|'button'|'img'|'h3'|'span'|'a'} [tag] Tag type for the container element
     * @returns {HTMLDivElement}
     */
    const createEl = (c, t, tag = 'div') => {
        const div = document.createElement(tag);

        if (Array.isArray(c)) {
            div.classList.add(...c);
        }

        if (t) {
            div.textContent = t;
        }

        return div;
    };

    return {
        /**
         * @param {Array<String|Number>} plan Feature plan to work wih
         * @param {jQuery} $featureContainer jQuery container to insert features to
         * @param {Array<Object.<String, String>>} extras Data for filling cards with
         * @param {String[]} promoTxt First value is text, second one is link, third one is link label
         * @param {Object.<String, String|Array<Object.<String, String>>>} promoBlocks Blocks with promotional texts
         * @returns {void}
         */
        renderPricingPage: (plan, $featureContainer, extras, promoTxt, promoBlocks) => {
            const cardsContainer = createEl(['pricing-pg', 'plans-cards-container']);
            const cardWrapper = createEl(
                ['pricing-plan-card-wrapper', 'flex', 'flex-row', 'flex-sm-col', 'justify-center', 'col-span-full']
            );
            const hasLocal = !!plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];

            let i = -1;
            let card;

            const addHeaders = (card, { cardId, subheading1, subheading2, title }) => {
                if (cardId) {
                    card.id = cardId;
                }

                if (subheading1) {
                    card.appendChild(createEl(['pricing-plan-recommend'], subheading1));
                }

                if (subheading2) {
                    card.appendChild(createEl(['pricing-plan-subheading2'], subheading2));
                }

                card.appendChild(createEl(['pricing-plan-title', 'pb-6'], title));
                card.appendChild(createEl(['pricing-plan-only', 'mt-4'], l.pr_only));
            };

            while (++i < extras.length) {
                const {
                    cardFeatures,
                    btnText,
                    moreLinkInfo,
                    clickName,
                    classes,
                    priceMonthly,
                    priceCurrency,
                    hasLocal,
                    taxedPrice,
                    onclick
                } = extras[i];

                card = createEl(['pricing-plan-card', ...(classes || [])]);

                addHeaders(card, extras[i]);

                const price = createEl(['pricing-plan-price']);
                price.appendChild(
                    createEl(['vl'], formatCurrency(priceMonthly, priceCurrency, 'narrowSymbol'), 'span')
                );

                if (hasLocal) {
                    price.appendChild(createEl(['ars'], '*', 'span'));
                }

                card.appendChild(price);
                card.appendChild(createEl(['pricing-plan-price-unit'], `${priceCurrency} / ${l[931]}`));

                const planTaxInfo = pro.getStandardisedTaxInfo(plan);

                if (planTaxInfo) {
                    const taxInfoCard = card.appendChild(createEl(['pricing-plan-tax']));
                    if (pro.taxInfo.variant === 1) {
                        taxInfoCard.appendChild(
                            createEl(['tax-info'], l.t_may_appy.replace('%1', pro.taxInfo.taxName), 'span')
                        );
                    }
                    else {
                        taxInfoCard.appendChild(createEl(['tax-info'], l.before_tax + ' ', 'span'));
                        taxInfoCard.appendChild(createEl(
                            ['tax-price'],
                            l.p_with_tax
                                .replace('%1', formatCurrency((taxedPrice), priceCurrency, 'narrowSymbol')
                                    + (priceCurrency === 'EUR' ? ' ' : '* ') + priceCurrency)
                            , 'span'));
                    }
                }

                const features = createEl(['pricing-plan-features']);

                if (Array.isArray(cardFeatures)) {
                    for (let k = 0; k < cardFeatures.length; k++) {
                        const {icon, text} = cardFeatures[k];
                        const row = createEl(['flex', 'flex-row', 'items-center']);
                        row.appendChild(createEl(['sprite-fm-mono', icon], null, 'i'));
                        row.appendChild(createEl(['flex-1'], text));
                        features.appendChild(row);
                    }
                }

                const btnContainer = createEl(['pricing-plan-btn-container']);
                // TODO: Make this dynamic based on if the plan has a trial or not
                const btn = createEl(
                    ['pricing-plan-btn'],
                    btnText,
                    'button');
                btnContainer.appendChild(btn);

                card.appendChild(features);

                if (moreLinkInfo) {
                    const { moreClass, moreText, moreLink } = moreLinkInfo;

                    const moreContainer = createEl(['relative']);
                    const more = createEl([moreClass, 'absolute', '-top-8'], moreText, 'a');
                    more.href = moreLink;
                    more.target = '_blank';

                    moreContainer.appendChild(more);
                    card.appendChild(moreContainer);
                }

                card.appendChild(btnContainer);
                cardWrapper.appendChild(card);

                $(btn).rebind(`click.${clickName}`, onclick.bind(null));
            }

            // Adding header for the single-card block
            if (extras.length === 1 && !extras[0].subheading1) {
                const el = createEl(['pricing-plan-recommend'], l.introductory_price);
                card.prepend(el);
                card.classList.add('popular');
            }

            cardsContainer.appendChild(cardWrapper);

            const footer = mCreateElement('div', { class: 'col-span-full w-full' });
            const subWording = mCreateElement('p', { class: 'pt-6 my-0 promo-txt' }, footer);
            const more = mCreateElement('a', { href: promoTxt[1], target: '_blank', class: 'px-2' });
            more.textContent = promoTxt[2];

            subWording.textContent = promoTxt[0];
            subWording.appendChild(more);

            if (hasLocal) {
                mCreateElement(
                    'div',
                    { class: 'pricing-flexi-block-card-note pt-2 font-body-2' },
                    footer
                ).textContent = `*${l[18770]}`;
            }

            const featuresBlock = mCreateElement(
                'div',
                { class: 'subcard-features mt-16 flex flex-row flex-md-col' },
                footer
            );

            if (promoBlocks.title) {
                const featuresTitle = mCreateElement(
                    'div',
                    { class: 'features-grid-title px-4 max-w-80' },
                    featuresBlock
                );
                featuresTitle.textContent = promoBlocks.title;
            }

            const featuresTable = mCreateElement('div', { class: 'w-full' }, featuresBlock);

            i = -1;
            let row;

            while (++i < promoBlocks.list.length) {
                if (!(i % promoBlocks.rowNum)) {
                    row = mCreateElement('div', { class: 'flex flex-row flex-md-col py-6' }, featuresTable);
                }

                const { label, sublabel, icon, class: klass } = promoBlocks.list[i];

                const block = mCreateElement('div', { class: `flex-1 w-0 pb-6 px-4 w-full ${klass || ''}` }, [
                    mCreateElement('i', { class: icon })
                ]);

                const labelEl = mCreateElement('p', { class: 'feature-label' }, block);
                labelEl.textContent = label;

                if (sublabel) {
                    const sublabelEl = mCreateElement('p', null, block);
                    sublabelEl.textContent = sublabel;
                }

                row.appendChild(block);
            }

            cardsContainer.appendChild(footer);

            $featureContainer[0].appendChild(cardsContainer);

            return $('.pricing-plan-card-wrapper', $featureContainer);
        }
    };
});

lazy(pro.proplan2, 'vpn', () => {
    'use strict';
    return {
        renderPricingPage: (plan, $parentPage, callback) => {
            const $featureContainer = $('.pricing-pg.pricing-feature-plan-container.vpn', $parentPage);
            const cardsContainer = $('.pricing-pg.plans-cards-container', $featureContainer);

            if (cardsContainer.length) {
                return;
            }

            const opts = [...pro.getPlanObj(plan).durationOptions];

            // Swapping places for 24 and 12 months
            if (opts.length > 2 && opts[1][pro.UTQA_RES_INDEX_MONTHS] === 12) {
                [opts[1], opts[2]] = [opts[2], opts[1]];
            }

            return pro.proplan2.feature.renderPricingPage(
                plan,
                $featureContainer,
                opts.map((opt) => {
                    const classes = ['pricing-plan-card', 'flex-1'];
                    let {
                        level,
                        currency: priceCurrency,
                        months,
                        price: priceMonthly,
                        saveUpTo,
                        hasLocal,
                        trial,
                        taxInfo
                    } = pro.getPlanObj(opt);

                    if (months === 1) {
                        classes.push('monthly');
                    }
                    else {
                        priceMonthly /= months;

                        if (months === 24) {
                            classes.push('popular');
                        }
                    }

                    const feature = {
                        btnText: trial
                            ? mega.icu.format(l.try_free_for_days, trial.days)
                            : l.buy_plan.replace('%1', l.mega_vpn),
                        clickName: 'vpnPricing',
                        title: pro.propay.getRecurringDurationWording(months),
                        classes,
                        hasLocal,
                        priceCurrency,
                        priceMonthly,
                        taxedPrice: taxInfo
                            ? taxInfo.taxedPrice / months
                            : priceMonthly,
                        onclick: callback.bind(null, months, level)
                    };

                    const dealHeader = months === 24 && 'subheading1'
                        || months === 12 && 'subheading2'
                        || '';

                    if (dealHeader) {
                        feature[dealHeader] = l.yearly_plan_saving.replace('%1', saveUpTo);
                    }

                    return feature;
                }),
                [l.vpn_promo_txt1, 'https://mega.io/vpn', l.vpn_more],
                {
                    title: l.why_vpn,
                    rowNum: 2, // Number of items in a row
                    list: [
                        {
                            icon: 'sprite-fm-mono icon-browser-slash-circle-small-thin-outline',
                            label: l.vpn_choose_title5,
                            sublabel: l.vpn_choose_subtxt5
                        },
                        {
                            icon: 'sprite-fm-mono icon-shield-thin-outline',
                            label: l.vpn_choose_title4,
                            sublabel: l.vpn_choose_subtxt4
                        },
                        {
                            icon: 'sprite-fm-mono icon-wifi-star-small-thin-outline',
                            label: l.vpn_choose_title6,
                            sublabel: l.vpn_choose_subtxt6
                        },
                        {
                            icon: 'sprite-fm-mono icon-devices-thin-outline',
                            label: l.vpn_choose_title7,
                            sublabel: l.vpn_choose_subtxt7
                        },
                        {
                            icon: 'sprite-fm-mono icon-globe-americas-thin-outline',
                            label: l.vpn_choose_title1,
                            sublabel: l.vpn_choose_subtxt1
                        },
                        {
                            icon: 'sprite-fm-mono icon-globe-01-thin-outline',
                            label: l.vpn_choose_title3,
                            sublabel: l.vpn_choose_subtxt3
                        }
                    ]
                }
            );
        }
    };
});

lazy(pro.proplan2, 'pwm', () => {
    'use strict';
    return {
        renderPricingPage: (plan, $parentPage, callback) => {
            const $featureContainer = $('.pricing-pg.pricing-feature-plan-container.pwm', $parentPage);
            const cardsContainer = $('.pricing-pg.plans-cards-container', $featureContainer);

            if (cardsContainer.length) {
                return;
            }

            // const btnText = plan[pro.UTQA_RES_INDEX_EXTRAS].trial
            //     ? mega.icu.format(l.try_free_for_days, plan[pro.UTQA_RES_INDEX_EXTRAS].trial.days)
            //     : "Buy MEGA\u00a0PWM";

            const opts = [...pro.getPlanObj(plan).durationOptions];

            // Swapping places for 24 and 12 months
            if (opts.length > 2 && opts[1][pro.UTQA_RES_INDEX_MONTHS] === 12) {
                [opts[1], opts[2]] = [opts[2], opts[1]];
            }

            return pro.proplan2.feature.renderPricingPage(
                plan,
                $featureContainer,
                opts.map((opt) => {
                    const classes = ['pricing-plan-card', 'flex-1'];

                    let {
                        level,
                        currency: priceCurrency,
                        months,
                        price: priceMonthly,
                        saveUpTo,
                        hasLocal,
                        trial,
                        taxInfo
                    } = pro.getPlanObj(opt);

                    if (months === 1) {
                        classes.push('monthly');
                    }
                    else {
                        priceMonthly /= months;

                        if (months === 24) {
                            classes.push('popular');
                        }
                    }

                    const feature = {
                        btnText: trial
                            ? mega.icu.format(l.try_free_for_days, trial.days)
                            : l.buy_plan.replace('%1', l.mega_pwm),
                        clickName: 'pwmPricing',
                        title: pro.propay.getRecurringDurationWording(months),
                        classes,
                        hasLocal,
                        priceCurrency,
                        priceMonthly,
                        taxedPrice: taxInfo
                            ? taxInfo.taxedPrice / months
                            : priceMonthly,
                        onclick: callback.bind(null, months, level)
                    };

                    const dealHeader = months === 24 && 'subheading1'
                        || months === 12 && 'subheading2'
                        || '';

                    if (dealHeader) {
                        feature[dealHeader] = l.yearly_plan_saving.replace('%1', saveUpTo);
                    }

                    return feature;
                }),
                [l.pwm_promo_txt1, 'https://mega.io/pass', l.pwm_learn_more],
                {
                    rowNum: 3, // Number of items in a row
                    list: [
                        {
                            icon: 'sprite-fm-mono icon-lock-thin-outline',
                            label: l.pwm_choose_title1,
                            class: 'text-center'
                        },
                        {
                            icon: 'sprite-fm-mono icon-magic-wand-thin-outline',
                            label: l.pwm_choose_title2,
                            class: 'text-center'
                        },
                        {
                            icon: 'sprite-fm-mono icon-shield-thin-outline',
                            label: l.pwm_choose_title3,
                            class: 'text-center'
                        }
                    ]
                }
            );
        }
    };
});
