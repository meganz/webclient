
class MTab extends MComponent {
    /**
     * @param {String} label Main text inside the tab
     * @param {Function} clickFn Callback to trigger when tab is clicked
     * @param {String} [classes] Classes to apply to the tab
     * @param {String} [activeClasses] Classes to apply when tab is active
     */
    constructor(label, clickFn, classes = 'py-2 px-6 cursor-pointer', activeClasses = '') {
        super();

        this.el.textContent = label;

        if (typeof clickFn === 'function') {
            this.attachEvent('click', clickFn);
        }

        if (classes) {
            this.el.className = classes;
        }

        this.activeClasses = activeClasses;
    }

    buildElement() {
        this.el = document.createElement('div');
    }
}
