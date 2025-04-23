/** @property T.ui.terms */
lazy(T.ui, 'termsSubpage', () => {
    'use strict';

    T.ui.appendTemplate('js_ui_subpages_terms', T.ui.page.content);

    const cn = T.ui.page.content.querySelector('.js-terms-subpage');

    return freeze({
        async init() {

            T.ui.page.showSection(cn, 'terms', true);
        }
    });
});
