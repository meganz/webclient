/**
 * Represents a read-only field component.
 * @class
 * @extends MegaComponent
 */
class MegaReadOnlyField extends MegaComponent {
    /**
     * Creates an instance of MegaReadOnlyField.
     * @param {Object} options - Configuration options for the read-only field.
     * @param {string} [options.label=''] - The label text for the field.
     * @param {string} [options.id=''] - The id for the input
     * @param {string} [options.inputValue=''] - The value to display in the field.
     * @param {boolean} [options.isLink=false] - If true, the value will be displayed as a hyperlink.
     * @param {string} [options.helpText=''] - Additional help text displayed below the field.
     * @param {Array<Object>} [options.actions=[]] - An array of action buttons to display.
     * @param {string} options.actions.icon - The CSS class for the action button icon.
     * @param {Function} options.actions.onClick - The click event handler for the action button.
     * @param {string} [options.actions.hint] - The text to show on hover of the action
     * @param {boolean} [options.grouped=false] - If true, the field will be grouped with a divider.
     * @param {boolean} [options.isPassword=false] - If true, the value will be masked as a password.
     * @param {Function} [options.onClick=null] - If provided, this function will be called when the field is clicked.
     *
     * @example
     * const readOnlyField = new MegaReadOnlyField({
     *     parentNode: detailForm,
     *     id: 'password'
     *     label: 'Password',
     *     inputValue: 'mySecretPassword',
     *     isLink: false,
     *     isPassword: true,
     *     actions: [
     *         {
     *             icon: 'icon-eye',
     *             onClick: (field) => { field.isPasswordVisible = !field.isPasswordVisible; }
     *         }
     *     ],
     *     grouped: true,
     *     onClick: () => { console.log('Field clicked'); }
     * });
     */
    constructor(options) {
        super(options);
        this.domNode.classList.add('read-only-field');
        this.isLink = options.isLink || false;
        this.isPassword = options.isPassword || false;
        this._originalValue = options.inputValue || '';  // Store the original value
        this._isPasswordVisible = false;  // Track whether the password is visible
        this.id = options.id;

        // Create Label
        this.label = document.createElement('label');
        this.label.className = 'read-only-label';
        this.label.textContent = options.label || '';
        this.label.htmlFor = this.id;
        this.domNode.append(this.label);

        // Create Input
        this.output = document.createElement('output');
        this.output.className = 'read-only-output';
        this.output.id = options.id;

        if (this.isLink) {
            this.linkText = document.createElement('a');
            this.linkText.target = '_blank';
            this.output.appendChild(this.linkText);
        }
        else {
            this.valueSpan = document.createElement('span');
            this.valueSpan.className = 'read-only-value';
            this.output.append(this.valueSpan);
        }
        this.domNode.append(this.output);

        if (this.isPassword) {
            this.strengthCheck = document.createElement('div');
            this.strengthCheck.className = 'read-only-help';
            this.strenghtText = document.createElement('span');
            this.strenghtText.textContent = 'test';
            this.strengthCheck.appendChild(this.strenghtText);
            this.strenghtIcon = document.createElement('i');
            this.strenghtIcon.className = 'sprite-pm-mono';
            this.strengthCheck.prepend(this.strenghtIcon);
            this.domNode.append(this.strengthCheck);
        }

        // Update the displayed value based on the initial settings
        this.updateValue();

        // Create Help Text if provided
        if (options.helpText) {
            this.helpText = document.createElement('div');
            this.helpText.className = 'read-only-help';
            const textContainer = document.createElement('span');
            textContainer.textContent = options.helpText;
            this.helpText.appendChild(textContainer);
            const icon = document.createElement('i');
            icon.className = 'sprite-pm-mono icon-help-circle-thin-outline';
            this.helpText.prepend(icon);
            this.domNode.append(this.helpText);
        }

        // Create Action Buttons if provided
        if (options.actions && options.actions.length > 0) {
            const actionButtons = document.createElement('div');
            actionButtons.className = 'read-only-actions';
            this.output.append(actionButtons);

            for (const action of options.actions) {
                const button = document.createElement('i');
                button.className = action.icon;
                button.addEventListener('click', (event) => {
                    event.stopPropagation();  // Prevent the event from bubbling up
                    action.onClick(event, this);
                });
                if (action.hint) {
                    button.dataset.simpletip = action.hint;
                    button.dataset.simpletipposition = 'top';
                    button.dataset.simpletipoffset = '2';
                    button.classList.add('simpletip');
                }
                actionButtons.append(button);
            }
        }

        // Handle Grouping if applicable
        if (options.grouped) {
            this.domNode.classList.add('grouped');
            const divider = document.createElement('span');
            divider.className = 'divider';
            this.domNode.append(divider);
        }

        // Attach onClick handler if provided
        if (options.onClick && typeof options.onClick === 'function') {
            this.on('click', options.onClick);
        }
    }

    /**
     * Updates the displayed value based on whether it's a password and its visibility state.
     * @returns {void}
     */
    updateValue() {
        if (this.isLink) {
            this.linkText.textContent = this._originalValue;
            let url = this._originalValue;
            if (url !== '') {
                const matches =
                    /^(https?:\/{2})?(?:[\w#%+.:=@~-]{2,256}\.[a-z]{2,6}|(?:\d{1,3}.?){4})\b[\w#%&+./:=?@~-]*$/
                        .exec(url);
                if (matches && typeof matches[1] === 'undefined') {
                    url = `https://${url}`;
                }
            }
            this.linkText.href = url;
            return;
        }

        this.valueSpan.textContent = '';

        if (this.isPassword) {
            if (typeof zxcvbn === 'undefined') {
                M.require('zxcvbn_js').done(this.passwordStrength.bind(this));
            }
            else {
                this.passwordStrength();
            }

            if (this._isPasswordVisible) {
                const fragment = colorizedPassword(this._originalValue);
                this.valueSpan.appendChild(fragment);
                this.valueSpan.classList.add('password-colorized');
                return;
            }
        }

        this.valueSpan.classList.remove('password-colorized');
        this.valueSpan.textContent = this.isPassword && !this._isPasswordVisible ?
            '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' :
            this._originalValue;
    }

    /**
     * Updates the strength checker based on the value of the field
     * @returns {void}
     */
    passwordStrength() {
        const strength = classifyPMPassword(this._originalValue);

        this.strenghtText.textContent = strength.string1;
        this.strengthCheck.className = `strength-checker ${strength.className}`;
        this.strenghtIcon.className = strength.icon;
    }

    /**
     * Sets the value of the read-only field.
     * @param {string} value - The value to display in the field.
     */
    set inputValue(value) {
        this._originalValue = value;  // Store the original value
        this.updateValue();  // Update the DOM with the correct display value
    }

    /**
     * Gets the value of the read-only field.
     * @return {string} The current value of the field.
     */
    get inputValue() {
        return this._originalValue;
    }

    /**
     * Sets the visibility of the password.
     * @param {boolean} isVisible - True to show the password, false to mask it.
     */
    set isPasswordVisible(isVisible) {
        this._isPasswordVisible = isVisible;
        this.updateValue();
    }

    /**
     * Gets the visibility state of the password.
     * @return {boolean} True if the password is visible, false if it is masked.
     */
    get isPasswordVisible() {
        return this._isPasswordVisible;
    }
}
