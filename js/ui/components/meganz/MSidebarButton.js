class MSidebarButton extends MButton {
    /**
     * @param {String} label Main button text
     * @param {String} leftIcon Icon on the left of the text
     * @param {Function} clickFn Callback to trigger on click
     * @param {String} additionalClasses Additional classes to use along with the main ones
     */
    constructor(label, leftIcon, clickFn, additionalClasses) {
        super(
            label,
            leftIcon,
            clickFn,
            'btn-galleries js-lpbtn' + (additionalClasses ? ' ' + additionalClasses : '')
        );
    }

    get isExpandable() {
        return this._expandable;
    }

    /**
     * Adding expandable feature to the item
     * @param {Boolean} status Indicating whether the button should be expandable or not
     */
    set isExpandable(status) {
        if (status) {
            if (!this._expandable) {
                const i = document.createElement('i');
                i.className = 'sprite-fm-mono icon-dropdown';
                i.style.marginRight = '0';

                this.el.prepend(i);
                this.el.classList.add('expansion-btn');
                this._expandable = true;
            }
        }
        else {
            const i = this.el.querySelector('i.icon-dropdown');

            if (i) {
                this.el.removeChild(i);
            }

            this._expandable = false;
        }
    }

    get isShared() {
        return !!this.shareIcon;
    }

    /**
     * @param {Boolean} value Share status
     */
    set isShared(value) {
        if (value === this.isShared) {
            return;
        }

        if (value) {
            this.shareIcon = document.createElement('i');
            this.shareIcon.className = 'sprite-fm-mono icon-link-small pointer-events-none icon-size-6';
            this.el.classList.add('is-shared');

            this.el.appendChild(this.shareIcon);
        }
        else {
            this.el.removeChild(this.shareIcon);
            this.el.classList.remove('is-shared');
            delete this.shareIcon;
        }
    }
}
