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
    show: function(quotaExceeded) {
        'use strict';

        this.quotaExceeded = quotaExceeded;

        const contentsDiv = document.createElement('div');
        contentsDiv.className =
            `obq-sheet-contents limited-bandwidth-dialog ${this.quotaExceeded ? 'exceeded' : 'limited'}`;

        const blurbDiv = document.createElement('div');
        blurbDiv.className = 'blurb-text';
        contentsDiv.append(blurbDiv);

        this.setSheetButtons();

        let mediaType = 'dl';
        const videoPreview = mega.ui.viewerOverlay.nodeComponent && is_video(mega.ui.viewerOverlay.nodeComponent.node);
        if (!dlmanager.isDownloading &&
            (dlmanager.isStreaming || videoPreview)) {
            mediaType = 'stream_media';
        }

        const quotaStatus = this.quotaExceeded ? 'tq_exceeded' : 'limited_tq';

        const stringKey = `${mediaType}_${quotaStatus}`;
        const sheetBlurb = u_attr ?
            l[`${stringKey}${u_attr.p ? '_pro' : '_free'}`] :
            l[`${stringKey}_non_user`];

        blurbDiv.append(parseHTML(sheetBlurb));

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

        const sheetOptions = {
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
        };

        if (Object(u_attr).p && this.quotaExceeded) {
            if (M.account) {
                // Force data retrieval from API
                M.account.lastupdate = 0;
            }
            M.accountData((account) => {
                var tfsQuotaLimit = bytesToSize(account.bw, 0).split('\u00A0');
                var tfsQuotaUsed = account.downbw_used + M.account.servbw_used;
                var perc = Math.min(100, Math.ceil(tfsQuotaUsed * 100 / account.bw));

                const tbUsedDiv = document.createElement('div');
                tbUsedDiv.className = 'tb-used';

                tbUsedDiv.append(parseHTML(escapeHTML(l.tq_percent_used)
                    .replace('%1', perc)
                    .replace('%2', tfsQuotaLimit[0]))
                );
                contentsDiv.append(tbUsedDiv);

                mega.ui.sheet.show(sheetOptions);
            });
        }
        else {
            mega.ui.sheet.show(sheetOptions);
        }
    },

    closeSheet: function() {
        'use strict';

        if (dlmanager._overQuotaTimeLeftTick) {
            clearInterval(dlmanager._overQuotaTimeLeftTick);
        }

        mega.ui.sheet.hide();
    },

    setSheetButtons: function() {
        'use strict';

        const secondaryBtn = {
            type: 'normal',
            className: 'secondary',
            text: this.quotaExceeded ? l.wait_for_free_tq_btn_text : l[6826],
            onClick: () => {
                this.closeSheet();
                if (!this.quotaExceeded && typeof dlmanager.onLimitedBandwidth === 'function') {
                    // Resume the download if the user taps the limited quota dialog's 'Continue' button
                    dlmanager.onLimitedBandwidth();
                }
            }
        };

        let primaryActionBtnText;
        if (u_attr) {
            primaryActionBtnText = u_attr.p ? l.buy_new_plan_btn_text : l[433];
        }
        else {
            primaryActionBtnText = l.buy_plan_btn_text;
        }

        const primaryBtn = {
            type: 'normal',
            text: primaryActionBtnText,
            onClick: () => {
                // Quota pre-warning / exceeded upgrade / buy plan button tapped
                eventlog(this.quotaExceeded ? 99640 : 99643);
                this.closeSheet();
                // Hide the download overlay
                mega.ui.overlay.hide();
                loadSubPage('pro');
            }
        };

        this.sheetActions = [primaryBtn];
        if (!this.quotaExceeded || u_attr && !Object(u_attr).p) {
            this.sheetActions.unshift(secondaryBtn);
        }
    },
};
