/** @property T.ui.compareSubpage */
lazy(T.ui, 'faqSubpage', () => {
    'use strict';

    T.ui.appendTemplate('js_ui_subpages_faq', T.ui.page.content);

    const cn = T.ui.page.content.querySelector('.js-faq-subpage');
    const box = cn.querySelector('.subpage-box');

    // Import content
    T.ui.appendTemplate('js_ui_subpages_faq_body', box);
    T.ui.appendTemplate('js_ui_subpages_rtu_body', box);

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

            // Close all FAQ
            for (const elm of cn.querySelectorAll('.faq-content .item.active')) {
                toggleFaqItem(elm, true);
            }

            T.ui.page.showSection(cn, 'faq', true);
        }
    });
});
