class MMenuSelectItem extends MComponent {
    constructor(label, selectFn, selected) {
        super();

        this.el.textContent = label;

        // This is a clickable item
        if (typeof selectFn === 'function') {
            this.el.classList.add('m-dropdown-item');
            this.el.classList.add('text-bold');
            this.click((e) => {
                selectFn(this, e);
            });
        }
        else { // This is just a label
            this.el.classList.add('m-px-sm');
            this.el.classList.add('m-dropdown-item-label');
        }

        if (selected) {
            this.selectItem();
        }
    }

    buildElement() {
        this.el = document.createElement('a');
        this.el.setAttribute('class', 'flex-row flex-justify-between');
    }

    selectItem() {
        this.checkEl = document.createElement('i');
        this.checkEl.setAttribute('class', 'sprite-fm-uni icon-check-circle');

        this.el.append(this.checkEl);
    }

    removeCheck() {
        if (this.checkEl) {
            this.el.removeChild(this.checkEl);
            delete this.checkEl;
        }
    }

    deselectItem() {
        this.removeCheck();
    }

    remove() {
        this.removeCheck();
        this.detach();
    }
}
