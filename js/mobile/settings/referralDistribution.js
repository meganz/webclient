mobile.settings.account.referralDistribution = Object.create(mobile.settingsHelper, Object.getOwnPropertyDescriptors({

    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init() {
        'use strict';

        if (this.domNode) {
            return this.render();
        }

        this.domNode = this.generatePage('account-referral-distribution');

        // Registration and Purchase tab buttons
        this.tabsComponent = new MegaMobileTab({
            parentNode:  this.domNode,
            componentClassname: 'account-referral-tabs',
            tabs: [
                { name: l[22710], key: 'reg', active: true, onSelect: this.showTab, type: 'normal' },
                { name: l[22711], key: 'pur', active: false, onSelect: this.showTab, type: 'normal' }
            ],
            tabContentClassname: 'tab-content'
        });

        // Registrations tab content
        this.registratrionsTab = mCreateElement('div', {
            class: 'account-referral tab-content reg'
        }, this.domNode);

        // Purchases tab content
        this.purchasesTab = mCreateElement('div', {
            class: 'account-referral tab-content pur hidden'
        }, this.domNode);

        this.render();
    },

    render() {
        'use strict';

        mobile.settings.account.referral.getData(() => {
            this.updateTabsContent();
            this.show();
        });
    },

    /**
     * Update registration/purchases tabs content
     * @returns {Void} void function
     */
    updateTabsContent() {
        'use strict';

        const signupGeo = Object.create(null);
        const creditGeo = Object.create(null);

        // Get Registrations data
        for (const item of M.affiliate.signupList) {
            signupGeo[item.cc] = ++signupGeo[item.cc] || 1;
        }

        // Get Purchases data
        for (const item of M.affiliate.creditList.active.concat(M.affiliate.creditList.pending)) {
            creditGeo[item.cc] = ++creditGeo[item.cc] || 1;
        }

        // Create a list or empty list component
        const _createList = (countList, node, type) => {

            // Sort data by registration values
            const ordered = Object.keys(countList).sort((a, b) => {
                return signupGeo[b] - signupGeo[a];
            });

            // Clear tab content
            node.textContent = '';

            // Create empty list component
            if (!ordered.length) {
                return this.renderEmptyTab(node, type);
            }

            // Create a list
            for (const item of ordered) {
                const country = countrydetails(item);
                let itemNode = null;

                itemNode = mCreateElement('div', { class: 'list-item' }, node);
                mCreateElement('img', { alt: '', src: `${staticpath}images/flags/${country.icon}` }, itemNode);
                mCreateElement('span', undefined, itemNode).textContent = country.name || 'Unknown';
                mCreateElement('span', { class: 'num' }, itemNode).textContent = countList[item];
            }
        };

        _createList(signupGeo, this.registratrionsTab, 'signup');
        _createList(creditGeo, this.purchasesTab, 'credit');
    },

    /**
     * Render empty tab UI
     * @param {Object} node Wrapper DOM element
     * @param {String} type "signup" or "credit" type
     * @returns {Void} void function
     */
    renderEmptyTab(node, type) {
        'use strict';

        const emptyNode = new MegaOverlay({
            parentNode: node,
            componentClassname: 'mega-empty-states',
            wrapperClassname: 'empty-states'
        });

        emptyNode.show({
            name: 'empty-state',
            showClose: false,
            icon: 'details',
            title: type === 'signup' ? l.no_referral_registrations :  l.no_referral_purchases,
            titleType: 'h2',
            contents: [type === 'signup' ? l.no_referral_registrations_hint : l.no_referral_purchases_hint]
        });
    },

    /**
     * Show Registraions/Purchases tab content
    * @returns {void} void
     */
    showTab() {
        'use strict';

        const tabs = document.querySelectorAll('.account-referral-distribution .tab-content');

        for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].classList.contains(this.key)) {
                tabs[i].classList.remove('hidden');
            }
            else {
                tabs[i].classList.add('hidden');
            }
        }
    }
}));


