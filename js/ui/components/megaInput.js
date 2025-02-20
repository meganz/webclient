class MegaInputComponent extends MegaComponent {
    // @todo convert MegaInputs into this component style
    constructor(options) {
        super(options);

        this.input = document.createElement('input');
        this.input.className = 'form-element pmText no-title-top clearButton';
        this.icon = 'sprite-fm-mono icon-search-light-outline left-icon';
        this.placeholder = l[102];
        this.disabled = false;
        this.domNode.append(this.input);

        this.megaInput = new mega.ui.MegaInputs($(this.input));
        this.megaInput.$wrapper.addClass('search-bar');
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
}
