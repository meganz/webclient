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

        const setNode = mCreateElement('fieldset', {'class': 'code-container'}, this.domNode);

        for (let i = 1; i <= this.pinLength; i++) {
            mCreateElement('input', {
                class: 'pmText no-title-top',
                'data-number': i,
                maxlength: 1,
                type: 'number'
            }, setNode);
        }

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
        this.pinInputs = $('input', this.fieldset);
        const $newInputs = this.pinInputs.filter(':not(.megaInputs)');

        if ($newInputs.length) {
            mega.ui.MegaInputs($newInputs);
        }

        this.fieldset.classList.remove('error');
        for (let i = 0; i < this.pinInputs.length; i++) {
            const input = this.pinInputs[i];
            input.dataset.pinIndex = i;
            $(input).val('').megaInputsHideError();
        }

        this.pinInputs.rebind('keydown.verifyPin', e => {
            const i = Number(e.currentTarget.dataset.pinIndex) || 0;

            if (e.keyCode === 8 && e.target.value === '') {
                this.pinInputs.eq(Math.max(0, i - 1)).focus();
            }

            if (e.keyCode === 13) {
                this.verifyTwoFA();
            }
        });

        this.pinInputs.rebind('focus.selectValue', e => {
            e.target.select();
        });

        this.pinInputs.rebind('input.fieldsetAction', e => {
            const i = Number(e.currentTarget.dataset.pinIndex) || 0;
            const [first, ...rest] = e.target.value.replace(/\D/g, '');

            this.fieldset.classList.remove('error');
            for (let j = 0; j < this.pinInputs.length; j++) {
                $(this.pinInputs[j]).megaInputsHideError();
            }

            e.target.value = first || '';

            if (first !== undefined && i !== this.pinInputs.length - 1) {
                this.pinInputs.eq(i + 1).focus();

                if (rest.length) {
                    this.pinInputs.eq(i + 1).val(rest.join('')).trigger('input.fieldsetAction');
                    return;
                }
            }

            const value = $.trim(this.pinInputs.toArray().map((input) => input.value).join(''));

            if (value.length === this.pinLength) {
                this.verifyTwoFA();
            }
        });
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
                twofactor.verifyActionDialog.init()
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

    /** jQuery selector for this dialog */
    $dialog: null,

    /**
     * Intialise the dialog
     */
    init: function() {

        'use strict';

        // Cache selector
        this.$dialog = $('.two-factor-dialog.setup-two-factor');

        // Setup functionality
        this.getSharedSecret();
        this.initNextButton();
        this.initCloseButton();
        this.initNoAuthenticatorAppButton();

        // Show the dialog
        this.$dialog.removeClass('hidden');
        fm_showoverlay();
    },

    /**
     * Setup the Two-Factor Authentication by getting a shared secret from the API
     */
    getSharedSecret: function() {

        'use strict';

        // Cache selectors
        var $seedInput = this.$dialog.find('.two-factor-qr-seed');
        var $qrCode = this.$dialog.find('.two-factor-qr-code');

        // Run Multi-Factor Auth Setup (mfas) request
        api.send('mfas')
            .then((res) => {
                assert(res && typeof res === 'string');

                // Set Base32 seed into text box
                $seedInput.val(res);

                // Configure the QR code rendering library
                // Appears as: MEGA (name@email.com) in authenticator app
                var options = {
                    width: 224,
                    height: 224,
                    correctLevel: QRErrorCorrectLevel.H,    // High
                    background: '#f2f2f2',
                    foreground: '#151412',
                    text: `otpauth://totp/MEGA:${u_attr.email}?secret=${res}&issuer=MEGA`
                };

                // Render the QR code
                $qrCode.text('').qrcode(options);

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
     * Initialise the Next button to go to the Verify Setup dialog
     */
    initNextButton: function() {

        'use strict';

        // On button click
        this.$dialog.find('.two-factor-next-btn').rebind('click', function() {

            // Close the current dialog and open the verify dialog
            twofactor.setupDialog.closeDialog();
            twofactor.verifySetupDialog.init();
        });
    },

    /**
     * Initialise the close icon in the header to close the dialog
     */
    initCloseButton: function() {

        'use strict';

        // On button click, close the dialog
        this.$dialog.find('button.js-close').rebind('click', function() {

            twofactor.setupDialog.closeDialog();
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        'use strict';

        // Hide the dialog and background
        this.$dialog.addClass('hidden');
        fm_hideoverlay();
    },

    /**
     * Initialise the Don't have an authenticator app? button to open the Select Authenticator App tooltip
     */
    initNoAuthenticatorAppButton: function() {

        'use strict';

        var $noAuthAppButton = this.$dialog.find('.no-auth-app-button');
        var $authAppSelectDialog = $('.auth-app-select-tooltip');

        // On button click
        $noAuthAppButton.rebind('click', function() {

            // Get the absolute position of the button, the width of the button and dialog
            var buttonOffset = $noAuthAppButton.offset();
            var buttonWidth = $noAuthAppButton.width();
            var dialogWidth = $authAppSelectDialog.outerWidth();

            // Put the dialog in the middle of the button horizontally
            var offsetMiddleOfButton = buttonOffset.left + (buttonWidth / 2);
            var leftOffset = offsetMiddleOfButton - (dialogWidth / 2);

            // Move the dialog down below the button text (14px text height + 10px top margin)
            var topOffset = buttonOffset.top + 14 + 10;

            // Show the tooltip above the Select Authenticator app dialog and below the button
            $authAppSelectDialog.css({ top: topOffset, left: leftOffset }).removeClass('hidden');

            // Initialise the handler to close the tooltip
            twofactor.setupDialog.initTooltipClose();

            // Prevent click closing the tooltip straight away
            return false;
        });
    },

    /**
     * Initialise the click handler to close the tooltip if they click anywhere in or out of the tooltip or press the
     * Esc key. The authenticator app buttons/hyperlinks should still open the link in a new tab/window regardless.
     */
    initTooltipClose: function() {

        'use strict';

        // If there is a click anywhere on the page
        $(document).rebind('click.closeauthapptooltip', function() {

            // Close the tooltip
            $('.auth-app-select-tooltip').addClass('hidden');

            // Remove the click handler
            $(document).off('click.closeauthapptooltip');
        });

        // If there is a keypress
        $(document).rebind('keyup.closeauthapptooltip', function(event) {

            // If the Esc key was pressed
            if (event.keyCode === 27) {

                // Close the tooltip
                $('.auth-app-select-tooltip').addClass('hidden');

                // Remove the keyup handler
                $(document).off('keyup.closeauthapptooltip');
            }
        });
    }
};


/**
 * The dialog to verify the 2FA activation process was set up correctly
 */
twofactor.verifySetupDialog = {

    /** jQuery selector for this dialog */
    $dialog: null,

    /**
     * Intialise the dialog
     */
    init: function() {

        'use strict';

        // Cache selector
        this.$dialog = $('.two-factor-dialog.setup-two-factor-verify');

        // Setup functionality
        this.resetToDefault();
        this.initCloseButton();
        this.initKeyupFunctionality();
        this.initBackButton();
        this.initNextButton();

        // Show the dialog
        this.$dialog.removeClass('hidden');
        fm_showoverlay();

        // Put the focus in the PIN input field after its visible
        this.$dialog.find('.pin-input').trigger('focus');
    },

    /**
     * Reset the dialog to default state if it is re-opened
     */
    resetToDefault: function() {

        'use strict';

        var $pinCode = this.$dialog.find('.pin-input');
        var $warningText = this.$dialog.find('.information-highlight.failed');
        var $warningText2 = this.$dialog.find('.information-highlight.empty');
        var $successText = this.$dialog.find('.information-highlight.success');
        var $closeButton = this.$dialog.find('button.js-close');

        // Clear the text input, remove the warning/success boxes, unhide the close button
        $pinCode.val('');
        $warningText.addClass('hidden');
        $warningText2.addClass('hidden');
        $successText.addClass('hidden');
        $closeButton.removeClass('hidden');
    },

    /**
     * Initialise the close icon in the header to close the dialog
     */
    initCloseButton: function() {

        'use strict';

        // On button click, close the dialog
        this.$dialog.find('button.js-close').rebind('click', function() {

            twofactor.verifySetupDialog.closeDialog();
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        'use strict';

        // Hide the dialog and background
        this.$dialog.addClass('hidden');
        fm_hideoverlay();
    },

    /**
     * Initialises keyup/blur functionality on the input field to check the PIN as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $warningText = this.$dialog.find('.information-highlight.failed');
        var $warningText2 = this.$dialog.find('.information-highlight.empty');
        var $verifyButton = this.$dialog.find('.next-button');

        // On keyup or clicking out of the text field
        $pinCodeInput.rebind('keyup blur', function(event) {

            // Hide previous warnings for incorrect PIN codes
            $warningText.addClass('hidden');
            $warningText2.addClass('hidden');

            // If Enter key is pressed, verify the code
            if (event.keyCode === 13) {
                $verifyButton.trigger('click');
            }
        });
    },

    /**
     * Initalises the back button to go back to the QR code/seed dialog
     */
    initBackButton: function() {

        'use strict';

        var $backButton = this.$dialog.find('.back-button');

        // On button click
        $backButton.removeClass('disabled').rebind('click', function() {

            // Don't let them go back if they already activated 2FA, they need to go forward
            if ($(this).hasClass('disabled')) {
                return false;
            }

            twofactor.verifySetupDialog.closeDialog();
            twofactor.setupDialog.init();
        });
    },

    /**
     * Initialise the Next button to verify the code
     */
    initNextButton: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $backButton = this.$dialog.find('.back-button');
        var $closeButton = this.$dialog.find('button.js-close');
        var $verifyButton = this.$dialog.find('.next-button');
        var $warningText = this.$dialog.find('.information-highlight.failed');
        var $successText = this.$dialog.find('.information-highlight.success');
        var $warningText2 = this.$dialog.find('.information-highlight.empty');

        // On button click
        $verifyButton.rebind('click', function() {

            if ($verifyButton.hasClass('disabled')) {
                return false;
            }
            $verifyButton.addClass('disabled');

            // Hide old warning
            $warningText.addClass('hidden');
            $warningText2.addClass('hidden');

            // If the operation hasn't succeeded yet
            if ($successText.hasClass('hidden')) {

                // Get the Google Authenticator PIN code from the user
                var pinCode = $.trim($pinCodeInput.val());

                if (pinCode === '' || pinCode.length !== 6 || Number.isInteger(pinCode)) {
                    $warningText2.removeClass('hidden');
                    $verifyButton.removeClass('disabled');
                    return;
                }

                // Run Multi-Factor Auth Setup (mfas) request
                api.req({a: 'mfas', mfa: pinCode})
                    .then((res) => {
                        console.info(res);

                        // Disable the back button and hide the close button to force them to go to the next step
                        // to backup their Recovery Key. Also now that 2FA is activated, show the success message
                        $backButton.addClass('disabled');
                        $closeButton.addClass('hidden');
                        $successText.removeClass('hidden');

                    })
                    .catch((ex) => {

                        // If the Two-Factor has already been setup, show a warning dialog
                        if (ex === EEXIST) {
                            msgDialog('warninga', l[19219], l['2fa_already_enabled'], null, () => {
                                // Close the dialog on click of OK button
                                twofactor.verifySetupDialog.closeDialog();
                            });
                        }
                        else {
                            console.error(ex);

                            // If there was an error, show message that the code was incorrect and clear the text field
                            $warningText.removeClass('hidden');
                            $pinCodeInput.val('');

                            // Put the focus back in the PIN input field
                            $pinCodeInput.trigger('focus');
                        }
                    })
                    .finally(() => {
                        $verifyButton.removeClass('disabled');
                    });
            }
            else {
                // If the operation to activate succeeded, load next dialog to backup the recovery key
                twofactor.verifySetupDialog.closeDialog();
                twofactor.backupKeyDialog.init();
            }
        });
    }
};


/**
 * The dialog to verify the 2FA activation process was set up correctly
 */
twofactor.backupKeyDialog = {

    /** jQuery selector for this dialog */
    $dialog: null,

    /**
     * Intialise the dialog
     */
    init: function() {

        'use strict';

        // Cache selectors
        this.$dialog = $('.two-factor-dialog.setup-two-factor-backup-key');

        // Setup functionality
        this.initCloseButton();
        this.initSaveRecoveryKeyButton();

        // Show the dialog
        this.$dialog.removeClass('hidden');
        fm_showoverlay();
    },

    /**
     * Initialise the button to save the Recovery Key to a file
     */
    initSaveRecoveryKeyButton: function() {

        'use strict';
        this.$dialog.find('.recovery-key-button').rebind('click', u_savekey);
    },

    /**
     * Initialise the close and finish buttons to close the dialog
     */
    initCloseButton: function() {

        'use strict';

        // On button click, close the dialog
        this.$dialog.find('button.js-close').rebind('click', function() {

            // Close the dialog and refresh the status of 2FA in the background
            twofactor.backupKeyDialog.closeDialog();
            twofactor.account.init();
        });
    },

    /**
     * Closes the dialog
     */
    closeDialog: function() {

        'use strict';

        // Hide the dialog and background
        this.$dialog.addClass('hidden');
        fm_hideoverlay();
    }
};


/**
 * Logic for the dialog where they need to perform some action e.g. change email or change
 * password but they need to enter their Two Factor Authentication PIN in order to proceed
 */
twofactor.verifyActionDialog = {

    /** jQuery selector for this dialog */
    $dialog: null,

    /**
     * Intialise the dialog
     * @returns {Promise<String>} 2-fa pin code.
     */
    init: function() {

        'use strict';
        return new Promise((resolve, reject) => {

            // Cache selectors
            this.$dialog = $('.mega-dialog.two-factor-verify-action');
            this.reject = reject;

            // Initialise functionality
            this.resetState();
            this.initKeyupFunctionality();
            this.initSubmitButton(resolve);
            this.initLostAuthenticatorDeviceButton();
            this.initCloseButton();

            // Show the modal dialog
            this.$dialog.removeClass('hidden');
            fm_showoverlay();

            // Put the focus in the PIN input field after its visible
            this.$dialog.find('.pin-input').trigger('focus');
        });
    },

    /**
     * Initialises keyup/blur functionality on the input field to check the PIN as it's being entered
     */
    initKeyupFunctionality: function() {

        'use strict';

        // Cache selectors
        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $submitButton = this.$dialog.find('.submit-button');
        var $warningText = this.$dialog.find('.information-highlight.warning');

        // On keyup or clicking out of the text field
        $pinCodeInput.off('keyup blur').on('keyup blur', function(event) {

            $warningText.addClass('hidden');

            // If Enter key is pressed, submit the login code
            if (event.keyCode === 13) {
                $submitButton.trigger('click');
            }

            // Trim whitespace from the ends of the PIN entered
            var pinCode = $pinCodeInput.val();
            var trimmedPinCode = $.trim(pinCode);

            // If empty, grey out the button so it appears unclickable
            if (trimmedPinCode === '' || trimmedPinCode.length !== 6 || Number.isInteger(trimmedPinCode)) {
                $submitButton.removeClass('active');
            }
            else {
                // Otherwise how the button as red/clickable
                $submitButton.addClass('active');
            }
        });
    },

    /**
     * Initialise the Submit button
     * @param {Function} completeCallback The callback to run after 2FA verify
     */
    initSubmitButton: function(completeCallback) {

        'use strict';

        // Cache selectors
        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $submitButton = this.$dialog.find('.submit-button');
        var $warningText = this.$dialog.find('.information-highlight.warning');

        // On Submit button click/tap
        $submitButton.rebind('click', function() {

            // Get the Google Authenticator PIN code from the user
            var pinCode = $.trim($pinCodeInput.val());

            if (pinCode === '' || pinCode.length !== 6 || Number.isInteger(pinCode)) {
                $warningText.removeClass('hidden');
                $pinCodeInput.trigger('focus');
            }
            else {
                // Close the modal dialog
                twofactor.verifyActionDialog.closeDialog();

                // Send the PIN code to the callback
                completeCallback(pinCode);
            }
        });
    },

    /**
     * Initialise the Lost Authenticator Device button
     */
    initLostAuthenticatorDeviceButton: function() {

        'use strict';

        // Cache selectors
        var $lostDeviceButton = this.$dialog.find('.lost-authenticator-button');

        // On button click
        $lostDeviceButton.rebind('click', function() {
            twofactor.verifyActionDialog.closeDialog();
            M.showRecoveryKeyDialog();
        });
    },

    /**
     * Initialise the Close buttons to close the overlay
     */
    initCloseButton: function() {

        'use strict';

        var $closeButton = this.$dialog.find('button.js-close');

        // On click of the close and back buttons
        $closeButton.rebind('click', function() {

            // Close the modal dialog
            twofactor.verifyActionDialog.closeDialog();
        });
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

        // Hide the dialog and background
        this.$dialog.addClass('hidden');
        fm_hideoverlay();
    },

    /**
     * Reset the two-factor login dialog's user interface back to its default.
     * Useful if there was an error during the verification process.
     */
    resetState: function() {

        'use strict';

        var $pinCodeInput = this.$dialog.find('.pin-input');
        var $submitButton = this.$dialog.find('.submit-button');
        var $warningText = this.$dialog.find('.information-highlight.warning');

        // Hide loading spinner and clear the text input
        $submitButton.removeClass('active');
        $pinCodeInput.val('');
        $warningText.addClass('hidden');
    }
};
