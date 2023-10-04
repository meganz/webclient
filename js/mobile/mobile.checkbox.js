class MegaMobileCheckbox extends MegaMobileComponent {

    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add(`align-${options.checkboxAlign}`);

        let targetNode = this.domNode;
        let subNode = document.createElement('div');
        subNode.className = 'checkbox-wrapper';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        this.input = subNode = document.createElement('input');
        subNode.type = 'checkbox';
        subNode.name = options.checkboxName;
        subNode.id = options.checkboxName;
        targetNode.appendChild(subNode);

        targetNode = this.domNode;
        subNode = document.createElement('label');
        subNode.className = 'checkbox-action';
        subNode.htmlFor = options.checkboxName;
        subNode.textContent = options.labelTitle;
        targetNode.appendChild(subNode);

        this.checked = options.checked;

        this.on('click.checkbox', () => {
            this.checked = !this.checked;
            return false;
        });
    }

    get checked() {
        return this.input.checked;
    }

    set checked(checked) {
        this.input.checked = checked;
        this.onToggle();
    }

    get checkboxName() {
        return this.input.name;
    }

    set checkboxName(name) {
        this.input.name = name;
    }

    get labelTitle() {
        const label = this.domNode.querySelector('label');
        return label && label.textContent || '';
    }

    set labelTitle(name) {
        const label = this.domNode.querySelector('label');
        if (label) {
            label.textContent = name;
        }
    }

    onToggle() {
        const checkboxWrapper = this.domNode.querySelector('.checkbox-wrapper');
        const checkedClassList = ['sprite-mobile-fm-mono', 'icon-check-thin-outline'];
        if (this.checked) {
            checkboxWrapper.classList.add(...checkedClassList);
        }
        else {
            checkboxWrapper.classList.remove(...checkedClassList);
        }
    }
}
