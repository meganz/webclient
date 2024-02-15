mobile.settings.notifications = Object.create(mobile.settingsHelper, {
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

            this.domNode = this.generatePage('settings-notifications');

            const container = mCreateElement('div', {
                'class': 'mobile-settings-content',
            }, this.domNode);

            const form = mCreateElement('div', {
                'class': 'mobile-settings-form',
            }, container);

            mCreateElement('div', {
                'class': 'mobile-settings-prompt',
            }, form).textContent = l[20898];

            const toggleList = mCreateElement('div', {
                'class': 'mobile-settings-list',
            }, form);

            // Build toggle ALL component
            this.toggleAllComponent = new MegaMobileToggleButton({
                parentNode: toggleList,
                componentClassname: 'mega-toggle-button',
                value: 'all',
                id: 'enotif-all',
                label: l[20897],
                role: 'switch',
                onChange: () => {
                    mega.enotif.setAllState(!this.toggleAllComponent.checked);
                    this.setTogglesStatus();
                }
            });

            // Options for toggle list
            const toggleArray = [
                {
                    value: 'contact-request',
                    id: 'enotif-contact-request',
                    label: l.notifications_contact_request
                },
                {
                    value: 'chat-message',
                    id: 'enotif-chat-message',
                    label: l.notifications_chat_message
                },
                {
                    value: 'achievements',
                    id: 'enotif-achievements',
                    label: l[20891],
                    sublabel: l[20892]
                },
                {
                    value: 'quota',
                    id: 'enotif-quota',
                    label: l[20893],
                },
                {
                    value: 'account-inactive',
                    id: 'enotif-inactive',
                    label: l[20895],
                },
                {
                    value: 'referral-program',
                    id: 'enotif-referral-program',
                    label: l[23280],
                },
                {
                    value: 'card-expiry',
                    id: 'enotif-card-expiry',
                    label: l.payment_card_noti_title,
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
                        mega.enotif.setState(toggleComponent.input.name, !toggleComponent.checked);
                        this.setToggleAllStatus();
                    }
                });
                this.togglesComponents[toggle.id] = toggleComponent;
            }

            M.accountData(() => {
                this.render();
            }, false, true);

            eventlog(99805);
        },
    },

    render: {
        value: function() {
            'use strict';

            this.domNode.classList.add('default-page', 'default-form');

            // Hide achievements toggle if achievements not an option for the user
            if (M.maf) {
                this.togglesComponents['enotif-achievements'].removeClass('hidden');
            }
            else {
                this.togglesComponents['enotif-achievements'].addClass('hidden');
            }

            // Hide card expiry toggle if card expiry not an option for the user
            if ((u_attr.p || u_attr.b) && M.account.stype === 'S'
                && (Array.isArray(M.account.sgw) && M.account.sgw.includes('Stripe')
                    || Array.isArray(M.account.sgwids)
                    && M.account.sgwids.includes((addressDialog || {}).gatewayId_stripe || 19))) {
                this.togglesComponents['enotif-card-expiry'].removeClass('hidden');
            }
            else {
                this.togglesComponents['enotif-card-expiry'].addClass('hidden');
            }

            this.setTogglesStatus(true);

            this.show();
        },
    },

    /**
     * Set the status of toggle ALL depending on the status of toggle list.
     * If all toggles in the list are on, the global state will be on.
     * Otherwise, off.
     *
     * @returns {void}
     */
    setToggleAllStatus: {
        value: function() {
            'use strict';

            let globalState = true;
            for (const id in this.togglesComponents) {
                if (this.togglesComponents.hasOwnProperty(id)) {
                    const toggleComponent = this.togglesComponents[id];
                    if (!toggleComponent.checked && !toggleComponent.hasClass('hidden')) {
                        globalState = false;
                    }
                }
            }
            this.toggleAllComponent.setButtonState(globalState);
        },
    },

    /**
     * Set the status of each of the toggles.
     * Also, set the status of toggle ALL if initial is true.
     * @param {Boolean} initial
     *
     * @returns {void}
     */
    setTogglesStatus: {
        value: function(initial) {
            'use strict';

            loadingDialog.show();

            // Load the enotify settings
            mega.enotif.all().then((enotifStates) => {
                for (const id in this.togglesComponents) {
                    if (this.togglesComponents.hasOwnProperty(id)) {
                        const toggleComponent = this.togglesComponents[id];
                        toggleComponent.setButtonState(!enotifStates[toggleComponent.input.name]);
                    }
                }

                if (initial) {
                    this.setToggleAllStatus();
                }

                loadingDialog.hide();
            });
        },
    }
});
