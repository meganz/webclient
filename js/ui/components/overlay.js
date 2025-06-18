class MegaOverlay extends MegaComponent {

    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        this.addClass('custom-alpha', 'overlay-wrap');

        let targetNode = this.domNode;
        let subNode = document.createElement('div');
        subNode.className = `${options.wrapperClassname} custom-alpha`;
        targetNode.appendChild(subNode);
        const overlay = this.overlayNode = subNode;

        targetNode = overlay;

        subNode = document.createElement('div');
        subNode.className = 'header mb-4 relative';
        targetNode.appendChild(subNode);
        targetNode = subNode;

        this.headerTitleNode = subNode = document.createElement('div');
        subNode.className = 'header-title flex flex-row items-center';
        targetNode.appendChild(subNode);

        this.closeButton = new MegaButton({
            parentNode: targetNode,
            type: 'icon',
            componentClassname: 'text-icon close absolute',
            icon: `${mega.ui.sprites.mono} icon-dialog-close`,
            iconSize: 24
        });

        targetNode = overlay;

        subNode = document.createElement('div');
        subNode.className = 'main';
        targetNode.appendChild(subNode);

        if (!is_mobile) {
            overlay.Ps = new PerfectScrollbar(options.scrollOverlay ? overlay : subNode);
        }

        targetNode = subNode;

        this.imageNode = subNode = document.createElement('div');
        subNode.className = 'image mob-px-6';
        targetNode.appendChild(subNode);

        this.titleNode = subNode = document.createElement('div');
        subNode.className = 'title mob-px-6';
        targetNode.appendChild(subNode);

        this.subTitleNode = subNode = document.createElement('div');
        subNode.className = 'subtitle';
        targetNode.appendChild(subNode);

        this.contentNode = subNode = document.createElement('div');
        subNode.className = 'content fm-scrolling scroller-space content';
        targetNode.appendChild(subNode);

        targetNode = overlay;
        this.actionsNode = subNode = document.createElement('div');
        subNode.className = 'actions';
        targetNode.appendChild(subNode);

        targetNode = overlay;
        this.footerNode = subNode = document.createElement('footer');
        subNode.className = 'overlay-footer hidden';
        targetNode.appendChild(subNode);
    }

    get centered() {
        return !!this.domNode.querySelector('.main').classList.contains('centered');
    }

    set centered(val) {
        val = val || true;
        const main = this.domNode.querySelector('.main');

        if (val !== this.centered) {
            main.classList.toggle('centered');
        }
    }

    get visible() {
        return this.hasClass('active');
    }

    show(options) {
        if (options) {
            this.clear();
            this.showClose = options.showClose;
            this.centered = options.centered;

            if (options.classList) {
                this.addClass(...options.classList);
                this.addedClasses = options.classList;
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

            if (options.navImage) {
                this.addNavImage(options.navImage, true);
            }

            if (options.icon) {
                this.addImage(options.icon);
            }

            if (options.header) {
                this.addHeader(options.header, options.headerType);
            }

            if (options.onBack) {
                this.addBackBtn(options.onBack);
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
                for (let i = options.actions.length; i--;) {
                    const {
                        type: type,
                        text: text,
                        className: className,
                        onClick: onClick,
                        icon
                    } = options.actions[i];

                    const button = new MegaButton({
                        parentNode: this.actionsNode,
                        type: type || 'normal',
                        componentClassname: className || '',
                        text,
                        icon
                    });

                    _bindEvent(onClick, button, 'click.overlayAction');
                }
            }

            if (options.footer) {
                this.addFooter(options.footer);
            }

            _bindEvent(options.onClose, this, 'close.overlay');

            if (options.actionOnBottom) {
                this.domNode.classList.add('action-button-bottom');
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

        // if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays(undefined, true);
        // }
    }

    hide(name) {
        if (this.visible && (!name || name === this.name)) {
            this.removeClass('active', 'pm-dialog');

            if (this.addedClasses) {
                this.removeClass(...this.addedClasses);
                delete this.addedClasses;
            }

            mainlayout.classList.remove('fm-overlay', 'pm-dialog');
            document.documentElement.classList.remove('overlayed');
            this.name = undefined;
            this.trigger('hide');

            // if (mega.flags.ab_ads) {
                mega.commercials.updateOverlays();
            // }
        }
    }

    clear() {
        this.clearBackBtn();
        this.clearHeader();
        this.clearTitle();
        this.clearSubTitle();
        this.clearImage();
        this.clearContent();
        this.clearActions();
        this.clearFooter();
        this.clearUserEvents();

        this.removeClass('action-button-bottom');
    }

    // Methods for each of its elements

    get showClose() {
        return !this.domNode.querySelector('.close').classList.contains('hidden');
    }

    set showClose(show) {
        const close = this.domNode.querySelector('.close');
        if (show !== !close.classList.contains('hidden')) {
            close.classList.toggle('hidden');
        }
    }

    get name() {
        return this.domNode.name;
    }

    set name(name) {
        this.domNode.name = name;
    }

    addTitle(title, titleType) {
        this.clearTitle();
        const subNode = document.createElement(titleType || 'h1');
        subNode.textContent = title;
        this.titleNode.appendChild(subNode);
    }

    clearTitle() {
        this.titleNode.textContent = '';
        this.titleNode.className = 'title mob-px-6';
    }

    addHeader(title, headerType, className = 'my-0 font-600 flex-1 text-left') {
        this.clearHeader();
        const subNode = document.createElement(headerType || 'h2');
        subNode.textContent = title;
        subNode.className = className;
        this.headerTitleNode.appendChild(subNode);
    }

    addBackBtn(cb) {
        this.clearBackBtn();

        const btn = new MegaButton({
            parentNode: this.headerTitleNode,
            icon: 'sprite-fm-mono icon-arrow-left-regular-outline rtl-rot-180',
            componentClassname: 'transparent-icon text-icon secondary me-4',
            type: 'icon'
        }).on('click.dialogBack', cb.bind(null));

        this.headerTitleNode.prepend(btn.domNode);
    }

    clearBackBtn() {
        const btn = this.headerTitleNode.querySelector('button.back-btn');

        if (btn) {
            this.headerTitleNode.removeChild(btn);
        }
    }

    clearHeader() {
        this.headerTitleNode.textContent = '';
    }

    addSubTitle(subtitle) {
        this.clearSubTitle();
        if (subtitle) {
            const subNode = document.createElement('span');
            subNode.textContent = subtitle;
            this.subTitleNode.appendChild(subNode);
        }
    }

    clearSubTitle() {
        this.subTitleNode.textContent = '';
    }

    clearImage() {
        this.imageNode.textContent = '';
        this.imageNode.className = 'image mob-px-6';
    }

    addImage(imageClass, icon = true) {
        const elem = document.createElement('i');
        elem.className = icon ? `icon ${imageClass}` : imageClass;
        this.imageNode.append(elem);
    }

    addNavImage(imageClass, icon = true) {
        const elem = document.createElement('i');
        elem.className = icon ? `icon ${imageClass}` : imageClass;
        this.headerTitleNode.appendChild(elem);
    }

    addContent(content, clear) {
        if (!content) {
            return;
        }
        if (typeof content === 'string') {
            content = document.createTextNode(content);
        }

        if (clear) {
            this.clearContent();
        }

        this.contentNode.appendChild(content);

        if (this.overlayNode.Ps) {
            this.overlayNode.Ps.update();
        }
    }

    addContents(contents, clear) {
        if (clear) {
            this.clearContent();
        }
        for (let i = 0; i < contents.length; i++) {
            this.addContent(contents[i]);
        }
    }

    clearContent() {
        this.contentNode.textContent = '';
        if (this.overlayNode.Ps) {
            this.overlayNode.Ps.update();
        }
    }

    addActions(actions, clear) {
        if (clear) {
            this.clearActions();
        }

        const res = [];

        for (let i = 0; i < actions.length; i++) {

            const interactable = actions.href ? MegaLink : MegaButton;
            const buttonProps = {
                ...actions[i],
                parentNode: this.actionsNode,
                componentClassname: `${actions[i].componentClassname || 'primary'} nav-elem normal button`
            };

            const btn = new interactable(buttonProps);

            res.push(btn);
        }

        return res;
    }

    clearActions() {
        this.actionsNode.textContent = '';
        this.actionsNode.className = 'actions';
    }

    addFooter(options, clear) {
        if (clear) {
            this.clearFooter();
        }

        const { type, classList = [], slot } = options;
        const hasSlot = Array.isArray(slot) && slot.length;

        if (!['checkbox', 'link'].includes(type) && !hasSlot) {
            return;
        }

        if (hasSlot) {
            for (let i = 0; i < slot.length; i++) {
                this.footerNode.appendChild(slot[i]);
            }
        }
        else if (type === 'checkbox') {
            this.footerComp = new MegaCheckbox({
                parentNode: this.footerNode,
                componentClassname: 'mega-checkbox',
                ...options,
            });
        }
        else if (type === 'link') {
            this.footerComp = new MegaLink({
                parentNode: this.footerNode,
                ...options,
            });
        }
        this.footerNode.className = ['overlay-footer', ...classList].join(' ');
        this.addClass('with-footer');
    }

    clearFooter() {
        this.footerNode.className = 'overlay-footer hidden';
        this.footerNode.textContent = '';
        delete this.footerComp;
        this.removeClass('with-footer');
    }

    // Other util methods

    scrollTo(element) {
        if (element) {
            element.scrollIntoView();
        }
    }

    clearUserEvents() {
        this.off('close.overlay');
    }
}

mega.ui.overlay = new MegaOverlay({
    parentNode: document.body,
    componentClassname: 'mega-overlay',
    wrapperClassname: 'overlay'
});

window.addEventListener('popstate', () => {

    'use strict';

    if (mega.ui.overlay.visible) {
        mega.ui.overlay.hide();
    }
});
