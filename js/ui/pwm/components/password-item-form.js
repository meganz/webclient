class PasswordItemForm extends MegaForm {
    constructor() {
        const options = {
            parentNode: mega.ui.pm.overlay.contentNode,
            componentClassname: 'password-item-form',
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

                            mega.ui.pm.utils.generateFavicon(this.megaTitleInput.$input.val(),
                                                             this.megaWebsiteInput.$input.val(), this.outer);
                        }
                    }
                },
                {
                    nodeType: 'input',
                    type: 'text',
                    title: l.username_label_optional,
                    classNames: 'form-element pmText clearButton trim optional',
                    megaInputOptions: {
                        name: 'megaUnameInput'
                    }
                },
                {
                    nodeType: 'input',
                    type: 'password',
                    title: l[909],
                    required: true,
                    classNames: 'form-element pmText strengthChecker clearButton password',
                    megaInputOptions: {
                        name: 'megaPwdInput'
                    }
                },
                {
                    nodeType: 'input',
                    type: 'text',
                    title: l.otp_label_optional,
                    classNames: 'form-element pmText clearButton trim optional',
                    megaInputOptions: {
                        name: 'megaTOTPInput',
                        event: 'blur',
                        on: () => {
                            const otp = this.megaTOTPInput.$input.val().replace(/\s+/g, '');
                            this.megaTOTPInput.setValue(otp);
                            if (otp && !mega.pm.otp.base32ToUint8Array(otp)) {
                                const alertIcon = '<i class="sprite-pm-mono icon-alert-triangle-thin-outline"></i>';
                                this.megaTOTPInput.$input.megaInputsShowError(`${alertIcon} ${l.otp_key_error}`);
                            }
                        }
                    }
                },
                {
                    nodeType: 'button',
                    type: 'icon',
                    classname: 'generate-password text-icon secondary',
                    icon: 'sprite-fm-mono icon-refresh-01-thin-outline',
                    typeAttr: 'button',
                    onClick: () => {
                        mega.ui.passwordGenerator.show();
                        eventlog(500551);
                        return false;
                    }
                },
                {
                    nodeType: 'input',
                    type: 'text',
                    title: l.website_label_optional,
                    classNames: 'form-element pmText clearButton trim optional',
                    megaInputOptions: {
                        name: 'megaWebsiteInput',
                        event: 'blur',
                        on: () => {
                            mega.ui.pm.utils.generateFavicon(this.megaTitleInput.$input.val(),
                                                             this.megaWebsiteInput.$input.val(), this.outer);
                        }
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
        this.outer.append(span);
        this.megaTitleInput.$wrapper[0].appendChild(this.outer);
        this.megaTitleInput.$wrapper.addClass('has-favicon');

        this.megaPwdInput.$wrapper[0].appendChild(this.domNode.querySelector('.generate-password'));
        this.megaPwdInput.$wrapper.addClass('has-favicon');
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

        if (mega.ui.pm.overlay.visible) {
            this.clear();
        }

        super.show(options);

        this.formType = options.type;

        if (this.formType === 'update') {
            this.setValue(M.getNodeByHandle(mega.ui.pm.comm.getLastSelected()));
        }

        mega.ui.pm.overlay.show({
            name: 'new-password-item-overlay',
            title: this.formType === 'create' ? l.add_item : l.edit_password,
            contents: [this.domNode],
            showClose: true,
            confirmClose: () => this.discard(this.isFormChanged, this.formType)
        });

        // delay for the overlay transition to happen and set focus
        delay('password-item-title-focus', () => {
            if (!options.disableAutoFocus) {
                this.megaTitleInput.$input.focus();
            }

            const infoIcon = '<i class="sprite-fm-mono icon-help-circle-thin-outline"></i>';
            this.megaTOTPInput.showInfoMessage(`${infoIcon} ${l.otp_field_instructions}`);

            const wrapper = this.megaTOTPInput.$wrapper[0];
            const link = wrapper.querySelector('div.message-container.mega-banner a');
            if (link) {
                link.addEventListener('click', () => {
                    const prompt = document.createElement('p');
                    prompt.append(l.otp_tutorial_prompt);
                    prompt.append(document.createElement('br'));
                    prompt.append(parseHTML(l.otp_learn_more));
                    this.showInfoSheet({
                        name: 'totp-info',
                        title: l.otp_info_title,
                        contents: [
                            l.otp_info_description,
                            prompt
                        ],
                        actions: [
                            {
                                type: 'normal',
                                text: l.ok_button,
                                className: 'primary',
                                onClick: () => mega.ui.sheet.hide()
                            },
                            {
                                type: 'normal',
                                text: l.otp_start_tutorial,
                                className: 'secondary',
                                onClick: () => {
                                    mega.ui.sheet.hide();
                                    const tutorialOTP = new TutorialOTP();
                                    tutorialOTP.start();
                                }
                            }
                        ]
                    });
                });
            }
        });
        mega.ui.pm.overlay.on('close.overlay', () => this.clear());

        this.initialcurrentFormValues = this.currentFormValues;
    }

    get currentFormValues() {
        return {
            title: this.megaTitleInput.$input.val().trim(),
            uname: this.megaUnameInput.$input.val().trim(),
            pwd: this.megaPwdInput.$input.val(),
            url: this.megaWebsiteInput.$input.val().trim(),
            notes: this.megaNotesInput.$input.val(),
            totp: this.megaTOTPInput.$input.val().replace(/\s+/g, '')
        };
    }

    get isFormChanged() {
        return Object.keys(this.initialcurrentFormValues).some(key => {
            return this.initialcurrentFormValues[key] !== this.currentFormValues[key];
        });
    }

    async createItem() {
        const {title, uname, pwd, url, notes, totp} = this.currentFormValues;
        const pwmh = mega.pwmh;

        const n = {
            name: title,
            pwm: {
                pwd,
                u: uname,
                n: notes,
                url,
                totp: totp ? {shse: totp, nd: '6', t: '30', alg: 'sha1'} : undefined
            }
        };

        const res = await mega.ui.pm.comm.createItem(n, title, pwmh);

        mega.ui.toast.show(l.item_created);
        mega.ui.pm.comm.saveLastSelected(res);
        mega.ui.pm.overlay.hide();
        this.clear();
    }

    async updateItem() {
        const {title, uname, pwd, url, notes, totp} = this.currentFormValues;
        const handle = mega.ui.pm.list.passwordItem.item.h;
        const node = M.getNodeByHandle(handle);
        const totpObj = {...(node.pwm && node.pwm.totp ? node.pwm.totp : {})};
        const n = {
            name: title,
            pwd,
            u: uname,
            n: notes,
            url,
            totp: totp ?
                {shse: totp, nd: totpObj.nd || '6', t: totpObj.t || '30', alg: totpObj.alg || 'sha1'}
                : undefined
        };

        const res = await mega.ui.pm.comm.updateItem(n, handle);

        if (res && typeof res === 'object' && res.result === 0) {
            mega.ui.toast.show(parseHTML(l.item_updated.replace('%1', title)));
        }

        mega.ui.pm.comm.saveLastSelected(handle);
        mega.ui.pm.overlay.hide();
        this.clear();
    }

    clear() {
        super.clear();
        this.setLoading(false);

        // reset to password type
        if (this.megaPwdInput.$input.attr('type') === 'text') {
            $('.pass-visible', this.megaPwdInput.$wrapper).trigger('click.togglePassV');
        }

        // trigger input to remove the strength checker message
        this.megaPwdInput.$input.trigger('input');

        mega.ui.pm.utils.generateFavicon('', '', this.outer);
    }

    setValue(pwdItem) {
        this.megaWebsiteInput.setValue(pwdItem.pwm.url);
        this.megaTitleInput.setValue(pwdItem.name);
        this.megaUnameInput.setValue(pwdItem.pwm.u);
        this.megaNotesInput.setValue(pwdItem.pwm.n);
        if (pwdItem.pwm.totp) {
            this.megaTOTPInput.setValue(pwdItem.pwm.totp.shse);
        }

        this.setPass(pwdItem.pwm.pwd);
    }

    setPass(val) {
        this.megaPwdInput.setValue(val);
    }

    validateForm(formType) {
        const alertIcon = '<i class="sprite-pm-mono icon-alert-triangle-thin-outline"></i>';
        const title = this.megaTitleInput.$input.val();
        const url = this.megaWebsiteInput.$input.val();
        const pwd = this.megaPwdInput.$input.val();
        const otp = this.megaTOTPInput.$input.val();
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

        if (!pwd) {
            showError(this.megaPwdInput.$input, l.err_no_pass);
        }

        if (url && !mega.ui.pm.utils.isURL(url)) {
            showError(this.megaWebsiteInput.$input, l.url_value);
        }

        if (otp && !mega.pm.otp.base32ToUint8Array(otp)) {
            showError(this.megaTOTPInput.$input, l.otp_key_error);
        }

        if (title) {
            const [node] = mega.ui.pm.list.vaultPasswords.filter(item => item.name === title);

            // allows editing of the other fields w/ or w/o the title
            if (node && (formType === 'create' || node.h !== mega.ui.pm.list.passwordItem.item.h)) {
                showError(this.megaTitleInput.$input, l.title_exist.replace('%1', title));
            }
        }

        if (!success && firstInvalidInput) {
            firstInvalidInput.focus();
        }

        return success;
    }

    showInfoSheet({ name, title, contents = [], actions = [] }) {
        const targetNode = document.createElement('div');

        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            if (typeof content === 'string') {
                mCreateElement('p', {}, targetNode).textContent = content;
            }
            else if (typeof content === 'object') {
                targetNode.appendChild(content);
            }
        }

        const footerElements = [
            mCreateElement('div', { class: 'flex flex-row' }),
            mCreateElement('div', { class: 'flex flex-row-reverse' })
        ];

        const buttons = actions.length > 0 ? actions : [{
            type: 'normal',
            text: l.ok_button,
            onClick: () => mega.ui.sheet.hide()
        }];

        for (let i = 0; i < buttons.length; i++) {
            const action = buttons[i];

            const className = [
                'font-600',
                'slim',
                i !== 0 && 'mx-2',
                action.className
            ].filter(Boolean).join(' ');

            MegaButton.factory({
                parentNode: footerElements[1],
                type: action.type || 'normal',
                componentClassname: className,
                text: action.text || '',
            }).on('click.sheetAction', action.onClick);
        }

        mega.ui.sheet.show({
            name,
            showClose: true,
            type: 'normal',
            preventBgClosing: true,
            title,
            contents: [targetNode],
            footer: {
                slot: footerElements
            }
        });
    }
}
