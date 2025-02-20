class MEmptyPad extends MComponent {
    buildElement() {
        this.el = document.createElement('div');
        this.el.className = 'fm-empty-pad text-center';
    }

    static createTxt(text, className) {
        const el = document.createElement('div');
        el.className = className;
        el.textContent = text;

        return el;
    }

    static createIcon(className) {
        const icon = document.createElement('i');
        icon.className = className;
        return icon;
    }

    static createOptionItem(text, iconClasses) {
        const el = document.createElement('div');
        el.className = 'fm-empty-options-item';

        el.appendChild(MEmptyPad.createIcon(iconClasses));
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
            options.appendChild(MEmptyPad.createOptionItem(text, icon));
        }

        this.el.appendChild(options);
    }

    remove() {
        this.el.parentNode.removeChild(this.el);
    }
}
