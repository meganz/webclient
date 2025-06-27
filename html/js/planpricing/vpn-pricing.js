lazy(pro.proplan2, 'feature', () => {
    'use strict';

    /**
     * @param {String[]} [c] Array of classes to add or null
     * @param {String} [t] Optional text
     * @param {'div'|'i'|'button'|'img'|'h3'|'span'|'a'} [tag] tagType='div'] Tag type for the container element
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
         * @param {Array} plan VPN plan to work with
         * @param {Function} callback Callback function to execute on buy btn click
         * @returns {void}
         */
        renderPricingPage: (plan, callback, extras) => {

            const {cardFeatures, $featureContainer, btnText, cardId, moreLinkInfo, clickName, title} = extras;
            const {moreClass, moreText, moreLink} = moreLinkInfo;

            let cardsContainer;

            const hasLocal = !!plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
            const priceCurrency = (
                hasLocal
                    ? plan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]
                    : plan[pro.UTQA_RES_INDEX_CURRENCY]
            ) || '';
            // const planExtras = plan[pro.UTQA_RES_INDEX_EXTRAS] || false;
            const priceValue = formatCurrency(
                (hasLocal ? plan[pro.UTQA_RES_INDEX_LOCALPRICE] : plan[pro.UTQA_RES_INDEX_PRICE]) || 'err',
                priceCurrency,
                'narrowSymbol'
            );

            cardsContainer = createEl(['pricing-pg', 'plans-cards-container']);
            const cardWrapper = createEl(['pricing-plan-card-wrapper']);

            const card = createEl(['pricing-plan-card', 'popular']);
            card.id = cardId;
            card.appendChild(createEl(['pricing-plan-recommend'], l.introductory_price));
            card.appendChild(createEl(['pricing-plan-title'], title));
            card.appendChild(createEl(['pricing-plan-only'], l.pr_only));

            const price = createEl(['pricing-plan-price']);
            price.appendChild(
                createEl(['vl'], priceValue, 'span')
            );

            if (hasLocal) {
                price.appendChild(createEl(['ars'], '*', 'span'));
            }

            card.appendChild(price);
            card.appendChild(createEl(['pricing-plan-price-unit'], `${priceCurrency} / ${l[931]}`));

            const features = createEl(['pricing-plan-features']);

            for (let k = 0; k < cardFeatures.length; k++) {
                const {icon, text} = cardFeatures[k];
                const row = createEl(['flex', 'flex-row', 'items-center']);
                row.appendChild(createEl(['sprite-fm-mono', icon], null, 'i'));
                row.appendChild(createEl(['flex-1'], text));
                features.appendChild(row);
            }

            const btnContainer = createEl(['pricing-plan-btn-container']);
            // TODO: Make this dynamic based on if the plan has a trial or not
            const btn = createEl(
                ['pricing-plan-btn'],
                btnText,
                'button');
            const moreContainer = createEl(['relative']);
            const more = createEl([moreClass, 'absolute', '-top-8'], moreText, 'a');
            more.href = moreLink;
            more.target = '_blank';

            moreContainer.appendChild(more);
            btnContainer.appendChild(btn);

            card.appendChild(features);
            card.appendChild(moreContainer);
            card.appendChild(btnContainer);
            cardWrapper.appendChild(card);

            cardsContainer.appendChild(cardWrapper);

            $featureContainer.safeAppend($(cardsContainer).prop('outerHTML'));

            $('.pricing-plan-btn', $featureContainer)
                .rebind(`click.${clickName}`, callback.bind(null, plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]));

            if (hasLocal) {
                $featureContainer.safeAppend(
                    $(createEl(['pricing-flexi-block-card-note', 'text-center'], `*${l[18770]}`))
                        .prop('outerHTML')
                );
            }
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

            const cardFeatures = [
                {icon: 'icon-shield-thin-outline', text: l.vpn_choose_title4},
                {icon: 'icon-zap-thin-outline', text: l.vpn_choose_title3},
                {icon: 'icon-globe-americas-thin-outline', text: l.vpn_choose_title1}
            ];
            // const btnText = plan[pro.UTQA_RES_INDEX_EXTRAS].trial
            //     ? mega.icu.format(l.try_free_for_days, plan[pro.UTQA_RES_INDEX_EXTRAS].trial.days)
            //     : l.pr_buy_vpn;
            const btnText = mega.icu.format(l.try_free_for_days, 7);
            const cardId = 'vpn-monthly';
            const moreClass = 'vpn-read-more';
            const moreText = l.vpn_more;
            const moreLink = 'https://mega.io/vpn';
            const clickName = 'vpnPricing';
            const title = l.mega_vpn;

            const extras = {
                $featureContainer,
                cardFeatures,
                btnText,
                cardId,
                moreLinkInfo: {
                    moreClass,
                    moreText,
                    moreLink
                },
                clickName,
                title,
            };

            return pro.proplan2.feature.renderPricingPage(plan, callback, extras);
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

            const cardFeatures = pro.featureInfo[plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]];
            // const btnText = plan[pro.UTQA_RES_INDEX_EXTRAS].trial
            //     ? mega.icu.format(l.try_free_for_days, plan[pro.UTQA_RES_INDEX_EXTRAS].trial.days)
            //     : "Buy MEGA\u00a0PWM";
            const btnText = mega.icu.format(l.try_free_for_days, 14);
            const cardId = 'pwm-monthly';
            const moreClass = 'pwm-read-more';
            const moreText = l.pwm_more;
            const moreLink = 'https://mega.io/pass';
            const clickName = 'pwmPricing';
            const title = l.mega_pwm;

            const extras = {
                $featureContainer,
                cardFeatures,
                btnText,
                cardId,
                moreLinkInfo: {
                    moreClass,
                    moreText,
                    moreLink
                },
                clickName,
                title,
            };

            return pro.proplan2.feature.renderPricingPage(plan, callback, extras);
        }
    };
});
