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
        const {nodeType, megaInputOptions = {}, ...rest} = options;
        const input = document.createElement(nodeType);
        input.className = rest.classNames || '';

        const propMap = ['type', 'id', 'name', 'title', 'placeholder', 'required', 'pattern', 'autocomplete'];

        for (const prop of propMap) {
            if (rest[prop] !== undefined) {
                input[prop] = rest[prop];
            }
        }

        this.targetNode.append(input);

        if (megaInputOptions) {
            let {name, event, on} = megaInputOptions;
            this[name] = new mega.ui.MegaInputs($(input));

            if (event) {
                event = typeof event === 'string' ? [{event, on}] : event;

                for (let i = event.length; i--;) {
                    const {event: type, on, options = {}} = event[i];

                    if (typeof on === 'function') {
                        const hasNativeOptions = options && (options.capture || options.once || options.passive);
                        if (hasNativeOptions) {
                            this[name].$input[0].addEventListener(type, on, options);
                        }
                        else {
                            this[name].$input.on(type, on);
                        }
                    }
                }
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
            const $wrapper = input.$wrapper;
            if ($wrapper) {
                if ($wrapper.hasClass('error')) {
                    input.$input.megaInputsHideError();
                }
                if ($wrapper.hasClass('warning')) {
                    input.$input.megaInputsHideMessage();
                    $wrapper.removeClass('warning');
                }
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

    discard(isFormChanged, formType, itemType) {
        return new Promise(resolve => {
            if (!isFormChanged) {
                resolve(true);
                return;
            }

            let title = l.discard_changes;
            let content = l.discard_changes_msg;
            const sheetClass = 'discard-dialog';

            if (formType === 'create') {
                title = l.add_item_discard_changes_title;
                content = l.add_item_discard_changes_msg;
            }

            const footerElements = mCreateElement('div', { class: 'flex flex-row-reverse' });

            MegaButton.factory({
                parentNode: footerElements,
                text: l.discard,
                componentClassname: 'slim font-600',
                type: 'normal'
            }).on('click', () => {
                resolve(true);
                mega.ui.sheet.removeClass(sheetClass);
                mega.ui.sheet.hide();

                if (itemType && itemType === 'cc') {
                    if (formType === 'create') {
                        eventlog(500882);
                    }
                    else {
                        eventlog(500883);
                    }
                }
            });

            MegaButton.factory({
                parentNode: footerElements,
                text: l.schedule_discard_cancel,
                componentClassname: 'slim font-600 mx-2 secondary',
                type: 'normal'
            }).on('click', () => {
                mega.ui.sheet.removeClass(sheetClass);
                mega.ui.sheet.hide();

                if (itemType && itemType === 'cc') {
                    if (formType === 'create') {
                        eventlog(500884);
                    }
                    else {
                        eventlog(500885);
                    }
                }
            });

            megaMsgDialog.render(
                title,
                content,
                '',
                {
                    onInteraction: res => {
                        resolve(res);
                        mega.ui.sheet.removeClass(sheetClass);
                    }
                },
                {
                    sheetType: 'normal',
                    footer: {
                        slot: [footerElements],
                        confirmButton: false
                    }
                },
                false,
                true
            );

            mega.ui.sheet.addClass(sheetClass);
        });
    }
}
