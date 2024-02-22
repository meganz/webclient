mobile.settings.fileManagement = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page.
     *
     * @returns {void}
     */
    init: {
        value: function() {
            'use strict';

            if (this.domNode) {
                return this.render();
            }

            this.domNode = this.generatePage('settings-file-management');

            const container = mCreateElement('div', {
                'class': 'mobile-settings-content',
            }, this.domNode);

            const form = mCreateElement('div', {
                'class': 'mobile-settings-form',
            }, container);

            const toggleList = mCreateElement('div', {
                'class': 'mobile-settings-list',
            }, form);

            // Options for toggle list
            const toggleArray = [
                {
                    value: 'nowarnpl',
                    id: 'nowarnpl',
                    label: l.setting_section_plink,
                    sublabel: l.setting_plink_warn
                }
            ];

            // Build toggle components and store in togglesComponents array by id
            this.togglesComponents = [];
            for (const toggle of toggleArray){
                const toggleComponent = new MegaMobileToggleButton({
                    parentNode: toggleList,
                    componentClassname: 'mega-toggle-button',
                    ...toggle,
                    role: 'switch',
                    onChange: () => {
                        mega.config.setn(toggleComponent.input.name, toggleComponent.checked ^ 1);
                    }
                });
                this.togglesComponents[toggle.id] = toggleComponent;
            }

            // Fetch account data, then render.
            M.accountData(() => {
                mega.config.fetch();
                this.render();
            }, false, true);
        },
    },

    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-page', 'default-form');

            this.setTogglesStatus();

            this.show();
        },
    },

    /**
     * Set the status of each of the toggles.
     *
     * @returns {void}
     */
    setTogglesStatus: {
        value: function() {
            'use strict';

            loadingDialog.show();

            for (const id in this.togglesComponents) {
                if (this.togglesComponents.hasOwnProperty(id)) {
                    const toggleComponent = this.togglesComponents[id];
                    toggleComponent.setButtonState(!mega.config.get(toggleComponent.input.name));
                }
            }

            loadingDialog.hide();
        },
    }
});
