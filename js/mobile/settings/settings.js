mobile.settings = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: function() {
            'use strict';

            if (this.domNode) {
                this.show();
                return true;
            }

            this.domNode = this.generatePage('settings-root');

            /* First Section */
            const menuItems1 = [
                {
                    text: l.mobile_settings_notifications_title,
                    icon: 'sprite-mobile-fm-mono icon-bell-thin',
                    href: 'fm/account/notifications',
                    eventLog: 99840
                },
                {
                    text: l.mobile_settings_privacy_security_title,
                    icon: 'sprite-mobile-fm-mono icon-lock-thin-outline',
                    href: 'fm/account/security',
                },
                {
                    text: l.mobile_settings_file_manage_title,
                    icon: 'sprite-mobile-fm-mono icon-folder-thin-outline',
                    href: 'fm/account/file-management',
                    eventLog: 99842
                },
                {
                    text: l.mobile_settings_appearance_title,
                    icon: 'sprite-mobile-fm-mono icon-palette-thin-outline',
                    binding: () => {
                        mobile.appearance.init();
                    },
                },
            ];

            for (const item of menuItems1) {
                this.generateMenuItem(this.domNode, item);
            }

            /* Second Section */
            const subNode = document.createElement('h2');
            subNode.classList.add('settings-heading');
            subNode.innerText = l.more_settings_more_info_title;
            this.domNode.appendChild(subNode);

            const menuItems2 = [
                {
                    text: l.mobile_settings_about_title,
                    icon: "sprite-mobile-fm-mono icon-mega-thin-outline",
                    href: 'fm/account/about',
                },
                {
                    text: l.mobile_settings_support_title,
                    icon: "sprite-mobile-fm-mono icon-headset-thin-outline",
                    href: 'fm/account/support',
                },
            ];

            for (const item of menuItems2) {
                this.generateMenuItem(this.domNode, item);
            }

            this.show();
        },
    },
});

