mobile.settings.privacyAndSecurity = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: function() {

            'use strict';

            if (this.domNode) {
                this.domNode.textContent = '';
            }
            else {
                this.domNode = this.generatePage('settings-privacy-security');
            }

            /* First Section */
            const menuItems1 = [
                {
                    text: l[8839],
                    icon: 'sprite-mobile-fm-mono icon-key-02-thin-outline',
                    href: 'fm/account/security/backup-key',
                    eventLog: 99838
                },
                {
                    text: l['2fa_menu'],
                    icon: 'sprite-mobile-fm-mono icon-shield-thin-outline',
                    href: 'fm/account/security/two-factor-authentication',
                    eventLog: 99839
                },
                {
                    text: l[429],
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
