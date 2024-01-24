class MegaMobileOverlay extends MegaMobileComponent {

    constructor(options) {
        super(options);

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add('custom-alpha', 'overlay-wrap');

        let targetNode = this.domNode;
        let subNode = document.createElement('div');
        subNode.className = `${options.wrapperClassname} custom-alpha`;
        targetNode.appendChild(subNode);
        const overlay = subNode;

        targetNode = overlay;

        this.closeButton = new MegaMobileButton({
            parentNode: targetNode,
            type: 'icon',
            componentClassname: 'text-icon close',
            icon: 'sprite-mobile-fm-mono icon-x-thin-outline',
            iconSize: 24
        });

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
        return this.domNode.classList.contains('active');
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

            if (options.icon) {
                this.addImage(options.icon);
            }

            if (options.title) {
                this.addTitle(options.title);
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
                        onClick: onClick
                    } = options.actions[i];

                    const button = new MegaMobileButton({
                        parentNode: this.actionsNode,
                        type: type || 'normal',
                        componentClassname: className || '',
                        text: text
                    });

                    _bindEvent(onClick, button, 'tap.overlayAction');
                }
            }

            _bindEvent(options.onClose, this, 'close.mobileOverlay');

            if (options.actionOnBottom) {
                this.domNode.classList.add('action-button-bottom');
            }

            _bindEvent(options.onShow);
        }

        this.closeButton.rebind('tap.closeOverlay', async() => {
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

        this.domNode.classList.add('active');

        if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays(undefined, true);
        }
    }

    hide() {
        this.domNode.classList.remove('active');

        mainlayout.classList.remove('fm-overlay');
        document.documentElement.classList.remove('overlayed');

        if (mega.flags.ab_ads) {
            mega.commercials.updateOverlays();
        }
    }

    clear() {
        this.clearTitle();
        this.clearSubTitle();
        this.clearImage();
        this.clearContent();
        this.clearActions();
        this.clearUserEvents();

        this.domNode.classList.remove('action-button-bottom');
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

    addTitle(title) {
        this.clearTitle();
        const subNode = document.createElement('h1');
        subNode.textContent = title;
        this.titleNode.appendChild(subNode);
    }

    clearTitle() {
        this.titleNode.textContent = '';
        this.titleNode.className = 'title';
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
    }

    addImage(imageClass, icon = true) {
        const elem = document.createElement('i');
        elem.className = icon ? `icon ${imageClass}` : imageClass;
        this.imageNode.append(elem);
    }

    addContent(content, clear) {
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
        const buttonClassList = ['nav-elem', 'normal', 'button'];
        for (let i = actions.length; i--;) {
            const button = actions[i];
            button.classList.add(...buttonClassList);
            this.actionsNode.insertBefore(button, this.actionsNode.firstChild);
        }
    }

    clearActions() {
        this.actionsNode.textContent = '';
    }

    // Other util methods

    scrollTo(element) {
        if (element) {
            element.scrollIntoView();
        }
    }

    clearUserEvents() {
        this.off('close.mobileOverlay');
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
