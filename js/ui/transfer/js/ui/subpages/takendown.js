/** @property T.ui.takendownSubpage */
lazy(T.ui, 'takendownSubpage', () => {
    'use strict';

    T.ui.appendTemplate('js_ui_subpages_takendown', T.ui.page.content);

    const cn = T.ui.page.content.querySelector('.js-takendown-subpage');

    return freeze({
        async init() {

            T.ui.page.showSection(cn, 'takendown', true);
        }
    });
});
