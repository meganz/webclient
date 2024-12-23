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
                    sublabel: l.setting_plink_warn,
                    reversedValue: 1
                }
            ];

            if (mega.sensitives.featureEnabled) {
                toggleArray.push({
                    value: 'showSen',
                    id: 'showSen',
                    label: l.show_hidden_files,
                    sublabel: l.show_hidden_files_txt,
                    onChangeFunction: (val) => mega.sensitives.onConfigChange(val)
                });
            }

            // Build toggle components and store in togglesComponents array by id
            this.togglesComponents = [];
            for (const toggle of toggleArray){
                const toggleComponent = new MegaToggleButton({
                    parentNode: toggleList,
                    componentClassname: 'mega-toggle-button',
                    ...toggle,
                    role: 'switch',
                    onChange: () => {
                        const val = toggleComponent.checked ^ toggleComponent.input.reversedValue;
                        mega.config.setn(toggleComponent.input.name, val);
                        if (toggleComponent.input.onChangeFunction) {
                            toggleComponent.input.onChangeFunction(val);
                        }
                    }
                });
                this.togglesComponents[toggle.id] = toggleComponent;
            }

            // Fetch account data, then render.
            M.accountData(() => {
                mega.config.fetch();
                this.render();
            }, true, true);
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

            for (const id in this.togglesComponents) {
                if (this.togglesComponents.hasOwnProperty(id)) {
                    const toggleComponent = this.togglesComponents[id];
                    const state = !!(mega.config.get(toggleComponent.input.name) ^ toggleComponent.input.reversedValue);
                    toggleComponent.setButtonState(state);
                }
            }
        },
    }
});
