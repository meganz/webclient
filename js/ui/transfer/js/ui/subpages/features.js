/** @property T.ui.featuresSubpage */
lazy(T.ui, 'featuresSubpage', () => {
    'use strict';

    T.ui.appendTemplate('js_ui_subpages_features', T.ui.page.content);

    const cn = T.ui.page.content.querySelector('.js-features-subpage');
    const box = cn.querySelector('.subpage-box');

    // Import content
    T.ui.appendTemplate('js_ui_subpages_rtu_body', box);

    // Init Try now / Get started buttons
    for (const elm of cn.querySelectorAll('.js-try-now')) {
        elm.addEventListener('click', () => T.ui.loadPage('start'));
    }

    // Init scrollTo button
    cn.querySelector('.js-scroll-down').addEventListener('click', () => {
        const elm = cn.querySelector('.js-sroll-to');
        document.body.scrollTo({
            top: elm.getBoundingClientRect().top + document.body.scrollTop,
            behavior: 'smooth'
        });
    });

    // Init segmented controls: Now / After buttons
    for (const elm of cn.querySelectorAll('.it-sgm-control input')) {
        elm.addEventListener('change', (e) => {
            const active = cn.querySelector('.tab-content.active');
            if (active) {
                active.classList.remove('active');
            }
            cn.querySelector(`.tab-content.content${e.target.value}`).classList.add('active');
        });
    }

    return freeze({
        async init() {
            T.ui.page.showSection(cn, 'features', true);
        },
    });
});
