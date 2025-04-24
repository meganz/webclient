/** @property T.ui.privacySubpage */
lazy(T.ui, 'privacySubpage', () => {
    'use strict';

    T.ui.appendTemplate('js_ui_subpages_privacy', T.ui.page.content);

    const cn = T.ui.page.content.querySelector('.js-privacy-subpage');

    return freeze({
        async init() {

            T.ui.page.showSection(cn, 'privacy', true);
        }
    });
});
