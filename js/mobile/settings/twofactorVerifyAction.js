mobile.settings.account.twofactorVerifyAction = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @param {String} msg Description of the action for 2FA verification, optional
     * @param {Number} error API exception value to display an error message in 2FA, optional
     * @returns {Promise<*>} 2FA code entered or false
     */
    init: {
        value: function(msg, error) {
            'use strict';

            return new Promise((resolve) => {
                this.resolve = resolve;
                this.error = error;
                this.msg = msg;
                this.pinLength = 6;

                if (this.domNode) {
                    return this.show();
                }

                this.domNode = mCreateElement('div', {
                    class: 'mega-mobile-settings two-factor-verification'
                });

                mCreateElement('h1', {'class': 'form-title'}, this.domNode)
                    .textContent = MegaMobileHeader.headings['fm/two-factor-confirmation'];

                this.msgNode = mCreateElement('div', {'class': 'form-info'}, this.domNode);

                const setNode =  mCreateElement('fieldset', {
                    'class': 'code-container'
                }, this.domNode);

                // Create PIN filedset
                for (let i = 1; i <= this.pinLength; i++) {
                    mCreateElement('input', {
                        'class': `underlinedText`,
                        'data-number': i,
                        'data-wrapper-class': 'box-style mobile',
                        'maxlength': 1,
                        'type': 'number'
                    }, setNode);
                }

                // Create Verify button
                new MegaMobileButton({
                    parentNode: this.domNode,
                    componentClassname: 'block',
                    text: l[1960]
                }).on('tap.confirmAction', () => this.verifyTwoFA());

                // Create Lost device button
                this.lostDeviceButton = new MegaMobileButton({
                    parentNode: this.domNode,
                    componentClassname: 'block text-only',
                    text: l[19215]
                }).on('tap.lostDevice', () => {
                    this.resolve(false);

                    // Hide 2FA overlay
                    mega.ui.overlay.hide();

                    if (u_attr) {
                        loadSubPage('fm/account/security/lost-auth-device');
                    }
                    else {
                        loadSubPage('recovery');
                    }
                });

                this.show();
            });
        }
    },

    show: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-form', 'fixed-width');
            this.msgNode.textContent = this.msg || l.enter_two_fa_code;

            // Hide Lost device button when enabling 2FA
            if (this.msg === l.two_fa_verify_enable) {
                this.lostDeviceButton.domNode.classList.add('hidden');
            }
            else {
                this.lostDeviceButton.domNode.classList.remove('hidden');
            }

            // Bind fieldset events
            this.initPinInputs();

            // Show overlay
            mega.ui.overlay.show({
                name: 'twpFA-overlay',
                actionOnBottom: false,
                showClose: true,
                contents: [this.domNode],
                onClose: () => {
                    this.resolve(false);

                    if (!u_attr) {
                        security.login.email = null;
                        security.login.password = null;
                        security.login.rememberMe = false;
                    }
                }
            });
        }
    },

    initPinInputs: {
        value: function() {
            'use strict';

            if (this.pinInputs && this.error) {
                return this.showError();
            }

            this.fiedset = this.domNode.querySelector('fieldset');
            this.pinInputs = new mega.ui.MegaInputs(this.fiedset.querySelectorAll('input')).reverse();

            // Set default
            this.fiedset.classList.remove('error');

            // Bind fieldset events
            for (let i = 0; i < this.pinInputs.length; i++) {

                this.pinInputs[i].$input.rebind('keydown.verifyPin', (e) => {
                    // Change focus on backspace
                    if (e.keyCode === 8 && e.target.value === '') {
                        this.pinInputs[Math.max(0, i - 1)].$input.focus();
                    }

                    // Verify pin
                    if (e.keyCode === 13) {
                        this.verifyTwoFA();
                    }
                });

                this.pinInputs[i].$input.rebind('focus.selectValue', (e) => {
                    e.target.select();
                });

                this.pinInputs[i].$input.rebind('input.fieldsetAction', (e) => {
                    const [first, ...rest] = e.target.value;

                    // Set default
                    this.fiedset.classList.remove('error');
                    this.pinInputs[0].$input.megaInputsHideError();

                    // Set emply val if undefined
                    e.target.value = first || '';

                    // Set other values
                    if (first !== undefined && i !== this.pinInputs.length - 1) {
                        this.pinInputs[i + 1].$input.focus();

                        if (rest.length) {
                            this.pinInputs[i + 1].$input.val(rest.join('')).trigger('input.fieldsetAction');
                        }
                    }
                }).val('').megaInputsHideError();
            }
        }
    },

    verifyTwoFA: {
        value: function() {
            'use strict';

            const value = $.trim(this.pinInputs.map(({$input}) => $input.val()).join(''));

            if (!value || value.length < this.pinLength) {
                return this.showError();
            }

            // Send the PIN code to the callback
            this.completeCallback(value);

            // Prevent double taps
            return false;
        }
    },

    completeCallback: {
        value: function(value) {
            'use strict';

            this.resolve(value);

            if (!u_attr) {
                // Get cached data that was already entered on the login form
                const {email, password, rememberMe} = security.login;

                // Check if using old/new login method and log them in
                security.login.checkLoginMethod(
                    email,
                    password,
                    value,
                    rememberMe,
                    mobile.signin.old.startLogin,
                    mobile.signin.new.startLogin
                );
            }
        }
    },

    showError: {
        value: function() {
            'use strict';

            this.fiedset.classList.add('error');
            this.pinInputs[0].$input.megaInputsShowError(
                '<i class="sprite-mobile-fm-mono icon-alert-triangle-thin-outline"></i>' +
                `<span>${l.incorrect_twofa_code}</span>`
            );
        }
    }
});
