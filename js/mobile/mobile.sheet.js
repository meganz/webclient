class MegaMobileSheet extends MegaMobileOverlay {

    constructor(options) {
        super(options);

        this.rebind('tap.closeSheet', (e) => {
            if (e.data
                && e.data.target === this.domNode
                // do not close sheet when an input element is focussed
                && !this.domNode.querySelector('.mega-input.active')) {
                if (this.preventBgClosing) {
                    return false;
                }
                this.hide();
                this.trigger('close.mobilesheet');
            }
        });
    }

    set type(key) {
        const sheetType = MegaMobileSheet.typeClass[key];

        if (!sheetType) {
            console.error('Sheet type is not given');
            return;
        }

        this.domNode.megaSheetType = sheetType;
        this.domNode.classList.add(sheetType);
    }

    get type() {
        return this.domNode.megaSheetType;
    }

    set height(key) {
        const sheetHeight = MegaMobileSheet.heightClass[key];

        if (!sheetHeight) {
            console.error('Sheet height mode is not given');
            return;
        }

        this.domNode.megaSheetHeight = sheetHeight;
        this.domNode.classList.add(sheetHeight);
    }

    get height() {
        return this.domNode.megaSheetHeight;
    }

    /**
     * Method to open a sheet with data if passed as a param
     * @param {Object} [options] contains optional fields to set data
     * @example
     *  mega.ui.sheet.show({
     *      name: 'sheet-loader',
     *      type: 'modal',
     *      showClose: true,
     *      preventBgClosing: false,
     *      icon: 'sprite-mobile-fm-theme icon-loader-throbber-thin-outline loading',
     *      title: 'Moving folder to Rubbish bin...',
     *      content: 'This can take a while.',
     *      actions: [{
     *          type: 'normal',
     *          text: 'Okay',
     *          className: '',
     *          onClick: 'function'
     *      }],
    *       onShow: 'function',
     *      onClose: 'function'
     *  });
     * @returns {void}
     */
    show(options) {
        if (options) {
            if (!options.name) {
                console.error('Sheet name is missing in the options');
                return;
            }

            M.safeShowDialog(options.name, () => {
                super.show(options);
                this.type = options.type || 'normal';
                this.height = options.sheetHeight || 'auto';
                this.preventBgClosing = options.preventBgClosing || false;

                if (options.onClose) {
                    this.on('close.mobilesheet', options.onClose);
                }
                else {
                    this.off('close.mobilesheet');
                }
            });
        }
        else {
            if (!this.type) {
                this.type = 'normal';
            }
            if (!this.height) {
                this.height = 'auto';
            }
            this.preventBgClosing = false;

            super.show();
        }

        if (mega.ui.overlay.visible) {
            mega.ui.overlay.domNode.classList.add('arrange-to-back');
        }

        if (!holderContainer.classList.contains('fm-overlay')) {
            holderContainer.classList.add('fm-overlay');
        }

        document.getElementsByTagName('html')[0].classList.add('overlayed');
    }

    hide() {
        super.hide();
        mega.ui.overlay.domNode.classList.remove('arrange-to-back');

        if ($.msgDialog) {
            closeMsg();
        }
        else if ($.dialog) {
            closeDialog();
        }
    }

    clear() {
        this.domNode.classList.remove(this.type, this.height);
        delete this.domNode.megaSheetType;
        delete this.domNode.megaSheetHeight;

        super.clear();
    }

    /**
     * Overridden function
     * @param {String} title
     */
    addTitle(title) {
        this.clearTitle();
        const subNode = document.createElement('h2');
        subNode.textContent = title;
        this.titleNode.appendChild(subNode);
    }
}

MegaMobileSheet.typeClass = {
    normal: 'normal',
    modal: 'modal-dialog',
    modalLeft: 'modal-dialog-left'
};

MegaMobileSheet.heightClass = {
    full: 'full-height',
    auto: 'dynamic-height'
};

// Create instance before fm is initialized
mega.ui.sheet = new MegaMobileSheet({
    parentNode: document.body,
    componentClassname: 'mega-sheet',
    wrapperClassname: 'sheet'
});

window.addEventListener('popstate', () => {

    'use strict';

    if (mega.ui.sheet.visible) {
        mega.ui.sheet.hide();
    }
});
