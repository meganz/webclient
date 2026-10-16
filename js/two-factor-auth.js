/**
 * Two-Factor Authentication logic for logging in with 2FA, setting up 2FA, disabling etc.
 */

/**
 * Generic functions for the desktop code
 */
var twofactor = {

    /**
     * Checks if Two-Factor Authentication functionality is enabled for all users
     * i.e. the user is allowed to see the 2FA section and enable/disable 2FA.
     * @returns {Boolean} Returns true if enabled, false if not.
     */
    isEnabledGlobally: function() {

        'use strict';

        // If the localStorage override is set, use that on/off value for testing
        if (localStorage.getItem('twoFactorAuthEnabled') !== null) {
            return (localStorage.getItem('twoFactorAuthEnabled') === '1') ? true : false;
        }

        return mega.flags.mfae;
    },

    /**
     * Checks if 2FA is enabled on the user's account
     * @param {Function} callbackFunction The function to call when the results are returned,
     * @returns {Promise<Boolean>} true for enabled and false for disabled
     */
    isEnabledForAccount: async function() {

        'use strict';

        // Make Multi-Factor Auth Get request
        return (await api.req({a: 'mfag', e: u_attr.email})).result === 1;
    },

    buildCodeInput(parentNode) {
        'use strict';

        const fieldset = mCreateElement('fieldset', {'class': 'code-container'}, parentNode);
        for (let i = 1; i <= twofactor.loginDialog.pinLength; i++) {
            mCreateElement('input', {
                class: 'pmText no-title-top',
                'data-number': i,
                maxlength: 1,
                type: 'number'
            }, fieldset);
        }
        return fieldset;
    },

    initCodeInput(fieldset, onFilled, onSubmit) {
        'use strict';

        const $inputs = $('input', fieldset);
        const $newInputs = $inputs.filter(':not(.megaInputs)');
        if ($newInputs.length) {
            mega.ui.MegaInputs($newInputs);
        }

        fieldset.classList.remove('error');
        for (let i = 0; i < $inputs.length; i++) {
            const input = $inputs[i];
            input.dataset.pinIndex = i;
            $(input).val('').megaInputsHideError();
        }

        $inputs.rebind('keydown.verifyPin', e => {
            const i = Number(e.currentTarget.dataset.pinIndex) || 0;
            if (e.keyCode === 8 && !e.target.value) {
                $inputs.eq(Math.max(0, i - 1)).focus();
            }
            if (e.keyCode === 13) {
                onSubmit();
            }
        });

        $inputs.rebind('focus.selectValue', e => {
            e.target.select();
        });

        $inputs.rebind('input.fieldsetAction', e => {
            const i = Number(e.currentTarget.dataset.pinIndex) || 0;
            const [first, ...rest] = e.target.value.replace(/\D/g, '');

            fieldset.classList.remove('error');
            for (let j = 0; j < $inputs.length; j++) {
                $($inputs[j]).megaInputsHideError();
            }

            e.target.value = first || '';

            if (first !== undefined && i !== $inputs.length - 1) {
                $inputs.eq(i + 1).focus();

                if (rest.length) {
                    $inputs.eq(i + 1).val(rest.join('')).trigger('input.fieldsetAction');
                    return;
                }
            }

            const value = $inputs.toArray().map((input) => input.value).join('').trim();
            onFilled(value.length === twofactor.loginDialog.pinLength);
        });

        return $inputs;
    }
};

/**
 * Shared 2FA login/verification overlay for mobile/desktop.
 */
twofactor.loginDialog = {

    pinLength: 6,

    init(oldStartLoginCallback, newStartLoginCallback, options) {

        'use strict';

        this.pageBound = page === 'login';
        this.oldStartLoginCallback = oldStartLoginCallback;
        this.newStartLoginCallback = newStartLoginCallback;

        closeDialog();

        // This is not a login, using global overlay.
        if (options && options.skipLoginCheck) {
            this.dialogComponent = mega.ui.overlay;
        }
        else {
            this.dialogComponent = mega.ui.auth.getDialogComponent(this.pageBound);
        }

        return new Promise(resolve => {

            if (!this.dialogComponent) {
                if (d) {
                    console.error('No dialog component available to show 2FA login dialog');
                }
                resolve(false);
                return;
            }

            this.resolve = resolve;
            this.options = options || {
                showClose: false,
                showLostDevice: true,
                onLostDevice: () => {
                    security.login.clearCachedLoginState();
                    this.closeDialog(false, 'recovery');
                }
            };

            if (!this.domNode) {
                this.buildDom();
            }

            this.show();
        });
    },

    buildDom() {

        'use strict';

        this.domNode = mCreateElement('div', {
            class: 'two-factor-verification twofactor-shared-verification'
        });
        this.msgNode = mCreateElement('div', {'class': 'form-info'}, this.domNode);

        twofactor.buildCodeInput(this.domNode);

        this.lostDeviceButton = new MegaLink({
            parentNode: this.domNode,
            type: 'text',
            text: l[19215]
        }).on('click.lostDevice tap.lostDevice', () => {

            if (typeof this.options.onLostDevice === 'function') {
                this.options.onLostDevice();
                return;
            }

            this.closeDialog(false, u_attr ? 'fm/account/security/lost-auth-device' : 'recovery');
        });
    },

    show() {

        'use strict';

        this.active = true;

        this.showMessage();
        this.initPinInputs();
        this.resetState();

        const showOptions = {
            name: 'twofa-overlay',
            classList: ['twofa-login-overlay'],
            header: l[19194],
            actionOnBottom: false,
            showClose: this.options.showClose !== false,
            preventBgClosing: true,
            contents: [this.domNode],
            onShow: () => {
                // Focus after the overlay/sheet is fully shown.
                // sheet.show() blurs the active element during open.
                onIdle(() => {
                    if (this.pinInputs && this.pinInputs[0]) {
                        this.pinInputs[0].focus();
                    }
                });
            },
            onBack: () => this.closeDialog(),
            onClose: () => this.closeDialog(),
            noBlurBackground: this.pageBound, // Don't blur the background if it's page bound
        };

        if (!is_mobile) {
            showOptions.type = 'modal';
            showOptions.sheetHeight = 'auto';
            showOptions.sheetWidth = 'auto';
        }

        this.dialogComponent.show(showOptions);
        if (is_mobile && this.pageBound) {
            placeLangBtnToLogin(this.dialogComponent);
            if (mega.ui.header) {
                mega.ui.header.update();
            }
        }
    },

    initPinInputs() {

        'use strict';

        this.fieldset = this.domNode.querySelector('fieldset');
        this.pinInputs = twofactor.initCodeInput(
            this.fieldset,
            (filled) => {
                if (filled) {
                    this.verifyTwoFA();
                }
            },
            () => this.verifyTwoFA()
        );
    },

    verifyTwoFA() {

        'use strict';

        if (this.submitting) {
            return false;
        }

        const value = $.trim(this.pinInputs.toArray().map((input) => input.value).join(''));

        if (!new RegExp(`^\\d{${this.pinLength}}$`).test(value)) {
            return this.showError();
        }

        this.submitting = true;

        this.completeCallback(value);
        return false;
    },

    completeCallback(value) {

        'use strict';

        this.resolve(value);

        if (this.options && this.options.skipLoginCheck) {
            return;
        }

        const {email, password, rememberMe} = security.login;
        let oldLogin;
        let newLogin;

        if (this.oldStartLoginCallback && this.newStartLoginCallback) {

            oldLogin = this.oldStartLoginCallback;
            newLogin = this.newStartLoginCallback;
        }

        if (pro.propay.signup.activeMobileLogin) {

            oldLogin = pro.propay.signup.onAttemptLoginOld.bind(pro.propay.signup);
            newLogin = pro.propay.signup.onAttemptLoginNew.bind(pro.propay.signup);
        }

        security.login.checkLoginMethod(email, password, value, rememberMe, oldLogin, newLogin);
    },

    showError() {

        'use strict';

        if (!this.pinInputs[0] || !this.fieldset) {
            return false;
        }

        this.resetState();
        this.fieldset.classList.add('error');
        for (let i = 0; i < this.pinInputs.length; i++) {
            const $input = $(this.pinInputs[i]);

            if (i === 0) {
                $input.megaInputsShowError(
                    '<i class="sprite-fm-mono icon-alert-triangle-thin-outline"></i>' +
                    `<span>${l.incorrect_twofa_code}</span>`
                );
            }
            else {
                $input.megaInputsShowError();
            }
        }
        this.pinInputs.eq(0).focus();

        return false;
    },

    showMessage(msg) {

        'use strict';

        const currentMsg = msg || false;

        this.msgNode.textContent = currentMsg || l.enter_two_fa_code;

        if (this.lostDeviceButton && this.options) {
            // Hide Lost device button when enabling 2FA.
            if (currentMsg === l.two_fa_verify_enable || this.options.showLostDevice === false) {
                this.lostDeviceButton.domNode.classList.add('hidden');
            }
            else {
                this.lostDeviceButton.domNode.classList.remove('hidden');
            }
        }

        return false;
    },

    resetState() {

        'use strict';

        if (!this.fieldset) {
            return;
        }

        this.fieldset.classList.remove('error');
        this.submitting = false;

        for (let i = 0; i < this.pinInputs.length; i++) {
            $(this.pinInputs[i]).val('').megaInputsHideError();
        }
    },

    get submitting() {

        'use strict';

        return !!this._submitting;
    },

    set submitting(state) {

        'use strict';

        this._submitting = !!state;

        if (this.pinInputs) {
            for (let i = 0; i < this.pinInputs.length; i++) {
                this.pinInputs[i].disabled = this._submitting;
                this.pinInputs[i].parentNode.classList.toggle('disabled', this._submitting);
            }
        }

        if (this.fieldset) {
            this.fieldset.classList[state ? 'add' : 'remove'](
                'submitting',
                'sprite-fm-theme-after',
                'icon-loader-throbber-dark-outline-after'
            );
        }
    },

    closeDialog(success, redirectTo) {

        'use strict';

        if (!success) {
            this.resolve(false);
        }

        if (this.dialogComponent) {

            this.dialogComponent.hide();
            this.dialogComponent.removeClass('page-bound');
        }

        if (redirectTo) {
            loadSubPage(redirectTo);
        }

        if (!this.options || !this.options.skipLoginCheck) {

            security.login.clearCachedLoginState();

            onIdle(() => {

                if (!success && !redirectTo) {
                    mega.ui.login.openDialog();
                }
                mega.ui.header.update();
            });
        }

        delete this.active;
        delete this.options;
        delete this.pageBound;
    }
};


/**
 * Functions for enabling and displaying 2FA in the My Account section, Security tab
 */
twofactor.account = {

    /**
     * Initialise the 2FA section on the page
     */
    init: function() {

        'use strict';

        // Check if disabled/enabled
        this.fetchAndDisplayTwoFactorAuthStatus();
    },

    /**
     * Displays the current Two-Factor Authentication status (enabled/disabled)
     */
    fetchAndDisplayTwoFactorAuthStatus: function() {

        'use strict';

        var $twoFactorSection = $('.account.two-factor-authentication');
        var $button = $twoFactorSection.find('.enable-disable-2fa-button');

        // Check if 2FA is actually enabled on the API for everyone
        if (twofactor.isEnabledGlobally()) {

            // Show the 2FA section
            $twoFactorSection.removeClass('hidden');

            // Check if 2FA is enabled on their account
            twofactor.isEnabledForAccount().then((result) => {
                // If enabled, show red button, disable PIN entry text box and Deactivate text
                if (result) {
                    $button.addClass('toggle-on enabled').trigger('update.accessibility');
                }
                else {
                    // Otherwise show green button and Enable text
                    $button.removeClass('toggle-on enabled').trigger('update.accessibility');
                }

                // Init the click handler now for the button now that the enabled/disabled status has been retrieved
                twofactor.account.initEnableDeactivateButton();
            }).catch(tell);
        }
    },

    /**
     * Initialises the enable/deactivate 2FA button
     */
    initEnableDeactivateButton: function() {

        'use strict';

        var $accountPageTwoFactorSection = $('.account.two-factor-authentication');
        var $button = $accountPageTwoFactorSection.find('.enable-disable-2fa-button');

        // On button click
        $button.rebind('click', function() {

            // If 2FA is enabled
            if ($button.hasClass('enabled')) {
                // Show the verify 2FA dialog to collect the user's PIN
                twofactor.verifyActionDialog.init(l.twofa_verify_disable)
                    .then((twoFactorPin) => {
                        // Disable 2FA
                        loadingDialog.show();

                        // Run Multi-Factor Auth Disable (mfad) request
                        return api.send({a: 'mfad', mfa: twoFactorPin});
                    })
                    .then(() => {
                        // Refresh the account 2FA status to show it's deactivated
                        return twofactor.account.init();
                    })
                    .catch((ex) => {
                        if (ex === EBLOCKED) {
                            // dialog closed.
                            return;
                        }

                        // The Two-Factor has already been disabled
                        if (ex === ENOENT) {
                            msgDialog('warninga', '', l.two_fa_already_off_title, l.two_fa_already_off_text, () => {
                                // Refresh the account 2FA status
                                twofactor.account.init();
                            });
                        }
                        else if (ex < 0) {

                            // If there was an error, show a message that the code was incorrect
                            msgDialog('warninga', '', l.two_fa_cannot_disable_title, l.two_fa_cannot_disable_text);
                        }
                        else {
                            tell(ex);
                        }
                    })
                    .finally(() => loadingDialog.hide());
            }
            else {
                // Setup 2FA
                twofactor.setupDialog.init();
            }
        });
    },

    /**
     * Disable the Two Factor Authentication
     */
    disableTwoFactorAuthentication: function(twoFactorPin) {

        'use strict';

        loadingDialog.show();

        // Run Multi-Factor Auth Disable (mfad) request
        api_req({ a: 'mfad', mfa: twoFactorPin }, {
            callback: function(response) {

                loadingDialog.hide();

                // The Two-Factor has already been disabled
                if (response === ENOENT) {
                    msgDialog('warninga', '', l.two_fa_already_off_title, l.two_fa_already_off_text, () => {
                        // Refresh the account 2FA status
                        twofactor.account.init();
                    });
                }
                else if (response < 0) {

                    // If there was an error, show a message that the code was incorrect
                    msgDialog('warninga', '', l.two_fa_cannot_disable_title, l.two_fa_cannot_disable_text);
                }
                else {
                    // Refresh the account 2FA status to show it's deactivated
                    twofactor.account.init();
                }
            }
        });
    }
};


/**
 * The dialog to start the 2FA activation process
 */
twofactor.setupDialog = {

    /**
     * Intialise the dialog
     */
    init: function() {

        'use strict';

        if (!this.domNode) {
            this.buildDom();
        }

        this.show();
        this.getSharedSecret();
    },

    buildDom() {
        'use strict';

        this.domNode = document.createElement('div');
        this.domNode.className = 'twofa-setup-body twofactor-shared-verification';
        const message = document.createElement('div');
        message.textContent = l.twofa_setup_dlg_subtitle;
        this.domNode.appendChild(message);
        const qrBlock = document.createElement('div');
        qrBlock.className = 'twofa-setup-instructions';
        this.qrcode = document.createElement('div');
        this.qrcode.className = 'twofa-setup-qrcode';
        qrBlock.appendChild(this.qrcode);
        qrBlock.appendChild(mCreateElement('div', { 'class': 'instruction-list' }, [
            mCreateElement('div', undefined, [document.createTextNode(l.twofa_setup_step1)]),
            mCreateElement('div', undefined, [document.createTextNode(l.twofa_setup_step2)]),
            mCreateElement('div', undefined, [document.createTextNode(l.twofa_setup_step3)])
        ]));
        this.domNode.appendChild(qrBlock);
        this.seedNode = document.createTextNode('');
        this.keyBlock = mCreateElement('div', { 'class': 'seed-key-input selectable-txt' }, [
            mCreateElement('div', { 'class': 'seed-text' }, [this.seedNode])
        ]);
        MegaButton.factory({
            parentNode: this.keyBlock,
            type: 'icon',
            icon: 'sprite-fm-mono icon-copy-thin-outline',
            componentClassname: 'transparent-icon text-icon secondary',
            onClick: () => {
                copyToClipboard(this.seedNode.textContent);
                mega.ui.toast.show(l[371]);
            }
        });
        const seedBlock = mCreateElement('div', { 'class': 'seed-key-block' }, [
            mCreateElement('div', { 'class': 'seed-key-label' }, [document.createTextNode(l.twofa_seedkey)]),
            this.keyBlock
        ]);
        this.domNode.appendChild(seedBlock);
        mCreateElement('div', { 'class': 'code-label' }, [document.createTextNode(l.twofa_authcode)], this.domNode);
        this.fieldSet = twofactor.buildCodeInput(this.domNode);
        const actions = document.createElement('div');
        actions.className = 'two-factor-setup-actions';
        MegaButton.factory({
            parentNode: actions,
            type: 'normal',
            text: l[82],
            componentClassname: 'secondary',
            onClick: () => {
                this.closeDialog();
            }
        });
        this.submitButton = new MegaButton({
            parentNode: actions,
            type: 'normal',
            text: l.s4_key_enable,
            componentClassname: 'primary',
            onClick: () => {
                this.enableTwoFA();
            }
        });
        this.domNode.appendChild(actions);
    },

    show() {
        'use strict';

        this.pinInputs = twofactor.initCodeInput(
            this.fieldSet,
            (filled) => {
                this.submitButton.disabled = !filled;
            },
            () => this.enableTwoFA()
        );
        this.resetState();

        mega.ui.sheet.show({
            name: 'twofa-setup',
            showClose: true,
            title: l[19289],
            contents: [this.domNode]
        });
    },

    resetState() {
        'use strict';

        this.seedNode.textContent = '';
        this.qrcode.textContent = '';
        this.submitButton.disabled = true;
        this.submitButton.loading = false;
    },

    /**
     * Verify the entered code to activate 2FA, then prompt to save the recovery key
     * @returns {void}
     */
    enableTwoFA() {
        'use strict';

        if (this.submitButton.loading) {
            return;
        }

        // Get the Google Authenticator PIN code from the user
        const pinCode = this.pinInputs.toArray().map((input) => input.value).join('');

        if (!new RegExp(`^\\d{${twofactor.loginDialog.pinLength}}$`).test(pinCode)) {
            return;
        }

        this.submitButton.loading = true;

        // Run Multi-Factor Auth Setup (mfas) request
        api.req({a: 'mfas', mfa: pinCode})
            .then((res) => {
                console.info(res);

                // 2FA is activated, load the recovery key dialog to back it up
                this.closeDialog();
                M.showRecoveryKeyDialog(3);
            })
            .catch((ex) => {

                // If the Two-Factor has already been setup, show a warning dialog
                if (ex === EEXIST) {
                    msgDialog('warninga', l[19219], l['2fa_already_enabled'], null, () => {
                        // Close the dialog on click of OK button
                        this.closeDialog();
                    });
                }
                else {
                    console.error(ex);

                    // If there was an error, show message that the code was incorrect and clear the inputs
                    this.fieldSet.classList.add('error');
                    for (let i = 0; i < this.pinInputs.length; i++) {
                        const $input = $(this.pinInputs[i]).val('');
                        if (i === 0) {
                            $input.megaInputsShowError(
                                '<i class="sprite-fm-mono icon-alert-triangle-thin-outline"></i>' +
                                `<span>${escapeHTML(l.incorrect_twofa_code)}</span>`
                            );
                        }
                        else {
                            $input.megaInputsShowError();
                        }
                    }
                    this.submitButton.disabled = true;

                    // Put the focus back in the first PIN input
                    this.pinInputs.eq(0).focus();
                }
            })
            .finally(() => {
                this.submitButton.loading = false;
                twofactor.account.init();
            });
    },

    /**
     * Setup the Two-Factor Authentication by getting a shared secret from the API
     */
    getSharedSecret() {

        'use strict';

        // Run Multi-Factor Auth Setup (mfas) request
        api.send('mfas')
            .then((res) => {
                assert(res && typeof res === 'string');

                // Set Base32 seed into text box
                this.seedNode.textContent = res;

                // Configure the QR code rendering library
                // Appears as: MEGA (name@email.com) in authenticator app
                var options = {
                    width: 132,
                    height: 132,
                    correctLevel: QRErrorCorrectLevel.H,    // High
                    background: '#f2f2f2',
                    foreground: '#151412',
                    text: `otpauth://totp/MEGA:${u_attr.email}?secret=${res}&issuer=MEGA`
                };

                // Render the QR code
                $(this.qrcode).text('').qrcode(options);

            })
            .catch((ex) => {
                twofactor.setupDialog.closeDialog();

                // If the Two-Factor has already been setup, show a warning dialog
                if (ex === EEXIST) {

                    msgDialog('warninga', l[19219], l['2fa_already_enabled']);
                }
                else {
                    tell(ex);
                }
            });
    },

    /**
     * Closes the dialog
     */
    closeDialog() {

        'use strict';

        if (mega.ui.sheet.visible && mega.ui.sheet.name === 'twofa-setup') {
            mega.ui.sheet.hide();
        }
    }
};


/**
 * Logic for the dialog where they need to perform some action e.g. change email or change
 * password but they need to enter their Two Factor Authentication PIN in order to proceed
 */
twofactor.verifyActionDialog = {

    /**
     * Intialise the dialog
     * @param {String} [msg] Description of the action being verified, defaults to the generic prompt
     * @returns {Promise<String>} 2-fa pin code.
     */
    init(msg) {

        'use strict';
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            if (!this.domNode) {
                this.buildDom();
            }

            this.message.textContent = msg || l.enter_two_fa_code;
            this.show();
        });
    },

    buildDom() {

        'use strict';

        this.domNode = document.createElement('div');
        this.domNode.className = 'twofa-verify-body twofactor-shared-verification';
        this.message = document.createElement('div');
        this.domNode.appendChild(this.message);
        this.fieldSet = twofactor.buildCodeInput(this.domNode);

        const actions = document.createElement('div');
        actions.className = 'twofa-verify-actions';
        MegaButton.factory({
            parentNode: actions,
            type: 'text',
            text: l[19215],
            componentClassname: 'lost-device-btn',
            onClick: () => {
                M.showRecoveryKeyDialog(1);
            }
        });
        MegaButton.factory({
            parentNode: actions,
            type: 'normal',
            text: l[82],
            componentClassname: 'secondary cancel-verify',
            onClick: () => {
                this.closeDialog();
            }
        });
        this.submitButton = new MegaButton({
            parentNode: actions,
            type: 'normal',
            text: l[1694],
            componentClassname: 'primary',
            onClick: () => {
                this.verifyTwoFA();
            }
        });
        this.submitButton.disabled = true;
        this.domNode.appendChild(actions);
    },

    show() {
        'use strict';

        this.initPinInputs();
        this.resetState();

        mega.ui.sheet.show({
            name: 'twofa-verify',
            safeShow: false,
            icon: 'icon-numpad-3d',
            classList: ['twofa-verify'],
            title: l[19191],
            showClose: true,
            contents: [this.domNode],
            onShow: () => {
                onIdle(() => {
                    this.pinInputs[0].focus();
                });
            },
            onClose: () => this.closeDialog(),
        });
    },

    initPinInputs() {

        'use strict';

        this.pinInputs = twofactor.initCodeInput(
            this.fieldSet,
            (filled) => {
                this.submitButton.disabled = !filled;
            },
            () => this.verifyTwoFA()
        );
    },

    verifyTwoFA() {

        'use strict';

        const value = this.pinInputs.toArray().map((input) => input.value).join('').trim();
        if (!new RegExp(`^\\d{${twofactor.loginDialog.pinLength}}$`).test(value)) {
            return;
        }
        this.resolve(value);
        this.closeDialog();
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        'use strict';
        const {reject} = this;

        if (reject) {
            onIdle(() => reject(EBLOCKED));
            delete this.reject;
        }
        delete this.resolve;

        if (mega.ui.sheet.visible && mega.ui.sheet.name === 'twofa-verify') {
            mega.ui.sheet.hide();
        }
    },

    /**
     * Reset the two-factor login dialog's user interface back to its default.
     * Useful if there was an error during the verification process.
     */
    resetState: function() {

        'use strict';

        this.fieldSet.classList.remove('error');
        for (let i = 0; i < this.pinInputs.length; i++) {
            $(this.pinInputs[i]).val('').megaInputsHideError();
        }
        this.submitButton.disabled = true;
    }
};
