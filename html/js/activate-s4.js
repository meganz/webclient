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

        if (this.getErrorMsg(result)) {
            delete window.s4ac;
        }

        return result;
    }

    async activateAuthCode(authCode) {
        const req = { a: 's4a' };

        if (authCode) {
            req.ac = authCode;
        }

        loadingDialog.show('activates4.s4a');

        const result = await api.send(req).catch(echo);

        loadingDialog.hide('activates4.s4a');

        if (result === 0 || this.getErrorMsg(result)) {
            delete window.s4ac;
        }

        return result;
    }

    getErrorMsg(res) {
        if (res === ETEMPUNAVAIL) { // plan is temporarily unavailable for purchase
            return l.s4_unable_to_purchase;
        }
        /* Uncomment if we need Auth Code verification */
        /*
        if (res === EACCESS || res === ENOENT) { // AuthCode is invalid, expired,
            return l.activate_s4_ac_invalid_message;
        }
        if (res === EEXIST) { // AuthCode has already been used.
            return l.activate_s4_ac_expired_message;
        }
        */

        return false;
    }

    handleResponse(res) {
        if (res !== 0) {
            return msgDialog(
                'warningb',
                l[16],
                this.getErrorMsg(res) || l[7140],
                null,
                () => loadSubPage('pro')
            );
        }

        return res;
    }
}

class ActivateS4Page {
    constructor() {
        this.page = document.querySelector('.fmholder .js-activate-s4-page');
        this.activateBtn = this.page.querySelector('button.enable-s4');
        this.checkbox = this.page.querySelector('.checkbox');
        this.tosAccepted = false;

        this.activateBtn.addEventListener('click', () => {
            if (!this.activateBtn.disabled) {

                // Log S4 feature activation
                eventlog(500593);

                ActivateS4.instance.activateAuthCode()
                    .then((res) => {
                        if (res === 0) {

                            loadSubPage('fm/s4');
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
        if (u_attr && u_attr.pf && !u_attr.s4 && !pro.isExpiredOrInGracePeriod(u_attr.pf.s)) {
            parsepage(pages.activates4);
            return new ActivateS4Page();
        }

        if (u_attr && u_attr.s4) {
            loadSubPage('fm');
            return false;
        }

        window.s4ac = true;
        loadSubPage(`propay_${pro.ACCOUNT_LEVEL_PRO_FLEXI}`);
    }

    init() {
        this._initCheckbox();
        this._updateButtonState();
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
        if (this.tosAccepted) {
            this.activateBtn.disabled = false;
            this.activateBtn.classList.remove('disabled');
        }
        else {
            this.activateBtn.disabled = true;
            this.activateBtn.classList.add('disabled');
        }
    }
}
