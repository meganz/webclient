class MEmptyPad extends MComponent {
    buildElement() {
        this.el = document.createElement('div');
        this.el.setAttribute('class', 'fm-empty-pad text-center');
    }

    static createTxt(text, className) {
        const el = document.createElement('div');
        el.setAttribute('class', className);
        el.textContent = text;

        return el;
    }

    static createIcon(className) {
        const icon = document.createElement('i');
        icon.setAttribute('class', className);

        return icon;
    }

    static createOptionItem(text, iconClasses) {
        const el = document.createElement('div');
        el.setAttribute('class', 'fm-empty-options-item');

        el.append(MEmptyPad.createIcon(iconClasses));
        el.append(text);

        return el;
    }

    /**
     * @param {[text: string, icon: string]} array Options array
     */
    appendOptions(array) {
        const options = document.createElement('div');
        options.setAttribute('class', 'fm-empty-options');

        for (let i = 0; i < array.length; i++) {
            const [text, icon] = array[i];
            options.append(MEmptyPad.createOptionItem(text, icon));
        }

        this.el.append(options);
    }

    remove() {
        this.el.parentNode.removeChild(this.el);
    }
}
