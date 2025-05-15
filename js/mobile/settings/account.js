mobile.settings.account = Object.create(mobile.settingsHelper, {
    /**
     * Initiate and render the page, fetch from cache if already inited.
     *
     * @returns {boolean} True if cached, undefined otherwise.
     */
    init: {
        value: function() {
            'use strict';

            const useOverlay = !is_fm() || pfid;

            if (this.domNode && useOverlay === this.overlayAccount) {
                this.show();
                return true;
            }


            this.domNode = useOverlay ?
                mCreateElement('div', {class: 'mega-mobile-settings account mob-px-6'}) : this.generatePage('account');

            this.overlayAccount = useOverlay;

            this.render();

            if (useOverlay) {

                const linkComponents = this.domNode.componentSelectorAll('a');

                linkComponents.forEach(c => c.rebind('beforeRedirect', () => {
                    onIdle(mega.ui.overlay.hide.bind(mega.ui.overlay));
                }));
            }

            this.show();

            // Add a server log
            api.req({ a: 'log', e: 99672, m: 'Mobile web My Account page accessed' });
        },
    },

    show: {
        value: function() {
            'use strict';

            if (!is_fm() || pfid) {
                mega.ui.overlay.show({
                    name: 'account-overlay',
                    title: MegaMobileHeader.headings['fm/account'],
                    showClose: true,
                    actionOnBottom: false,
                    contents: [this.domNode]
                });

                this.updateCallback();
            }
            else {
                mobile.settingsHelper.show.call(this);
            }
        }
    },

    /**
     * Get the plan details of the user and update the plan name accordingly.
     *
     * @returns {String} 'Free' if u_attr.p is undefined, otherwise the plan name (e.g. Pro II)
     */
    getPlanDetails: {
        value() {
            'use strict';

            let proNum = u_attr.p;

            // If Business or Pro Flexi we override the proNum because it's undefined when these plans are expired.
            // We don't want to show as Free because they are still on that account and they must pay to reactivate.
            if (u_attr.b) {
                proNum = pro.ACCOUNT_LEVEL_BUSINESS;
            }
            else if (u_attr.pf) {
                proNum = pro.ACCOUNT_LEVEL_PRO_FLEXI;
            }

            return pro.getProPlanName(proNum);
        },
    },

    /**
     * Check if the user has any active subscriptions, and load the cancel subscriptions page if so
     */
    checkForActiveSubs: {
        async value() {
            'use strict';

            // Show a loading dialog while the data is fetched from the API
            loadingDialog.show();

            // Check if there are any active subscriptions
            // ccqns = Credit Card Query Number of Subscriptions
            const {result: numOfSubscriptions} = await api.req({a: 'ccqns'}).catch(dump);

            // Hide the loading dialog after request completes
            loadingDialog.hide();

            if (numOfSubscriptions > 0) {
                loadSubPage('fm/account/cancel');

                // Hide the account overlay if coming from a folder or file link
                if (mega.ui.overlay.visible) {
                    mega.ui.overlay.hide();
                }
            }
        }
    },

    /**
     *
     * @return {{percentageUsed: number,
     * overQuota: boolean,
     * spaceUsed: (null|string|number),
     * spaceTotal: (null|string|number)}}
     */
    getStorageUsage: {
        value: function(data) {
            'use strict';

            const spaceUsed = data.cstrg;
            const spaceTotal = data.mstrg;
            const percentageUsed = spaceUsed / spaceTotal;
            let percentageUsedText = new Intl.NumberFormat(lang, {style: 'percent', maximumFractionDigits: 2}).format(
                percentageUsed);
            const spaceUsedText = bytesToSize(spaceUsed, 2);
            let spaceTotalText = bytesToSize(spaceTotal, 0);

            // If this is Business or Pro Flexi there is no limit for storage and no percentage
            if (u_attr && (u_attr.b || u_attr.pf)) {
                spaceTotalText = null;
                percentageUsedText = null;
            }

            return {
                spaceUsed: spaceUsedText,
                percentageUsed: percentageUsedText,
                spaceTotal: spaceTotalText,
                overQuota: data.isFull,
                warning: data.isAlmostFull,
            };
        },
    },

    renderDynamicInfo: {
        value: function(data) {
            'use strict';

            const avatarMeta = generateAvatarMeta(u_handle);

            const shortNameEl = mCreateElement('span');
            shortNameEl.textContent = avatarMeta.shortName;

            const avatar = avatarMeta.avatarUrl
                ? mCreateElement('img', {src: avatarMeta.avatarUrl})
                : mCreateElement('div', {class: `color${avatarMeta.color}`}, [shortNameEl]);

            const avatarContainer = mCreateElement('div', {class: 'avatar-container'}, [avatar]);

            const userName = mCreateElement('h2');
            userName.textContent = u_attr.fullname;

            const userEmail = mCreateElement('span');
            userEmail.textContent = u_attr.email;

            const userInfoContainer = mCreateElement('div', {}, [userName, userEmail]);

            MegaMobileTopMenu.renderUpgradeButton(userInfoContainer, 99836);

            const accountTop = mCreateElement('div', {class: 'account-information'},
                                              [avatarContainer, userInfoContainer]);

            /* Plan info */

            const planName = this.getPlanDetails();
            const storageInfo = this.getStorageUsage(data);

            const iconClass = 'sprite-mobile-fm-mono icon-shield-thin-outline left-icon icon-size-24';
            const iconContainer = mCreateElement('i', {class: iconClass});

            const planNameContainer = mCreateElement('span');
            planNameContainer.textContent = planName;

            const percentColor = storageInfo.overQuota ? 'error' : storageInfo.warning ? 'warning' : 'green';
            const percentageContainer = mCreateElement('span', {class: `storage ${percentColor}`});

            // Show only space_used for Business and Pro Flexi accounts
            percentageContainer.textContent = u_attr && (u_attr.b || u_attr.pf) ? mega.icu
                .format(l.mobile_account_storage_usage_flexi, storageInfo.spaceUsed)
                .replace('%1', storageInfo.spaceUsed) : l.mobile_account_storage_usage
                .replace('%1', storageInfo.percentageUsed)
                .replace('%2', storageInfo.spaceTotal);

            const planInfo = mCreateElement('div', {class: 'text-box-wrapper storage-info'},
                                            [planNameContainer, percentageContainer]);
            const planElem = mCreateElement('div', {class: 'plan-information nav-elem full-width text-icon'},
                                            [iconContainer, planInfo]);
            const planContainer = mCreateElement('div', {}, [planElem]);

            if (u_attr.uspw) {
                const planAlertContainer = mCreateElement('div', {class: 'odq-alert'});

                const overlayTexts = odqPaywallDialogTexts(u_attr || {}, M.account);
                const inlineODQBanner = mobile.inline.alert.create({
                    parentNode: planAlertContainer,
                    componentClassname: 'error',
                    icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline',
                    closeButton: false,
                });

                planContainer.appendChild(planAlertContainer);
                inlineODQBanner.domNode.querySelector('.message-text').appendChild(
                    parseHTML(overlayTexts.dlgFooterText.replace(/span/g, 'strong'))
                );

            }
            return [accountTop, planContainer];
        },
    },

    render: {
        value: function() {

            'use strict';

            const dynamicInfoContainer = mCreateElement('div', {class: 'dynamic-information'});
            this.domNode.appendChild(dynamicInfoContainer);

            const menuItems = [];

            /* First Links */
            menuItems.push(
                {
                    text: l[16117],
                    icon: 'sprite-mobile-fm-mono icon-rocket-thin-outline',
                    href: 'fm/account/achievements',
                    eventLog: 99837,
                    componentClassname: 'hidden achievement-btn'
                },
                {
                    text: l[23262],
                    icon: 'sprite-mobile-fm-mono icon-lock-thin-outline',
                    href: 'fm/account/security/change-password',
                    eventLog: 99843
                },
                {
                    text: l[7743],
                    icon: 'sprite-mobile-fm-mono icon-mail-thin-outline',
                    href: 'fm/account/security/change-email',
                },
                {
                    text: l.payment_card,
                    icon: 'sprite-mobile-fm-mono icon-creditcard-thin-outline',
                    href: 'fm/account/paymentcard',
                    componentClassname: 'hidden payment-card-btn'
                },
                {
                    text: l.cancel_sub_btn_label,
                    icon: 'sprite-mobile-fm-mono icon-slash-circle-thin-outline',
                    componentClassname: 'hidden cancel-subscription',
                    defaultRightIcon: true,
                    binding: () => {
                        const _gatewayCheck = async(gatewayIds) => {
                            // If Apple or Google subscription show popup dialog
                            if (gatewayIds.length === 1 && (gatewayIds.includes(2) || gatewayIds.includes(3))) {
                                msgDialog('info', l[7165], l.double_billing_sub_cancel);
                            }
                            // Otherwise check for active subscriptions
                            else {
                                await this.checkForActiveSubs();
                            }
                        };

                        const { sgwids, features, subs } = M.account;
                        let gatewayIds = sgwids; // Gateway ID's

                        if (gatewayIds && gatewayIds.length > 0) {
                            _gatewayCheck(gatewayIds);
                        }
                        else if (features && features.length > 0) {
                            // M.account.sgwids is not set for feature plans so
                            // get the gateway IDs from their subscriptions
                            gatewayIds = subs
                                .filter(({ al }) => al === pro.ACCOUNT_LEVEL_FEATURE)
                                .map(({ gwid }) => gwid);
                            _gatewayCheck(gatewayIds);
                        }
                    }
                }
            );

            for (const item of menuItems) {
                this.generateMenuItem(this.domNode, item);
            }

            if (this.overlayAccount) {
                api.req({a: 'maf', v: mega.achievem.RWDLVL}).then(({result: res}) => {
                    if (typeof res === 'object') {
                        const achievementBtn = this.domNode.componentSelector('.achievement-btn');
                        if (achievementBtn) {
                            achievementBtn.show();
                        }
                    }
                }).catch(dump);
            }
            else {
                M.accountData(() => {
                    if (M.account.maf) {
                        const achievementBtn = this.domNode.componentSelector('.achievement-btn');
                        if (achievementBtn) {
                            achievementBtn.show();
                        }
                    }
                });
            }

            if (u_attr && (!u_attr.b || u_attr.b.m)) {
                this.generateMenuItem(this.domNode, {
                    text: l[16115],
                    icon: 'sprite-mobile-fm-mono icon-user-x-thin-outline',
                    componentClassname: 'delete-account hidden',
                    href: 'fm/account/delete',
                    eventLog: 99844
                });
            }

            this.generateMenuItem(this.domNode, {
                text: l[23433],
                icon: 'sprite-mobile-fm-mono icon-rotate-cw-thin-outline',
                binding: () => {
                    M.reload();
                },
            });

            // Log out button, see mobile-settings.css
            const logout = new MegaButton({
                parentNode: this.domNode,
                text: l.mobile_settings_log_out_button,
                componentClassname: "mobile-log-out",
            });
            logout.on('tap', () => {
                eventlog(99854, true);
                mLogout();
                return false;
            });

            // Version number
            const version = new MegaInteractable({
                parentNode: this.domNode,
                text: `v. ${  M.getSiteVersion()}`,
                componentClassname: "mobile-mega-version text-only no-deco"
            });

            let versionClickCounter = 0;

            version.rebind('tap.versionupdate', () => {
                if (++versionClickCounter >= 3) {
                    msgDialog('info', '', 'Developer tools have moved. Ask the team for access!');
                }
                delay('top-version-click', () => {
                    versionClickCounter = 0;
                }, 1000);
            });
        }
    },

    updateCallback: {
        value() {
            'use strict';

            const dynamicInfoContainer = this.domNode.querySelector('.dynamic-information');

            const payCardBtn = this.domNode.componentSelector('.payment-card-btn');
            const cancelSubsBtn = this.domNode.componentSelector('.cancel-subscription');
            const delAccountBtn = this.domNode.componentSelector('.delete-account');

            if (payCardBtn) {
                payCardBtn.hide();
            }
            if (cancelSubsBtn) {
                cancelSubsBtn.hide();
            }

            if (M.storageQuotaCache) {

                dynamicInfoContainer.textContent = '';

                const dynamicElements = this.renderDynamicInfo(M.storageQuotaCache);
                for (const dynamicElement of dynamicElements) {
                    dynamicInfoContainer.appendChild(dynamicElement);
                }
            }
            else {
                M.getStorageQuota().then(data => {

                    dynamicInfoContainer.textContent = '';

                    const dynamicElements = this.renderDynamicInfo(data);
                    for (const dynamicElement of dynamicElements) {
                        dynamicInfoContainer.appendChild(dynamicElement);
                    }
                }).catch(dump);
            }

            M.accountData(() => {

                // Check if we should show the Payment Card button (uq response)
                if (payCardBtn && mobile.settings.account.paymentCard.validateUser(M.account)) {
                    api.req({a: 'cci', v: 2})
                        .then(({result}) => mobile.settings.account.paymentCard.validateCardResponse(result))
                        .then((res) => {
                            if (res) {
                                payCardBtn.show();
                            }
                        })
                        .catch(dump);
                }

                // Check for any subscriptions
                if (cancelSubsBtn && !u_attr.b && M.account.subs.length) {
                    cancelSubsBtn.show();
                }

                if (delAccountBtn) {
                    delAccountBtn.show();
                }
            });
        },
    }
});
