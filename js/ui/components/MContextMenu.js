class MContextMenu extends MComponent {
    /**
     * @param {HTMLElement|String?} target DOM object or query selector to the DOM object
     * @param {Boolean} [ignoreOutsideClick] Whether to react to the clicks outside or not
     */
    constructor(target, ignoreOutsideClick = false) {
        super(target, false);
        this.isShowing = false;
        this.ignoreOutsideClick = ignoreOutsideClick;
    }

    buildElement() {
        this.el = document.createElement('div');
        this.el.className = 'dropdown body context m-context-menu tooltip-popin';
    }

    /**
     * @param {Number} width Width of the popup block
     */
    set width(width) {
        this._minWidth = parseInt(width);
    }

    /**
     * @param {Number} x Global X pos
     * @param {Number} y Global Y pos
     * @param {Number} [proposeX] Proposed X pos on the left, if the standard work out does not fit on the right
     * @param {Number} [proposeY] Proposed Y pos at the top, if the standard work out does not fit at the bottom
     * @returns {void}
     */
    show(x, y, proposeX, proposeY) {
        this.isShowing = true;

        document.body.appendChild(this.el);

        if (Number.isNaN(parseInt(x)) || Number.isNaN(parseInt(y))) {
            this.setPositionByTarget();
        }
        else {
            this.setPositionByCoordinates(x, y, proposeX, proposeY);
        }

        if (!this.ignoreOutsideClick) {
            this.disposeOutsideClick = MComponent.listen(document, 'mousedown', ({ target }) => {
                while (target) {
                    if (target.parentNode && target.classList.contains('m-context-menu')) {
                        break;
                    }

                    target = target.parentNode;
                }

                if (!target) {
                    this.hide(true);
                }
            });
        }

        this.pageChangeListener = mBroadcaster.addListener('beforepagechange', () => {
            if (this.ignorePageNavigationOnce) {
                this.ignorePageNavigationOnce = false;
            }
            else {
                this.hide();
            }
        });

        this.toggleScrolls(false);
    }

    hide(hideSiblings) {
        if (!this.isShowing) {
            return;
        }

        this.isShowing = false;

        if (this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }

        if (this.disposeOutsideClick) {
            this.disposeOutsideClick();
            delete this.disposeOutsideClick;
        }

        if (this.pageChangeListener) {
            mBroadcaster.removeListener(this.pageChangeListener);
            delete this.pageChangeListener;
        }

        if (hideSiblings) {
            const siblingMenus = document.body.querySelectorAll(':scope > div.m-context-menu');

            for (let i = 0; i < siblingMenus.length; i++) {
                const el = siblingMenus[i];

                if (el.mComponent && el.mComponent.isShowing && el !== this.el) {
                    el.mComponent.hide();
                }
            }
        }

        this.toggleScrolls(true);
    }

    /**
     * @param {Boolean} status Whether PS scrolls should be enabled or not
     * @returns {void}
     */
    toggleScrolls(status) {
        const scrollablePointers = document.querySelectorAll('.ps');
        const method = (status) ? 'remove' : 'add';

        if (scrollablePointers.length) {
            for (let i = 0; i < scrollablePointers.length; i++) {
                scrollablePointers[i].classList[method]('ps-disabled');
            }
        }
    }

    toggle() {
        this[this.isShowing ? 'hide' : 'show']();
    }

    setPositionByCoordinates(x, y, proposeX, proposeY) {
        if (this._minWidth > 0) {
            this.el.style.minWidth = this._minWidth + 'px';
        }

        if (x + this.el.offsetWidth > window.innerWidth) {
            x = (proposeX === undefined)
                ? window.innerWidth - this.el.offsetWidth - MContextMenu.offsetHoriz * 3
                : proposeX - this.el.offsetWidth;
        }

        if (y + this.el.offsetHeight > window.innerHeight) {
            y = (proposeY === undefined)
                ? window.innerHeight - this.el.offsetHeight - MContextMenu.offsetVert * 3
                : proposeY - this.el.offsetHeight;
        }

        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';
    }

    setPositionByTarget() {
        if (!this._parent) {
            return;
        }

        const rect = this._parent.getBoundingClientRect();

        this.el.style.top = (rect.top + this._parent.offsetHeight + MContextMenu.offsetVert) + 'px';
        this.el.style.left = rect.left + 'px';

        if (this._minWidth > 0) {
            this.el.style.minWidth = this._minWidth + 'px';
        }

        if (locale === 'ar') {
            this.el.style.left = `${rect.right - this.el.getBoundingClientRect().width}px`;
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
