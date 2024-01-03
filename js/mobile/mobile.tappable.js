class MegaMobileTappable extends MegaMobileComponent {

    constructor(options) {
        super(options);

        // Map of types to tappable classes
        const tappableTypes = {
            normal: 'normal',
            fullwidth: 'full-width',
            icon: 'icon-only',
        };

        // Cache the tapElement for future use
        this.domNode.classList.add(
            'nav-elem', tappableTypes[options.type] || 'normal');

        if (options.icon) {

            this.icon = options.icon;

            if (options.iconSize) {
                this.iconSize = options.iconSize;

                if (!this.iconSize) {
                    return;
                }
            }
        }

        if (options.text && options.type !== "icon") {

            this.text = options.text;

            if (options.subtext) {
                this.subtext = options.subtext;
            }
        }

        if (options.rightIcon && options.type === "fullwidth") {

            this.rightIcon = options.rightIcon;

            if (options.rightIconSize) {

                this.rightIconSize = options.rightIconSize;

                if (!this.rightIconSize) {
                    return;
                }
            }
        }

        // Disable and enable the tappable
        this.disabled = options.disabled;
        this.loading = false;

        if (options.loadSpinner) {
            this.on('click', e => {
                e.currentTarget.loading = !e.currentTarget.loading;
            });
        }
    }

    get disabled() {
        return this.domNode.classList.contains("disabled");
    }

    set disabled(value) {
        // Add/Remove the disabled style
        if (value) {
            this.domNode.classList.add("disabled");
        }
        else {
            this.domNode.classList.remove("disabled");
        }
    }

    get loading() {
        return !!this.domNode.querySelector('.loading');
    }

    set loading(stateBool) {
        stateBool |= 0;
        if (this.loading === stateBool) {
            return;
        }

        if (stateBool) {
            for (let i = 0; i < this.domNode.childNodes.length; i++) {
                this.domNode.childNodes[i].style.display = "none";
            }

            const loading_elem = document.createElement('i');
            loading_elem.className = 'notification-loading-spinner sprite-mobile-fm-mono icon-loader-thin-outline ' +
                'loading';
            this.domNode.appendChild(loading_elem);
        }
        else {
            let elem;
            for (let i = 0; i < this.domNode.childNodes.length; i++) {
                elem = this.domNode.childNodes[i];
                elem.removeAttribute('style');
                if (elem.classList.contains("loading")) {
                    elem.remove();
                }
            }

        }
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
            elm.classList.add(MegaMobileTappable.iconSizesClass[this.iconSize]);
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

        const sizeClass = MegaMobileTappable.iconSizesClass[size];

        if (!sizeClass) {

            console.error(`Icon size is not valid, valid sizes are:
                ${Object.keys(MegaMobileTappable.iconSizesClass).toString()}`);

            return;
        }

        this.domNode.icon.s = size;

        const elm = this.domNode.querySelector('.left-icon');

        if (elm) {
            elm.classList.remove(MegaMobileTappable.iconSizesClass[this.domNode.icon.s]);
            elm.classList.add(sizeClass);
        }
    }

    get rightIcon() {
        return this.domNode.rightIcon.c;
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
            elm.classList.add(MegaMobileTappable.iconSizesClass[this.rightIconSize]);
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

        const sizeClass = MegaMobileTappable.iconSizesClass[size];

        if (!sizeClass) {

            console.error(`Icon size is not valid, valid sizes are:
                ${Object.keys(MegaMobileTappable.iconSizesClass).toString()}`);

            return;
        }

        if (this.domNode.rightIcon.s === size) {
            return;
        }

        const elm = this.domNode.querySelector('.right-icon');

        if (elm) {
            elm.classList.remove(MegaMobileTappable.iconSizesClass[this.domNode.rightIcon.s]);
            elm.classList.add(sizeClass);
        }

        this.domNode.rightIcon.s = size;
    }

    get text() {

        const elm = this.domNode.querySelector('.primary-text');

        return elm && elm.textContent;
    }

    set text(content) {

        let elm = this.domNode.querySelector('.primary-text');

        if (!elm) {

            const wrapper = document.createElement("div");

            wrapper.className = 'text-box-wrapper';
            this.domNode.appendChild(wrapper);

            elm = document.createElement('span');
            elm.classList.add("primary-text");
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

        wrapper.classList.add("multi-text-box");

        let elm = wrapper.querySelector('.sub-text');

        /* Create a enclosing div if there is subtext */
        if (content) {

            if (!elm) {
                elm = document.createElement('span');
                elm.classList.add("sub-text");
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
}

MegaMobileTappable.iconSizesClass = Object.freeze({
    16: 'icon-size-16',
    20: 'icon-size-20',
    22: 'icon-size-22',
    24: 'icon-size-24',
    28: 'icon-size-28',
    32: 'icon-size-32',
    48: 'icon-size-48',
    80: 'icon-size-80'
});
