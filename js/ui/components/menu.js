class MegaMenu extends MegaOverlay {
    /**
     * Show mega menu
     * @param {Object} options Options for the MegaMenu
     * @example
     * mega.ui.menu.show({
     *      name: 'context-menu',
     *      showClose: true,
     *      scrollTo: false,
     *      preventBgClosing: false,
     *      contents: [this.domNode]
     * })
     * @returns {void}
     */
    show(options) {
        super.show({
            ...options,
            showClose: false,
            centered: false
        });
        if (options.classList) {
            this.addedClasses = options.classList;
        }

        if (options.container) {
            this.container = options.container;
        }

        this.event = options.event;
        this.pos = options.pos || 'left';
        this.calcPosition();

        // This is opened by click event.
        if (options.eventTarget) {
            this.eventTarget = options.eventTarget;
        }

        if (!is_mobile && options.resizeHandler) {
            this.onResize = SoonFc(90, () => {
                if (this.name === options.name) {
                    this.calcPosition();
                }
            });
            window.addEventListener('resize', this.onResize);
        }
    }

    clear() {
        super.clear();
        if (this.addedClasses) {
            this.removeClass(...this.addedClasses);
            delete this.addedClasses;
        }
        if (this.onResize) {
            window.removeEventListener('resize', this.onResize);
            delete this.onResize;
        }
    }

    hide() {
        super.hide();
        if (this.onResize) {
            window.removeEventListener('resize', this.onResize);
            delete this.onResize;
        }
    }

    /**
     * Calculate the position of the context menu dialog based on the target element
     *
     * @returns {void}
     */
    calcPosition() {
        if (!this.visible) {
            return;
        }

        const containerPos = (this.container || document.body).getBoundingClientRect();
        const dialog = this.domNode;
        const dialogStyle = dialog.style;
        dialogStyle.height = null;
        let posLeft;
        let posTop;

        const menuWidth = parseFloat(dialog.offsetWidth);
        let menuHeight = parseFloat(dialog.offsetHeight);

        // calculate the max width & height available for the context menu dialog
        const maxHeight = window.innerHeight;

        if (this.event.type === 'contextmenu' || this.pos === 'bottomRight') {

            if (this.pos === 'bottomRight') {

                const {bottom, left} = this.event.currentTarget.domNode.getBoundingClientRect();

                posLeft = left;
                posTop = bottom + 12;
            }
            else {
                posLeft = this.event.originalEvent.clientX;
                posTop = this.event.originalEvent.clientY;
            }

            // if the left side of the popup is out of the window, move it to fit the right side of the window
            if (posLeft + menuWidth > containerPos.right) {
                posLeft = containerPos.right - menuWidth;
            }
            // if the bottom side of the popup is out of the window, move it to fit the bottom side of the window
            if (posTop + menuHeight > maxHeight) {
                posTop = maxHeight - menuHeight;
            }
        }
        else {
            const {top, bottom, right} = this.event.currentTarget.domNode.getBoundingClientRect();

            // calculate the position of the context menu dialog from the left & top of the target element
            posLeft = right - menuWidth;
            posTop = bottom + 12; // 12px space between the target element and the context menu dialog

            // check if top is at the second half of the popup.
            // if so, show the context menu dialog above the target element
            if (posTop + menuHeight > maxHeight) {
                posTop = Math.abs(top - menuHeight);
            }

            // show the dialog taking into account the position of the left menu to avoid overlapping it
            if (posLeft < containerPos.left) {
                posLeft = containerPos.left + 12;
            }

            const maxPosHeight = posTop + menuHeight;

            // calc the dialog height based on the available space.
            if (maxPosHeight > maxHeight) {
                menuHeight = Math.abs(maxHeight - posTop);
            }

            dialogStyle.height = `${menuHeight}px`;
        }
        dialogStyle.left = `${posLeft}px`;
        dialogStyle.top = `${posTop}px`;
    }
}

mBroadcaster.once('startMega', () => {
    'use strict';

    const closeHandler = (event) => {

        const {domNode} = mega.ui.menu.eventTarget || {};
        const {target} = event || {};

        if (domNode && target && (target === domNode || domNode.contains(target))) {
            return;
        }

        mega.ui.menu.hide();
        mega.ui.menu.trigger('close');
    };

    mBroadcaster.addListener('contextmenuclose', closeHandler);
});

(mega => {
    "use strict";

    lazy(mega.ui, 'menu', () => new MegaMenu({
        parentNode: document.body,
        componentClassname: 'menu-container context-menu',
        wrapperClassname: 'menu'
    }));

})(window.mega);
