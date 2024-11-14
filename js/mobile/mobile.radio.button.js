class MegaMobileRadioButton extends MegaComponent {

    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add(`align-${options.radioAlign}`);

        let targetNode = this.domNode;
        const buttonAndLabelsNode = document.createElement('div');
        buttonAndLabelsNode.className = 'button-and-labels';
        targetNode.appendChild(buttonAndLabelsNode);

        targetNode = buttonAndLabelsNode;
        let subNode = document.createElement('div');
        subNode.className = 'radio-wrapper';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        this.input = subNode = document.createElement('input');
        subNode.type = 'radio';
        subNode.name = options.radioName;
        subNode.value = options.radioValue;
        subNode.id = `${options.radioName}-${options.radioValue}`;
        subNode.disabled = options.disabled;
        targetNode.appendChild(subNode);

        targetNode = buttonAndLabelsNode;
        subNode = document.createElement('div');
        subNode.className = 'label-wrapper';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        subNode = document.createElement('div');
        subNode.className = 'label-and-sublabel';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        subNode = document.createElement('label');
        subNode.className = 'radio-action';
        subNode.htmlFor = `${options.radioName}-${options.radioValue}`;
        subNode.textContent = options.labelTitle;
        targetNode.appendChild(subNode);

        if (options.subLabelTitle) {
            subNode = document.createElement('div');
            subNode.className = 'radio-sublabel';
            subNode.textContent = options.subLabelTitle;
            targetNode.appendChild(subNode);
        }

        if (options.disabled && options.disabledReason) {
            targetNode = this.domNode;
            subNode = document.createElement('div');
            subNode.className = 'disabled-reason';
            subNode.textContent = options.disabledReason;
            targetNode.appendChild(subNode);
        }

        this.group = options.group;
        this.checked = options.checked;
        this.disabled = options.disabled || false;

        if (this.disabled) {
            this.domNode.classList.add('disabled');
        }
        else {
            // Only listen to the events if the radio button is not disabled
            const _checkRadio = () => {
                this.checked = true;
            };

            this.on('tap.radioButton', _checkRadio);
            this.on('change.radioButton', _checkRadio);
        }
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

    get disabled() {
        return this.input ? this.input.disabled : false;
    }

    set disabled(disabled) {
        if (this.input) {
            this.input.disabled = disabled;
        }
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
