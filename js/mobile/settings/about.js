mobile.settings.about  = Object.create(mobile.settingsHelper, {
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

            this.domNode = this.generatePage('settings-about');

            /* First Section */
            const menuItems1 = [
                {
                    text: l.mobile_settings_website_title,
                    icon: "sprite-mobile-fm-mono icon-globe-01-thin-outline",
                    href: 'https://mega.io',
                    target: "_blank",
                    rightIcon: null
                },
                {
                    text: l.mobile_settings_pricing_title,
                    icon: "sprite-mobile-fm-mono icon-dollar-sign-thin",
                    href: 'pro',
                    rightIcon: null,
                    componentClassname: 'pricing-btn'
                },
                {
                    text: l.mobile_settings_tos_title,
                    icon: "sprite-mobile-fm-mono icon-clipboard-thin",
                    href: 'fm/account/about/terms-policies'
                },
                {
                    text: l[24644],
                    icon: 'sprite-mobile-fm-mono icon-settings-thin-outline',
                    binding: () => {
                        if ('csp' in window) {
                            csp.trigger().dump('csp.trigger');
                        }
                    }
                }
            ];

            for (const item of menuItems1) {
                this.generateMenuItem(this.domNode, item);
            }

            const $pricingBtn = this.domNode.componentSelector('.pricing-btn');

            if (u_attr && (u_attr.pf || u_attr.b)) {
                $pricingBtn.addClass('hidden');
            }

            this.show();
        }
    }
});
