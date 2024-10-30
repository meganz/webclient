class MegaMobileInfoMenuItem extends MegaInteractable {

    constructor(options) {

        super(options);

        const targetNode = this.domNode;

        targetNode.classList.add('info-elem');

        if (options.tipIcon) {
            this.tipIcon = options.tipIcon;
        }

        if (options.dataValue) {
            this.dataValue = options.dataValue;
        }
    }

    get tipIcon() {
        return this.domNode.tipIcon.c;
    }

    set tipIcon(iconClass) {

        let elm = this.domNode.querySelector('.tip-icon');

        if (!elm) {

            elm = document.createElement('i');

            this.domNode.appendChild(elm);
            this.domNode.tipIcon = {};
        }

        elm.className = `${iconClass} tip-icon`;
        this.domNode.tipIcon.c = iconClass;

        if (this.iconSize) {
            elm.classList.add(MegaInteractable.iconSizesClass[this.iconSize]);
        }
    }

    get dataValue() {

        const elm = this.domNode.querySelector('.data-value');

        return elm && elm.textContent;
    }

    set dataValue(content) {

        let elm = this.domNode.querySelector('.data-value');

        if (!elm) {
            elm = document.createElement('div');
            elm.classList.add('data-value');
            this.domNode.appendChild(elm);
        }

        elm.textContent = content;
    }
}
