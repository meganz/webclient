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
     * @param {boolean} [options.isCard=false] - If true, masks as card number.
     * @param {boolean} [options.isCvv=false] - If true, masks as CVV.
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
        this.maskType = options.isPassword ? 'password'
            : options.isCard    ? 'card'
                : options.isCvv     ? 'cvv'
                    : null;
        this._visible = false;

        this._originalValue = options.inputValue || '';  // Store the original value
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

        if (this.maskType === 'password') {
            this.strengthCheck = document.createElement('div');
            this.strengthCheck.className = 'read-only-help';
            this.strenghtText = document.createElement('span');
            this.strengthCheck.appendChild(this.strenghtText);
            this.strenghtIcon = document.createElement('i');
            this.strenghtIcon.className = 'sprite-pm-mono';
            this.strengthCheck.prepend(this.strenghtIcon);
            this.domNode.append(this.strengthCheck);
        }

        // Create Help Text if provided
        if (options.help && options.help.text) {
            this.helpText = document.createElement('div');
            this.helpText.className = 'read-only-help';
            if (options.help.className) {
                this.helpText.classList.add(options.help.className);
            }

            const textContainer = document.createElement('span');
            textContainer.textContent = options.help.text;
            this.helpText.appendChild(textContainer);
            const icon = document.createElement('i');
            icon.className = options.help.iconClass || 'sprite-pm-mono icon-help-circle-thin-outline';

            this.helpText.prepend(icon);
            this.domNode.append(this.helpText);
        }

        // Update the displayed value based on the initial settings
        this.updateValue();

        // Create Action Buttons if provided
        if (options.actions && options.actions.length > 0) {
            this.actions = options.actions;
            this.setActions(options.actions);
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
     * Updates display based on type and visibility.
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

        if (this.id === 'card-expiry') {
            if (MegaUtils.isCardExpired(this._originalValue)) {
                this.helpText.classList.remove('hidden');
            }
            else {
                this.helpText.classList.add('hidden');
            }
        }

        // Maskable types
        if (this.maskType) {
            // Password strength
            if (this.maskType === 'password') {
                if (typeof zxcvbn === 'undefined') {
                    M.require('zxcvbn_js').done(this.passwordStrength.bind(this));
                }
                else {
                    this.passwordStrength();
                }
            }

            // Visible state
            if (this._visible) {
                this.valueSpan.classList.remove('monospace-mask');
                if (this.maskType === 'password') {
                    const frag = mega.ui.pm.utils.colorizedPassword(this._originalValue);
                    this.valueSpan.appendChild(frag);
                    this.valueSpan.classList.add('password-colorized');
                }
                else if (this.maskType === 'card') {
                    const cleaned = this._originalValue.replace(/\s+/g, '');
                    const formatted = cleaned.match(/.{1,4}/g).join(' ');
                    this.valueSpan.textContent = formatted;
                }
                else {
                    this.valueSpan.textContent = this._originalValue;
                }
            }
            else {
                this.valueSpan.classList.add('monospace-mask');
                let masked;
                if (this.maskType === 'password') {
                    masked = '\u2022'.repeat(16);
                }
                else if (this.maskType === 'card') {
                    const digits = this._originalValue.replace(/\D/g, '');
                    const lastDigits = digits.slice(-4);
                    const maskGroup = '\u2022'.repeat(4);
                    const suffix = lastDigits ? ` ${lastDigits}` : '';
                    masked = `${maskGroup} ${maskGroup} ${maskGroup}${suffix}`;
                }
                else { // cvv
                    masked = '\u2022'.repeat(4);
                }
                this.valueSpan.textContent = masked;
            }
            return;
        }

        // Plain text
        this.valueSpan.textContent = this._originalValue;
    }

    /**
     * Updates the strength checker based on the value of the field
     * @returns {void}
     */
    passwordStrength() {
        const strength = MegaUtils.classifyPMPassword(this._originalValue);

        this.strenghtText.textContent = strength.string1;
        this.strengthCheck.className = `strength-checker ${strength.className}`;
        this.strenghtIcon.className = strength.icon;
    }

    setActions(actions) {
        let actionButtons = this.domNode.querySelector('.read-only-actions');

        if (!actionButtons) {
            actionButtons = document.createElement('div');
            actionButtons.className = 'read-only-actions';
            this.output.append(actionButtons);
        }

        actionButtons.textContent = '';

        for (const action of actions) {

            const options = {
                icon: action.icon,
                onClick: action.onClick.bind(this),
                type: 'icon',
                parentNode: actionButtons,
            };
            const button = new MegaButton(options);

            if (action.hint) {
                button.domNode.dataset.simpletip = action.hint;
                button.domNode.dataset.simpletipposition = 'top';
                button.domNode.dataset.simpletipoffset = '2';
                button.addClass('simpletip');
            }
        }
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
     * Sets the visibility of the value.
     * @param {boolean} isVisible - True to show the value, false to mask it.
     */
    set visible(isVisible) {
        this._visible = isVisible;
        this.updateValue();
    }

    /**
     * Gets the visibility state of the value.
     * @return {boolean} True if the value is visible, false if it is masked.
     */
    get visible() {
        return this._visible;
    }
}
