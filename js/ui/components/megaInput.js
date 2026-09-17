class MegaInputComponent extends MegaComponent {
    // @todo convert MegaInputs into this component style
    constructor(options) {
        super(options);

        this.input = document.createElement(options.type || 'input');
        this.input.className = options.className || 'form-element pmText no-title-top clearButton';
        this.input.title = options.title || '';

        if (options.title) {
            this.input.classList.remove('no-title-top');
            if (options.titleOptional) {
                this.input.classList.add('optional');
            }
        }

        if (options.icon) {
            this.icon = `${options.icon} left-icon`;
        }
        this.placeholder = options.placeholder || '';
        this.disabled = false;

        this.messageIcons = options.messageIcons || false;

        if (options.password) {
            this.password = true;
        }
        this.domNode.append(this.input);

        this.megaInput = new mega.ui.MegaInputs($(this.input));
        if (options.wrapperClasses) {
            this.megaInput.$wrapper.addClass(options.wrapperClasses);
        }

        if (options.copy) {
            this.copy = options.copy;
        }
        this.megaInput.$input.on('input', () => {
            this.trigger('input', this.megaInput.$input.val());
        });
        this.megaInput.$input.on('blur', () => {
            this.trigger('blur');
        });
    }

    set icon(iconClass) {
        this.input.dataset.icon = iconClass;
    }

    set copy(toastText) {
        this.copyToast = typeof toastText === 'string' ? toastText : l[371];
        if (this.copyIcon) {
            return;
        }

        this.copyIcon = document.createElement('i');
        this.copyIcon.className = 'sprite-fm-mono icon-copy-thin-outline action-icon copy-input-value';
        this.input.parentNode.append(this.copyIcon);
        this.copyIcon.addEventListener('click', (ev) => {
            ev.stopPropagation();
            copyToClipboard(this.value, this.copyToast);
        });
    }

    set placeholder(placeholder) {
        this.input.placeholder = placeholder;
    }

    get password() {
        return this.input.type === 'password';
    }

    set password(value) {
        this.input.type = value ? 'password' : 'text';
    }

    get disabled() {
        return this.input.disabled;
    }

    set disabled(disable) {
        this.input.disabled = disable;
    }

    get readOnly() {
        return this.input.readOnly;
    }

    set readOnly(readOnly) {
        this.input.readOnly = readOnly;
    }

    get value() {
        return this.megaInput.$input.val();
    }

    set value(value) {
        this.megaInput.setValue(value);
    }

    withStateIcon(icon, message) {
        if (!this.messageIcons || !message) {
            return message;
        }
        return `<i class="sprite-fm-mono ${icon} icon"></i><span>${message}</span>`;
    }

    hideMessage() {
        this.megaInput.$wrapper.removeClass('success warning');
        this.megaInput.hideMessage();
    }

    set error(errorMessage) {
        this.hideMessage();
        if (errorMessage) {
            this.megaInput.showError(this.withStateIcon(MegaInputComponent.messageIconMap.ERROR, errorMessage));
        }
    }

    set message(message) {
        this.hideMessage();
        if (message) {
            this.megaInput.showMessage(message);
        }
    }

    set success(message) {
        this.hideMessage();
        if (message) {
            this.megaInput.$wrapper.addClass('success');
            this.megaInput.showMessage(this.withStateIcon(MegaInputComponent.messageIconMap.SUCCESS, message));
        }
    }

    set warning(warningMessage) {
        this.hideMessage();
        if (warningMessage) {
            this.megaInput.$wrapper.addClass('warning');
            this.megaInput.showMessage(this.withStateIcon(MegaInputComponent.messageIconMap.WARN, warningMessage));
        }
    }

    blur() {
        this.input.blur();
    }

    focus() {
        this.input.focus();
    }
}

MegaInputComponent.messageIconMap = Object.freeze({
    ERROR: 'icon-alert-triangle-thin-outline',
    WARN: 'icon-alert-triangle-thin-outline',
    SUCCESS: 'icon-check-circle-thin-outline'
});
