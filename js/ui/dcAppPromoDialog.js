lazy(mega.ui, 'dcAppPromoDialog', () => {
    'use strict';

    const DIALOG_DEFAULT_PAGE = 0;
    const PAGE_DURATION = 5000; // milliseconds
    return new class DCAppPromoDialog {
        /**
         * Device Centre - App Promo Dialog
         */
        constructor() {
            // jQuery caches
            this.$dialog = $('.mega-dialog.dc-app-promo-dialog', 'body');
            this.$title = $('.title-and-description .title', this.$dialog);
            this.$description = $('.title-and-description .description', this.$dialog);
            this.$image = $('i.image', this.$dialog);
            this.$button = $('button.mega-button', this.$dialog);
            this.$preventAutoscroll = false;
        }

        /**
         * Add event listeners for the tabs and buttons
         *
         * @returns {void}
         */
        initEventListeners() {
            $('.tab', this.$dialog).rebind('click.changeDialogTab', (e) => {
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

            $('.js-close', this.$dialog).rebind('click.closeDialog', () => {
                _closeDialogCb(500621);
            });

            this.$button.rebind('click.ctaButton', () => {
                _closeDialogCb(this.$button.attr('data-evt'));
                window.open(this.$button.attr('data-href'), '_blank', 'noopener,noreferrer');
            });
        }

        /**
         * Function to change the dialog's content and animate it (fade in/out)
         *
         * @returns {void}
         */
        changeContent() {
            const contents = this.tabContents[this.activeTab];
            const variant = $('body', document).hasClass('theme-dark') ? 'dark' : 'light';

            $('.title-and-description *', this.$dialog).addClass('animation');
            this.$title.text(contents.title);
            this.$description.safeHTML(contents.description);

            this.$image
                .addClass('animation')
                .css('background-image', `url(${staticpath}images/mega/${contents.imgName}-${variant}.png)`)
                .css('width', `${contents.imgWidth}px`);

            this.$button
                .text(contents.btnData.label)
                .attr('data-href', contents.btnData.href)
                .attr('data-evt', contents.btnData.eid);

            $('.tab', this.$dialog).removeClass('active');
            $(`.tab[data-tab-num=${this.activeTab}]`, this.$dialog).addClass('active');

            // Remove the preselection
            delete this.selectPage;

            // Remove animation class when it has finished
            delay('tab-content-animation', () => {
                $('.title-and-description *', this.$dialog).removeClass('animation');
                this.$image.removeClass('animation');
            }, 500);
        }

        /**
         * Set an interval for changing the active tab and the content shown on the dialog
         *
         * @returns {void}
         */
        setTabsTimer() {
            clearInterval(this.tabsTimer);
            this.tabsTimer = setInterval(() => {
                this.activeTab =
                    this.activeTab === this.tabContents.length - 1
                        ? DIALOG_DEFAULT_PAGE
                        : this.activeTab + 1;
                this.changeContent();
            }, PAGE_DURATION);
        }

        /**
         * Clear the interval (for changing the active tab) if it exists
         *
         * @returns {void}
         */
        unsetTabsTimer() {
            if (this.tabsTimer) {
                clearInterval(this.tabsTimer);
                delete this.tabsTimer;
            }
        }

        /**
         * Set the contents for each tab when it is active
         *
         * @returns {void}
         */
        initTabContents() {
            const appInfo = {
                desktop: {
                    label: l.download_desktop_app,
                    href: 'https://mega.io/desktop',
                    eid: 500622,
                },
                mobile: {
                    label: l.download_mobile_app,
                    href: 'https://mega.io/mobile',
                    eid: 500623,
                }
            };

            this.tabContents = [
                {
                    imgWidth: 495,
                    imgName: 'dialog-dc-getting-started',
                    title: l.dc_app_promo_gstarted_title,
                    description: l.dc_app_promo_gstarted_desc,
                    btnData: appInfo.desktop,
                    eventId: 500624
                },
                {
                    imgWidth: 303,
                    imgName: 'dialog-dc-backup',
                    title: l.dc_app_promo_backup_title,
                    description: l.dc_app_promo_backup_desc,
                    btnData: appInfo.desktop,
                    eventId: 500625
                },
                {
                    imgWidth: 349,
                    imgName: 'dialog-dc-sync',
                    title: l.dc_app_promo_sync_title,
                    description: l.dc_app_promo_sync_desc,
                    btnData: appInfo.desktop,
                    eventId: 500626
                },
                {
                    imgWidth: 267,
                    imgName: 'dialog-dc-camera-uploads',
                    title: l.dc_app_promo_cuploads_title,
                    description: l.dc_app_promo_cuploads_desc,
                    btnData: appInfo.mobile,
                    eventId: 500627
                },
            ];

            // Create tabs based off above list
            const $tabTemplate = $('.tab.template', this.$dialog);
            const $prevCreatedTabs = $('.tabs > .tab', this.$dialog);
            const preselectTab = this.selectPage || DIALOG_DEFAULT_PAGE;
            const variant = $('body', document).hasClass('theme-dark') ? 'dark' : 'light';
            let tabCount = 0;

            for (const tabInfo of this.tabContents) {
                const $tabNode = $tabTemplate.length
                    ? $tabTemplate.clone(true).appendTo($tabTemplate.parent())
                    : $($prevCreatedTabs[tabCount]);

                $tabNode
                    .removeClass('template')
                    .toggleClass('active', tabCount === preselectTab)
                    .attr('data-tab-num', tabCount)
                    .attr('data-evt', tabInfo.eventId);

                // Set title, description, image, and button data for first/preselected tab
                // The rest of the tabs are addressed in `changeContent()`
                if (tabCount === preselectTab) {
                    this.$title.text(tabInfo.title);
                    this.$description.safeHTML(tabInfo.description);
                    this.$image
                        .css('background-image', `url(${staticpath}images/mega/${tabInfo.imgName}-${variant}.png)`)
                        .css('width', `${tabInfo.imgWidth}px`);
                    this.$button
                        .text(tabInfo.btnData.label)
                        .attr('data-href', tabInfo.btnData.href)
                        .attr('data-evt', tabInfo.btnData.eid);
                }

                tabCount++;
            }

            $tabTemplate.remove();

            this.activeTab = preselectTab;
        }

        /**
         * Check for conditions (e.g. flags, storage, etc.) for dialog to be shown
         *
         * @returns {Promise} true if the forced upgrade pro dialog can be shown to the user, false if not
         */
        async canShowDialog() {
            // Put conditions here
            return true;
        }

        /**
         * Show the dialog if the user meets all the requirements
         * @param {Number|undefined} pageNumber The page we want to select - if provided, turns off the autoscroll
         * @returns {void}
         */
        async showDialog(pageNumber) {
            const canShowDialog = await this.canShowDialog();

            if (canShowDialog) {
                M.safeShowDialog('dc-app-promo-dialog', () => {
                    this.selectPage = pageNumber;
                    this.initTabContents();
                    this.initEventListeners();
                    if (!this.$preventAutoscroll || pageNumber === undefined) {
                        this.setTabsTimer();
                    }
                    else {
                        this.unsetTabsTimer();
                    }
                    return this.$dialog;
                });
            }
        }
    }();
});
