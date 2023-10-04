/**
 * Controller for the over StorageQuota.
 */
mobile.overStorageQuota = {
    isVisible: false,

    /**
     * Show the banner and sheet dialog
     *
     * @returns {void}
     */
    show() {
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

        mega.ui.sheet.show({
            name: 'over-storage',
            type: 'modal',
            showClose: true,
            icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline icon error',
            title: l.storage_full,
            contents: [l.storage_full_sheet_msg],
            actions: [
                {
                    type: 'normal',
                    text: l.earn_storage,
                    className: 'secondary',
                    onClick: () => {
                        mega.ui.sheet.hide();
                        loadSubPage('fm/account/achievements');
                    }
                },
                {
                    type: 'normal',
                    text: l.upgrade_now,
                    className: 'primary',
                    onClick: () => {
                        mega.ui.sheet.hide();
                        loadSubPage('pro');
                    }
                }
            ]
        });
    }
};
