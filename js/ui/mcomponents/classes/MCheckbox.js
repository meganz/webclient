class MCheckbox extends MComponent {
    /**
     * @constructor
     * @param {Object.<String, String|Boolean>} data An enclosing data object
     * @param {String} data.id Id for Input and Label
     * @param {String} data.name Input name
     * @param {String} data.label Label for the checkbox
     * @param {String} [data.classes] Additional classes to add
     * @param {Boolean} [data.checked] Whether checked or not on init
     * @param {Boolean} [data.passive] Whether checkbox should or shouldn't change state on click right away
     */
    constructor({
        label,
        id,
        name,
        checked,
        classes,
        disabled,
        passive
    }) {
        super();

        this.prepareInput(id, name, checked === true, passive === true);

        if (label) {
            this.label = label;
        }

        this.appendCss(classes);
        this.disabled = disabled === true;
    }

    get checked() {
        return this._checked;
    }

    /**
     * @param {Boolean} status Status to change to
     */
    set checked(status) {
        this._checked = status === true;

        const classes = ['checkboxOn', 'checkboxOff'];
        const toggle = (this._checked) ? classes : classes.reverse();

        this.checkDiv.classList.add(toggle[0]);
        this.checkDiv.classList.remove(toggle[1]);

        this.inputEl.checked = this._checked;
    }

    /**
     * @param {Boolean} status Whether the checkbox is available for interactions or not
     */
    set disabled(status) {
        if (status) {
            this.el.classList.add('opacity-50', 'pointer-events-none');
        }
        else {
            this.el.classList.remove('opacity-50', 'pointer-events-none');
        }
    }

    /**
     * @param {Function} fn Callback to fire when checkbox changes state
     */
    set onChange(fn) {
        this._onChange = fn;
    }

    /**
     * @param {String?} label Label to set
     */
    set label(label) {
        if (!label) {
            if (this.labelEl) {
                this.el.removeChild(this.labelEl);
            }

            return;
        }

        if (!this.labelEl) {
            this.labelEl = document.createElement('label');
            this.labelEl.className = 'radio-txt cursor-pointer pl-1 max-w-full';
            this.labelEl.htmlFor = this.inputEl.id;

            this.el.insertBefore(this.labelEl, this.inputEl.nextSibling);
        }

        this.labelEl.textContent = label;
    }

    buildElement() {
        this.el = document.createElement('div');
        this.el.className = 'key';

        this.checkDiv = document.createElement('div');
        this.checkDiv.className = 'checkdiv';

        this.inputEl = document.createElement('input');
        this.inputEl.type = 'checkbox';

        this.checkDiv.appendChild(this.inputEl);
        this.el.appendChild(this.checkDiv);
    }

    prepareInput(id, name, checked, passive) {
        if (id) {
            this.inputEl.id = id;
        }
        else {
            console.warn('Cannot use m-checkbox without an id...');
        }

        this.inputEl.name = name || id;
        this.checked = checked === true;

        if (passive) {
            this.attachEvent(
                'click',
                (evt) => {
                    evt.preventDefault();

                    if (this._onChange) {
                        this._onChange(!this.checked);
                    }
                },
                this.inputEl
            );
        }
        else {
            this.attachEvent(
                'change',
                (evt) => {

                    this.checked = evt.target.checked;

                    if (this._onChange) {
                        this._onChange(this.checked);
                    }
                },
                this.inputEl
            );
        }
    }
}
