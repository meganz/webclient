class MegaDropdown extends MegaInteractable {
    /**
     * Build dropdown menu with the given options
     * @param {*} options Options for the MegaDropdown
     * @example
     * options = {
     *  parentNode: this.passwordPanel,
     *  type: 'fullwidth',
     *  rightIcon: 'icon sprite-pm-mono icon-chevron-down-thin-outline',
     *  text: l.sort_by_title,
     *  prepend: true,
     *  listContainerClass: 'sort-password-list',
     *  componentClassname: 'name-sort',
     *  dropdownItems: dropdownItems,
     *  dropdownOptions: {
     *      titleText: 'title,
     *      search: true,
     *      placeholderText: 'Search',
     *  },
     *  selected: listSort,
     *  scrollTo: false,
     *  name: 'pwd-list-sorting',
     *  onSelected: Function
     * }
     * @returns {Boolean|void} Returns false if the same menu is open and closed on click.
     */
    constructor(options) {
        super(options);

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add('dropdown-button');

        const dpButton = document.createElement('select');
        dpButton.className = 'hidden-select';
        dpButton.name = options.name;
        dpButton.id = options.name;

        this.domNode.appendChild(dpButton);

        // default option
        this.optionNode = document.createElement('option');
        dpButton.appendChild(this.optionNode);

        this.dropdownItems = options.dropdownItems;
        this.selected = options.selected;

        this.rightIcon = 'icon sprite-pm-mono icon-chevron-down-thin-outline';
        this.rightIconSize = '20';

        options.optionsWrap = document.createElement('div');
        options.optionsWrap.classList.add('dropdown-options-wrap');
        this.domNode.appendChild(options.optionsWrap);

        options.dropdown = this;
        this.items = new MegaDropdownItemList(options);

        if (typeof options.onSelected === 'function') {
            this.on('selectItem', options.onSelected);
        }

        this.on('click', event => {
            if (this.toggleClass('active')) {
                this.rightIcon = 'icon sprite-pm-mono icon-chevron-up-thin-outline';
                this.items.rerender({...options, event});
            }
            else {
                this.items.dropdownMenu.hide();
                this.rightIcon = 'icon sprite-pm-mono icon-chevron-down-thin-outline';
            }
        });

        this.dropdownMenu.on('close.menu', () => {
            this.rightIcon = 'icon sprite-pm-mono icon-chevron-down-thin-outline';
            this.active = false;
        });

        document.body.addEventListener('click', event => {
            if (event.target === this.domNode || this.domNode.contains(event.target)) {
                return;
            }
            this.items.dropdownMenu.hide();
            this.items.dropdownMenu.trigger('close');
        }, true);
    }

    set selected(val) {
        if (this.dropdownItems[val]) {
            this.optionNode.textContent = this.dropdownItems[val];
            this.optionNode.value = val;
            this.optionNode.setAttribute('selected', true);
        }
    }

    get selected() {
        return this.optionNode.value;
    }
}
