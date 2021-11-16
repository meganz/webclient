/**
 * Mobile Verify functionality
 */
mobile.verify = {
    $page: null,
    $step1: null,
    $step2: null,
    $verifyButton: null,
    $returnButton: null,
    $password: null,
    $error: null,
    context: null,

    init: function() {
        'use strict';
        if (!u_type) {
            return msgDialog('warninga', l[135], l[7720], false, () => {
                loadSubPage('login');
            });
        }
        this.$page = $('.verify-code-page', '.mobile');
        this.$step1 = $('.verify-step1', this.$page);
        this.$step2 = $('.verify-step2', this.$page);
        this.$password = $('.verify-password-input', this.$step1);
        this.$error = $('.password-input-error', this.$step1);
        this.$verifyButton = $('.verify-password-button', this.$step1);
        this.$returnButton = $('button', this.$step2);
        this.context = Object.create(null);
        this.context.code = page.substr(6);
        this.bindEvents();
        loadingDialog.show();
        this.verifyCode();
    },

    verifyCode() {
        'use strict';
        api_req(
            {a: 'ersv', c: this.context.code},
            { callback: function(res) {
                loadingDialog.hide();
                if (mobile.verify._isApiErr(res)) {
                    return;
                }

                if (u_attr.u !== res[4]) {
                    return msgDialog('warninga', l[135], l[23046],  false, () => {
                        loadSubPage('fm');
                    });
                }
                mobile.verify.render(0);
                mobile.verify.context.email = res[1];
            }});
    },

    render: function(step) {
        'use strict';
        this.$password.val('');
        if (step) {
            this.$step1.addClass('hidden');
            $('.fm-header', this.$page).addClass('hidden');
            $('.step2-text span:not(.verify-header)', this.$step2).text(
                l.m_email_change_info.replace('%1', this.context.email)
            );
            this.$step2.removeClass('hidden');
            return;
        }
        topmenuUI();
        this.$page.removeClass('hidden');
    },

    bindEvents: function() {
        'use strict';
        this.$verifyButton.rebind('click.verify', () => {
            if (this.$verifyButton.hasClass('active')) {
                this._beginVerify();
            }
        });
        this.$returnButton.rebind('click.verify', () => {
            M.currentdirid = null;
            M.account = null;
            loadSubPage('fm/account');
        });
        this.$password.rebind('keyup.verify', () => {
            if (this.$password.parent().hasClass('error')) {
                this.$password.parent().removeClass('error');
            }
            if (this.$password.val()) {
                this.$verifyButton.addClass('active');
            }
            else {
                this.$verifyButton.removeClass('active');
            }
        });
    },

    showError: function(error) {
        'use strict';
        this.$error.text(error);
        this.$password.parent().addClass('error');
    },

    _beginVerify: function() {
        'use strict';
        if (this.$password.parent().hasClass('error') || !this.context || !this.context.code || !this.context.email) {
            return;
        }

        const verifyUserPasswordCallback = () => {
            const password = mobile.verify.$password.val();
            mobile.verify.$password.val('');
            security.getDerivedEncryptionKey(password)
                .then((derivedKey) => {
                    mobile.verify._finishProcess(derivedKey);
                })
                .catch((ex) => {
                    console.warn(ex);
                    mobile.verify._finishProcess('');
                });
        };

        loadingDialog.show();
        api_req(
            {a: 'ug'},
            {callback: (res) => {
                u_checklogin3a(res, {checkloginresult: verifyUserPasswordCallback});
            }
            });
    },

    _finishProcess: function(key) {
        'use strict';
        if (!checkMyPassword(key)) {
            loadingDialog.hide();
            this.showError(l[17920]);
            return;
        }

        const args = {
            a: 'sec',
            c: this.context.code,
            e: this.context.email,
            r: 1,
            i: requesti
        };

        if (u_attr.aav < 2) {
            const cipher = new sjcl.cipher.aes(key);
            args.uh = stringhash(this.context.email, cipher);
        }

        api_req(args, {
            callback: (res) => {
                loadingDialog.hide();
                if (mobile.verify._isApiErr(res)) {
                    return;
                }
                u_attr.email = mobile.verify.context.email;
                mobile.verify.render(1);
                mobile.verify.context = null;
            }
        });
    },

    _isApiErr: function(res) {
        'use strict';
        if (typeof res === 'number' && res < 0) {
            const title = l[135];
            let msgBody = l[7719];
            if (res === EEXIST) {
                msgBody = l[7718];
            }
            else if (res === -9) {
                msgBody = l[22128];
            }
            else if (res === -11) {
                msgBody = l[22151];
            }
            else if (res === -2) {
                msgBody = l[22152];
            }
            msgDialog('warninga', title, msgBody, false, () => {
                loadSubPage('fm/account');
            });
            return true;
        }
        return false;
    },
};
