mobile.settings.account.twofactorSettings = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: function() {
            'use strict';

            if (this.domNode) {
                return this.render();
            }

            this.domNode = this.generatePage('two-factor-settings');
            this.initSettings();
            this.initSetup();
            this.render();
        },
    },

    /**
     * Create DOM elements for initial settings page
     * @returns {void} void
     */
    initSettings: {
        value: function() {
            'use strict';

            // Settings page main node
            this.settingsNode = mCreateElement('div', {'class': 'settings-step'}, this.domNode);

            // Enable/disable 2FA button
            this.toggleButton = new MegaMobileToggleButton({
                parentNode: this.settingsNode,
                componentClassname: 'mega-toggle-button',
                value: 'twoFactorSetup',
                label: l[19194],
                role: 'switch',
                onChange: () => {
                    if (this.toggleButton.checked) {
                        this.renderSetup();
                    }
                    else {
                        this.disableTwoFA().catch(tell);
                    }
                }
            });

            // 2FA feature details and help links
            mCreateElement('p', undefined, this.settingsNode).textContent = l.two_fa_protection;
            mCreateElement('p', undefined, this.settingsNode).textContent = l.two_fa_verification;
            mCreateElement('a', {
                'class': 'clickurl primary-link inline-block',
                'href': `${l.mega_help_host}/accounts/password-management/two-factor-authentication`,
                'target': '_blank',
                'rel': 'noopener noreferrer'
            }, this.settingsNode).textContent = l[8742];
        }
    },

    /**
     * Create DOM elements for Setup 2FA page
     * @returns {void} void
     */
    initSetup: {
        value: function() {
            'use strict';

            // Setup page main node
            this.setupNode = mCreateElement('div', {'class': 'settings-step hidden'}, this.domNode);

            // Setup details and "Download app" button
            mCreateElement('div', {'class': 'two-fa-details'}, this.setupNode)
                .append(parseHTML(l.two_fa_download_app));

            // Copy code/Scan QR code component
            this.dataNode = new MegaMobileTab({
                parentNode:  this.setupNode,
                componentClassname: 'two-factor-tabs',
                tabs: [
                    { name: l[17408], key: 'copy', active: true, onSelect: this.showTab, type: 'normal' },
                    { name: l.two_fa_scan_qr, key: 'scan', active: false, onSelect: this.showTab, type: 'normal' }
                ],
                tabContentClassname: 'two-factor-tab-item'
            });

            // Copy code tab content
            this.copyTabNode = mCreateElement('div', {
                'class': 'two-factor-tab-item copy'
            }, this.setupNode);

            // Copy code code details
            mCreateElement('h2', undefined, this.copyTabNode).textContent = l.two_fa_copy_header;
            mCreateElement('p', undefined, this.copyTabNode).textContent = l.two_fa_copy_details;

            // Current email input
            mCreateElement('input', {
                'class': 'underlinedText twoFactorEmail copyButton',
                'data-wrapper-class': 'box-style fixed-width mobile',
                'name': 'twoFactorEmail',
                'readonly': true,
                'title': l[1331],
                'type': 'text'
            }, this.copyTabNode);

            // Shared secret code input
            mCreateElement('input', {
                'class': 'underlinedText twoFactorCode copyButton',
                'data-wrapper-class': 'box-style fixed-width mobile',
                'name': 'twoFactorCode',
                'readonly': true,
                'title': l.two_code_placeholder,
                'type': 'text'
            }, this.copyTabNode);

            // Scan QR code content
            this.scanTabNode = mCreateElement('div', {
                'class': 'two-factor-tab-item scan hidden'
            }, this.setupNode);

            // Scan QR code details
            mCreateElement('h2', undefined, this.scanTabNode).textContent = l.two_fa_scan_header;
            mCreateElement('p', {
                'class': 'setup-details'
            }, this.scanTabNode).textContent = l.two_fa_scan_details;

            // QR code image wrapper
            this.qrCodeNode = mCreateElement('div', {'class': 'qr-code-img'}, this.scanTabNode);

            // Continue setup button to open 2FA verification overlay
            new MegaMobileButton({
                parentNode: this.setupNode,
                componentClassname: 'form-button block',
                text: l[6826]
            }).on('tap.setupTwoFactor', () => this.enableTwoFA().catch(tell));
        }
    },

    /**
     * Render initial/setup 2FA page
     * @returns {void} void
     */
    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-form');
            this.isEnabled = false;
            this.header = document.querySelector('.mega-header .bottom-block .heading');

            loadingDialog.show();

            mobile.twofactor.isEnabledForAccount()
                .then((res) => {
                    this.isEnabled = res;

                    // Show main page wrapper, update the header
                    this.show();

                    // Render Setup page if setup is in progress and 2FA is disabled
                    if (!res && this.setupProgress) {
                        this.renderSetup();
                    }
                    else {
                        this.renderSettings();
                    }

                    loadingDialog.hide();
                })
                .catch((ex) => {
                    dump(ex);
                    loadSubPage('fm/account/security');
                });
        }
    },

    /**
     * Render initial 2FA settings page, available fpr enabled and disabled 2FA
     * @returns {void} void
     */
    renderSettings: {
        value: function() {
            'use strict';

            this.setupProgress = false;
            this.setupNode.classList.add('hidden');
            this.toggleButton.setButtonState(this.isEnabled);
            this.header.textContent = l[19194];
            this.settingsNode.classList.remove('hidden');
        }
    },

    /**
     * Render Setup 2FA page and components
     * @returns {void} void
     */
    renderSetup: {
        value: function() {
            'use strict';

            this.setupProgress = true;
            this.settingsNode.classList.add('hidden');
            this.header.textContent = l.two_fa_setup_header;
            this.emailInput = new mega.ui.MegaInputs($('.twoFactorEmail', this.setupNode), {
                copyToastText: l.two_fa_email_coppied
            });
            this.codeInput = new mega.ui.MegaInputs($('.twoFactorCode', this.setupNode), {
                copyToastText: l.two_fa_code_coppied
            });
            this.emailInput.setValue(u_attr.email);
            this.codeInput.setValue('');

            // Get a shared secret from the API, set secret code, init QR image
            this.getSharedSecret();

            // Show setup page
            this.setupNode.classList.remove('hidden');

            // "Download app" link event
            $('.two-fa-details a', this.setupNode).rebind('tap.showApps', (e) => {
                e.preventDefault();
                this.showAppsDialog();
            }).addClass('primary-link');
        }
    },

    /**
     * Setup the Two-Factor Authentication by getting a shared secret from the API
     * @returns {void} void
     */
    getSharedSecret: {
        value: function() {
            'use strict';

            loadingDialog.show();

            // Run Multi-Factor Auth Setup (mfas) request
            api.send({a: 'mfas'})
                .then((res) => {
                    assert(res && typeof res === 'string');

                    // Set Base32 seed into text box
                    this.codeInput.setValue(res);

                    // Configure the QR code rendering library
                    // Appears as: MEGA (name@email.com) in authenticator app
                    const options = {
                        width: 152,
                        height: 152,
                        correctLevel: QRErrorCorrectLevel.H,    // High
                        background: 'white',
                        foreground: 'black',
                        text: `otpauth://totp/MEGA:${u_attr.email}?secret=${res}&issuer=MEGA`
                    };

                    // Render the QR code
                    $(this.qrCodeNode).text('').qrcode(options);
                })
                .catch((ex) => {

                    // The Two-Factor has already been setup, return to the My Account page to disable
                    if (ex === EEXIST) {
                        msgDialog('warninga', l[19219], '', '', () => this.back());
                    }
                    else {
                        tell(ex);
                    }
                })
                .finally(() => loadingDialog.hide());
        }
    },

    /**
     * Get the Authenticator PIN code from the user and enable 2FA
     * @param {Number} error API exception value to display an error message in 2FA, optional
     * @returns {void} void
     */
    enableTwoFA: {
        value: async function(error) {
            'use strict';

            // Get the Authenticator PIN code from the user
            const twoFactorPin = await mobile.settings.account.twofactorVerifyAction
                .init(l.two_fa_verify_enable, error);

            // Cancel the process if user closed the overlay
            if (!twoFactorPin) {
                return false;
            }

            loadingDialog.show();

            // Run Multi-Factor Auth Setup (mfas) request
            api.send({a: 'mfas', mfa: twoFactorPin})
                .then(() => {
                    // Hide 2FA overlay
                    mega.ui.overlay.hide();

                    // Show in itial settings page
                    this.back();
                    mega.ui.toast.show(l[19206]);
                })
                .catch((ex) => {

                    // If something went wrong with the 2FA PIN
                    if (ex === EFAILED || ex === EEXPIRED) {
                        this.enableTwoFA(ex).catch(tell);
                        return false;
                    }

                    // Hide 2FA overlay
                    mega.ui.overlay.hide();

                    // The Two-Factor has already been setup
                    if (ex === EEXIST) {
                        msgDialog('warninga', l[19219], '', '', () => this.render());
                    }
                    // If something else went wrong, show an error
                    else {
                        tell(ex);
                    }
                })
                .finally(() => {
                    loadingDialog.hide();
                });
        }
    },

    /**
     * Get the Authenticator PIN code from the user and disable 2FA
     * @param {Number} error API exception value to display an error message in 2FA, optional
     * @returns {void} void
     */
    disableTwoFA: {
        value: async function(error) {
            'use strict';

            // Get the Authenticator PIN code from the user
            const twoFactorPin = await mobile.settings.account.twofactorVerifyAction
                .init(l.two_fa_verify_disable, error);

            // Cancel the process if user closed the overlay
            if (!twoFactorPin) {

                // Set Enabled 2FA state back
                this.toggleButton.setButtonState(this.isEnabled);

                return false;
            }

            loadingDialog.show();

            // Run Multi-Factor Auth Setup (mfas) request
            api.send({a: 'mfad', mfa: twoFactorPin})
                .then(() => {
                    // Hide 2FA overlay
                    mega.ui.overlay.hide();

                    // Update settings page
                    this.render();
                    mega.ui.toast.show(l[19211]);
                })
                .catch((ex) => {

                    // Set Enabled 2FA state back
                    this.toggleButton.setButtonState(this.isEnabled);

                    // If something went wrong with the 2FA PIN
                    if (ex === EFAILED || ex === EEXPIRED) {
                        this.disableTwoFA(ex).catch(tell);
                        return false;
                    }

                    // Hide 2FA overlay
                    mega.ui.overlay.hide();

                    // The Two-Factor has already been disabled
                    if (ex === ENOENT) {
                        msgDialog('warninga', l[19217]);
                    }
                    // If something else went wrong, show an error
                    else {
                        tell(ex);
                    }
                })
                .finally(() => {
                    loadingDialog.hide();
                });
        }
    },

    /**
     * Show Download Apps dialog
     * @returns {void} void
     */
    showAppsDialog: {
        value: function() {
            'use strict';

            M.safeShowDialog('mobile-two-fa-apps', () => {

                // Set required sheet content
                mega.ui.sheet.clear();
                mega.ui.sheet.showClose = true;
                mega.ui.sheet.addTitle(l.two_fa_apps_header);
                mega.ui.sheet.addContents([
                    l[19566],
                    this.createAppButtons()
                ]);

                // Add OK action button
                new MegaMobileButton({
                    parentNode: mega.ui.sheet.actionsNode,
                    componentClassname: 'block',
                    text: l.ok_button
                }).on('tap.closeAppsSheet', () => mega.ui.sheet.hide());

                // Show content
                mega.ui.sheet.show();
            });
        }
    },

    /**
     * Create the app link buttons to load the relevant link for the button clicked and their phone's OS
     * @returns {HTMLDivElement} The generated domNode.
     */
    createAppButtons: {
        value: function() {
            'use strict';

            const platform = is_ios ? 'ios' : is_microsoft ? 'winphone' : 'android';

            // The suggested/supported apps and app store links for each platform
            const appItems = [
                {
                    icon: 'sprite-mobile-fm-uni icon-authy',
                    links: {
                        android: 'https://play.google.com/store/apps/details?id=com.authy.authy',
                        ios: 'https://itunes.apple.com/us/app/authy/id494168017'
                    },
                    text: 'Authy'
                },
                {
                    icon: 'sprite-mobile-fm-uni icon-duo-auth',
                    links: {
                        android: 'https://play.google.com/store/apps/details?id=com.duosecurity.duomobile',
                        ios: 'https://itunes.apple.com/us/app/duo-mobile/id422663827'
                    },
                    text: 'Duo Mobile'
                },
                {
                    icon: 'sprite-mobile-fm-uni icon-google-auth',
                    links: {
                        android: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
                        ios: 'https://itunes.apple.com/us/app/google-authenticator/id388497605'
                    },
                    text: 'Google Authenticator'
                },
                {
                    icon: 'sprite-mobile-fm-uni icon-microsoft-auth',
                    links: {
                        android: 'https://play.google.com/store/apps/details?id=com.azure.authenticator',
                        ios: 'https://itunes.apple.com/app/microsoft-authenticator/id983156458',
                        winphone: 'https://www.microsoft.com/p/microsoft-authenticator/9nblgggzmcj6'
                    },
                    text: 'Microsoft Authenticator'
                }
            ];

            const contentNode = mCreateElement('div', {'class': 'two-fa-app-links'});

            // Create Download app buttons
            for (const item of appItems) {
                if (!item.links[platform]) {
                    continue;
                }

                this.generateMenuItem(contentNode, {
                    binding: () => {
                        mega.ui.sheet.hide();
                        window.open(item.links[platform], '_blank', 'noopener,noreferrer');
                        return false;
                    },
                    defaultRightIcon: true,
                    ...item
                });
            }

            return contentNode;
        }
    },

    /**
     * Show Copy code/Scan QR code tab on Setup page
    * @returns {void} void
     */
    showTab: {
        value: function() {
            'use strict';

            const tabs = document.querySelectorAll('.two-factor-settings .two-factor-tab-item');

            for (let i = 0; i < tabs.length; i++) {
                if (tabs[i].classList.contains(this.key)) {
                    tabs[i].classList.remove('hidden');
                }
                else {
                    tabs[i].classList.add('hidden');
                }
            }
        }
    },

    /**
     * Back to previous page
     * @returns {void} void
     */
    back: {
        value: function() {
            'use strict';

            if (this.setupProgress) {
                this.setupProgress = false;
                this.render();
            }
            else {
                loadSubPage('fm/account/security');
            }
        }
    }
});
