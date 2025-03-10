class ForcedUpgradeProDialog {

    /**
     * Forced upgrade to pro dialog constructor
     *
     * @param {Object} storageInfo the result from the call to M.getStorageQuota()
     */
    constructor(storageInfo) {
        // jQuery caches
        this.$dialog = $('.mega-dialog.upgrade-to-pro-dialog', 'body');
        this.$title = $('.title-and-blurb .title', this.$dialog);
        this.$blurb = $('.title-and-blurb .blurb', this.$dialog);
        this.$image = $('i.image', this.$dialog);

        // Get storage quota percentage
        this.storagePct = (storageInfo.cstrg / storageInfo.mstrg) * 100;

        // Get the registered timestamp
        this.registeredDate = new Date(u_attr.since * 1000);

        // Get the current time
        this.currentTime = unixtime() * 1000;
    }

    /**
     * Add event listeners for the tabs and buttons
     *
     * @returns {void}
     */
    initEventListeners() {
        $('.tab', this.$dialog).rebind('click.changeProDialogTab', (e) => {
            const $clickedTab = $(e.currentTarget, this.$dialog);
            eventlog($clickedTab.attr('data-evt'));

            // Change image and tab contents
            this.activeTab = parseInt($clickedTab.attr('data-tab-num'));
            this.changeContent();

            // Reset the timer to 0
            clearInterval(this.tabsTimer);
            this.setTabsTimer();
        });

        const _closeDialogCb = (eventId) => {
            eventlog(eventId);
            clearInterval(this.tabsTimer);
            closeDialog();
        };

        $('button.close-dialog', this.$dialog).rebind('click.closeUpgradeToProDialog', () => {
            _closeDialogCb(500265);
        });

        $('button.upgrade', this.$dialog).rebind('click.upgradeToProDialog', () => {
            _closeDialogCb(500266);
            loadSubPage('pro');
        });
    }

    /**
     * Function to change the dialog's content and animate it (fade in/out)
     *
     * @returns {void}
     */
    changeContent() {
        const contents = this.tabContents[this.activeTab];

        $('.title-and-blurb *', this.$dialog).addClass('animation');
        this.$title.text(contents.title);
        this.$blurb.safeHTML(contents.blurb);

        this.$image
            .addClass('animation')
            .css('background-image', `url(${staticpath}images/mega/${contents.imgName}.png)`);

        $('.tab', this.$dialog).removeClass('active');
        $(`.tab[data-tab-num=${this.activeTab}]`, this.$dialog).addClass('active');

        // Remove animation class when it has finished
        delay('tab-content-animation', () => {
            $('.title-and-blurb *', this.$dialog).removeClass('animation');
            this.$image.removeClass('animation');
        }, 500);
    }

    /**
     * Set a five second interval for changing the active tab and the content shown on the dialog
     *
     * @returns {void}
     */
    setTabsTimer() {
        this.tabsTimer = setInterval(() => {
            this.activeTab = this.activeTab === this.tabContents.length - 1 ? 0 : this.activeTab + 1;
            this.changeContent();
        }, 5000);
    }

    /**
     * Set the contents for each tab when it is active
     *
     * @returns {void}
     */
    initTabContents() {
        this.tabContents = [
            {
                tabName: l[495], // Storage
                imgName: 'dialog-storage',
                title: l.storage_flexibility,
                blurb: l.user_storage_needs,
                eventId: 500267
            },
            {
                tabName: l.pr_sharing,
                imgName: 'dialog-sharing',
                title: l.easy_file_sharing,
                blurb: l.share_file_benefits,
                eventId: 500268
            },
            {
                tabName: l[5906], // Access
                imgName: 'dialog-access',
                title: l.never_lose_data,
                blurb: l.backup_sync_data,
                eventId: 500269
            },
            {
                tabName: l.vpn_title,
                imgName: 'dialog-vpn',
                title: l.vpn_upsell_headline,
                blurb: l.vpn_upsell_desc,
                eventId: 500270
            },
            {
                tabName: l.password_manager,
                imgName: 'dialog-pwm',
                title: l.pwm_upsell_headline,
                blurb: l.pwm_upsell_desc,
                eventId: 500603
            },
            {
                tabName: l.meetings,
                imgName: 'dialog-meetings',
                title: l.unrestricted_calls,
                blurb: l.unrestricted_calls_blurb,
                eventId: 500271
            },
        ];

        // Create tabs based off above list
        const $tabTemplate = $('.tab.template', this.$dialog);
        let tabCount = 0;
        for (const tabInfo of this.tabContents) {
            const $tabNode = $tabTemplate.clone(true).appendTo($tabTemplate.parent());
            $tabNode
                .text(tabInfo.tabName)
                .removeClass('template')
                .toggleClass('active', tabCount === 0)
                .attr('data-tab-num', tabCount)
                .attr('data-evt', tabInfo.eventId);

            // Set info container title, blurb and image to contents for first tab
            if (tabCount === 0) {
                this.$title.text(tabInfo.title);
                this.$blurb.safeHTML(tabInfo.blurb);
                this.$image.css('background-image', `url(${staticpath}images/mega/${tabInfo.imgName}.png)`);
            }

            tabCount++;
        }
        $tabTemplate.remove();

        this.activeTab = 0;
    }

    /**
     * Update the texts on the dialog which could be hidden or need value replacement:
     * 1. Main blurb text of the dialog (has the price of the lowest pro plan)
     * 2. The price disclaimer section and asterisk next to the price (show/hide as appropriate)
     * 3. The blurb text when the Storage tab is active (replace the %1 placeholder with the storage value)
     *
     * @returns {void}
     */
    updateDialogTexts() {
        // Get details of lowest available pro plan
        const lowestProPlan = pro.membershipPlans.filter((plan) => {
            return pro.filter.simple.proPlans.has(plan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL])
                && plan[pro.UTQA_RES_INDEX_MONTHS] === 1;
        })[0];

        // Get price and currency of lowest pro plan
        let dialogBlurbPrice;
        let dialogBlurbCurrency;
        let priceIsInEuros;

        if (lowestProPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY]
            && lowestProPlan[pro.UTQA_RES_INDEX_LOCALPRICE]) {
            dialogBlurbPrice = lowestProPlan[pro.UTQA_RES_INDEX_LOCALPRICE];
            dialogBlurbCurrency = lowestProPlan[pro.UTQA_RES_INDEX_LOCALPRICECURRENCY];
            priceIsInEuros = false;
        }
        else {
            dialogBlurbPrice = lowestProPlan[pro.UTQA_RES_INDEX_PRICE];
            dialogBlurbCurrency = 'EUR';
            priceIsInEuros = true;
        }

        // Replace storage tab blurb string with storage value (x GB/TB)
        const storageGigabytes = lowestProPlan[pro.UTQA_RES_INDEX_STORAGE];
        const storageBytes = storageGigabytes * 1024 * 1024 * 1024;
        const storageFormatted = numOfBytes(storageBytes, 0);
        const storageSizeRounded = Math.round(storageFormatted.size);
        const storageValue = `${storageSizeRounded} ${storageFormatted.unit}`;
        l.user_storage_needs = l.user_storage_needs.replace('%1', storageValue);

        // Update dialog blurb text with the price of the lowest available Pro plan
        const dialogBlurbText = l.view_upgrade_pro_dialog_desc
            .replace('%1', formatCurrency(dialogBlurbPrice, dialogBlurbCurrency, 'narrowSymbol'));
        $('.upgrade-to-pro-dialog-description', this.$dialog).safeHTML(dialogBlurbText);

        // Show or hide the price disclaimer and asterisk as appropriate
        $('span.asterisk', '.upgrade-to-pro-dialog-description')
            .add($('.price-disclaimer', this.$dialog))
            .toggleClass('hidden', priceIsInEuros);
    }

    /**
     * Set the next time when the user can see the dialog based on their activity levels
     *
     * @returns {void}
     */
    async setNextDialogShowTime() {
        let nextDialogShowTime;

        const tenDaysAfterRegistration = new Date(this.registeredDate.getTime());
        tenDaysAfterRegistration.setDate(this.registeredDate.getDate() + 10);
        tenDaysAfterRegistration.setHours(0,0,0,0);

        // If the user is new (has registered in last 10 days), show the dialog again
        // after the tenth day
        if (this.currentTime < tenDaysAfterRegistration.getTime()) {
            nextDialogShowTime = tenDaysAfterRegistration.getTime();
        }
        else {
            // Check number of logins / sessions in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setHours(0,0,0,0);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const {result: sessions} = await api.req({ a: 'usl', x: 1 });
            const sessionsInLastThirtyDays = sessions.filter((session) => {
                return session[0] * 1000 >= thirtyDaysAgo.getTime();
            }).length;

            let daysMultiplier;

            // Determine number of days until dialog can be shown again based on
            // number of logins / sessions (or storage quota used)
            if (sessionsInLastThirtyDays >= 15) {
                daysMultiplier = 3;
            }
            else if (sessionsInLastThirtyDays >= 10) {
                daysMultiplier = 4;
            }
            else if (sessionsInLastThirtyDays >= 5 || this.storagePct >= 50) {
                daysMultiplier = 5;
            }
            else {
                daysMultiplier = 15;
            }

            const nextDialogShowDate = new Date(this.currentTime + (86400 * 1000 * daysMultiplier));
            nextDialogShowDate.setHours(0,0,0,0);
            nextDialogShowTime = nextDialogShowDate.getTime();
        }

        mega.attr.set('fudnxt', String(nextDialogShowTime), -2, true);
    }

    /**
     * Check if the forced upgrade pro dialog can be shown to the user. Do not show this dialog if:
     * 1. the user is not part of / eligible for the experiment
     * 2. the user registered in the last two days, or
     * 3. it is too early for them to see it again (based on the ^!fudnxt user attribute -
     * forced upgrade dialog next (show time)) and their storage quota isn't in the yellow or red
     * (almost full / full) state
     *
     * @returns {Promise} true if the forced upgrade pro dialog can be shown to the user, false if not
     */
    async canShowDialog() {
        // Check if user is part of / eligible for the experiment
        const isInExperiment = M.isInExperiment('fupd');

        // Get end of the day after registration (registration day + 1 at 23:59:59)
        const endOfDayAfterRegistering = new Date(this.registeredDate.getTime() + 86400 * 1000);
        endOfDayAfterRegistering.setHours(23,59,59,59);

        const registeredLastTwoDays = this.currentTime <= endOfDayAfterRegistering.getTime();

        // Get the the earliest time we can show the dialog next (if it exists)
        const nextDialogShowTime =
            parseInt(await Promise.resolve(mega.attr.get(u_handle, 'fudnxt', -2, true)).catch(nop)) || 0;

        if (nextDialogShowTime) {
            return this.currentTime >= nextDialogShowTime;
        }

        return isInExperiment && !registeredLastTwoDays && this.storagePct < 90;
    }

    /**
     * Show the forced upgrade pro dialog if the user meets all the requirements
     *
     * @returns {void}
     */
    async showForcedUpgradeDialog() {
        const canShowDialog = await this.canShowDialog();
        this.setNextDialogShowTime();

        if (canShowDialog) {
            pro.loadMembershipPlans(() => {
                this.updateDialogTexts();

                M.safeShowDialog('upgrade-to-pro-dialog', () => {
                    this.initTabContents();
                    this.initEventListeners();
                    this.setTabsTimer();

                    eventlog(500264);

                    return this.$dialog;
                });
            });
        }
    }
}

mBroadcaster.once('fm:initialized', () => {
    'use strict';

    // Do not show on the below pages
    const isInvalidDialogPage = M.currentdirid === 'transfers'
        || String(M.currentdirid).includes('account')
        || folderlink;

    // Also do not show on mobile web or to paid users
    if (isInvalidDialogPage || is_mobile || u_attr.p || u_attr.pf || u_attr.b) {
        return;
    }

    onIdle(() => {
        M.getStorageQuota().then((storage) => {
            const forcedUpgradeProDialog = new ForcedUpgradeProDialog(storage);
            forcedUpgradeProDialog.showForcedUpgradeDialog();
        });
    });
});
