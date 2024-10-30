class MegaOverlay extends MegaMobileOverlay {
    constructor(options) {
        super(options);

        this.overlayNode = this.domNode.querySelector(`.${options.wrapperClassname}`);

        this.contentNode.className = 'content';
        this.overlayNode.Ps = new PerfectScrollbar(this.overlayNode);
    }

    show(options) {
        if (options) {
            this.clear();
            this.showClose = options.showClose;
            this.centered = options.centered;

            if (options.classList) {
                this.addClass(...options.classList);
            }

            if (!options.name && d) {
                console.warn('Overlay name is missing. Please set it in the options');
            }

            const _bindEvent = (onAction, target, event) => {

                if (typeof onAction === 'function') {

                    if (target && event) {
                        target.on(event, onAction);
                    }
                    else {
                        onAction();
                    }
                }
            };

            this.name = options.name || '';
            this.clearHeader();

            if (options.navImage) {
                this.addNavImage(options.navImage, true);
            }

            if (options.icon) {
                this.addImage(options.icon);
            }

            if (options.header) {
                this.addHeader(options.header, options.headerType);
            }

            if (options.title) {
                this.addTitle(options.title, options.titleType);
            }
            if (options.subtitle) {
                this.addSubTitle(options.subtitle);
            }
            this.addContents(options.contents || []);

            _bindEvent(options.onRender);

            if (options.actions) {
                this.addActions(options.actions);
            }

            _bindEvent(options.onClose, this, 'close.overlay');

            if (options.actionOnBottom) {
                this.addClass('action-button-bottom');
            }

            _bindEvent(options.onShow);
        }

        this.closeButton.rebind('click.closeOverlay', async() => {
            // If the overlay requires a confirmation action before closing it,
            // wait for the user's response before trying to close the overlay
            if (options && options.confirmClose) {
                const closeOverlay = await options.confirmClose();
                if (!closeOverlay) {
                    return;
                }
            }

            this.hide();
            if (mega.ui.toast) {
                mega.ui.toast.rack.removeClass('above-actions');
            }
            this.trigger('close');
        });

        this.addClass('active');
    }

    hide(name) {
        if (this.visible && (!name || name === this.name)) {
            this.removeClass('active');
            mainlayout.classList.remove('pm-dialog');
            mega.ui.overlay.removeClass('pm-dialog');
            this.name = undefined;
            this.trigger('hide');
        }
    }

    get centered() {
        return !!this.domNode.querySelector('.main').classList.contains('centered');
    }

    set centered(val = true) {
        const main = this.domNode.querySelector('.main');

        if (val !== this.centered) {
            main.classList.toggle('centered');
        }
    }

    addContent(content, clear) {
        super.addContent(content, clear);

        if (this.overlayNode.Ps) {
            this.overlayNode.Ps.update();
        }
    }

    clearContent() {
        super.clearContent();
        if (this.overlayNode.Ps) {
            this.overlayNode.Ps.update();
        }
    }
}

(mega => {
    "use strict";

    lazy(mega.ui.pm, 'overlay', () => new MegaOverlay({
        parentNode: document.querySelector('.password-list-page'),
        componentClassname: 'mega-overlay pm-overlay',
        wrapperClassname: 'overlay'
    }));

})(window.mega);
