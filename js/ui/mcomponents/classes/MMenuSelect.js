class MMenuSelect extends MContextMenu {
    /**
     * @param {HTMLElement|String?} parent Parent element to attach the menu to
     * @param {String[]} additionalItemClasses Additional classes to use for all items enclosed
     */
    constructor(parent, additionalItemClasses) {
        super(parent);

        this.el.classList.add('m-menu-select');
        this.additionalItemClasses = additionalItemClasses;
    }

    get options() {
        return this._options || [];
    }

    /**
     * @param {Object[]} list Options to work with
     * @param {String} list[].label Label of the option
     * @param {Function} list[].click A specific behaviour when option is clicked
     * @param {Boolean} list[].selected Checking if the option is selected initially
     * @param {Boolean} list[].icon Icon on the left for the item
     * @param {Boolean} list[].iconRight Icon on the right for the item
     * @param {String[]} list[].classes Additional classes for a single option
     * @param {MMenuSelectItem[]} list[].children Sub items in the context menu
     * @returns {void}
     */
    set options(list) {
        this.resetOptions();

        if (!this.el) {
            this.buildElement();
        }

        let section = null;

        for (let i = 0; i < list.length; i++) {
            const {
                label,
                click,
                selected,
                icon,
                iconRight,
                classes,
                children
            } = list[i];

            // Creating a new section here
            if (!i || typeof click !== 'function') {
                if (section) {
                    section.append(document.createElement('hr'));
                }

                section = document.createElement('div');
                section.setAttribute('class', 'dropdown-section');
                this.el.append(section);
            }

            const isSelected = selected === true;

            const itemClasses = [];

            if (this.additionalItemClasses) {
                itemClasses.push(...this.additionalItemClasses);
            }

            if (classes) {
                itemClasses.push(...classes);
            }

            const item = new MMenuSelectItem({
                label,
                selectFn: typeof click === 'function' ? (item) => this.onItemSelect(i, item, click) : null,
                selected: isSelected,
                leftIcon: icon,
                rightIcon: iconRight,
                additionalClasses: itemClasses,
                children
            });

            this._options.push(item);

            if (isSelected) {
                this.selectedIndex = i;
            }

            section.append(item.el);
        }
    }

    resetOptions() {
        MComponent.resetSubElements(this, '_options');
    }

    onItemSelect(index, item, clickFn) {
        if (index === this.selectedIndex) {
            return;
        }

        item.selectItem();

        for (let i = 0; i < this._options.length; i++) {
            if (item.el !== this._options[i].el) {
                this._options[i].deselectItem();
            }
        }

        this.selectedIndex = index;
        this.hide(true);

        if (typeof clickFn === 'function') {
            clickFn();
        }
    }

    selectItem(index) {
        if (index !== this.selectedIndex && this._options[index]) {
            this.onItemSelect(index, this._options[index]);
        }
    }

    hide(hideSiblings) {
        for (let i = 0; i < this._options.length; i++) {
            if (this._options[i].subMenu) {
                this._options[i].subMenu.hide();
            }
        }

        super.hide(hideSiblings);
    }
}

/**
 * @type {Number}
 */
MMenuSelect.selectedIndex = -1;
