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
                        name: 'megaSecurityCodeInput'
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
                            // if (!this.validateForm(this.formType)) {
                            //     this.setLoading(false);
                            //     this.megaTitleInput.$input.focus();
                            //     return;
                            // }

                            if (this.formType === 'create') {
                                this.createCreditCardItem();
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
        this.outer.className = 'favicon manual-favicon-card';
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

        mega.ui.pm.overlay.show({
            name: 'new-credit-card-item-overlay',
            title: l.cc_title,
            contents: [this.domNode],
            showClose: true,
            confirmClose: () => this.discard(this.isFormChanged, this.formType)
        });

        // delay for the overlay transition to happen and set focus
        delay('credit-card-item-title-focus', () => {
            this.megaTitleInput.$input.focus();

            const infoIcon = '<i class="sprite-fm-mono icon-help-circle-thin-outline"></i>';
            this.megaExpirationDateInput.showInfoMessage(`${infoIcon} ${l.exp_date_hint}`);
            this.megaSecurityCodeInput.showInfoMessage(`${infoIcon} ${l.security_code_hint}`);
        });

        mega.ui.pm.overlay.on('close.overlay', () => this.clear());
        this.initialcurrentFormValues = this.currentFormValues;
    }

    get currentFormValues() {
        return {
            title: this.megaTitleInput.$input.val().trim(),
            u: this.megaCardHolderNameInput.$input.val().trim(),
            nu: this.megaCardNumberInput.$input.val(),
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

    async createCreditCardItem() {
        const {title, u, nu, exp, cvv, notes} = this.currentFormValues;
        const {pwmh} = mega;

        const n = {name: title, pwm: { t: 'c', nu, exp, u, cvv, n: notes}};
        const res = await mega.ui.pm.comm.createItem(n, title, pwmh);

        mega.ui.toast.show(l.item_created);
        mega.ui.pm.comm.saveLastSelected(res);
        mega.ui.pm.overlay.hide();
        this.clear();
    }

    clear() {
        super.clear();
        this.setLoading(false);
    }
}
