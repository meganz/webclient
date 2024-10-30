class MegaMobileOverlay extends MegaComponent {

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
        const overlay = subNode;

        targetNode = overlay;

        subNode = document.createElement('div');
        subNode.className = 'header';
        targetNode.appendChild(subNode);
        targetNode = subNode;

        this.headerTitleNode = subNode = document.createElement('div');
        subNode.className = 'header-title';
        targetNode.appendChild(subNode);

        this.closeButton = new MegaButton({
            parentNode: targetNode,
            type: 'icon',
            componentClassname: 'text-icon close',
            icon: 'sprite-mobile-fm-mono icon-dialog-close',
            iconSize: 24
        });

        targetNode = overlay;

        subNode = document.createElement('div');
        subNode.className = 'main';
        targetNode.appendChild(subNode);

        targetNode = subNode;

        this.imageNode = subNode = document.createElement('div');
        subNode.className = 'image';
        targetNode.appendChild(subNode);

        this.titleNode = subNode = document.createElement('div');
        subNode.className = 'title';
        targetNode.appendChild(subNode);

        this.subTitleNode = subNode = document.createElement('div');
        subNode.className = 'subtitle';
        targetNode.appendChild(subNode);

        this.contentNode = subNode = document.createElement('div');
        subNode.className = 'content fm-scrolling scroller-space';
        targetNode.appendChild(subNode);

        targetNode = overlay;
        this.actionsNode = subNode = document.createElement('div');
        subNode.className = 'actions';
        targetNode.appendChild(subNode);
    }

    get visible() {
        return this.hasClass('active');
    }

    show(options) {
        if (options) {
            this.clear();
            this.showClose = options.showClose;

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

        if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays(undefined, true);
        }
    }

    hide() {
        this.removeClass('active');

        mainlayout.classList.remove('fm-overlay');
        document.documentElement.classList.remove('overlayed');

        if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays();
        }
    }

    clear() {
        this.clearHeader();
        this.clearTitle();
        this.clearSubTitle();
        this.clearImage();
        this.clearContent();
        this.clearActions();
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
        this.titleNode.className = 'title';
    }

    addHeader(title, headerType) {
        this.clearHeader();
        const subNode = document.createElement(headerType || 'h2');
        subNode.textContent = title;
        this.headerTitleNode.appendChild(subNode);
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
        this.imageNode.className = 'image';
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

mega.ui.overlay = new MegaMobileOverlay({
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
