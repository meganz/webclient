mobile.settings.support  = Object.create(mobile.settingsHelper, {
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

            this.domNode = this.generatePage('settings-support');

            /* First Section */
            const menuItems1 = [
                {
                    text: l.mobile_settings_help_title,
                    icon: 'sprite-mobile-fm-mono icon-headset-thin-outline',
                    href: "help",
                    rightIcon: null
                },
                {
                    text: l.mobile_settings_contact_title,
                    icon: 'sprite-mobile-fm-mono icon-phone-01-thin-outline',
                    href: 'contact',
                    rightIcon: null
                },
                {
                    text: l.menu_item_priority_support,
                    icon: 'sprite-mobile-fm-mono icon-message-circle-thin-outline',
                    href: 'support',
                    rightIcon: null,
                    componentClassname: 'priority-support'
                }
            ];

            for (const item of menuItems1) {
                this.generateMenuItem(this.domNode, item);
            }

            this.show();
        }
    },

    show: {
        value: function() {

            mobile.settingsHelper.show.call(this);

            if (u_attr.p) {
                this.domNode.componentSelector('.priority-support').show();
            }
            else {
                this.domNode.componentSelector('.priority-support').hide();
            }
        }
    }
});
