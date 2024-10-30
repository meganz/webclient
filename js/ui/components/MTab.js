class MTab extends MComponent {
    /**
     * @param {String} label Main text inside the tab
     * @param {Function} clickFn Callback to trigger when tab is clicked
     */
    constructor(label, clickFn) {
        super();

        this.el.textContent = label;

        if (typeof clickFn === 'function') {
            this.attachEvent('click', clickFn);
        }
    }

    buildElement() {
        this.el = document.createElement('div');
        this.el.className = 'py-2 px-6 cursor-pointer';
    }
}
