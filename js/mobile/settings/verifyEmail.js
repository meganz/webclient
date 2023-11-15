mobile.settings.account.verifyEmail = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: function() {
            'use strict';

            if (!u_type) {
                return msgDialog('warninga', l[135], l[7720], false, () => {
                    loadSubPage('login');
                });
            }

            if (!page.startsWith('fm/account') && (this.code = page.split('/').pop().substr(6))) {
                return loadSubPage('/fm/account/security/verify');
            }

            if (this.domNode) {
                return this.verifyCode();
            }

            this.domNode = this.generatePage('settings-account-verify-email');

            mCreateElement('input', {
                'class': 'underlinedText verifyEmail',
                'title': l[909],
                'type': 'password',
                'value': u_attr.email,
                'data-wrapper-class': 'box-style fixed-width mobile',
            }, this.domNode);

            new MegaMobileButton({
                parentNode: this.domNode,
                componentClassname: 'form-button block',
                text: l[1960]
            }).on('tap.verfiyEmail', () => this._beginVerify());

            this.verifyCode();
        },
    },

    verifyCode: {
        value: function() {
            'use strict';

            api.req({a: 'ersv', c: this.code})
                .then(({result}) => {
                    if (u_attr.u !== result[4]) {
                        return msgDialog('warninga', l[135], l[23046],  false, () => {
                            loadSubPage('fm/account');
                        });
                    }
                    this.render();
                    this.email = result[1];
                })
                .catch((ex) => this._isApiErr(ex))
                .finally(() => loadingDialog.hide());
        }
    },

    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-form');
            this.password = new mega.ui.MegaInputs($('.verifyEmail', this.domNode));
            this.password.$input.val('').megaInputsHideError();

            this.password.$input.rebind('keydown.verfiyEmail', (e) => {
                if (e.keyCode === 13) {
                    this._beginVerify();
                }
            });

            this.show();
        }
    },

    showError: {
        value: function(error) {
            'use strict';

            this.password.$input.megaInputsShowError(
                '<i class="sprite-mobile-fm-mono icon-alert-triangle-thin-outline"></i>' +
                `<span>${error}</span>`
            );
        }
    },

    _beginVerify: {
        value: function() {
            'use strict';

            if (this.password.$input.hasClass('errored') || !this.code || !this.email) {
                return;
            }

            const password = this.password.$input.val();
            this.password.$input.val('');

            loadingDialog.show();
            security.verifyUserPassword(password)
                .then((derivedKey) => this._finishProcess(derivedKey))
                .catch((ex) => {
                    console.warn(ex);
                    this._finishProcess('');
                });
        }
    },

    _finishProcess: {
        value: function(key) {
            'use strict';

            if (!checkMyPassword(key)) {
                loadingDialog.hide();
                return this.showError(l[17920]);
            }

            const args = {
                a: 'sec',
                c: this.code,
                e: this.email,
                r: 1,
                i: requesti
            };

            if (u_attr.aav < 2) {
                args.uh = stringhash(this.email, new sjcl.cipher.aes(key));
            }

            api.req(args)
                .then(() => {
                    u_attr.email = this.email;
                    this.code = null;
                    this.email = null;
                    delete localStorage.new_email;

                    loadSubPage('fm/account');
                    mobile.showToast(l.email_changed.replace('%1', u_attr.email));
                })
                .catch((ex) => {
                    this._isApiErr(ex);
                })
                .finally(() => loadingDialog.hide());
        }
    },

    _isApiErr: {
        value: function(res) {
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
        }
    }
});
