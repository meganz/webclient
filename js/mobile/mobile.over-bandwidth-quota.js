/**
 * Controller for the over bandwidth quota (OBQ).
 */
mobile.overBandwidthQuota = {

    /**
     * Show the sheet
     * @param {Boolean} quotaExceeded whether the user has exceeded their transfer
     * quota limit
     * @returns {undefined}
     */
    show(quotaExceeded) {
        'use strict';

        this.quotaExceeded = quotaExceeded;
        this.proPlanAttribute = Object(u_attr).p;
        this.lowestPlanIsMini = false;
        const freeOrLowerTier = !this.proPlanAttribute ||
            [
                pro.ACCOUNT_LEVEL_STARTER,
                pro.ACCOUNT_LEVEL_BASIC,
                pro.ACCOUNT_LEVEL_ESSENTIAL
            ].includes(this.proPlanAttribute);

        const contentsDiv = document.createElement('div');
        contentsDiv.className =
            `obq-sheet-contents limited-bandwidth-dialog ${this.quotaExceeded ? 'exceeded' : 'limited'}`;

        const blurbDiv = document.createElement('div');
        blurbDiv.className = 'blurb-text';
        contentsDiv.append(blurbDiv);

        pro.loadMembershipPlans(() => {
            this.lowestPlanIsMini =
                freeOrLowerTier && pro.filter.simple.miniPlans.has(pro.minPlan[pro.UTQA_RES_INDEX_ACCOUNTLEVEL]);
            const miniPlanId = this.lowestPlanIsMini ? pro.filter.miniMin[pro.UTQA_RES_INDEX_ACCOUNTLEVEL] : '';

            this.setSheetButtons();

            const videoPreview = mega.ui.viewerOverlay.nodeComponent &&
                is_video(mega.ui.viewerOverlay.nodeComponent.node);
            this.isStreaming = !dlmanager.isDownloading && (dlmanager.isStreaming || videoPreview);

            const quotaStatus = this.quotaExceeded ? 'tq_exceeded' : 'limited_tq';
            const level = miniPlanId ? 'mini' :
                (this.proPlanAttribute ? (this.proPlanAttribute === 3 ? 'pro3' : 'pro') : 'free');

            let string = this.isStreaming ? l[`stream_media_${quotaStatus}_${level}`] : l[`dl_${quotaStatus}_${level}`];
            if (miniPlanId) {
                string = string.replace(this.quotaExceeded ? '%2' : '%1', pro.getProPlanName(miniPlanId));
            }

            blurbDiv.append(parseHTML(string));

            const countdown = blurbDiv.querySelector('.countdown');

            if (countdown) {
                dlmanager._overquotaInfo();
            }

            if (this.quotaExceeded) {
                localStorage.seenOverQuotaDialog = Date.now();
                this.icon = 'icon-alert-triangle-thin-outline error-icon';
                this.sheetTitle = l[17];
            }
            else {
                localStorage.seenQuotaPreWarn = Date.now();
                this.icon = 'icon-alert-circle-thin-outline warning-icon';
                this.sheetTitle = l[16164];
            }

            mega.ui.sheet.show({
                name: 'obq-mobile-dialog',
                type: 'modal',
                showClose: this.quotaExceeded,
                preventBgClosing: !this.quotaExceeded,
                icon: `sprite-mobile-fm-mono ${this.icon}`,
                title: this.sheetTitle,
                contents: [contentsDiv],
                actions: this.sheetActions,
                onShow: () => {
                    eventlog(this.quotaExceeded ? 99648 : 99617);
                    if (!this.quotaExceeded && !u_wasloggedin()) {
                        eventlog(99646);
                    }
                },
                onClose: () => {
                    this.closeSheet();
                }
            });
        });
    },

    closeSheet() {
        'use strict';

        if (dlmanager._overQuotaTimeLeftTick) {
            clearInterval(dlmanager._overQuotaTimeLeftTick);
        }

        mega.ui.sheet.hide();
    },

    setSheetButtons() {
        'use strict';

        const secondaryBtn = {
            type: 'normal',
            className: 'secondary',
            text: this.quotaExceeded ?
                l[this.proPlanAttribute ? 'ok_button' : 'wait_for_free_tq_btn_text'] :
                l[6826],
            onClick: () => {
                this.closeSheet();
                if (!this.quotaExceeded && typeof dlmanager.onLimitedBandwidth === 'function') {
                    // Resume the download if the user taps the limited quota dialog's 'Continue' button
                    dlmanager.onLimitedBandwidth();
                }
            }
        };

        const primaryBtn = {
            type: 'normal',
            text: !this.proPlanAttribute || this.proPlanAttribute === 3 ?
                l[this.quotaExceeded ? 'upgrade_now' : 433] :
                l.buy_another_plan,
            onClick: () => {
                // Quota pre-warning / exceeded upgrade / buy plan button tapped
                eventlog(this.quotaExceeded ? 99640 : 99643);
                this.closeSheet();
                // Hide the download overlay
                mega.ui.overlay.hide();

                // Load pro page
                if (this.proPlanAttribute === 3) {
                    sessionStorage.mScrollTo = 'flexi';
                }
                else if (this.lowestPlanIsMini) {
                    sessionStorage.mScrollTo = 'exc';
                }
                loadSubPage('pro');
            }
        };

        this.sheetActions = [secondaryBtn, primaryBtn];
    },
};
