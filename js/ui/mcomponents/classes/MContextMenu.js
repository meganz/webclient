class MContextMenu extends MComponent {
    constructor(parent) {
        super(parent, false);
        this.isShowing = false;
    }

    buildElement() {
        this.el = document.createElement('div');
        this.el.setAttribute('class', 'dropdown body context');
    }

    /**
     * @param {Number} width Width of the popup block
     */
    set width(width) {
        this._minWidth = parseInt(width);
    }

    show() {
        this.isShowing = true;

        if (!this.el) {
            this.buildElement();
        }

        this.setPositionByParent();

        document.body.append(this.el);

        this._overlay = new MOverlay();
        this._overlay.click(() => {
            this.hide();
        });
    }

    hide() {
        this.isShowing = false;

        if (this._overlay) {
            this._overlay.detach();
            delete this._overlay;
        }

        this.detach();
    }

    toggle() {
        this[this.isShowing ? 'hide' : 'show']();
    }

    // Keeping it easy for now, without parametrized positioning
    setPositionByParent() {
        if (!this.mParent) {
            return;
        }

        const rect = this.mParent.getBoundingClientRect();

        this.el.style.top = (rect.top + this.mParent.offsetHeight + MContextMenu.offsetVert) + 'px';
        this.el.style.left = rect.left + 'px';

        if (this._minWidth > 0) {
            this.el.style.minWidth = this._minWidth + 'px';
        }
    }
}

/**
 * Menu vertical offset in pixels
 * @type {Number}
 */
MContextMenu.offsetVert = 5;

/**
 * Menu horizontal offset in pixels
 * @type {Number}
 */
MContextMenu.offsetHoriz = 5;
