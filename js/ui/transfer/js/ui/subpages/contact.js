/** @property T.ui.contactSubpage */
lazy(T.ui, 'contactSubpage', () => {
    'use strict';

    T.ui.appendTemplate('js_ui_subpages_contact', T.ui.page.content);

    const cn = T.ui.page.content.querySelector('.js-contact-subpage');

    return freeze({
        async init() {
            T.ui.page.showSection(cn, 'contact', true);
        }
    });
});
