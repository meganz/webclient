class MMenuSelect extends MContextMenu {
    constructor(parent) {
        super(parent);
        this.el.classList.add('m-menu-select');
    }

    get options() {
        return this._options || [];
    }

    /**
     * @param {Object[]} list Options to work with
     * @param {String} list[].label - Label of the option
     * @param {Function} list[].click - A specific behaviour when option is clicked
     * @param {Boolean} list[].selected - Checking if the option is selected initially
     * @returns void
     */
    set options(list) {
        this.resetOptions();

        let section = null;

        for (let i = 0; i < list.length; i++) {
            const { label, click, selected } = list[i];

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

            const item = new MMenuSelectItem(
                label,
                typeof click === 'function' ? (item) => this.onItemSelect(i, item, click) : null,
                isSelected
            );

            this._options.push(item);

            if (isSelected) {
                this.selectedIndex = i;
            }

            section.append(item.el);
        }
    }

    resetOptions() {
        if (!Array.isArray(this._options) || !this._options.length) {
            this._options = [];
            return;
        }

        for (let i = 0; i < this._options.length; i++) {
            this._options[i].remove();
            delete this._options[i];
        }

        // Cleaning of any unnecessary section and hr elements
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }

        this._options = [];
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
        this.hide();

        if (typeof clickFn === 'function') {
            clickFn();
        }
    }

    selectItem(index) {
        if (index !== this.selectedIndex && this._options[index]) {
            this.onItemSelect(index, this._options[index]);
        }
    }
}

/**
 * @type {Number}
 */
MMenuSelect.selectedIndex = -1;
