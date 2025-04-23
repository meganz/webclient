/** @property T.ui.compareSubpage */
lazy(T.ui, 'compareSubpage', () => {
    'use strict';

    T.ui.appendTemplate('js_ui_subpages_compare', T.ui.page.content);

    const cn = T.ui.page.content.querySelector('.js-compare-subpage');
    const box = cn.querySelector('.subpage-box');
    const compareData = [
        {
            wetransfer : {
                plan: l[1150],
                price: '0',
                quota: 2,
                expiry: 7,
                dls: 100,
                recipients: 3,
                trs: 10
            },
            transferit : {
                price:  '0',
                quota: 0,
                expiry: 90,
                dls: 0,
                recipients: 0
            }
        },
        {
            wetransfer : {
                plan: l[1150],
                price: '0',
                quota: 2,
                expiry: 7,
                dls: 100,
                recipients: 3,
                trs: 10
            },
            transferit : {
                plan: l.transferit_cmpr_free,
                price:  '0',
                quota: 0,
                expiry: 90,
                dls: 100,
                recipients: 0
            }
        },
        {
            wetransfer : {
                plan: l.transferit_cmpr_starter,
                price: '6.00',
                quota: 300,
                expiry: 7,
                dls: 100,
                recipients: 10,
                trs: 10
            },
            transferit : {
                plan: l.transferit_cmpr_pro,
                price:  '2.99',
                quota: 0,
                expiry: 0,
                dls: 0,
                recipients: 0
            }
        },
    ];

    // Import content
    T.ui.appendTemplate('js_ui_subpages_faq_body', box);
    T.ui.appendTemplate('js_ui_subpages_rtu_body', box);

    // Fill in the comparison data
    const fillData = (elm, data) => {
        const { plan, price, quota, expiry, dls, recipients, trs } = data;
        const priceNode = elm.querySelector('.price');
        const planNode = elm.querySelector('.plan');

        priceNode.textContent = '';
        priceNode.append(
            parseHTML(l.transferit_x_per_month.replace('%1', `&euro;${price}`))
        );

        if (plan) {
            planNode.classList.remove('hidden');
            planNode.textContent = plan;
        }
        else {
            planNode.classList.add('hidden');
        }

        if (trs) {
            elm.querySelector('.tr-per-mon').textContent =
                l.transferit_cmpr_tr_per_mo.replace('%1', trs);
        }

        elm.querySelector('.quota').textContent = quota ?
            l.transferit_cmpr_x_gb_per_mo.replace('%1', quota) : l.transferit_cmpr_unlim_tr_size;
        elm.querySelector('.expiry').textContent = expiry ?
            l.transferit_cmpr_expires_in_x.replace('%1', expiry) : l.transferit_cmpr_unlim_expiry;
        elm.querySelector('.dls').textContent = dls ?
            l.transferit_cmpr_x_dls.replace('%1', dls) : l.transferit_cmpr_unlim_dls;
        elm.querySelector('.recipients').textContent = recipients ?
            l.transferit_cmpr_x_recipients.replace('%1', recipients) : l.transferit_cmpr_unlim_recipients;
    };

    // Create PRO grid and fill in data
    const freeGrid = cn.querySelector('.cmpr-main-grid');
    const proGrid = freeGrid.cloneNode(true);

    for (const elm of proGrid.querySelectorAll('.col')) {
        fillData(elm, compareData[compareData.length - 1][elm.dataset.name]);
    }

    proGrid.classList.add('pro', 'hidden');
    cn.querySelector('.cmpr-head-body').append(proGrid);

    // Init segmented control (Now/Then)
    for (const elm of cn.querySelectorAll('.it-sgm-control input')) {
        elm.addEventListener('change', (e) => {
            const val = parseInt(e.target.value) || 0;

            for (const elm of freeGrid.querySelectorAll('.col')) {
                fillData(elm, compareData[val][elm.dataset.name]);
            }

            if (val) {
                proGrid.classList.remove('hidden');
            }
            else {
                proGrid.classList.add('hidden');
            }
        });
    }

    // Init all Try now btns
    for (const elm of cn.querySelectorAll('.js-try-now')) {
        elm.addEventListener('click', () => T.ui.loadPage('start'));
    }

    // Expand/collapse FAQ btns
    const toggleFaqItem = (item, collapse) => {
        const activeItem = cn.querySelector('.faq-content .item.active');

        // Do not activate if active item is clicked
        collapse = collapse || item.classList.contains('active');

        if (activeItem) {
            activeItem.classList.remove('active');
            activeItem.querySelector('button i').className = 'sprite-it-x24-mono icon-plus-circle-solid';
        }

        if (collapse) {
            return;
        }

        item.classList.add('active');
        item.querySelector('button i').className = 'sprite-it-x24-mono icon-close-circle-solid';
    };

    // Init FAQ btns
    for (const elm of cn.querySelectorAll('.faq-content .header')) {
        elm.addEventListener('click', (e) => toggleFaqItem(
            e.currentTarget.closest('.item'))
        );
    }

    return freeze({
        async init() {
            // Reset segmented control active state
            cn.querySelector('#subpage-cmpr-now-radio').click();

            // Close all FAQ
            for (const elm of cn.querySelectorAll('.faq-content .item.active')) {
                toggleFaqItem(elm, true);
            }

            T.ui.page.showSection(cn, 'compare', true);
        }
    });
});
