/** @property T.ui.page */
lazy(T.ui, 'page', () => {
    'use strict';

    document.title = 'Transfer.it';
    document.documentElement.classList.add('transferit-vars');
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-dark-forced');
    document.body.removeAttribute('style');
    document.body.textContent = '';

    if (({'fa': 1,'ar': 1,'he': 1})[lang]) {
        document.body.classList.add('rtl');
    }
    document.body.classList.add(lang);

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };
    const div = (...a) => mCreateElement('div', ...a);
    let cn = div({class: 'page-body'}, div({class: 'global-page-container'}, 'body'));

    const header = mCreateElement('header', {class: 'page-header'}, cn);
    const content = mCreateElement('div', {class: 'page-content'}, cn);
    const footer = mCreateElement('footer', {class: 'page-footer'}, cn);

    T.ui.appendTemplate('js_ui_transfer_header', header);
    T.ui.appendTemplate('js_ui_transfer_footer', footer);
    T.ui.appendTemplate('js_ui_transfer_content', content);
    T.ui.pageHeader.init();

    // @todo: create T.ui.overlay
    cn = document.querySelector('body > .global-overlay-container')
        || mCreateElement('div', { class: 'global-overlay-container' }, 'body');
    T.ui.appendTemplate('js_ui_transfer_overlays', cn);

    mCreateElement('div', {class: 'global-toast-container'}, 'body');

    mCreateElement('textarea', {
        id: 'chromeclipboard',
        readonly: 'readonly',
        title: 'copy',
    }, 'body').inert = true;

    // Lock DnD
    document.addEventListener('dragover', stop);
    document.addEventListener('drop', stop);

    return freeze({
        get content() {
            return content;
        },

        get footer() {
            return footer;
        },

        showSection(cn, path, subpage) {
            // Update history
            if (typeof path === 'string' && getSitePath() !== `/${path}`) {
                pushHistoryState(path);
            }

            // Update active states of header buttons
            for (const elm of header.querySelectorAll(`.it-button[data-page]`)) {
                if (elm.dataset.page === path) {
                    elm.classList.add('active');
                }
                else {
                    elm.classList.remove('active');
                }
            }

            // Show section
            if (cn && cn.classList.contains('hidden')) {
                const cns = content.querySelectorAll('.it-box-holder');
                for (let i = 0; i < cns.length; i++) {
                    cns[i].classList.add('hidden');
                }
                cn.classList.remove('hidden');
            }

            // Update UI for main and sub-sections
            // @todo: appendTemplate
            if (subpage) {
                document.body.classList.add('subpage');
                footer.querySelector('.js-main-footer').classList.add('hidden');
                footer.querySelector('.js-subpage-footer').classList.remove('hidden');
            }
            else {
                document.body.classList.remove('subpage');
                footer.querySelector('.js-main-footer').classList.remove('hidden');
                footer.querySelector('.js-subpage-footer').classList.add('hidden');
            }
        }
    });
});
