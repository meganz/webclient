/** @property T.ui.loginDialog */
lazy(T.ui, 'loginDialog', () => {
    'use strict';

    const stop = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    return freeze({
        data: Object.create(null),

        init() {
            const cn = this.data.cn = T.ui.dialog.content.querySelector('.js-login-dialog');
            this.data.loginCn = cn.querySelector('.content.login-cn');
            this.data.twoFaCn = cn.querySelector('.content.two-fa-cn');
            this.data.emailInput = cn.querySelector('#login-dlg-email-input');
            this.data.passInput = cn.querySelector('#login-dlg-password-input');
            this.data.pinInputs = this.data.twoFaCn.querySelectorAll('input');
            this.data.backBtn = cn.querySelector('.js-back');

            T.ui.input.init(cn.querySelectorAll('.it-input input'));

            // Continue(login) button
            cn.querySelector('.js-continue-button')
                .addEventListener('click', (e) => this.tryLogin(e).catch(tell));

            // X button
            cn.querySelector('.js-close').addEventListener('click', () => this.hide());

            // Back button
            this.data.backBtn.addEventListener('click', () => this.showStep());

            // Submit 2FA button
            cn.querySelector('.js-submit-2fa').addEventListener('click', (e) => this.verifyTwoFA(e));

            // Init 2FA pin intput events
            for (let i = 0; i < this.data.pinInputs.length; i++) {
                const elm = this.data.pinInputs[i];

                elm.addEventListener('keydown', (e) => {
                    // Change focus on backspace
                    if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.value === '') {
                        this.data.pinInputs[Math.max(0, i - 1)].focus();
                    }

                    // Verify pin
                    if (e.key === 'Enter') {
                        this.verifyTwoFA();
                    }
                });

                elm.addEventListener('focus', (e) => {
                    e.target.select();
                });

                elm.addEventListener('input', (e) => {
                    const [first, ...rest] = e.target.value;

                    // Set default
                    this.twoFAerror();

                    // Set emply val if undefined
                    e.target.value = first || '';

                    // Set other values
                    if (first !== undefined && i !== this.data.pinInputs.length - 1) {
                        const next = this.data.pinInputs[i + 1];
                        next.focus();

                        if (rest.length) {
                            next.value = rest.join('');
                            next.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                });
            }
        },

        show() {
            if (self.u_type > 0) {
                return false;
            }

            if (!this.data.cn) {
                this.init();
            }

            // Reset and show
            this.reset();
            T.ui.dialog.show(this.data.cn);

            // Focus Email input after dialog animation
            setTimeout(() => this.data.emailInput.focus(), 300);
        },

        hide() {
            this.reset();
            T.ui.dialog.hide(this.data.cn);
        },

        reset() {
            const { emailInput, passInput, pinInputs } = this.data;
            emailInput.value = '';
            passInput.value = '';

            for (const elm of pinInputs) {
                elm.value = '';
            }

            T.ui.input.errorMsg(emailInput);
            T.ui.input.errorMsg(passInput);
            this.showStep();
            this.twoFAerror();
        },

        async tryLogin(e) {
            stop(e);
            /*
            disable temporary session warning for now (as we don't properly support it on transfer.it):
            we may improve in the future
            if (self.u_sid) {
                console.assert(self.u_type === 0);

                // warn about an ephemeral session being active
                const res = await T.ui.confirm(l[1058]);

                if (res !== true) {
                    return this.hide();
                }
                await u_logout(true);
            }
            */
            const {emailInput, passInput} = this.data;

            // Validate email
            if (emailInput.value.trim() === '' || !isValidEmail(emailInput.value)) {
                T.ui.input.errorMsg(emailInput, l[198]);
                return false;
            }

            // Validate pass
            if (passInput.value.trim() === '') {
                T.ui.input.errorMsg(passInput, l[1791]);
                return false;
            }

            return this.doLogin(emailInput.value, passInput.value);
        },

        async doLogin(u, p, pin) {
            loadingDialog.show();
            return security.atomicSignIn(u, p, pin)
                .then(() => location.reload())
                .catch((ex) => {
                    loadingDialog.hide();

                    // If there was a 2FA error, show a message that the PIN code was incorrect
                    if (ex === EFAILED) {
                        this.twoFAerror(true);
                        return true;
                    }

                    // If the Two-Factor PIN is required
                    if (ex === EMFAREQUIRED) {
                        this.showStep(1);
                        return true;
                    }

                    // Check and handle the common login errors
                    // Check for suspended account
                    if (ex === EBLOCKED) {
                        msgDialog('warninga', l[6789], api_strerror(ex));
                        return true;
                    }

                    // Check for too many login attempts
                    else if (ex === ETOOMANY) {
                        api_getsid.etoomany = Date.now();
                        api_getsid.warning();
                        return true;
                    }

                    // Check for incomplete registration
                    else if (ex === EINCOMPLETE) {
                        // This account has not completed the registration
                        msgDialog('warningb', l[882], l[9082]);
                        return true;
                    }

                    if (ex !== undefined) {
                        T.ui.input.errorMsg(this.data.emailInput, l[16349]);
                    }
                });
        },

        showStep(step) {
            const { loginCn, twoFaCn, emailInput, pinInputs, backBtn } = this.data;

            if (step) {
                backBtn.classList.remove('hidden');
                loginCn.classList.add('hidden');
                twoFaCn.classList.remove('hidden');
                pinInputs[0].focus();
            }
            else {
                backBtn.classList.add('hidden');
                loginCn.classList.remove('hidden');
                twoFaCn.classList.add('hidden');
                emailInput.focus();
            }
        },

        verifyTwoFA(e) {
            if (e) {
                stop(e);
            }

            const { emailInput, passInput, pinInputs } = this.data;
            const value = $.trim([...pinInputs].map((n) => n.value).join(''));

            if (!value || value.length < pinInputs.length) {
                return this.twoFAerror(true);
            }

            // Send the PIN code to the callback
            this.doLogin(emailInput.value, passInput.value, value);

            return false;
        },

        twoFAerror(error) {
            const { pinInputs, twoFaCn } = this.data;
            const en = twoFaCn.querySelector('.error-text');

            if (error) {
                en.classList.remove('v-hidden');
            }
            else {
                en.classList.add('v-hidden');
            }

            for (const elm of pinInputs) {
                if (error) {
                    elm.closest('.it-input').classList.add('error');
                    pinInputs[0].focus();
                }
                else {
                    elm.closest('.it-input').classList.remove('error');
                }
            }
        }
    });
});
