class MegaForm extends MegaComponent {
    constructor(options) {
        super({...options, nodeType: 'form'});

        if (!this.domNode) {
            return;
        }

        this.domNode.classList.add('pm-form');
        this.targetNode = this.domNode;

        this.inputs = [];
        this.buttons = [];

        if (options.fieldsetOptions) {
            this.fieldset = document.createElement('fieldset');
            this.fieldset.className = options.fieldsetOptions.className || '';
            this.domNode.append(this.fieldset);

            this.targetNode = this.fieldset;
        }

        if (options.fields) {
            for (let i = 0; i < options.fields.length; i++) {
                const {nodeType} = options.fields[i];

                if (nodeType === 'input') {
                    this.addInput(options.fields[i]);
                }

                if (nodeType === 'textarea') {
                    this.addTextarea(options.fields[i]);
                }

                if (nodeType === 'button') {
                    this.addButton(options.fields[i]);
                }
            }
        }

        if (options.actions) {
            this.actionsNode = document.createElement('div');
            this.actionsNode.className = options.actions.className || 'form-actions';
            this.domNode.append(this.actionsNode);

            for (let i = options.actions.length; i--;) {
                options.actions[i].parentNode = this.actionsNode;
                this.addButton(options.actions[i]);
            }
        }

    }

    addInput(options) {
        const {nodeType, type, required, id, name, title, classNames, autocomplete} = options;
        const input = document.createElement(nodeType);
        input.type = type;
        input.className = classNames;

        if (autocomplete) {
            input.autocomplete = autocomplete;
        }

        if (required) {
            input.required = true;
        }

        if (id) {
            input.id = id;
        }

        if (name) {
            input.name = name;
        }

        if (title) {
            input.title = title;
        }

        this.targetNode.append(input);
        const megaInputOptions = options.megaInputOptions || {};

        if (megaInputOptions) {
            const {name, event, on} = megaInputOptions;
            this[name] = new mega.ui.MegaInputs($(input));

            if (typeof on === 'function') {
                this[name].$input.on(event, on);
            }

            this.inputs.push(this[name]);
        }
    }

    addTextarea(options) {
        const {nodeType, required, id, name, title, classNames} = options;
        const textarea = document.createElement(nodeType);
        textarea.id = id || '';
        textarea.name = name || '';
        textarea.className = classNames;
        textarea.title = title || '';

        if (required) {
            input.required = true;
        }

        this.targetNode.append(textarea);

        const megaInputOptions = options.megaInputOptions || {};

        if (megaInputOptions) {
            const {name, event, on} = megaInputOptions;
            this[name] = new mega.ui.MegaInputs($(textarea));

            if (typeof on === 'function') {
                this[name].$input.on(event, on);
            }

            this.inputs.push(this[name]);
        }
    }

    addButton(options) {
        const {text, classname, icon, type, typeAttr, onClick, parentNode} = options;

        const actionBtn = new MegaButton({
            parentNode : parentNode || this.domNode,
            text,
            componentClassname: classname,
            icon,
            type,
            typeAttr,
            onClick
        });

        this.buttons.push(actionBtn);
    }

    clear() {
        for (let i = this.inputs.length; i--;) {
            const input = this.inputs[i];
            if (input.$wrapper && input.$wrapper.hasClass('error')) {
                input.$input.megaInputsHideError();
            }
        }

        this.domNode.reset();
    }

    isLoading() {
        for (let i = this.buttons.length; i--;) {
            const btn = this.buttons[i];
            if (btn.hasClass('submit')) {
                return btn.loading;
            }
        }

        return false;
    }

    setLoading(val) {
        for (let i = this.buttons.length; i--;) {
            const btn = this.buttons[i];
            if (btn.hasClass('submit')) {
                btn.loading = val;
            }
        }

        if (this.fieldset) {
            this.fieldset.disabled = val;
        }
    }

    discard(isFormChanged) {
        return new Promise(resolve => {
            if (!isFormChanged) {
                resolve(true);
                return;
            }

            megaMsgDialog.render(
                l.discard_changes,
                l.discard_changes_msg,
                '',
                {
                    onInteraction: res => resolve(res)
                },
                {
                    buttons: [l.discard, l.schedule_discard_cancel]
                },
                false,
                true
            );
        });
    }
}
