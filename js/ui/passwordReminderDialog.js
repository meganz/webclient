(function(scope) {
    "use strict";

    var DEBUG = localStorage.debugPasswordReminderDialog || false;

    // all values are in seconds.
    var DAY = 86400;
    var SHOW_AFTER_LASTLOGIN = 14 * DAY;
    var SHOW_AFTER_LASTSKIP = 90 * DAY;
    // var SHOW_AFTER_LASTSKIP_LOGOUT = 30 * DAY;
    var SHOW_AFTER_ACCOUNT_AGE = 7 * DAY;
    var SHOW_AFTER_LASTSUCCESS = 90 * DAY;
    var RECHECK_INTERVAL = 15 * 60;

    if (DEBUG) {
        SHOW_AFTER_LASTLOGIN = 15;
        SHOW_AFTER_LASTSKIP = 30;
        // SHOW_AFTER_LASTSKIP_LOGOUT = 5;
        SHOW_AFTER_LASTSUCCESS = 45;
        SHOW_AFTER_ACCOUNT_AGE = DAY;
        RECHECK_INTERVAL = 15;
    }

    var PasswordReminderAttribute = function(dialog, changedCb, str) {
        var self = this;
        self.dialog = dialog;
        self._queuedSetPropOps = [];

        if (changedCb) {
            this.changedCb = changedCb;
        }
        PasswordReminderAttribute.PROPERTIES.forEach(function(prop) {
            self["_" + prop] = 0;

            Object.defineProperty(self, prop, {
                get: function() { return self["_" + prop]; },
                set: function(newValue) {
                    if (!self.loading) {
                        self._queuedSetPropOps.push([prop, newValue]);
                    }
                    else if (self.loading && self.loading.state() === 'pending') {
                        self.loading.always(function() {
                            self["_" + prop] = newValue;
                            self.hasChanged(prop);
                        });
                    }
                    else {
                        self["_" + prop] = newValue;
                        self.hasChanged(prop);
                    }
                },
                enumerable: true,
                configurable: true
            });
        });


        if (str) {
            self.mergeFromString(str);
        }
    };

    PasswordReminderAttribute.prototype.mergeFromString = function(str) {
        var self = this;

        var vals = str.split(":");
        var wasMerged = false;
        PasswordReminderAttribute.PROPERTIES.forEach(function(prop, index) {
            var val = typeof vals[index] !== 'undefined' ? parseInt(vals[index]) : 0;

            if (Number.isNaN(val)) {
                val = 0;
            }

            if (self["_" + prop] !== val) {
                self["_" + prop] = val;
                wasMerged = true;
            }
        });
        if (wasMerged) {
            self.hasBeenMerged();
        }
    };

    PasswordReminderAttribute.prototype.hasChanged = function(prop) {
        // Update ui?
        if (this.changedCb) {
            this.changedCb(prop);
        }

        // Save via mega.attr
        return this.save(prop === 'lastLogin').catch(dump);
    };

    PasswordReminderAttribute.prototype.hasBeenMerged = function() {
        // update ui?
        if (this.changedCb) {
            this.changedCb();
        }
    };

    PasswordReminderAttribute.prototype.toString = function() {
        var self = this;
        var vals = [];
        PasswordReminderAttribute.PROPERTIES.forEach(function(prop) {
            vals.push(self["_" + prop]);
        });
        return vals.join(":");
    };

    PasswordReminderAttribute.prototype.save = function(delayed) {

        if (!this.savingPromise) {

            const save = () => {
                const data = this.toString();

                return mega.attr.set2(null, 'prd', data, -2, true)
                    .always(() => {
                        if (data !== this.toString()) {

                            return save();
                        }
                    })
                    .finally(() => {
                        delete this.savingPromise;
                    });
            };

            if (delayed) {

                this.savingPromise = tSleep(Math.max(delayed | 0, 3)).then(save);
            }
            else {

                this.savingPromise = save();
            }
        }

        return this.savingPromise;
    };

    PasswordReminderAttribute.prototype.loadFromAttribute = function() {
        var self = this;

        if (self.loading) {
            return;
        }

        self.loading = mega.attr.get(u_handle, 'prd', -2, true)
            .done(function (r) {
                if (isString(r)) {
                    self.dialog._initFromString(r);
                }
                else {
                    self.dialog._initFromString("");
                }
            })
            .fail(function (e) {
                if (e === ENOENT) {
                    self.dialog._initFromString("");
                }
            })
            .always(function() {
                if (self._queuedSetPropOps.length > 0) {
                    self._queuedSetPropOps.forEach(function(op) {
                        self[op[0]] = op[1];
                    });
                    self._queuedSetPropOps = [];
                }
                if (self.changedCb) {
                    self.changedCb();
                }
            });
    };

    PasswordReminderAttribute.prototype.attributeUpdatedViaAp = function() {
        if (this.loading) {
            this.loading.reject();
            this.loading = false;
        }

        this.loadFromAttribute();
    };

    /**
     * Those properties are intentionally stored in an array, they are ordered and that order is important for when
     * saving/retrieving data from mega.attr.*.
     * In case a new key is added, please append it at the end of the list.
     * Never remove a key from the array above.
     *
     * @type {Array}
     */
    PasswordReminderAttribute.PROPERTIES = [
        'lastSuccess',
        'lastSkipped',
        'masterKeyExported',
        'dontShowAgain',
        'lastLogin'
    ];

    const showTextIcon = 'icon-eye-reveal';
    const hideTextIcon = 'icon-eye-hidden';

    class PasswordReminderDialog {
        constructor() {
            this.passwordReminderAttribute = new PasswordReminderAttribute(this, prop => {
                this.recheck(
                    prop !== 'lastSuccess' &&
                    prop !== 'dontShowAgain' &&
                    prop !== 'masterKeyExported'
                );
                if (prop === 'masterKeyExported') {
                    this.hideIcon();
                }
            });
            this.succeeded = false;
            this.isLogout = false;

            this.NAMESPACE = 'recoverykey-logout-overlay';

            if (is_mobile) {
                // When the user presses the browser's back button, the parameter dialogShown should be updated
                // if the overlay is no longer visible.
                window.addEventListener('popstate', () => {
                    if (mega.ui.overlay.name === this.NAMESPACE
                        && mega.ui.passwordReminderDialog.dialogShown !== mega.ui.overlay.visible) {
                        mega.ui.passwordReminderDialog.dialogShown = mega.ui.overlay.visible;
                    }
                });
            }
        }

        async onConfirmClicked() {
            this.wrongLabel.classList.add('hidden');
            this.correctLabel.classList.add('hidden');
            const derivedKey = await security.getDerivedEncryptionKey(this.passwordField.value).catch(dump) || '';
            const correctPassword = checkMyPassword(derivedKey);
            if (correctPassword) {
                this.dialog.classList.add('accepted');
                this.dialog.classList.remove('wrong');
                this.correctLabel.classList.remove('hidden');
                this.passwordReminderAttribute.lastSuccess = unixtime();

                this.skipLink.text = l[967];
                this.succeeded = true;
                this.hideIcon();
                eventlog(500319);
                return;
            }
            this.dialog.classList.add('wrong');
            this.dialog.classList.remove('accepted');
            this.wrongLabel.classList.remove('hidden');
            this.correctLabel.classList.add('hidden');
            if (this.passwordField) {
                this.passwordField.focus();
            }
            this.downloadButton.removeClass('green-button');
            this.downloadButton.addClass('red-button');
            eventlog(500320);
        }

        onSkipClicked() {
            if (this.succeeded) {
                this.hideIcon();
            }
            else {
                this.passwordReminderAttribute.lastSkipped = unixtime();
            }

            this.onLogoutDialogUserAction().always(() => this.hideDialog());
        }

        async onLogoutDialogUserAction() {
            if (this.passwordReminderAttribute.savingPromise) {
                if (this.promise) {
                    loadingDialog.show();
                    this.promise.always(() => {
                        loadingDialog.hide();
                    });
                }
                await this.passwordReminderAttribute.savingPromise.catch(nop);
            }
            if (this.promise) {
                this.promise.resolve(true);
            }
        }

        async onBackupClicked() {
            eventlog(500020);
            await M.saveAs(a32_to_base64(window.u_k || ''), `${M.getSafeName(l[20830])}.txt`);
            mega.ui.toast.rack.addClass('above-fab');
            mega.ui.toast.show(l.recovery_key_download_toast);
            this.passwordReminderAttribute.masterKeyExported = 1;
            this.showLogoutStep();
        }

        init() {
            if (!this.initialised) {
                this.initialised = true;
            }
            this.initDialogContents();
            if (this.passwordReminderAttribute.loading) {
                this.recheck();
            }
            else {
                this.passwordReminderAttribute.loadFromAttribute();
            }
        }

        onTopmenuReinit() {
            if (this.topIcon && !document.body.contains(this.topIcon)) {
                this.hideDialog();
                this.initialised = false;
                this.topIcon = null;
            }
            this.prepare();
        }

        /**
         * Prepare the PRD.
         * @returns {void}
         */
        prepare() {
            if (this.initialised) {
                this.resetUI();
            }
            else {
                this.init();
            }
        }

        _scheduleRecheck() {
            if (this.recheckInterval) {
                this.recheckInterval.abort();
                this.recheckInterval = null;
            }

            (this.recheckInterval = tSleep(RECHECK_INTERVAL))
                .then(() => {
                    onIdle(() => this._scheduleRecheck());
                    this.recheckInterval = null;
                    this.recheck();
                })
                .catch(dump);
        }

        _initFromString(str) {
            this.passwordReminderAttribute.mergeFromString(str);
            if (this.recheckInterval) {
                this.recheckInterval.abort();
                this.recheckInterval = null;
            }

            if (!this.passwordReminderAttribute.dontShowAgain) {
                this._scheduleRecheck();

                this.recheck();
            }
        }

        get canShowDialog() {
            const time = unixtime();
            const { masterKeyExported, dontShowAgain, lastSuccess, lastLogin } = this.passwordReminderAttribute;
            // User has not exported the recovery key
            // User has not disabled showing the dialog
            // User has been registered at least a week
            // User last succeeded in verifying over 3 months ago
            // User's last login was over 2 weeks ago
            return u_type === 3 &&
                !masterKeyExported &&
                !dontShowAgain &&
                time - u_attr.since > SHOW_AFTER_ACCOUNT_AGE &&
                time - lastSuccess > SHOW_AFTER_LASTSUCCESS &&
                time - lastLogin > SHOW_AFTER_LASTLOGIN;
        }

        recheck(hideIfShown) {
            if (!u_handle) {
                // user is in the middle of a logout...
                return;
            }

            // skip any re-checks in case this is the 'cancel' page
            if (window.location.toString().includes('/cancel')) {
                return;
            }
            hideIfShown = hideIfShown && (!this.passwordField || this.passwordField.value === '') && !this.isLogout;

            if (this.canShowDialog) {
                const selectors = [
                    'textarea:focus',
                    'input:focus, select:focus',
                    '.dropdown-content:visible:first',
                    '.dropdown-section:visible:first',
                    '.mega-dialog:visible:first'
                ];

                // skip recheck in case:
                // - there is no top-icon, i.e. we are on a custom page
                // - there is a visible .dropdown
                // - the user had a textarea, input or select field focused
                // - there is a visible/active dialog
                const skipShowingDialog = !this.showIcon() || $(selectors.join(',')).length > 0;

                if (
                    !skipShowingDialog &&
                    is_fm() &&
                    !pfid &&
                    (
                        !this.passwordReminderAttribute.lastSkipped ||
                        unixtime() - this.passwordReminderAttribute.lastSkipped > SHOW_AFTER_LASTSKIP
                    )
                ) {
                    this.showDialog();
                }
                else if (hideIfShown) {
                    this.hideDialog();
                }
            }
            else if (hideIfShown) {
                this.hideIcon();
                this.hideDialog();
            }
        }

        showIcon() {
            if (!this.topIcon || this.topIcon.classList.contains('hidden') || !document.body.contains(this.topIcon)) {
                // because, we have plenty of top menus, that may not be visible/active
                const $icon = $('.js-pass-reminder', '.top-head, .mega-header');
                this.topIcon = $icon[0];
                if (this.topIcon) {
                    $icon.removeClass('hidden').rebind('click.prd', () => this.showDialog());
                }
            }
            return !!this.topIcon;
        }

        resetUI() {
            assert(this.dialog);
            const textInfo = this.dialog.querySelector('.text.info');
            if (textInfo) {
                textInfo.textContent = '';
                textInfo.append(parseHTML(l.logout_recovery_key));
            }

            this.dialog.querySelector('.recovery-key.container').classList.remove('hidden');
            this.dialog.querySelector('.pass-reminder.container').classList.add('hidden');

            this.skipLink.text = l[1379];
            this.skipLink.removeClass('button-prd-skip');
            this.skipLink.show();
            this.dialog.classList.remove('wrong', 'accepted');

            this.wrongLabel.classList.add('hidden');
            this.correctLabel.classList.add('hidden');

            this.downloadButton.removeClass('red-button');
            this.downloadButton.addClass('green-button');

            this.passVisibleButton.classList.add(showTextIcon);
            this.passVisibleButton.classList.remove(hideTextIcon);
            // On mobile, if the input were readonly, the keyboard would not open when taking focus
            this.passwordField.removeAttribute('style');
            this.passwordField.value = '';
            this.passwordField.type = 'password';
            this.passwordField.setAttribute('readonly', !is_mobile);
            this.passwordField.classList.remove('hidden');
        }

        hideIcon() {
            if (!this.topIcon) {
                return;
            }

            $(this.topIcon).addClass('hidden').off('click.prd');
        }

        showDialog(promise) {
            assert(this.dialog, 'dialog not defined.');

            if (this.dialogShown) {
                return;
            }
            this.dialogShown = true;

            const options = {
                name: this.NAMESPACE,
                title: l.logout_before,
                contents: [this.initDialogContents()],
                showClose: true,
                icon: 'bell',
            };
            if (is_mobile) {
                options.onClose = () => this.hideDialog();
                mega.ui.overlay.show(options);
            }
            else {
                options.footer = {
                    type: 'checkbox',
                    componentClassname: 'mega-checkbox',
                    checkboxName: 'show-again',
                    labelTitle: l.remind_recovery_check,
                    checked: false
                };
                options.onShow = () => {
                    mega.ui.sheet.footerComp.on('toggle.prd', ({ data }) => {
                        this.passwordReminderAttribute.dontShowAgain = data | 0;
                        eventlog(500024, data ? 'checked' : 'unchecked');
                    });
                };
                options.onClose = () => {
                    this.hideDialog();
                    eventlog(500318);
                };
                mega.ui.sheet.show(options);
                mega.ui.sheet.addClass(this.NAMESPACE);
            }

            if (promise) {
                this.promise = promise;
                promise.always(() => {
                    delete this.promise;
                });
            }
        }

        hideDialog() {
            if (!this.dialogShown) {
                return;
            }
            if (this.promise) {
                this.promise.reject();
            }
            this.dialogShown = false;
            this.succeeded = false;
            this.isLogout = false;

            const component = is_mobile ? mega.ui.overlay : mega.ui.sheet;

            if (component.name === this.NAMESPACE) {
                component.removeClass(this.NAMESPACE);
                component.hide();
                component.clear();
            }
        }

        async recheckLogoutDialog() {
            if (!u_handle) {
                return true;
            }

            if (window.location.toString().includes('/cancel')) {
                return true;
            }

            if (
                u_type === 3 &&
                !this.passwordReminderAttribute.dontShowAgain &&
                page !== 'start' &&
                (is_fm() || dlid)
            ) {
                const { promise } = mega;
                this.showDialog(promise);
                return promise;
            }
            return true;
        }

        initDialogContents() {
            if (!this.dialog) {
                this.dialog = mCreateElement('div', {'class': 'recovery-key-logout mob-px-6'}, [
                    mCreateElement('span', {'class': 'text info text-left'}, [parseHTML(l.logout_recovery_key)])
                ]);

                const recoveryKey = a32_to_base64(window.u_k || '');

                let rkinput;

                // Step 1: Actual recovery key input + download button
                const recoveryKeyContainer = mCreateElement('div', {'class': 'recovery-key container'}, [
                    mCreateElement('span', {'class': 'recovery-key blurb text-left'}, [document.createTextNode(
                        l.logout_recovery_key_title)]),
                    rkinput = mCreateElement('div', {'class': 'recovery-key input'}, [
                        mCreateElement('input', {
                            'class': 'recovery-key string text-left',
                            'type': 'text',
                            'readonly': '',
                            'value': recoveryKey
                        })])
                ], this.dialog);

                // Inline copy button
                const copyButton = new MegaButton({
                    parentNode: rkinput,
                    type: 'icon',
                    icon: `${mega.ui.sprites.mono} icon-square-copy`,
                    iconSize: 20,
                    componentClassname: 'text-icon'
                });
                copyButton.on('click', () => {
                    eventlog(500026);
                    copyToClipboard(recoveryKey);
                    mega.ui.toast.rack.addClass('above-fab');
                    mega.ui.toast.show(l[8836]);
                });

                // Download button
                this.downloadButton = new MegaButton({
                    parentNode: recoveryKeyContainer,
                    text: l.logout_recovery_key_download,
                    componentClassname: 'primary block dlButton button-prd-backup'
                });
                this.downloadButton.on('click', () => {
                    this.onBackupClicked().catch(tell);
                });

                // Step 2: Actual password input + confirm button
                const passReminderContainer = mCreateElement('div', {'class': 'pass-reminder container hidden'}, [
                    mCreateElement('div', {'class': 'mega-input title-ontop box-style fixed-width mobile'}, [
                        mCreateElement('div', {'class': 'mega-input-title'}, [document.createTextNode(l[909])]),
                        this.passwordField = mCreateElement('input', {
                            'class': 'underlinedText megaInputs',
                            'type': 'password',
                            'id': 'test-pass'
                        }),
                        this.passVisibleButton =
                            mCreateElement('i', {'class': `${mega.ui.sprites.mono} ${showTextIcon} pass-visible`})
                    ]),
                    mCreateElement('div', {'class': 'pass-reminder-results'}, [
                        this.correctLabel =
                            mCreateElement('div', {'class': 'pass-reminder result-txt accepted hidden'}, [
                                mCreateElement('i', {
                                    'class': `${mega.ui.sprites.mono} icon-check-circle-thin-outline`
                                }),
                                mCreateElement('span', {'class': 'result-text'}, [
                                    document.createTextNode(l.logout_password_confirm_correct)
                                ])
                            ]),
                        this.wrongLabel = mCreateElement('div', {'class': 'pass-reminder result-txt wrong hidden'}, [
                            mCreateElement('i', {'class': `${mega.ui.sprites.mono} icon-alert-triangle-thin-outline`}),
                            mCreateElement('span', {'class': 'result-text'}, [
                                document.createTextNode(l.logout_password_confirm_no_correct)
                            ])
                        ]),
                    ])
                ], this.dialog);

                this.passwordField.addEventListener('focus', () => {
                    if (this.passwordField.type === 'password') {
                        if (ua.details.browser === 'Chrome') {
                            this.passwordField.style.webkitTextSecurity = 'disc';
                        }
                        else {
                            this.passwordField.type = 'password';
                        }
                    }
                    this.passwordField.removeAttribute('readonly');
                    this.passwordField.setAttribute(
                        'autocomplete',
                        `section-off${rand_range(1, 123244)} off disabled nope no none`
                    );
                    eventlog(500317);
                });
                this.passwordField.addEventListener('keydown', e => {
                    if (!this.dialogShown) {
                        return;
                    }

                    if (e.key === 'Enter') {
                        eventlog(500019);
                        this.onConfirmClicked().catch(dump);
                        return false;
                    }
                    this.dialog.classList.remove('wrong');
                    this.dialog.classList.remove('accepted');
                    this.correctLabel.classList.add('hidden');
                    this.wrongLabel.classList.add('hidden');
                });

                this.passVisibleButton.addEventListener('click', () => {
                    if (this.passVisibleButton.classList.contains(showTextIcon)) {
                        this.passwordField.type = 'text';
                        if (this.passwordField.style.webkitTextSecurity) {
                            this.passwordField.style.webkitTextSecurity = 'none';
                        }
                        this.passVisibleButton.classList.remove(showTextIcon);
                        this.passVisibleButton.classList.add(hideTextIcon);
                    }
                    else {
                        this.passwordField.type = 'password';
                        if (this.passwordField.style.webkitTextSecurity) {
                            this.passwordField.style.webkitTextSecurity = 'disc';
                        }
                        this.passVisibleButton.classList.add(showTextIcon);
                        this.passVisibleButton.classList.remove(hideTextIcon);
                    }
                });

                // Confirm button
                this.confirmButton = new MegaButton({
                    parentNode: passReminderContainer,
                    text: l.logout_password_confirm,
                    componentClassname: 'primary block confirmButton button-prd-confirm'
                });
                this.confirmButton.on('click', () => {
                    eventlog(500019);
                    this.onConfirmClicked().catch(dump);
                });

                let forgotPasswordButton;
                // Forgot password link
                mCreateElement('div', {'class': 'pass-reminder-forgot'}, [
                    parseHTML(l[1934]),
                    forgotPasswordButton
                        = mCreateElement('a', {'class': 'forgot-password clickurl'}, [parseHTML(l[23262])])
                ], passReminderContainer);
                forgotPasswordButton.addEventListener('click', () => {
                    this.hideDialog();
                    if (this.promise) {
                        this.promise.reject();
                    }
                    this.passwordField.value = '';

                    eventlog(500022);
                    loadSubPage('/fm/account/security/change-password');
                });

                // Skip link
                this.skipLink = new MegaLink({
                    parentNode: this.dialog,
                    type: 'text',
                    componentClassname: 'skip-link',
                    text: l[1379]
                });
                this.skipLink.on('click.skip', () => {
                    if (this.succeeded || this.skipLink.text === l.logout_proceed) {
                        eventlog(500023);
                        this.isLogout = true;
                        this.onSkipClicked();
                    }
                    else {
                        this.showPasswordStep();
                    }
                });
            }

            this.resetUI();

            return this.dialog;
        }

        showPasswordStep() {
            this.dialog.querySelector('.recovery-key.container').classList.add('hidden');

            const component = is_mobile ? mega.ui.overlay : mega.ui.sheet;
            component.addTitle(l[16895]);
            component.clearImage('password');
            component.addImage('password');

            const textInfo = this.dialog.querySelector('.text.info');
            if (textInfo) {
                textInfo.textContent = l.logout_password;
            }

            this.dialog.querySelector('.pass-reminder.container').classList.remove('hidden');

            if (this.promise) {
                this.showLogoutStep();
            }
            else {
                this.skipLink.hide();
            }
        }

        showLogoutStep() {
            this.skipLink.text = this.promise ? l.logout_proceed : l.logout_password_confirm;
            this.skipLink.addClass('button-prd-skip');
            this.skipLink.show();
        }
    }

    const passwordReminderDialog = new PasswordReminderDialog();
    scope.mega.ui.passwordReminderDialog = passwordReminderDialog;

    mBroadcaster.once('login', function() {
        // cancel page can trigger a login event, which should NOT trigger PRD attribute update.
        if (window.location.toString().indexOf("/cancel") > -1) {
            return;
        }

        // since u_type is not available yet, assuming that 'login' would only be triggered by a normal user login
        // e.g. u_type === 3
        passwordReminderDialog.passwordReminderAttribute.lastLogin = unixtime();
    });

    mBroadcaster.addListener('keyexported', function() {
        passwordReminderDialog.passwordReminderAttribute.masterKeyExported = 1;
    });

    mBroadcaster.addListener('attr:passwordReminderDialog', function() {
        passwordReminderDialog.passwordReminderAttribute.attributeUpdatedViaAp();
    });

})(window);
