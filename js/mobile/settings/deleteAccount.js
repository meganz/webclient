mobile.settings.account.deleteAccount = Object.create(mobile.settingsHelper, {
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

            this.domNode = this.generatePage('settings-account-delete');

            const contentDiv = mCreateElement('div', {
                'class': 'mobile-settings-content'
            }, this.domNode);

            this.result = mCreateElement('div', {
                'class': 'mobile-settings-result bold-style',
            }, contentDiv);

            this.prompt = mCreateElement('div', {
                'class': 'mobile-settings-prompt'
            }, contentDiv);

            this.info = mCreateElement('div', {
                'class': 'mobile-settings-info'
            }, contentDiv);

            const buttonsDiv = mCreateElement('div', {
                'class': 'mobile-settings-buttons'
            }, this.domNode);

            this.deleteButton = new MegaMobileButton({
                parentNode: buttonsDiv,
                componentClassname: 'mobile-settings-button block',
                text: l[16115]
            }).on('tap.deleteAccount', () => this.deleteAccount().catch(tell));

            this.noDeleteButton = new MegaMobileButton({
                parentNode: buttonsDiv,
                componentClassname: 'mobile-settings-button block secondary',
                text: l.account_no_delete
            }).on('tap.noDeleteAccount', () => loadSubPage('fm/account'));

            this.render();
        }
    },

    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-page');

            this.result.textContent = l.account_delete_warning;
            this.prompt.textContent = l.account_delete_info_title;
            this.info.textContent = '';
            this.renderInfo(this.info);

            this.deleteButton.text = l[16115];

            this.show();
        }
    },

    renderInfo: {
        value: function(parentNode) {
            'use strict';

            const ulInfo = mCreateElement('ul', {}, parentNode);

            mCreateElement('li', {}, ulInfo).textContent = l.account_delete_info_1;
            mCreateElement('li', {}, ulInfo).textContent = l.account_delete_info_2;
            mCreateElement('li', {}, ulInfo).textContent = l.account_delete_info_3;
            mCreateElement('li', {}, ulInfo).textContent = l.account_delete_info_4;
        }
    },

    deleteAccount: {
        value: async function() {
            'use strict';

            const hasTwoFactor = await twofactor.isEnabledForAccount();
            let twoFactorPin = null;

            if (hasTwoFactor &&
                !(twoFactorPin = await mobile.settings.account.twofactorVerifyAction.init())) {
                return false;
            }
            this.continueDeleteAccount(twoFactorPin);
        }
    },

    /**
     * Initiate the delete account request to the API
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     * @returns {void} void
     */
    continueDeleteAccount: {
        value: function(twoFactorPin) {
            'use strict';

            loadingDialog.show();

            // Prepare the request
            var requestParams = {
                a: 'erm',
                m: u_attr.email,
                t: 21
            };

            // If 2FA PIN is set, add it to the request
            if (twoFactorPin !== null) {
                requestParams.mfa = twoFactorPin;
            }

            // Delete account request
            api.req(requestParams)
                .then(() => {
                    this.result.textContent = '';
                    this.prompt.textContent = l.account_email_confirmation_sent;

                    this.info.textContent = '';
                    mCreateElement('p', {}, this.info).textContent = l.account_delete_email_confirmation_sent
                        .replace('%1', u_attr.email);
                    mCreateElement('p', {}, this.info).textContent = l.account_delete_email_confirmation_no_receive;

                    this.deleteButton.text = l.resend_email;

                    mobile.showToast(l.email_confirmation_sent.replace('%1', u_attr.email));
                })
                .catch((ex) => {

                    // Check for invalid 2FA code
                    if (ex === EFAILED || ex === EEXPIRED) {
                        msgDialog('warninga', l[135], l[19216]);
                    }
                    // Check for incorrect email
                    else if (ex === ENOENT) {
                        msgDialog('warningb', l[1513], l[1946]);
                    }
                    else {
                        msgDialog('warningb', l[135], l[200]);
                    }
                })
                .finally(() => loadingDialog.hide());
        }
    }
});
