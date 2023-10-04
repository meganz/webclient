class MegaMobileRadioButton extends MegaMobileComponent {

    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add(`align-${options.radioAlign}`);

        let targetNode = this.domNode;
        let subNode = document.createElement('div');
        subNode.className = 'radio-wrapper';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        this.input = subNode = document.createElement('input');
        subNode.type = 'radio';
        subNode.name = options.radioName;
        subNode.value = options.radioValue;
        subNode.id = `${options.radioName}-${options.radioValue}`;
        targetNode.appendChild(subNode);

        targetNode = this.domNode;
        subNode = document.createElement('label');
        subNode.className = 'radio-action';
        subNode.htmlFor = `${options.radioName}-${options.radioValue}`;
        subNode.textContent = options.labelTitle;
        targetNode.appendChild(subNode);

        this.group = options.group;
        this.checked = options.checked;

        const _checkRadio = () => {
            this.checked = true;
        };

        this.on('tap.radioButton', _checkRadio);
        this.on('change.radioButton', _checkRadio);
    }

    get checked() {
        return this.input.checked;
    }

    set checked(checked) {
        this.input.checked = checked;
        this.group.applyDomChange();
    }

    get value() {
        return this.input.value;
    }

    set value(value) {
        this.input.value = value;
    }

    toggleDom() {
        if (this.checked) {
            this.domNode.classList.add('on');
        }
        else {
            this.domNode.classList.remove('on');
        }
    }
}
