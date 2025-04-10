class MegaCheckboxGroup extends MegaComponentGroup {
    constructor(options) {
        super();

        this.multiCheckbox = options.multiCheckbox;
        this.statusNode = options.statusNode;
        this.onUpdate = options.onUpdate;

        for (let i = 0; i < options.checkboxes.length; i++) {
            this.addChild(i, options.checkboxes[i]);
        }

        this.multiCheckbox.on('change', () => {
            this.toggleAll(this.multiCheckbox.checked);
            if (this.onUpdate) {
                this.onUpdate();
            }
        });

        this.each(checkbox => {
            checkbox.on('change', () => {
                this.updateMultiCheckbox();
                if (this.onUpdate) {
                    this.onUpdate();
                }
            });
        });

        this.updateStatus();
    }

    toggleAll(state) {
        this.each(checkbox => {
            checkbox.checked = state;
        });

        this.updateStatus();
    }

    updateMultiCheckbox() {
        const checkedCount = this.filter(cb => cb.checked).length;
        const total = this.children.length;

        if (checkedCount > 0 && checkedCount < total) {
            this.multiCheckbox.checkedPartially = true;
        }
        else {
            this.multiCheckbox.checked = checkedCount === total;
        }

        this.updateStatus();
    }

    updateStatus() {
        if (this.statusNode) {
            const checkedCount = this.filter(cb => cb.checked).length;
            this.statusNode.textContent =
                mega.icu.format(l.import_selected_items_count, this.children.length)
                    .replace('%1', checkedCount);
        }
    }
}
