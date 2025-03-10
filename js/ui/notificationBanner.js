/**
 * This file handles the Notification Banner, which appears on the user's
 * Dashboard, CD, and Photos pages below the top navigation menu. One banner
 * will be shown at a time (the oldest first, if multiple notifications exist).
 * Once a user has closed the banner or clicked a CTA button, it will be marked
 * as actioned on the API server, and another banner will be shown if possible.
 */
var notificationBanner = {

    /** The id number of the last banner that the user has actioned */
    lastActionedBannerId: 0,

    /** The current notification being shown to the user */
    currentNotification: null,

    /** Whether the banner system has been inited or not */
    bannerInited: false,

    /** Whether the event for dismissing the banner has been sent or not */
    sendDismissedEvent: false,

    /**
     * Check if there are any banners that can be shown to the user, and set the last actioned
     * banner ID variable
     * @returns {void}
     */
    async init() {
        'use strict';

        // Get the last actioned banner ID user attribute
        this.lastActionedBannerId
            = parseInt(await Promise.resolve(mega.attr.get(u_handle, 'lbannr', -2, true)).catch(nop)) | 0;

        // Show the banner
        this.configureAndShowBanner();

        this.bannerInited = true;
    },

    /**
     * Wrapper function to configure the banner details and show it
     * @returns {Boolean} whether a banner can be shown or not
     */
    configureAndShowBanner() {
        'use strict';

        // Iterate through list of notifications to find earliest banner to show
        for (const key in notify.dynamicNotifs) {
            if (notify.dynamicNotifs[key]) {
                const notification = notify.dynamicNotifs[key];
                const notifIsActive = notification.e - unixtime() > 0;

                if (this.lastActionedBannerId < notification.id && notification.sb && notifIsActive) {
                    this.currentNotification = notification;

                    if (this.prefillBannerDetails()) {
                        if (!this.bannerPcListener || !this.bannerMultiTabsListener) {
                            this.addBroadcastListeners();
                        }

                        this.showBanner(true);

                        // Add a handler to fix the layout if the window is resized
                        $(window).rebind('resize.notifBanner', () => {
                            this.updateFMContainerHeight(true);
                        });

                        return true;
                    }
                }
            }
        }

        this.updateFMContainerHeight(false);

        delete this.currentNotification;
        return false;
    },

    /**
     * Update the details of the banner
     * @returns {Boolean} whether banner integrity is ok or not
     */
    prefillBannerDetails() {
        'use strict';

        const title = this.currentNotification.t;
        const description = this.currentNotification.d;

        let primaryButtonLabel;
        if (this.currentNotification.cta1) {
            primaryButtonLabel = this.currentNotification.cta1.text;
        }

        let secondaryButtonLabel;
        if (this.currentNotification.cta2) {
            secondaryButtonLabel = this.currentNotification.cta2.text;
        }

        if (!this.$banner) {
            this.$banner = $('.notification-banner');
        }

        if (!title || !description || !this.$banner.length) {
            return false;
        }

        // Populate the details
        $('.title', this.$banner).text(title);
        $('.message', this.$banner).text(description);

        const $primaryButton = $('.cta-primary', this.$banner);
        const $secondaryButton = $('.cta-secondary', this.$banner);

        $primaryButton.toggleClass('hidden', !this.currentNotification.cta1.link);
        if (this.currentNotification.cta1.link) {
            $primaryButton
                .attr('data-continue-link', this.currentNotification.cta1.link)
                .text(primaryButtonLabel);
        }

        $secondaryButton.toggleClass('hidden', !this.currentNotification.cta2.link);
        if (this.currentNotification.cta2.link) {
            $secondaryButton
                .attr('data-continue-link', this.currentNotification.cta2.link)
                .text(secondaryButtonLabel);
        }

        // Add event handlers for the buttons
        $('button.cta-primary, button.cta-secondary', this.$banner).rebind('click.bannerCtaBtns', (e) => {
            const pageLink = $(e.currentTarget).attr('data-continue-link');

            if (pageLink) {
                // If a link exists, open it in a new tab
                window.open(pageLink, '_blank', 'noopener,noreferrer');
            }
            else {
                // Otherwise, mark the banner as actioned
                this.markBannerAsActioned();
            }
        });
        $('.close.js-close', this.$banner).rebind('click.bannerClose', () => {
            this.sendDismissedEvent = true;
            this.markBannerAsActioned();
        });

        const $displayIcon = $('.display-icon', this.$banner).addClass('hidden');

        const icon = this.currentNotification.icon;
        if (icon) {
            // Determine icon path
            const retina = window.devicePixelRatio > 1 ? '@2x' : '';
            const imagePath = `${staticpath}images/mega/psa/${icon + retina}.png`;
            let failed = false;

            $displayIcon
                .attr('src', imagePath)
                .rebind('error.bannerImage', function() {
                    // If it failed once it will likely keep failing, prevent infinite loop
                    if (failed) {
                        $(this).addClass('hidden');
                        return;
                    }

                    $(this).attr('src', `${notificationBanner.currentNotification.dsp + icon + retina}.png`);
                    failed = true;
                })
                .rebind('load.bannerImage', function() {
                    $(this).removeClass('hidden');
                });
        }

        return true;
    },

    /**
     * Function to mark a banner as actioned, and to notify any open tabs of this.
     * @returns {void}
     */
    markBannerAsActioned() {
        'use strict';

        // Notify any other tabs a banner has been closed
        mBroadcaster.crossTab.notify('closedBanner', this.currentNotification.id);

        // Store that the user has actioned this banner on the API side
        // (as ^!lbannr for a private, non encrypted, non historic attribute)
        mega.attr.set('lbannr', String(this.currentNotification.id), -2, true);

        this.updateBanner(true);
    },

    /**
     * Attempt to show the banner and toggle some classes if required
     * @param {Boolean} [sendBannerShownEvent] Whether to send an event when the banner is shown.
     * @returns {void}
     */
    showBanner(sendBannerShownEvent) {
        'use strict';

        const isValidBannerPage = !M.chat && M.currentdirid !== 'refer'
            && !String(M.currentdirid).includes('account');

        if (isValidBannerPage) {
            delay('update-banner-classes', () => {
                const onDashboardPage =  M.currentdirid === 'dashboard';

                this.$banner.removeClass('hidden')
                    .toggleClass('no-max-width', !onDashboardPage)
                    .toggleClass('extra-bottom-padding', $('.onboarding-control-panel').is(':visible'));

                // Move the banner in the DOM if:
                // (1) the user navigates to the dashboard page (banner must be fixed there), or
                // (2) it has been moved before (move it back to its original position)
                if (onDashboardPage) {
                    this.$banner.insertBefore($('.widgets.content-block', '.fm-right-block.dashboard'));
                }
                else {
                    this.$banner.insertBefore($('.onboarding-control-panel'));
                }

                this.updateFMContainerHeight(true);
            }, 30);

            if (sendBannerShownEvent) {
                eventlog(500239, this.currentNotification.id | 0);
            }
        }
    },

    /**
     * Resize the currently shown FM container to prevent the page contents being cut off at the bottom
     *
     * @param {Boolean} bannerShown if the banner is currently being shown
     * @returns {void}
     */
    updateFMContainerHeight(bannerShown) {
        'use strict';

        if (M.currentdirid === 'dashboard') {
            return;
        }

        let activeFMContainer = '.fm-right-files-block:not(.in-chat)';

        if (M.currentdirid === 'recents') {
            activeFMContainer = '.fm-recents.container';
        }

        if (bannerShown) {
            if (M.currentdirid !== 'albums') {
                // If a gallery empty state is visible, add a scroller to it so the contents
                // can be seen
                const $emptySection = $('.fm-empty-section:not(.hidden)', $(activeFMContainer));

                if (M.currentCustomView &&
                        M.currentCustomView.type === 'gallery' &&
                        !$emptySection.hasClass('hidden')) {
                    Ps.initialize($emptySection[0]);
                }
            }
        }
        else {
            // Remove any custom height styles set
            $('.fm-right-files-block:not(.in-chat)').removeAttr('style');
            $('.fm-right-block.dashboard').removeAttr('style');
            $('.fm-recents.container').removeAttr('style');
            $('.fm-right-block.full-size').removeAttr('style');
            $('.albums-grid', '#albums-view').removeAttr('style');

            // Remove any scrollbars added
            const $emptySection = $('.fm-empty-section.ps');
            if ($emptySection) {
                Ps.destroy($emptySection[0]);
            }

            $(window).unbind('resize.notifBanner');
        }
    },

    /**
     * Add the broadcast listners for:
     * (1) showing/hiding the banner as appropriate when navigating between pages
     * (2) when multiple tabs are open and a banner is closed on one of them
     * @returns {void}
     */
    addBroadcastListeners() {
        'use strict';

        this.bannerPcListener = mBroadcaster.addListener('pagechange', () => {
            // Hide the notifications banner while the page change is finishing up.
            this.$banner.addClass('hidden');

            onIdle(() => this.showBanner(false));
        });

        this.bannerMultiTabsListener = mBroadcaster.addListener('crossTab:closedBanner', (key) => {
            if (this.currentNotification.id === key.data) {
                this.updateBanner(true);
            }
        });
    },

    /**
     * Function to attempt to show a new banner if possible.
     * @param {Boolean} [updateLastActioned] Whether to set the last actioned banner ID or not.
     * @returns {void}
     */
    updateBanner(updateLastActioned) {
        'use strict';

        if (updateLastActioned) {
            this.lastActionedBannerId = this.currentNotification.id;
        }
        this.$banner.addClass('hidden');

        if (this.sendDismissedEvent) {
            eventlog(500241, this.currentNotification.id | 0);
            this.sendDismissedEvent = false;
        }

        // If no more banners are available to be shown, remove the broadcast listeners and reset them
        if (!this.configureAndShowBanner()) {
            mBroadcaster.removeListener(this.bannerPcListener);
            mBroadcaster.removeListener(this.bannerMultiTabsListener);
            delete this.bannerPcListener;
            delete this.bannerMultiTabsListener;
        }
    }
};
