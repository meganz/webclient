class MegaInteractable extends MegaComponent {

    constructor(options) {
        super(options);

        this.domNode.classList.add('nav-elem');
        this.interactableType = options.type;

        if (options.icon) {

            this.icon = options.icon;

            if (options.iconSize) {
                this.iconSize = options.iconSize;

                if (!this.iconSize) {
                    return;
                }
            }
        }

        if (options.text && options.type !== 'icon') {

            this.text = options.text;

            if (options.subtext) {
                this.subtext = options.subtext;
            }
        }

        if (options.rightIcon) {

            this.rightIcon = options.rightIcon;

            if (options.rightIconSize) {

                this.rightIconSize = options.rightIconSize;

                if (!this.rightIconSize) {
                    return;
                }
            }
        }

        if (options.rightBadge) {
            this.rightBadge = options.rightBadge;
        }

        // Disable and enable the interactable
        this.disabled = options.disabled;

        if (options.loaderColor) {
            this.loaderColor = options.loaderColor;
        }

        if (options.onClick) {
            this.on('click.onclick', options.onClick);
        }

        if (options.onContextmenu) {
            this.on('contextmenu', options.onContextmenu);
        }

        if (options.dataset) {
            this.dataset = options.dataset;
        }

        if (options.simpletip) {
            this.dataset.simpletip = options.simpletip;
            this.addClass('simpletip');

            if (options.simpletipPos) {
                this.dataset.simpletipposition = options.simpletipPos;
            }
        }

        if (options.eventLog) {
            this.eventLog = options.eventLog;
            this.on('click.eventLog', () => eventlog(options.eventLog));
        }
    }

    get disabled() {
        return this.domNode.classList.contains('disabled');
    }

    set disabled(value) {
        // Add/Remove the disabled style
        if (value) {
            this.domNode.classList.add('disabled');
        }
        else {
            this.domNode.classList.remove('disabled');
        }
    }

    get loading() {
        return this.domNode.classList.contains('loading');
    }

    set loading(stateBool) {
        if (this.loading === !!stateBool) {
            return;
        }

        const sprite = this.loaderColor === 'w' ? 'uni' : 'theme';

        if (stateBool) {
            this.addClass('loading', `sprite-fm-${sprite}-after`, 'icon-loader-throbber-light-outline-after');
        }
        else {
            this.removeClass(
                'loading',
                'sprite-fm-theme-after',
                'sprite-fm-uni-after',
                'icon-loader-throbber-light-outline-after'
            );
        }
    }

    get interactableType() {
        return Object.values(MegaInteractable.interactableTypes).find(cls => this.domNode.classList.contains(cls));
    }

    set interactableType(type) {
        this.removeClass(...Object.values(MegaInteractable.interactableTypes));
        this.addClass(MegaInteractable.interactableTypes[type] || 'normal');
    }

    get icon() {
        return this.domNode.icon.c;
    }

    set icon(iconClass) {

        let elm = this.domNode.querySelector('.left-icon');

        if (!elm) {

            elm = document.createElement('i');

            this.domNode.appendChild(elm);
            this.domNode.icon = {};
        }

        elm.className = `${iconClass} left-icon`;
        this.domNode.icon.c = iconClass;

        if (this.iconSize) {
            elm.classList.add(MegaInteractable.iconSizesClass[this.iconSize]);
        }
    }

    get iconSize() {
        return this.domNode.icon.s;
    }

    set iconSize(size) {

        if (!this.icon) {

            console.error('Icon not found');

            return;
        }

        const sizeClass = MegaInteractable.iconSizesClass[size];

        if (!sizeClass) {

            console.error(`Icon size is not valid, valid sizes are:
                ${Object.keys(MegaInteractable.iconSizesClass).toString()}`);

            return;
        }

        this.domNode.icon.s = size;

        const elm = this.domNode.querySelector('.left-icon');

        if (elm) {
            elm.classList.remove(MegaInteractable.iconSizesClass[this.domNode.icon.s]);
            elm.classList.add(sizeClass);
        }
    }

    get rightIcon() {
        return this.domNode.rightIcon && this.domNode.rightIcon.c;
    }

    set rightIcon(iconClass) {

        let elm = this.domNode.querySelector('.right-icon');

        if (!elm) {

            elm = document.createElement('i');

            this.domNode.appendChild(elm);
            this.domNode.rightIcon = {};
        }

        elm.className = `${iconClass} right-icon`;
        this.domNode.rightIcon.c = iconClass;

        if (this.rightIconSize) {
            elm.classList.add(MegaInteractable.iconSizesClass[this.rightIconSize]);
        }
    }

    get rightIconSize() {
        return this.domNode.rightIcon.s;
    }

    set rightIconSize(size) {

        if (!this.rightIcon) {

            console.error('Icon not found');

            return;
        }

        const sizeClass = MegaInteractable.iconSizesClass[size];

        if (!sizeClass) {

            console.error(`Icon size is not valid, valid sizes are:
                ${Object.keys(MegaInteractable.iconSizesClass).toString()}`);

            return;
        }

        if (this.domNode.rightIcon.s === size) {
            return;
        }

        const elm = this.domNode.querySelector('.right-icon');

        if (elm) {
            elm.classList.remove(MegaInteractable.iconSizesClass[this.domNode.rightIcon.s]);
            elm.classList.add(sizeClass);
        }

        this.domNode.rightIcon.s = size;
    }

    get rightBadge() {
        const elm = this.domNode.querySelector('.right-badge');
        if (!elm) {
            return false;
        }
        return {
            badgeClass: elm.className.replace('right-badge', '').replace('right-icon', '').trim(),
            text: elm.textContent
        };
    }

    set rightBadge(options) {
        let elm = this.domNode.querySelector('.right-badge');

        if (!elm) {
            elm = document.createElement('div');
            this.domNode.appendChild(elm);
        }

        const { text, badgeClass } = options;
        if (!text) {
            elm.remove();
            return;
        }
        elm.className = `${badgeClass} right-badge right-icon`;
        elm.textContent = text;
    }

    get text() {

        const elm = this.domNode.querySelector('.primary-text');

        return elm && elm.textContent;
    }

    set text(content) {

        let elm = this.domNode.querySelector('.primary-text');

        if (!elm) {

            const wrapper = document.createElement("div");

            wrapper.className = 'text-box-wrapper sk-elm';
            this.domNode.appendChild(wrapper);

            elm = document.createElement('span');
            elm.classList.add('primary-text');
            wrapper.appendChild(elm);
        }

        elm.textContent = content;
    }

    get subtext() {

        const elm = this.domNode.querySelector('.sub-text');

        return elm && elm.textContent;
    }

    set subtext(content) {

        // Subtext can only exist if there is primary text
        if (!this.text) {
            return;
        }

        const wrapper = this.domNode.querySelector('.text-box-wrapper');

        wrapper.classList.add('multi-text-box');

        let elm = wrapper.querySelector('.sub-text');

        /* Create a enclosing div if there is subtext */
        if (content) {

            if (!elm) {
                elm = document.createElement('span');
                elm.classList.add('sub-text');
                wrapper.appendChild(elm);
            }

            elm.textContent = content;
        }
        else if (elm) {
            elm.remove();
        }
    }

    get active() {
        return this.domNode.classList.contains('active');
    }

    set active(active) {
        if (active) {
            this.domNode.classList.add('active');
        }
        else {
            this.domNode.classList.remove('active');
        }
    }

    get dataset() {
        return this.domNode.dataset;
    }

    set dataset(data) {
        Object.assign(this.domNode.dataset, data);
    }
}

MegaInteractable.interactableTypes = Object.freeze({
    normal: 'normal',
    fullwidth: 'full-width',
    icon: 'icon-only',
    text: 'text-only'
});

MegaInteractable.iconSizesClass = Object.freeze({
    8: 'icon-size-8',
    16: 'icon-size-16',
    20: 'icon-size-20',
    22: 'icon-size-22',
    24: 'icon-size-24',
    28: 'icon-size-28',
    32: 'icon-size-32',
    48: 'icon-size-48',
    80: 'icon-size-80'
});
