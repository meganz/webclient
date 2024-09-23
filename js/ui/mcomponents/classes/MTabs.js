class MTabs extends MComponent {
    buildElement() {
        this.el = document.createElement('div');
        this.el.className = 'm-tabs flex items-center justify-center';
    }

    /**
     * @param {Number} index Current index to set to active
     */
    set activeTab(index) {
        if (this._activeTab === index) {
            return;
        }

        this._activeTab = index;

        for (let i = 0; i < this._tabs.length; i++) {
            this._tabs[i].el.classList[i === index ? 'add' : 'remove']('active');
        }
    }

    /**
     * @param {Object[]} tabs Array of Tab objects to work with
     * @param {String} tabs[].label - Label of the option
     * @param {Function} tabs[].click - A specific behaviour when option is clicked
     */
    set tabs(tabs) {
        this.resetTabs();

        for (let i = 0; i < tabs.length; i++) {
            const { label, click } = tabs[i];

            const tab = new MTab(label, click);

            this._tabs.push(tab);
            this.el.appendChild(tab.el);
        }
    }

    resetTabs() {
        MComponent.resetSubElements(this, '_tabs');
    }
}
