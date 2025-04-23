T.ui.toast = {

    init() {
        'use strict';

        let cn = document.querySelector('body > .global-toast-container');

        if (!cn) {
            cn = mCreateElement('div', { class: 'global-toast-container' }, 'body');
        }

        cn.textContent = '';

        cn = mCreateElement('div', { class: 'toast-rack top' }, cn);
        this.slot = mCreateElement('div', { class: 'toast-slot' }, cn);
        this.toast = mCreateElement('div', {
            class: 'toast',
            role: 'status'
        }, this.slot);

        this.icon = mCreateElement('i', { class: 'toast-icon hidden' }, this.toast);
        this.message = mCreateElement('span', { class: 'message' }, this.toast);
        this.button = mCreateElement('button', {
            'aria-label': 'Close',
            class: 'it-button ghost close'
        }, this.toast);
        mCreateElement('i', { class: 'it-button ghost close' }, this.button);

    },

    hide() {
        'use strict';

        if (!this.toast) {
            return false;
        }

        this.slot.classList.remove('open');
        this.toast.classList.remove('visible');
        this.slot.removeAttribute('style');
        this.toast.dataset.id = '';
    },

    show(classname, content, timeout) {
        'use strict';

        if (!content) {
            return false;
        }

        if (!this.toast) {
            this.init();
        }

        if (this.toast.dataset.id) {
            clearTimeout(parseInt(this.toast.dataset.id));
        }

        this.icon.className = `toast-icon ${classname || 'hidden'}`;
        this.message.textContent = content;
        this.slot.style.setProperty('--toast-height', getComputedStyle(this.toast).height);
        this.slot.classList.add('open');
        this.toast.classList.add('visible');

        this.toast.dataset.id = setTimeout(() => this.hide(), parseInt(timeout) || 2000);

        this.button.addEventListener('click', () => {
            clearTimeout(parseInt(this.toast.dataset.id));
            this.hideToast();
        });
    }
};
