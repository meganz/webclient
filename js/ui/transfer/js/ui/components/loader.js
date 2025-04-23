/** @property T.ui.loader */
lazy(T.ui, 'loader', () => {
    'use strict';

    const ce = (n, t, a) => mCreateElement(n, a, t);

    return freeze({
        data: Object.create(null),

        // @todo: T.ui.overlay
        init() {
            const cn = document.querySelector('body > .global-overlay-container')
                || ce('div', 'body', { class: 'global-overlay-container' });

            this.data.overlay = cn.querySelector('.it-overlay')
                || ce('div', cn, { class: 'it-overlay hidden' });

            this.data.spinner = cn.querySelector('.it-loading-spinner')
                || ce('div', cn, { class: 'it-loading-spinner' });
        },

        hide() {
            if (!this.data.overlay) {
                return false;
            }

            this.data.overlay.classList.add('hidden');
            this.data.spinner.classList.add('hidden');
        },

        show() {
            if (!this.data.overlay || !this.data.overlay.closest('body')) {
                this.init();
            }

            this.data.overlay.classList.remove('hidden');
            this.data.spinner.classList.remove('hidden');
        }
    });
});
