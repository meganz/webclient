mobile.terms  = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init : {
        value : function() {
            'use strict';

            if (this.domNode) {
                this.show();
                return true;
            }

            this.domNode = this.generatePage('settings-terms');

            /* First Section */
            const menuItems1 = [
                {
                    text: l[385],
                    icon: "sprite-mobile-fm-mono icon-file-text-thin-outline",
                    href: 'https://mega.io/terms',
                    target: '_blank',
                    rightIcon: null
                },
                {
                    text: l[386],
                    icon: "sprite-mobile-fm-mono icon-lock-thin-outline",
                    href: 'https://mega.io/privacy',
                    target: '_blank',
                    rightIcon: null
                },
                {
                    text: l[24629],
                    icon: 'sprite-mobile-fm-mono icon-cookie-thin-outline',
                    href: `${getBaseUrl()}/cookie`,
                    target: '_blank',
                    rightIcon: null
                }
            ];

            for (const item of menuItems1) {
                this.generateMenuItem(this.domNode, item);
            }

            this.show();
        }
    }
});
