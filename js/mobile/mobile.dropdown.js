class MegaMobileDropdown extends MegaMobileComponent {
    constructor(options) {
        super(options);

        if (!this.domNode) {
            return;
        }

        const dpLabel = document.createElement(options.dpTag);
        dpLabel.textContent = options.dpTagText;
        dpLabel.htmlFor = options.elemName;

        const dpButton = document.createElement('select');
        dpButton.className = `dropdown-button ${options.classNames || ''}`;
        dpButton.name = options.elemName;
        dpButton.id = options.elemName;

        // default option
        this.optionNode = document.createElement('option');
        dpButton.appendChild(this.optionNode);

        this.setSelectedOption(options.dropdownItems[options.selected] || options.dropdownButtonText, options.selected);

        // To avoid some mixin shenanigans, we keep the domNodes but
        // don't make them visible
        if (options.invisible) {

            // Add a closure handler so we can trigger the dropdown manually
            this.on('dropdown', () => {
                this.buildDropdown(options);
                return false;
            });
        }
        else {
            this.domNode.append(dpLabel, dpButton);

            this.on('tap', () => {
                this.buildDropdown(options);
                return false;
            });
        }
    }

    buildDropdown(options) {
        options.dropdown = this;

        M.safeShowDialog('mobile-dropdown', () => {
            mega.ui.sheet.clear();

            if (this.items) {
                this.items.rerender();
            }
            else {
                if (typeof options.onSelected === 'function') {
                    this.on('selectItem', options.onSelected);
                }

                this.items = new MegaMobileDropdownItemList(options);
            }

            this.items.show();
        });
    }

    setSelectedOption(text, val = '') {
        this.optionNode.textContent = text;
        this.optionNode.value = val;
    }

    get selected() {
        return this.optionNode.value;
    }
}
