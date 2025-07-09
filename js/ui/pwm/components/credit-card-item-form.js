class CreditCardItemForm extends MegaForm {
    constructor() {
        const options = {
            parentNode: mega.ui.pm.overlay.contentNode,
            componentClassname: 'credit-card-item-form',
            fields: [
                {
                    nodeType: 'input',
                    type: 'text',
                    required: true,
                    classNames: 'form-element pmText password-item-title clearButton trim',
                    title: l.title_label,
                    megaInputOptions: {
                        name: 'megaTitleInput',
                        event: 'input',
                        on: () => {
                            if (this.megaTitleInput.$wrapper.hasClass('error')) {
                                this.megaTitleInput.$input.megaInputsHideError();
                            }
                        }
                    }
                },
                {
                    nodeType: 'input',
                    type: 'text',
                    title: l.cardholder_name_label_optional,
                    classNames: 'form-element pmText clearButton trim optional',
                    autocomplete: 'cc-name',
                    megaInputOptions: {
                        name: 'megaCardHolderNameInput'
                    }
                },
                {
                    nodeType: 'input',
                    type: 'tel',
                    title: l.card_number_label,
                    required: true,
                    classNames: 'form-element pmText clearButton align-start',
                    autocomplete: 'cc-number',
                    megaInputOptions: {
                        name: 'megaCardNumberInput',
                        event: [
                            {
                                event: 'keyup',
                                on: ev => {
                                    if (/\D/.test(ev.key) && ev.key !== 'Backspace' && ev.key !== 'Delete'
                                        && ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Tab') {
                                        ev.preventDefault();
                                    }
                                }
                            },
                            {
                                event: 'input',
                                on: ({target}) => {
                                    let val = this.megaCardNumberInput.$input.val();
                                    const prevValue = val;
                                    const prevPos = this.megaCardNumberInput.$input[0].selectionStart;
                                    let nextPos = prevPos;

                                    val = target.value.replace(/\D/g, '');
                                    const groups = val.match(/\d{1,4}/g) || [];
                                    const formatVal = groups.join(' ');
                                    const digitsBeforeCaret = prevValue.slice(0, prevPos).replace(/\D/g, '').length;

                                    let count = 0;
                                    let caret = 0;
                                    for (const group of groups) {
                                        if (digitsBeforeCaret <= count + group.length) {
                                            caret += digitsBeforeCaret - count;
                                            break;
                                        }

                                        count += group.length;
                                        caret += group.length + 1;
                                    }

                                    nextPos = caret;

                                    this.megaCardNumberInput.$input.val(formatVal);
                                    this.megaCardNumberInput.$input[0].setSelectionRange(nextPos, nextPos);

                                    mega.ui.pm.utils.generateCardFavicon(
                                        this.megaCardNumberInput.$input.val(), this.outer);
                                }
                            }
                        ]
                    }
                },
                {
                    nodeType: 'input',
                    type: 'tel',
                    title: l.exp_date_label_optional,
                    classNames: 'form-element pmText optional clearButton align-start',
                    autocomplete: 'cc-exp',
                    placeholder: l.month_year_placeholder,
                    megaInputOptions: {
                        name: 'megaExpirationDateInput',
                        event:  [
                            {
                                event: 'keydown',
                                on: ev => {
                                    const input = ev.target;
                                    const val = input.value;
                                    const pos = input.selectionStart;

                                    if (/\D/.test(ev.key) && ev.key !== 'Backspace' && ev.key !== 'Delete'
                                        && ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Tab') {
                                        ev.preventDefault();
                                    }

                                    // Remove slash on backspace or delete
                                    if (ev.key === 'Backspace' || ev.key === 'Delete' && pos > 0) {
                                        if (val[pos - 1] === '/' || val[pos - 2] === '/') {
                                            ev.preventDefault();
                                            // Remove the slash and any spaces before it
                                            const before = val.slice(0, pos - 4);
                                            const after = val.slice(pos);
                                            const newVal = before + after;
                                            input.value = newVal;
                                            this.megaExpirationDateInput.$input.val(newVal);
                                            input.setSelectionRange(pos - 3, pos - 3);
                                        }

                                        if (val.length === 3) {
                                            ev.preventDefault();
                                            const before = val.slice(0, pos - 1);
                                            const after = val.slice(pos);
                                            const newVal = before + after;
                                            input.value = newVal;
                                            this.megaExpirationDateInput.$input.val(newVal);
                                            input.setSelectionRange(pos - 1, pos - 1);
                                        }
                                    }
                                }
                            },
                            {
                                event: 'input',
                                on: () => {
                                    let val = this.megaExpirationDateInput.$input.val();

                                    if (!/\d/.test(val)) {
                                        val = val.replace(/\D/g, ''); // Remove non-digit characters
                                    }

                                    if (val.length > 7) {
                                        val = val.slice(0, 7);
                                        this.megaExpirationDateInput.$input.val(val);
                                        return;
                                    }

                                    if (val.length === 2) {
                                        val = `${val} / `;
                                        this.megaExpirationDateInput.$input[0].setSelectionRange(5, 5);
                                    }

                                    this.megaExpirationDateInput.$input.val(val);
                                }
                            },
                            {
                                event: 'blur',
                                on: () => {
                                    this.validateExpirationDate();
                                }
                            }
                        ]
                    }
                },
                {
                    nodeType: 'input',
                    type: 'password',
                    title: l.security_code_label_optional,
                    classNames: 'form-element pmText clearButton trim optional align-start',
                    autocomplete: 'cc-csc',
                    megaInputOptions: {
                        name: 'megaSecurityCodeInput',
                        event: [
                            {
                                event: 'input',
                                on: ({target}) => {
                                    // Remove any non-digit characters
                                    target.value = target.value.replace(/\D/g, '');
                                },
                                options: {
                                    capture: true
                                }
                            }
                        ]
                    }
                },
                {
                    nodeType: 'textarea',
                    title: l.notes_label_optional,
                    classNames: 'form-element pmTextArea optional',
                    megaInputOptions: {
                        name: 'megaNotesInput'
                    }
                }
            ],
            actions: [
                {
                    text: l.msg_dlg_save,
                    classname: 'primary submit',
                    typeAttr: 'button',
                    onClick: () => {
                        if (!this.isLoading()) {
                            this.setLoading(true);

                            if (!navigator.onLine) {
                                this.setLoading(false);
                                megaMsgDialog.render(
                                    l.unable_to_save,
                                    l.check_connection,
                                    '',
                                    {
                                        onInteraction: () => {
                                            mega.ui.pm.overlay.hide();
                                        }
                                    },
                                    {
                                        icon: 'sprite-pm-mono icon-alert-triangle-thin-outline warning',
                                        buttons: [l.ok_button]
                                    },
                                    false,
                                    true
                                );

                                return;
                            }

                            if (!this.validateForm(this.formType)) {
                                this.setLoading(false);
                                return;
                            }

                            if (this.formType === 'create') {
                                this.createItem()
                                    .catch((ex) => {
                                        this.setLoading(false);
                                        tell(ex);
                                    });
                            }
                            else {
                                this.updateItem()
                                    .catch((ex) => {
                                        this.setLoading(false);
                                        tell(ex);
                                    });
                            }
                        }
                    }
                },
                {
                    text: l[82],
                    classname: 'secondary',
                    typeAttr: 'button',
                    onClick: async() => {
                        const res = await this.discard(this.isFormChanged, this.formType);

                        if (res) {
                            mega.ui.pm.overlay.hide();
                            this.clear();
                        }
                    }
                }
            ]
        };

        super(options);

        this.outer = document.createElement('div');
        this.outer.className = 'favicon manual-favicon';
        const span = document.createElement('span');
        const icon = document.createElement('i');
        icon.className = 'sprite-fm-mono icon-credit-card';
        span.append(icon);
        this.outer.append(span);
        this.megaTitleInput.$wrapper[0].appendChild(this.outer);
        this.megaTitleInput.$wrapper.addClass('has-favicon');
    }

    show(options) {
        if (!options.type || !mega.pm.validateUserStatus()) {
            return;
        }

        // check connection before proceeding
        if (!navigator.onLine) {
            megaMsgDialog.render(
                options.type === 'create' ? l.unable_to_add : l.unable_to_edit,
                l.check_connection,
                '',
                '',
                {
                    icon: 'sprite-pm-mono icon-alert-triangle-thin-outline warning',
                    buttons: [l.ok_button]
                },
                false,
                true
            );

            return;
        }

        super.show(options);

        this.formType = options.type;

        if (this.formType === 'update') {
            this.setValue(M.getNodeByHandle(mega.ui.pm.comm.getLastSelected()));
        }

        mega.ui.pm.overlay.show({
            name: 'new-credit-card-item-overlay',
            title: this.formType === 'create' ? l.cc_title : l.edit_credit_card,
            contents: [this.domNode],
            showClose: true,
            confirmClose: () => {
                let eventID = '500880';
                if (this.formType === 'update') {
                    eventID = '500881';
                }

                eventlog(eventID);

                return this.discard(this.isFormChanged, this.formType);
            }
        });

        // delay for the overlay transition to happen and set focus
        delay('credit-card-item-title-focus', () => {
            this.megaTitleInput.$input.focus();
            const infoIcon = '<i class="sprite-fm-mono icon-help-circle-thin-outline"></i>';
            if (!this.validateExpirationDate()) {
                this.megaExpirationDateInput.showInfoMessage(`${infoIcon} ${l.exp_date_hint}`);
            }
            this.megaSecurityCodeInput.showInfoMessage(`${infoIcon} ${l.security_code_hint}`);
        });

        mega.ui.pm.overlay.on('close.overlay', () => this.clear());
        this.initialcurrentFormValues = this.currentFormValues;
    }

    get currentFormValues() {
        return {
            title: this.megaTitleInput.$input.val().trim(),
            u: this.megaCardHolderNameInput.$input.val().trim(),
            nu: this.megaCardNumberInput.$input.val().replace(/\s/g, ''), // remove spaces
            exp: this.megaExpirationDateInput.$input.val().trim(),
            cvv: this.megaSecurityCodeInput.$input.val().trim(),
            notes: this.megaNotesInput.$input.val()
        };
    }

    get isFormChanged() {
        return Object.keys(this.initialcurrentFormValues).some(key => {
            return this.initialcurrentFormValues[key] !== this.currentFormValues[key];
        });
    }

    async createItem() {
        const {title, u, nu, exp, cvv, notes} = this.currentFormValues;
        const {pwmh} = mega;

        const n = {name: title, pwm: { t: 'c', nu, exp, u, cvv, n: notes}};
        const res = await mega.ui.pm.comm.createItem(n, title, pwmh);

        eventlog(500878);
        mega.ui.toast.show(l.item_created);
        mega.ui.pm.comm.saveLastSelected(res);
        mega.ui.pm.overlay.hide();
        this.clear();
    }

    async updateItem() {
        const {title, u, nu, exp, cvv, notes} = this.currentFormValues;
        const handle = mega.ui.pm.list.passwordItem.item.h;
        const n = { name: title, nu, exp, u, cvv, n: notes };

        const res = await mega.ui.pm.comm.updateItem(n, handle);

        if (res && typeof res === 'object' && res.result === 0) {
            mega.ui.toast.show(parseHTML(l.item_updated.replace('%1', title)));
        }

        eventlog(500879);
        mega.ui.pm.comm.saveLastSelected(handle);
        mega.ui.pm.overlay.hide();
        this.clear();
    }

    clear() {
        super.clear();
        this.setLoading(false);

        mega.ui.pm.utils.generateCardFavicon('', this.outer);

        // reset to password type
        if (this.megaSecurityCodeInput.$input.attr('type') === 'text') {
            $('.pass-visible', this.megaSecurityCodeInput.$wrapper).trigger('click.togglePassV');
        }
    }

    setValue(item) {
        let nu = item.pwm.nu.match(/\d{1,4}/g) || [];
        nu = nu.join(' ');

        this.megaTitleInput.setValue(item.name);
        this.megaCardHolderNameInput.setValue(item.pwm.u);
        this.megaCardNumberInput.setValue(nu);
        this.megaExpirationDateInput.setValue(item.pwm.exp);
        this.megaSecurityCodeInput.setValue(item.pwm.cvv);
        this.megaNotesInput.setValue(item.pwm.n);
    }

    validateForm(formType) {
        const alertIcon = '<i class="sprite-pm-mono icon-alert-triangle-thin-outline"></i>';
        const title = this.megaTitleInput.$input.val();
        const ccn = this.megaCardNumberInput.$input.val();
        const ccexp = this.megaExpirationDateInput.$input.val();
        let success = true;
        let firstInvalidInput = null;

        const showError = (input, message) => {
            input.megaInputsShowError(`${alertIcon} ${message}`);
            if (!firstInvalidInput) {
                firstInvalidInput = input;
            }
            success = false;
        };

        if (!title) {
            showError(this.megaTitleInput.$input, l.title_value);
        }

        if (!ccn) {
            showError(this.megaCardNumberInput.$input, l.card_number_missing);
        }

        if (title) {
            const [node] = mega.ui.pm.list.vaultPasswords.filter(item => item.name === title);

            // allows editing of the other fields w/ or w/o the title
            if (node && (formType === 'create' || node.h !== mega.ui.pm.list.passwordItem.item.h)) {
                showError(this.megaTitleInput.$input, l.title_exist.replace('%1', title));
            }
        }

        if (ccexp) {
            // Check if the expiration date is in the correct format MM / YYYY
            const expParts = ccexp.split('/');
            const month = parseInt(expParts[0].trim(), 10);
            if (expParts.length !== 2 || expParts[0].trim().length !== 2 || expParts[1].trim().length !== 2) {
                showError(this.megaExpirationDateInput.$input, l.four_digit_expiration_date);
            }
            else if (month < 1 || month > 12) {
                // Check if the month is valid
                showError(this.megaExpirationDateInput.$input, l.invalid_expiration_date);
            }
        }

        if (!success && firstInvalidInput) {
            firstInvalidInput.focus();
        }

        return success;
    }

    validateExpirationDate() {
        const val = this.megaExpirationDateInput.$input.val();
        if (MegaUtils.isCardExpired(val)) {
            const alertIcon =
            '<i class="sprite-pm-mono icon-alert-triangle-thin-outline"></i>';

            this.megaExpirationDateInput.showMessage(
                `${alertIcon} ${l.past_expiration_date}`);
            this.megaExpirationDateInput.$wrapper.addClass('warning');
            return true;
        }
    }
}
