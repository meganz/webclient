class MMenuSelectItem extends MComponent {
    /**
     * Creating the menu item
     * @param {Object.<String, any>} props Item Options
     * @param {String|function(): String|HTMLElement} props.label Main item text
     * @param {Function} props.selectFn Callback to trigger when the item is clicked
     * @param {Boolean} props.selected Whether to render the item as selected from the beginning or not
     * @param {String} props.leftIcon Icon on the left of the text
     * @param {String} props.rightIcon Icon on the right of the text
     * @param {String} props.additionalClasses Additional classes to add to the item along with global ones
     * @param {MMenuSelectItem} props.children Additional items to render when hovering above the item
     */
    constructor({
        label,
        selectFn,
        selected,
        selectable,
        leftIcon,
        rightIcon,
        additionalClasses,
        children
    }) {
        super();

        this.selectable = selectable === true;

        // This is a clickable item
        if (typeof selectFn === 'function') {
            this.el.classList.add('m-dropdown-item', 'border-radius-1');

            if (Array.isArray(additionalClasses) && additionalClasses.length) {
                this.el.classList.add(...additionalClasses);
            }

            this.attachEvent('click', (e) => {
                selectFn(this, e);
            });
        }
        else { // This is just a label
            this.el.classList.add('px-2');
            this.el.classList.add('m-dropdown-item-label');
        }

        const labelDiv = document.createElement('div');
        labelDiv.className = 'flex flex-1 text-ellipsis';

        if (label) {
            if (typeof label === 'function') {
                label = label();
            }

            if (label instanceof HTMLElement) {
                labelDiv.appendChild(label);
            }
            else if (typeof label === 'string') {
                labelDiv.textContent = label;
            }
        }

        this.el.append(labelDiv);

        if (leftIcon) {
            this.addLeftIcon(leftIcon);
        }

        if (rightIcon) {
            this.addRightIcon(leftIcon);
        }

        if (selected === true) {
            this.selectItem();
        }
        else if (this.selectable) {
            this.deselectItem();
        }

        if (Array.isArray(children) && children.length) {
            this.children = children;
            this.el.classList.add('contains-submenu', 'sprite-fm-mono-after', 'icon-arrow-right-after');
        }

        this.attachEvent('pointerenter', () => {
            const contextMenu = this.el.parentNode.parentNode;

            const items = contextMenu.querySelectorAll('a');

            for (let i = 0; i < items.length; i++) {
                const otherItem = items[i];

                if (
                    otherItem !== this.el
                    && otherItem.mComponent
                    && otherItem.mComponent.subMenu
                ) {
                    otherItem.mComponent.subMenu.hide();
                    otherItem.classList.remove('opened');
                    delete otherItem.mComponent.subMenu;
                    break;
                }
            }

            if (!Array.isArray(this.children) || !this.children.length || this.subMenu) {
                return;
            }

            const { x, y, right, bottom } = this.el.getBoundingClientRect();

            this.subMenu = new MMenuSelect();
            this.subMenu.parentItem = this;

            this.subMenu.options = children;
            this.subMenu.show(right + MContextMenu.offsetHoriz, y - 8, x - MContextMenu.offsetHoriz, bottom);
            this.el.classList.add('opened');
        });
    }

    buildElement() {
        this.el = document.createElement('a');
        this.el.setAttribute('class', 'flex flex-row items-center');
    }

    createCheck() {
        if (!this.checkEl) {
            this.checkEl = document.createElement('div');
            this.el.prepend(this.checkEl);
        }
    }

    removeCheck() {
        if (this.checkEl) {
            this.el.removeChild(this.checkEl);
            delete this.checkEl;
        }
    }

    selectItem() {
        this.createCheck();
        this.checkEl.className = 'radioOn';
    }

    deselectItem() {
        if (this.selectable) {
            this.createCheck();
            this.checkEl.className = 'radioOff';
        }
        else {
            this.removeCheck();
        }
    }

    addLeftIcon(icon) {
        const i = document.createElement('i');
        i.className = 'mr-4 ml-0 sprite-fm-mono icon-' + icon;

        this.el.prepend(i);
    }

    addRightIcon(icon) {
        const i = document.createElement('i');
        i.className = 'ml-3 mr-0 sprite-fm-mono icon-' + icon;

        this.el.appendChild(i);
    }

    remove() {
        this.disposeEvent('pointerenter');
        this.detachEl();
    }
}
