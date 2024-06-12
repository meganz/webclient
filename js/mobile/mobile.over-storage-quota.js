/**
 * Controller for the over StorageQuota.
 */
mobile.overStorageQuota = {
    isVisible: false,
    advertiseFlexi: false,
    advertiseMini: false,
    quotaInfo: null,

    /**
     * Show the banner and sheet dialog
     *
     * @returns {void}
     */
    async show() {
        'use strict';

        mega.ui.sheet.hide();

        if (!this.isVisible) {
            const banner = mobile.banner.show(
                l.storage_full, l.storage_full_msg, l.upgrade_now, 'error', false);
            banner.on('cta', () => {
                loadSubPage('pro');
            });

            this.isVisible = true;
        }

        if (!this.quotaInfo) {
            this.quotaInfo = await M.getStorageQuota();
        }

        pro.loadMembershipPlans(() => {
            const sheetContents = this.getSheetContents(true);

            mega.ui.sheet.show({
                name: 'over-storage',
                type: 'modal',
                showClose: true,
                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
                title: l.cloud_strg_100_percent_full,
                contents: [sheetContents],
                actions: [
                    {
                        type: 'normal',
                        text: l.upgrade_now,
                        className: 'primary',
                        onClick: () => {
                            mega.ui.sheet.hide();
                            if (this.advertiseFlexi) {
                                sessionStorage.mScrollTo = 'flexi';
                            }
                            else if (this.advertiseMini) {
                                sessionStorage.mScrollTo = 'exc';
                            }
                            loadSubPage('pro');
                        }
                    }
                ]
            });
        });
    },

    /**
     * Get the contents for the over storage quota dialog
     *
     * @param {Boolean} storageQuotaFull whether the storage quota is full or not
     * @returns {HTMLDivElement} contentsDiv
     */
    getSheetContents(storageQuotaFull) {
        'use strict';

        let upgradeString;
        let upgradeTo;
        this.advertiseFlexi = false;
        this.advertiseMini = false;

        const lowestRequiredPlan = pro.filter.lowestRequired(this.quotaInfo.cstrg, 'storageTransferDialogs');
        const isEuro = !lowestRequiredPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
        const lowestPlanLevel = lowestRequiredPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL];

        // If user requires lowest available plan (Pro Lite or a Mini plan)
        if (pro.filter.simple.lowStorageQuotaPlans.has(lowestPlanLevel)) {
            upgradeString = isEuro
                ? l[16313]
                : l.cloud_strg_upgrade_price_ast;
            upgradeTo = 'min';
            this.advertiseMini = true;
        }
        // If user requires pro flexi
        else if (lowestPlanLevel === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            upgradeString = l.over_storage_upgrade_flexi;
            upgradeTo = 'flexi';
            this.advertiseFlexi = true;
        }
        // User requires a regular plan
        else {
            upgradeString = l.over_storage_upgrade_pro;
            upgradeTo = 'regular';
        }

        const planName = pro.getProPlanName(lowestPlanLevel);

        const localPrice = isEuro
            ? lowestRequiredPlan[pro.UTQA_RES_INDEX_PRICE]
            : lowestRequiredPlan[pro.UTQA_RES_INDEX_LOCALPRICE];

        const localCurrency = isEuro
            ? 'EUR'
            : lowestRequiredPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];

        if (upgradeTo !== 'flexi') {
            upgradeString = upgradeString.replace('%1', planName)
                .replace('%2', formatCurrency(localPrice, localCurrency, 'narrowSymbol'))
                .replace('%3', bytesToSize(lowestRequiredPlan[pro.UTQA_RES_INDEX_STORAGE] * pro.BYTES_PER_GB, 0))
                .replace('%4', bytesToSize(lowestRequiredPlan[pro.UTQA_RES_INDEX_TRANSFER] * pro.BYTES_PER_GB, 0));
        }

        const contentsDiv = document.createElement('div');
        contentsDiv.className = 'storage-dialog-contents';

        // Show user the percentage of storage quota they've used
        if (!storageQuotaFull) {
            const {percent, mstrg} = this.quotaInfo;

            const titleAndPercentDiv = document.createElement('div');
            titleAndPercentDiv.className = 'title-and-percent-used';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'title-text';
            titleDiv.append(l[16312]);

            const percUsedDiv = document.createElement('div');
            percUsedDiv.className = 'percentage-used';
            percUsedDiv.append(l.storage_quota_used.replace('%1', percent).replace('%2', bytesToSize(mstrg, 0)));

            titleAndPercentDiv.append(titleDiv);
            titleAndPercentDiv.append(percUsedDiv);
            contentsDiv.append(titleAndPercentDiv);
        }

        const upgradeDiv = document.createElement('div');
        upgradeDiv.className = 'blurb-text';
        upgradeDiv.append(upgradeString);

        const rubbishDiv = document.createElement('div');
        rubbishDiv.className = 'rubbish-bin-text';
        rubbishDiv.append(parseHTML(l[16306]));

        // Add touchend event to span tag as a workaround to load fm/rubbish without
        // a page reload
        rubbishDiv.querySelector('span.gotorub').addEventListener('touchend', () => {
            mega.ui.sheet.hide();
            mega.ui.overlay.hide();
            loadSubPage('fm/rubbish');
        });

        contentsDiv.append(upgradeDiv);
        contentsDiv.append(rubbishDiv);

        if (!isEuro && upgradeTo === 'min') {
            const disclaimerDiv = document.createElement('div');
            disclaimerDiv.className = 'disclaimer-text';
            disclaimerDiv.append(`* ${l[18770]}`);

            contentsDiv.append(disclaimerDiv);
        }

        return contentsDiv;
    }
};
