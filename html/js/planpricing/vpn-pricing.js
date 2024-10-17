lazy(pro.proplan2, 'vpn', () => {
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
         * @param {jQuery} $parentPage Page container
         * @param {Function} callback Callback function to execute on buy btn click
         * @returns {void}
         */
        renderPricingPage: (plan, $parentPage, callback) => {
            const $vpnContainer = $('.pricing-pg.pricing-vpn-plan-container', $parentPage);
            let cardsContainer = $('.pricing-pg.plans-cards-container', $vpnContainer);

            if (cardsContainer.length) {
                return;
            }

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

            const cardFeatures = [
                { i: 'icon-shield-thin-outline', t: l.vpn_choose_title4 },
                { i: 'icon-zap-thin-outline', t: l.vpn_choose_title3 },
                { i: 'icon-globe-americas-thin-outline', t: l.vpn_choose_title1 }
            ];

            cardsContainer = createEl(['pricing-pg', 'plans-cards-container']);
            const cardWrapper = createEl(['pricing-plan-card-wrapper']);

            const card = createEl(['pricing-plan-card', 'popular']);
            card.id = `vpn-monthly`;
            card.appendChild(createEl(['pricing-plan-recommend'], l.introductory_price));
            card.appendChild(createEl(['pricing-plan-title'], l.mega_vpn));
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
                const { i, t } = cardFeatures[k];
                const row = createEl(['flex', 'flex-row', 'items-center']);
                row.appendChild(createEl(['sprite-fm-mono', i], null, 'i'));
                row.appendChild(createEl(['flex-1'], t));
                features.appendChild(row);
            }

            const btnContainer = createEl(['pricing-plan-btn-container']);
            // TODO: Make this dynamic based on if the plan has a trial or not
            const btn = createEl(
                ['pricing-plan-btn'],
                // planExtras.trial
                //     ? mega.icu.format(l.try_free_for_days, planExtras.trial.days)
                //     : l.pr_buy_vpn,      // uncomment this
                mega.icu.format(l.try_free_for_days, 7),        // remove this
                'button');
            const moreContainer = createEl(['relative']);
            const more = createEl(['vpn-read-more', 'absolute', '-top-8'], l.vpn_more, 'a');
            more.href = 'https://mega.io/vpn';
            more.target = '_blank';

            moreContainer.appendChild(more);
            btnContainer.appendChild(btn);

            card.appendChild(features);
            card.appendChild(moreContainer);
            card.appendChild(btnContainer);
            cardWrapper.appendChild(card);

            cardsContainer.appendChild(cardWrapper);

            $vpnContainer.safeAppend($(cardsContainer).prop('outerHTML'));

            $('.pricing-plan-btn', $vpnContainer)
                .rebind('click.vpnPricing', callback.bind(null, pro.ACCOUNT_LEVEL_FEATURE_VPN));

            if (hasLocal) {
                $vpnContainer.safeAppend(
                    $(createEl(['pricing-flexi-block-card-note', 'text-center'], `*${l.est_price_acc_billed_euro}`))
                        .prop('outerHTML')
                );
            }

            return $('.pricing-plan-card-wrapper', $vpnContainer);
        }
    };
});
