mobile.settings.fileManagement = Object.create(mobile.settingsHelper, {
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

            this.domNode = this.generatePage('file-management');

            /* First Section */
            const menuItems = [
                /* {
                    text: l[20168],
                    icon: 'sprite-mobile-fm-mono icon-clock-rotate-thin-outline',
                    href: 'fm/account/file-management/file-version',
                },*/
                /* {
                    text: l.settings_file_management_rubbish_cleaning,
                    icon: 'sprite-mobile-fm-mono icon-trash-thin-outline',
                    href: 'fm/account/file-management/rubbish-cleaning',
                },*/
                {
                    text: l.setting_section_plink,
                    icon: 'sprite-mobile-fm-mono icon-link-thin-outline',
                    href: 'fm/account/file-management/link-options',
                },
            ];

            for (const item of menuItems) {
                this.generateMenuItem(this.domNode, item);
            }

            this.show();
        },
    },
});
