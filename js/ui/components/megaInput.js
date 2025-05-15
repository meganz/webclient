class MegaInputComponent extends MegaComponent {
    // @todo convert MegaInputs into this component style
    constructor(options) {
        super(options);

        this.input = document.createElement('input');
        this.input.className = 'form-element pmText no-title-top clearButton';
        this.icon = `${options.icon || ''} left-icon`;
        this.placeholder = options.placeholder || '';
        this.disabled = false;
        this.domNode.append(this.input);

        this.megaInput = new mega.ui.MegaInputs($(this.input));
        if (options.wrapperClasses) {
            this.megaInput.$wrapper.addClass(options.wrapperClasses);
        }
        this.megaInput.$input.on('input', () => {
            this.trigger('input', this.megaInput.$input.val());
        });
    }

    set icon(iconClass) {
        this.input.dataset.icon = iconClass;
    }

    set placeholder(placeholder) {
        this.input.placeholder = placeholder;
    }

    get disabled() {
        return this.input.disabled;
    }

    set disabled(disable) {
        this.input.disabled = disable;
    }

    get value() {
        return this.megaInput.$input.val();
    }

    set value(value) {
        this.megaInput.setValue(value);
    }

    set error(errorMessage) {
        if (errorMessage) {
            this.megaInput.showError(errorMessage);
            return;
        }
        this.megaInput.hideError();
    }

    blur() {
        this.input.blur();
    }

    focus() {
        this.input.focus();
    }
}
