/** /activate-s4 scripting, desktop and mobile */

class ActivateS4 {
    static get instance() {
        this._instance = this._instance || new ActivateS4();

        return this._instance;
    }

    async verifyAuthCode(authCode) {
        loadingDialog.show('verifys4.s4v');

        // auth code verify -- 'f'lags, 1: S4 sales
        const result = await api.send({a: 'acv', ac: authCode, f: 1}).catch(echo);

        loadingDialog.hide('verifys4.s4v');

        if (this.invalidCodeMsg(result)) {
            delete window.s4ac;
        }

        return result;
    }

    async activateAuthCode(authCode) {
        loadingDialog.show('activates4.s4a');

        const result = await api.send({a: 's4a', ac: authCode}).catch(echo);

        loadingDialog.hide('activates4.s4a');

        if (result === 0 || this.invalidCodeMsg(result)) {
            delete window.s4ac;
        }

        return result;
    }

    invalidCodeMsg(res) {
        if (res === EACCESS || res === ENOENT) { // AuthCode is invalid, expired,
            return l.activate_s4_ac_invalid_message;
        }
        if (res === EEXIST) { // AuthCode has already been used.
            return l.activate_s4_ac_expired_message;
        }

        return false;
    }

    handleResponse(res) {
        const msg = this.invalidCodeMsg(res);

        if (msg) {
            this.showInvalidDialog(l.activate_s4_ac_invalid_title, msg);
            return false;
        }

        // "... unknown error... try again later"
        if (res !== 0) {
            return msgDialog('warningb', l[16], l[7140], null, (yes) => {
                if (yes) {
                    loadSubPage('pro');
                }
            });
        }

        return res;
    }

    showInvalidDialog(title, message) {
        if (!this.dialog) {
            this.dialog = document.querySelector('.mega-dialog.acs4-invalid-ac');
            this.dialogTitle = this.dialog.querySelector('.title');
            this.dialogMessage = this.dialog.querySelector('.message');

            $('button', this.dialog).rebind('click.s4ac', () => {
                mega.redirect('mega.io', 'objectstorage#register_your_interest', false, false);
            });
        }

        M.safeShowDialog('acs4-invalid-ac', () => {
            this.dialogTitle.textContent = title;
            this.dialogMessage.textContent = message;
            return $(this.dialog);
        });
    }
}

class ActivateS4Page {
    constructor() {
        this.page = document.querySelector('.fmholder .js-activate-s4-page');
        this.activateBtn = this.page.querySelector('button.enable-s4');
        this.checkbox = this.page.querySelector('.checkbox');
        this.codeVerified = false;
        this.tosAccepted = false;

        this.activateBtn.addEventListener('click', () => {
            if (!this.activateBtn.disabled) {

                ActivateS4.instance.activateAuthCode(window.s4ac)
                    .then((res) => {
                        if (res === 0) {
                            loadSubPage('fm');
                            location.reload();
                            return;
                        }
                        return ActivateS4.instance.handleResponse(res);
                    })
                    .catch(tell);
            }
        });

        this.init();
    }

    static load() {
        if (u_attr && u_attr.pf && !pro.isExpiredOrInGracePeriod(u_attr.pf.s) && window.s4ac) {
            parsepage(pages.activates4);
            return new ActivateS4Page();
        }

        if (u_attr && u_attr.s4) {
            loadSubPage('pro');
            return false;
        }

        mega.redirect('mega.io', 'objectstorage#register_your_interest', false, false);
    }

    init() {
        this.codeVerified = false;
        this._initCheckbox();
        this._updateButtonState();

        ActivateS4.instance.verifyAuthCode(window.s4ac).then((res) => {
            if (res === 0) {
                this.codeVerified = true;
                this._updateButtonState();
                return;
            }
            return ActivateS4.instance.handleResponse(res);
        }).catch(tell);
    }

    _initCheckbox() {
        this.checkbox.classList.remove('checked');
        this.tosAccepted = false;

        this.checkbox.addEventListener('click', () => {
            const checked = this.checkbox.classList.contains('checked');

            this.checkbox.classList.toggle('checked');
            this.tosAccepted = !checked;
            this._updateButtonState();
        });
    }

    _updateButtonState() {
        if (this.tosAccepted && this.codeVerified) {
            this.activateBtn.disabled = false;
            this.activateBtn.classList.remove('disabled');
        }
        else {
            this.activateBtn.disabled = true;
            this.activateBtn.classList.add('disabled');
        }
    }
}
