class MegaPMMenu extends MegaMenu {
    /**
     * Show mega menu
     * @param {Object} options Options for the MegaPMMenu
     * @example
     * mega.ui.pm.menu.show({
     *      name: 'context-menu',
     *      showClose: true,
     *      scrollTo: false,
     *      preventBgClosing: false,
     *      contents: [this.domNode]
     * })
     * @returns {void}
     */
    show(options) {

        // Disable scrolling
        if (options && options.name === 'item-list-menu'
            && mega.ui.pm.list.passwordList.Ps) {
            Ps.disable(mega.ui.pm.list.passwordList.Ps.element);
        }

        super.show(options);

        if (this.onResize) {
            window.removeEventListener('resize', this.onResize);
            this.onResize = SoonFc(90, () => {
                if (this.name !== options.name || !this.visible) {
                    return;
                }
                if (this.eventTarget && !this._isAnchorVisible()) {
                    this.hide();
                    this.trigger('close');
                    return;
                }
                this.calcPosition();
            });
            window.addEventListener('resize', this.onResize);
        }
    }

    hide() {
        super.hide();

        // Enable scrolling
        if (mega.pwmh && (mega.pm.pwmFeature || u_attr.b || u_attr.pf) && mega.ui.pm.list.passwordList.Ps) {
            Ps.enable(mega.ui.pm.list.passwordList.Ps.element);
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

        const leftMenuWidth = mega.ui.topmenu.domNode.offsetWidth;

        var POPUP_WIDTH = leftMenuWidth + mega.ui.pm.list.passwordPanel.offsetWidth;
        var POPUP_HEIGHT = window.innerHeight;

        const dialog = this.domNode;
        const dialogStyle = dialog.style;
        dialogStyle.height = null;
        let posLeft;
        let posTop;

        const menuWidth = parseFloat(dialog.offsetWidth);
        let menuHeight = parseFloat(dialog.offsetHeight);

        const psaBannerHeight = typeof psa === 'undefined' ? 0 : psa.getBannerHeight();

        // calculate the max width & height available for the context menu dialog
        const maxHeight = POPUP_HEIGHT - mega.ui.pm.POPUP_TOP_MARGIN - psaBannerHeight;

        if (this.event.type === 'contextmenu') {
            posLeft = this.event.originalEvent.clientX;
            posTop = this.event.originalEvent.clientY;

            // if the left side of the popup is out of the window, move it to fit the right side of the window
            if (posLeft + menuWidth + mega.ui.pm.POPUP_SIDE_MARGIN > POPUP_WIDTH) {
                posLeft = POPUP_WIDTH - menuWidth - mega.ui.pm.POPUP_SIDE_MARGIN;
            }
            // if the bottom side of the popup is out of the window, move it to fit the bottom side of the window
            if (posTop + menuHeight + mega.ui.pm.POPUP_TOP_MARGIN + psaBannerHeight > POPUP_HEIGHT) {
                posTop = POPUP_HEIGHT - menuHeight - mega.ui.pm.POPUP_TOP_MARGIN - psaBannerHeight;
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

            const minPosWidth = leftMenuWidth + mega.ui.pm.POPUP_SIDE_MARGIN;

            // show the dialog taking into account the position of the left menu to avoid overlapping it
            if (posLeft < minPosWidth) {
                posLeft = minPosWidth;
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

    _isAnchorVisible() {
        const {domNode} = this.eventTarget;
        const rect = domNode.getBoundingClientRect();
        if (!rect.width && !rect.height) {
            return false;
        }
        const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return topEl !== null && (domNode.contains(topEl) || this.domNode.contains(topEl));
    }
}

mBroadcaster.once('startMega', () => {
    'use strict';

    document.body.addEventListener('click', event => {
        if (mega.ui.pm.menu.eventTarget && (event.target === mega.ui.pm.menu.eventTarget.domNode ||
            mega.ui.pm.menu.eventTarget.domNode.contains(event.target))) {
            return;
        }

        mega.ui.pm.menu.hide();
        mega.ui.pm.menu.trigger('close');
    }, true);
});
