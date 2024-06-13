mobile.settings.account.referral = Object.create(mobile.settingsHelper, Object.getOwnPropertyDescriptors({

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

        this.domNode = this.generatePage('account-referral-program');

        // Comission index info block
        new MegaMobileInfoMenuItem({
            componentClassname: 'no-active',
            type: 'fullwidth',
            iconSize: 24,
            tipIcon: 'sprite-mobile-fm-mono icon-info-thin-outline',
            text: l[22690],
            icon: 'sprite-mobile-fm-mono icon-dollar-sign-thin',
            parentNode: this.domNode
        }).on('tap.redeem', (e) => {

            // Show tip on tip icon tap only
            if (e.data.target.classList.contains('tip-icon')) {
                this.showCommisionTip();
            }
        });

        // Comission index wrapper
        const node = mCreateElement('div', {'class': 'comission-wrapper'}, this.domNode);
        let subNode = mCreateElement('div', {'class': 'comission-item total'}, node);

        // Total amount
        mCreateElement('div', { class: 'name' }, subNode)
            .textContent = l.total_referral_comission;
        mCreateElement('div', { class: 'local' }, subNode);
        mCreateElement('div', { class: 'euro' }, subNode);

        // Pending amount
        subNode = mCreateElement('div', {'class': 'comission-item pending'}, node);
        mCreateElement('div', { class: 'name' }, subNode)
            .textContent = l.pending_referral_comission;
        mCreateElement('div', { class: 'local' }, subNode);
        mCreateElement('div', { class: 'euro' }, subNode);

        // Available amount
        subNode = mCreateElement('div', {'class': 'comission-item available'}, node);
        mCreateElement('div', { class: 'name' }, subNode)
            .textContent = l.available_referral_comission;
        mCreateElement('div', { class: 'local' }, subNode);
        mCreateElement('div', { class: 'euro' }, subNode);

        // Redeem button, disabled by default
        this.redeemBtn = new MegaMobileButton({
            disabled: true,
            parentNode: node,
            componentClassname: 'form-button block',
            text: l.redeem_commissions_label
        }).on('tap.redeem', () => loadSubPage('/fm/refer/redeem'));

        // Registrations info block
        this.registrationNode = new MegaMobileInfoMenuItem({
            componentClassname: 'no-active',
            type: 'fullwidth',
            iconSize: 24,
            text: l[22699],
            icon: 'sprite-mobile-fm-mono icon-users-thin-outline',
            parentNode: this.domNode
        });

        // Purchases info block
        this.purchasesNode = new MegaMobileInfoMenuItem({
            componentClassname: 'no-active',
            type: 'fullwidth',
            iconSize: 24,
            text: l[22703],
            icon: 'sprite-mobile-fm-mono icon-creditcard-thin-outline',
            parentNode: this.domNode
        });

        // Program guide link
        this.generateMenuItem(this.domNode, {
            text: l[22683],
            icon: 'sprite-mobile-fm-mono icon-file-text-thin-outline',
            href: 'fm/refer/guide'
        });

        // Redemption history link
        this.generateMenuItem(this.domNode, {
            text: l[22808],
            icon: 'sprite-mobile-fm-mono icon-file-search-01-thin-outline',
            href: 'fm/refer/history'
        });

        // Geographic distribution link
        this.generateMenuItem(this.domNode, {
            text: l[22709],
            icon: 'sprite-mobile-fm-mono icon-map-pin-thin-outline',
            href: 'fm/refer/distribution'
        });

        this.render();
    },

    /**
     * Render page with all completed data
     * @returns {void} void
     */
    render() {
        'use strict';

        this.getData(() => {
            this.updateReferralData();
            this.show();
        });
    },

    /**
     * Get referral program data
     * @param {Function} callback Function to run after receiving data
     * @returns {void} void
     */
    getData(callback) {
        'use strict';

        loadingDialog.show('affiliateRefresh');

        // Note: Referral Program is called as affiliate program at begining,
        // so some systemic names are under word affiliate i.e. affiliate === referral
        M.affiliate.getAffiliateData()
            .then(() => {
                M.affiliate.lastupdate = Date.now();

                if (typeof callback === 'function') {
                    callback();
                }
            })
            .catch(() => {
                if (d) {
                    console.error('Pulling affiliate data failed due to one of it\'s operation failed.');
                }
                msgDialog('warninga', l[7235], `${l[200]} ${l[253]}`);
            })
            .finally(() => loadingDialog.hide('affiliateRefresh'));
    },

    /**
     * Update referral program data on the main page
     * @returns {void} void
     */
    updateReferralData() {
        'use strict';

        const thisMonth = calculateCalendar('m');
        const { balance } = M.affiliate;
        const creditList = M.affiliate.creditList.active.concat(M.affiliate.creditList.pending);
        let thisMonthRegCount = 0;
        let thisMonthPurCount = 0;
        let localTotal = 0;
        let localPending = 0;
        let localAvailable = 0;

        this.currency = '';

        // Set Comission index values in EUR as base
        if (balance.localCurrency === 'EUR') {
            localTotal = formatCurrency(balance.localTotal);
            localPending = formatCurrency(balance.localPending);
            localAvailable = formatCurrency(balance.localAvailable);
        }
        else {
            // Cache the currency value to adapt text in Comission index overlay
            this.currency = balance.localCurrency;

            // Set values in EUR as an addition
            this.domNode.querySelector('.total .euro').textContent =
                `(${formatCurrency(balance.pending + balance.available)})`;
            this.domNode.querySelector('.pending .euro').textContent =
                `(${formatCurrency(balance.pending)})`;
            this.domNode.querySelector('.available .euro').textContent =
                `(${formatCurrency(balance.available)})`;

            // Set values in local currncy as base
            localTotal = formatCurrency(balance.localTotal, this.currency, 'number');
            localPending = formatCurrency(balance.localPending, this.currency, 'number');
            localAvailable = formatCurrency(balance.localAvailable, this.currency, 'number');
        }

        // Set Comission index base values
        this.domNode.querySelector('.total .local').textContent = `${localTotal} ${this.currency}`;
        this.domNode.querySelector('.pending .local').textContent = `${localPending} ${this.currency}`;
        this.domNode.querySelector('.available .local').textContent = `${localAvailable} ${this.currency}`;

        // Get registrations for the month
        for (const item of M.affiliate.signupList) {
            if (thisMonth.start <= item.ts && item.ts <= thisMonth.end) {
                thisMonthRegCount++;
            }
        }

        // Get purchases for the month
        for (const item of creditList) {
            if (thisMonth.start <= item.gts && item.gts <= thisMonth.end) {
                thisMonthPurCount++;
            }
        }

        // Set registrations data
        this.registrationNode.subtext = `(${l.plus_x_this_month.replace('%1', thisMonthRegCount)})`;
        this.registrationNode.dataValue = M.affiliate.signupList.length;

        // Set purchases data
        this.purchasesNode.subtext = `(${l.plus_x_this_month.replace('%1', thisMonthPurCount)})`;
        this.purchasesNode.dataValue = creditList.length;

        // Toggle Redeem button disabled state
        // Redeem requires at least one payment history and available balance more than 50 euro
        if (M.affiliate.redeemable && M.affiliate.balance.available >= 50 && M.affiliate.utpCount) {
            this.redeemBtn.disabled = false;
        }
        else {
            this.redeemBtn.disabled = true;
        }
    },

    /**
     * Show Comission index overlay
     * @returns {void} void
     */
    showCommisionTip() {
        'use strict';

        const content = `<div class="referral-comission-info">`
            + `<p>${l.pending_commission_tip}</p>`
            + `<p>${l.available_commission_tip} ${u_attr.b || u_attr.pf ? '' : l.go_to_pro}`
            + `<span class="tip${this.currency ? '' : ' hidden'}">${l[22875]}</span>`
            + `</p><p>${l.commission_amount_tip}</p></div>`;

        mega.ui.sheet.show({
            name: 'referral-comission-info',
            title: l[22690],
            type: 'normal',
            showClose: true,
            contents: [parseHTML(content)]
        });
    }
}));


