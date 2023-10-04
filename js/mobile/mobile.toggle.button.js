class MegaMobileToggleButton extends MegaMobileComponent {

    constructor(options) {

        super(options);

        if (!this.domNode) {
            return;
        }

        const isProUserOption = options.isProUserOption || false;

        let targetNode = this.domNode;
        let subNode = document.createElement('div');
        subNode.className = 'toggle-label';
        subNode.textContent = options.label;
        targetNode.appendChild(subNode);

        targetNode = this.domNode;

        if (isProUserOption && !Object(u_attr).p) {
            this.proLabel = subNode = document.createElement('a');
            subNode.className = 'pro-label';
            subNode.href = 'https://mega.nz/pro';
            subNode.target = '_blank';
            subNode.textContent = l.mobile_pro_only_toggle;
            targetNode.appendChild(subNode);
        }
        else {
            this.toggle = subNode = document.createElement('div');
            subNode.className = 'toggle-wrapper sprite-fm-mono-after';
            targetNode.appendChild(subNode);

            targetNode = this.toggle;
            this.input = subNode = document.createElement('input');
            subNode.name = options.value;
            subNode.ariaChecked = options.checked;
            subNode.type = 'checkbox';
            subNode.role = options.role;
            subNode.id = options.id;
            subNode.disabled = options.disabled;
            targetNode.appendChild(subNode);

            this.checked = options.checked || false;
            this.disabled = options.disabled || false;

            const iconToShow = this.checked ? 'check' : 'minimise';
            this.toggle.classList.add(`icon-${iconToShow}-after`);

            if (this.checked) {
                this.domNode.classList.add('on');
            }
        }

        const _checkToggle = (event) => {
            // Only continue if the toggle button is tapped and it isn't disabled
            if (this.disabled || (event.data.srcElement !== this.toggle)) {
                return;
            }

            this.checked = !this.checked;
            this.input.ariaChecked = this.checked;

            this.domNode.classList.toggle('on');

            this.toggle.classList.toggle('icon-check-after');
            this.toggle.classList.toggle('icon-minimise-after');

            if (typeof options.onChange === 'function') {
                options.onChange.call(this);
            }
        };

        if (!this.proLabel) {
            this.on('tap.toggleButton', _checkToggle);
            this.on('change.toggleButton', _checkToggle);
        }
    }

    get checked() {
        return this.input ? this.input.checked : false;
    }

    set checked(checked) {
        if (this.input) {
            this.input.checked = checked;
        }
    }

    get value() {
        return this.input ? this.input.value : '';
    }

    set value(value) {
        if (this.input) {
            this.input.value = value;
        }
    }

    get disabled() {
        return this.input ? this.input.disabled : false;
    }

    set disabled(disabled) {
        if (this.input) {
            this.input.disabled = disabled;
        }
    }
}
