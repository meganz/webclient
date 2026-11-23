class MegaCheckbox extends MegaComponent {

    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add('flex', 'flex-row', 'items-center');

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

        this.passedOnClick = options.onClick || false;
        this.checkedIcon = options.checkedIcon || 'icon-check-thin-outline';
        this.partialIcon = options.partialIcon || 'icon-minus-regular-outline';

        this.checked = options.checked;

        this.on('click.checkbox', (ev) => {

            const passClick = () => {
                if (this.passedOnClick) {
                    this.passedOnClick(this.checked);
                }
            };

            if (ev.target === this.input) {
                ev.stopPropagation();
                this.onToggle();
                passClick();
                return;
            }
            this.checked = this.checkedPartially ? false : !this.checked;
            this.trigger('change');
            passClick();
            return false;
        });
    }

    get checked() {
        return this.input.checked;
    }

    set checked(checked) {
        this.input.checked = checked;
        this.input.checkedPartially = false;
        this.onToggle();
    }

    get checkedPartially() {
        return this.input.checkedPartially;
    }

    set checkedPartially(value) {
        this.input.checked = false;
        this.input.checkedPartially = value;
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
        checkboxWrapper.className = 'checkbox-wrapper';

        if (this.checked) {
            checkboxWrapper.classList.add(
                mega.ui.sprites.mono, this.checkedIcon, 'checkbox-on');
        }
        else if (this.checkedPartially) {
            checkboxWrapper.classList.add(
                mega.ui.sprites.mono, this.partialIcon);
        }

        this.trigger('toggle', this.checked);
    }
}
