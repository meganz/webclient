class MButton extends MComponent {
    /**
     * @param {String} label Main text of the button
     * @param {String} leftIcon The icon on the left of the text
     * @param {Function} clickFn The callback to trigger
     * @param {String} additionalClasses Additional classes to use along with the main ones
     */
    constructor(label, leftIcon, clickFn, additionalClasses) {
        super();

        if (label) {
            this.label = label;
        }

        if (typeof clickFn === 'function') {
            this.attachEvent('click', (e) => {
                clickFn(this, e);
            });
        }

        if (leftIcon) {
            this.setLeftIcon(leftIcon);
        }

        this.appendCss(additionalClasses);
        this._loading = false;
    }

    /**
     * @param {Boolean} status Whether to truncate the overlapping text or not
     */
    set truncateOverflowText(status) {
        if (!this.textSpan) {
            return;
        }

        const truncateClasses = ['text-ellipsis', 'w-full'];

        if (status === true) {
            this.textSpan.classList.add(...truncateClasses);
        }
        else {
            this.textSpan.classList.remove(...truncateClasses);
        }
    }

    get label() {
        return this.textSpan ? this.textSpan.textContent : '';
    }

    /**
     * @param {String} label Label to set withing the button
     */
    set label(label) {
        if (!this.textSpan) {
            this.textSpan = document.createElement('span');
            this.el.appendChild(this.textSpan);
        }

        this.textSpan.textContent = label;
    }

    /**
     * @param {Boolean} status Loading status
     */
    set loading(status) {
        if (status === this.loading) {
            return;
        }

        if (status) {
            this.el.style.width = this.el.offsetWidth + 'px';

            if (this.textSpan) {
                this.el.removeChild(this.textSpan);
            }

            this.loadingEl = document.createElement('i');
            this.loadingEl.className = 'sprite-fm-theme icon-loading-spinner mx-auto rotating';
            this.el.appendChild(this.loadingEl);

            this.disable();
        }
        else {
            if (this.loadingEl) {
                this.el.removeChild(this.loadingEl);
            }

            if (this.textSpan) {
                this.el.appendChild(this.textSpan);
            }

            this.el.style.width = null;
            this.enable();
        }
    }

    disable() {
        if (!this.el.disabled) {
            this.el.classList.add('disabled');
            this.el.disabled = true;
        }
    }

    enable() {
        if (this.el.disabled) {
            this.el.classList.remove('disabled');
            this.el.disabled = false;
        }
    }

    removeLeftIcon() {
        if (this.leftIcon) {
            this.leftIcon.parentNode.removeChild(this.leftIcon);
        }
    }

    setLeftIcon(icon) {
        this.removeLeftIcon();

        this.leftIcon = document.createElement('i');
        this.leftIcon.className = 'sprite-fm-mono ' + icon;

        const div = document.createElement('div');
        div.appendChild(this.leftIcon);

        this.el.prepend(div);
    }

    buildElement() {
        this.el = document.createElement('button');
    }

    setActive() {
        this.el.classList.add('active');
    }

    unsetActive() {
        this.el.classList.remove('active');
    }
}
