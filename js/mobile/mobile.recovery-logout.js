mobile.recoveryLogout = {

    container: null,

    /**
     * Initializes the recovery logout dialog.
     * @returns {Object} Container
     */
    init: function() {
        'use strict';

        if (!this.container) {

            this.container = mCreateElement('div', {'class': 'recovery-key-logout'}, [
                mCreateElement('span', {'class': 'text info'}, [parseHTML(l.logout_recovery_key)])
            ]);

            const recoveryKey = a32_to_base64(window.u_k || '');

            let rkinput;

            // Step 1: Actual recovery key input + download button
            const recoveryKeyContainer = mCreateElement('div', {'class': 'recovery-key container'}, [
                mCreateElement('span', {'class': 'recovery-key blurb'}, [document.createTextNode(
                    l.logout_recovery_key_title)]),
                rkinput = mCreateElement('div', {'class': 'recovery-key input'}, [
                    mCreateElement('input', {
                        'class': 'recovery-key string',
                        'type': 'text',
                        'readonly': '',
                        'value': recoveryKey
                    })])
            ], this.container);

            // Inline copy button
            const copyButton = new MegaMobileButton({
                parentNode: rkinput,
                type: 'icon',
                icon: 'sprite-mobile-fm-mono icon-copy-thin-outline',
                iconSize: 20,
                componentClassname: 'text-icon'
            });
            copyButton.on('tap', () => {
                eventlog(500026);
                copyToClipboard(recoveryKey, l[6040]);
            });

            // Download button
            /* eslint-disable no-new */
            new MegaMobileButton({
                parentNode: recoveryKeyContainer,
                text: l.logout_recovery_key_download,
                componentClassname: 'primary block dlButton button-prd-backup'
            });

            // Step 2: Actual password input + confirm button
            const passReminderContainer = mCreateElement('div', {'class': 'pass-reminder container hidden'}, [
                mCreateElement('div', {'class': 'mega-input title-ontop box-style fixed-width mobile'}, [
                    mCreateElement('div', {'class': 'mega-input-title'}, [document.createTextNode(l[909])]),
                    mCreateElement('input', {
                        'class': 'underlinedText megaInputs',
                        'type': 'password',
                        'id': 'test-pass'
                    }),
                    mCreateElement('i', {'class': 'sprite-mobile-fm-mono icon-eye-thin-outline pass-visible'})
                ]),
                mCreateElement('div', {'class': 'pass-reminder-results'}, [
                    mCreateElement('div', {'class': 'pass-reminder result-txt accepted hidden'}, [
                        mCreateElement('i', {'class': 'sprite-mobile-fm-mono icon-check-circle-thin-outline'}),
                        mCreateElement('span', {'class': 'result-text'}, [
                            document.createTextNode(l.logout_password_confirm_correct)
                        ])
                    ]),
                    mCreateElement('div', {'class': 'pass-reminder result-txt wrong hidden'}, [
                        mCreateElement('i', {'class': 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline'}),
                        mCreateElement('span', {'class': 'result-text'}, [
                            document.createTextNode(l.logout_password_confirm_no_correct)
                        ])
                    ]),
                ])
            ], this.container);

            // Confirm button
            new MegaMobileButton({
                parentNode: passReminderContainer,
                text: l.logout_password_confirm,
                componentClassname: 'primary block confirmButton button-prd-confirm'
            });

            // Forgot password link
            mCreateElement('div', {'class': 'pass-reminder-forgot'}, [
                parseHTML(l[1934]),
                mCreateElement('a', {'class': 'forgot-password clickurl'}, [parseHTML(l[23262])])
            ], passReminderContainer);

            // Skip link
            const skipLink = new MegaMobileLink({
                parentNode: this.container,
                type: 'text',
                componentClassname: 'text-only skip-link',
                text: l[1379]
            });
            skipLink.on('tap.skip', () => {
                if (skipLink.text === l.logout_proceed) {
                    eventlog(500023);
                    mega.ui.passwordReminderDialog.onSkipClicked();
                }
                else {
                    this.jumpToStep2();
                }
            });
        }

        const textInfo = this.container.querySelector('.text.info');
        if (textInfo) {
            textInfo.textContent = '';
            textInfo.append(parseHTML(l.logout_recovery_key));
        }

        const skipLink = this.container.componentSelector('.skip-link');
        if (skipLink) {
            skipLink.text = 'Skip';
            skipLink.removeClass('button-prd-skip');
        }

        this.container.querySelector('.recovery-key.container').classList.remove('hidden');
        this.container.querySelector('.pass-reminder.container').classList.add('hidden');

        return this.container;
    },

    /**
     * Moves to the next step of the recovery logout dialog
     * @returns {void}
     */
    jumpToStep2: function() {
        'use strict';

        this.container.querySelector('.recovery-key.container').classList.add('hidden');

        mega.ui.overlay.addTitle(l[16895]);

        mega.ui.overlay.clearImage('password');
        mega.ui.overlay.addImage('password');

        const textInfo = this.container.querySelector('.text.info');
        if (textInfo) {
            textInfo.textContent = l.logout_password;
        }

        this.container.querySelector('.pass-reminder.container').classList.remove('hidden');

        this.skipToLogout();
    },

    /**
     * Update the 'Skip' button to proceed with the logout.
     * @returns {void}
     */
    skipToLogout: function() {
        'use strict';

        const skipLink = this.container.componentSelector('.skip-link');
        if (skipLink) {
            skipLink.text = l.logout_proceed;
            skipLink.addClass('button-prd-skip');
        }
    }
};

mBroadcaster.once('startMega', () => {
    'use strict';

    /**
     * Get container from password reminder dialog.
     * @returns {Object} Container
     */
    mega.ui.passwordReminderDialog.getDialog = function() {
        return mobile.recoveryLogout.container;
    };

    /**
     * Show dialog using MegaMobileOverlay component.
     * @param {Object} dialog Dialog
     * @returns {void}
     */
    mega.ui.passwordReminderDialog.showOverlay = function() {
        mega.ui.overlay.show({
            name: 'recoverykey-logout-overlay',
            showClose: true,
            icon: 'bell',
            title: l.logout_before,
            contents: [mobile.recoveryLogout.init()]
        });
    };

    /**
     * Hide dialog using MegaMobileOverlay component.
     * @returns {void}
     */
    mega.ui.passwordReminderDialog.hideOverlay = function() {
        if (mega.ui.overlay.name === 'recoverykey-logout-overlay') {
            mega.ui.overlay.hide();
        }
    };

    /**
     * Get close button from password reminder dialog.
     * @returns {Object} Close button
     */
    mega.ui.passwordReminderDialog.getCloseButton = function() {
        if (mega.ui.overlay.name === 'recoverykey-logout-overlay') {
            return mega.ui.overlay.closeButton.domNode;
        }
    };

    /**
     * Save recovery key, display informative toast, and allow user to log out.
     * @returns {void}
     */
    mega.ui.passwordReminderDialog.onBackupClicked = function() {

        M.saveAs(a32_to_base64(window.u_k || ''), `${M.getSafeName(l[20830])}.txt`)
            .then(() => {
                mega.ui.toast.rack.addClass('above-fab');
                mega.ui.toast.show(l.recovery_key_download_toast); // Downloaded copy

                mobile.recoveryLogout.skipToLogout();
            })
            .catch(tell);
    };

    // When the user presses the browser's back button, the parameter dialogShown should be updated
    // if the overlay is no longer visible.
    window.addEventListener('popstate', () => {

        if (mega.ui.overlay.name === 'recoverykey-logout-overlay'
            && mega.ui.passwordReminderDialog.dialogShown !== mega.ui.overlay.visible) {
            mega.ui.passwordReminderDialog.dialogShown = mega.ui.overlay.visible;
        }
    });
});
