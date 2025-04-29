/** @property T.ui.transferItOverlay */
lazy(T.ui, 'transferItOverlay', () => {
    'use strict';

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    const div = (...a) => mCreateElement('div', ...a);
    const gn = mCreateElement('div', {class: 'global-transferit-container transferit-vars hidden'}, 'body');
    const cn = div({class: 'page-body'}, div({class: 'global-page-container'}, gn));

    const header = mCreateElement('header', {class: 'page-header'}, cn);
    const content = mCreateElement('div', {class: 'page-content'}, cn);
    const footer = mCreateElement('footer', {class: 'page-footer'}, cn);

    T.ui.appendTemplate('js_ui_transfer_header', header);
    T.ui.appendTemplate('js_ui_transfer_footer', footer);
    T.ui.appendTemplate('js_ui_transfer_content', content);
    T.ui.appendTemplate('js_ui_transferit_overlay', gn);

    const visitBtn = header.querySelector('.js-visit-it');
    const closeBtn = header.querySelector('.js-close');

    visitBtn.classList.remove('hidden');
    closeBtn.classList.remove('hidden');

    /** @temp property T.ui.page */
    lazy(T.ui, 'page', () => {

        return freeze({
            get content() {
                return content;
            },

            showSection(cn) {
                if (cn && cn.classList.contains('hidden')) {
                    const cns = content.querySelectorAll('.it-box-holder');

                    for (let i = 0; i < cns.length; i++) {
                        cns[i].classList.add('hidden');
                    }

                    cn.classList.remove('hidden');
                }
            }
        });
    });

    return freeze({
        data: Object.create(null),

        init() {
            const cn = this.data.cn = gn.querySelector('.js-transferit-overlay');

            closeBtn.addEventListener('click', () => history.back());

            visitBtn.addEventListener('click', (ev) => {
                stop(ev);
                T.core.transfer();
            });

            header.querySelector('.it-logo').addEventListener('click', (e) => {
                e.preventDefault();
                T.ui.addFilesLayout.init();
            });

            cn.querySelector('.js-continue').addEventListener('click', () => {
                if (cn.querySelector('.js-skip-overlay').checked) {
                    mega.config.set('skiptritwarn', 1);
                }
                else {
                    mega.config.remove('skiptritwarn');
                }
                cn.classList.add('hidden');
            });
            cn.querySelector('.js-close').addEventListener('click', () => history.back());
            cn.querySelector('.js-cancel').addEventListener('click', () => history.back());
        },

        show(psn) {
            loadSubPage('');

            if (!this.data.cn) {
                this.init();
            }
            if (this.data.active) {
                console.warn('transferItOverlay already visible?');
                return;
            }

            this.data.active = true;
            gn.classList.remove('hidden');

            if (!mega.config.get('skiptritwarn')) {
                this.data.cn.querySelector('.js-skip-overlay').checked = false;
                this.data.cn.classList.remove('hidden');
            }
            return T.ui.addFilesLayout.init(psn);
        },

        hide() {
            this.data.active = false;
            this.data.cn.classList.add('hidden');
            gn.classList.add('hidden');
        }
    });
});
