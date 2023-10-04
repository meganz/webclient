mobile.settings.privacyAndSecurity = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: async function() {

            'use strict';

            if (this.domNode) {
                this.domNode.textContent = '';
            }
            else {
                this.domNode = this.generatePage('settings-privacy-security');
            }

            const isTwoFactorEnabled = await mobile.twofactor.isEnabledForAccount();
            const twoFactorLink = isTwoFactorEnabled
                ? 'fm/account/security/two-factor-authentication/verify-disable'
                : 'fm/account/security/two-factor-authentication/intro';

            /* First Section */
            const menuItems1 = [
                {
                    text: l.recovery_key_menu,
                    icon: 'sprite-mobile-fm-mono icon-key-02-thin-outline',
                    href: 'fm/account/security/backup-key',
                    eventLog: 99838
                },
                {
                    text: l['2fa_menu'],
                    icon: 'sprite-mobile-fm-mono icon-shield-thin-outline',
                    href: twoFactorLink,
                    eventLog: 99839
                },
                {
                    text: l.sess_his_menu,
                    icon: 'sprite-mobile-fm-mono icon-clock-rotate-thin-outline',
                    href: 'fm/account/security/session-history',
                    eventLog: 99841
                }
            ];

            for (const item of menuItems1) {
                this.generateMenuItem(this.domNode, item);
            }

            this.show();
        }
    }
});
