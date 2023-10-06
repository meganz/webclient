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
                mCreateElement('div', {class: 'mega-mobile-settings account'}) : this.generatePage('account');

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

    getProPlanDetails: {
        value: function() {
            'use strict';

            let proNum = u_attr.p;

            // If Business or Pro Flexi we override the u_attr.p because it's undefined when these plans are expired.
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

            this.renderUpgradeButton(userInfoContainer);

            const accountTop = mCreateElement('div', {class: 'account-information'},
                                              [avatarContainer, userInfoContainer]);

            /* Plan info */

            const planName = this.getProPlanDetails();
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

    renderUpgradeButton: {
        value: function(userInfoContainer) {
            'use strict';

            let btn;

            if (u_attr && !u_attr.pf && !u_attr.b) {
                btn = new MegaMobileLink({
                    parentNode: userInfoContainer,
                    href: 'pro',
                    componentClassname: 'upgrade outline',
                    text: l[433]
                });
            }

            // If expired business master account show reactivate button
            else if (u_attr && (u_attr.b && u_attr.b.m && u_attr.b.s !== pro.ACCOUNT_STATUS_ENABLED
                || u_attr.pf && u_attr.pf.s !== pro.ACCOUNT_STATUS_ENABLED)) {

                btn = new MegaMobileLink({
                    parentNode: userInfoContainer,
                    href: 'repay',
                    componentClassname: 'upgrade outline',
                    text: l.mobile_account_reactivate
                });
            }

            if (btn) {
                btn.rebind('beforeRedirect', () => {
                    if (this.overlayAccount) {
                        mega.ui.overlay.hide();
                    }
                    eventlog(99836);
                });
            }
        }
    },

    render: {
        value: function() {

            'use strict';

            const dynamicInfoContainer = mCreateElement('div', {class: 'dynamic-information'});
            this.domNode.appendChild(dynamicInfoContainer);

            const menuItems = [];

            if (this.overlayAccount) {

                api.req({a: 'maf', v: mega.achievem.RWDLVL}).then(({result: res}) => {
                    if (typeof res === 'object') {
                        this.domNode.componentSelector('.achievement-btn').show();
                    }
                }).catch(dump);
            }
            else {
                M.accountData(() => {
                    if (M.account.maf) {
                        this.domNode.componentSelector('.achievement-btn').show();
                    }
                });
            }

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
                    text:l[22682],
                    icon: 'sprite-mobile-fm-mono icon-users-thin-outline',
                    href: 'fm/refer',
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
                    binding: async() => {
                        const gatewayId = M.account.sgwids.length > 0 ? M.account.sgwids[0] : null; // Gateway ID

                        // If Apple or Google subscription (see pro.getPaymentGatewayName function for codes)
                        if (gatewayId === 2 || gatewayId === 3) {

                            // Show popup
                            msgDialog('info', l[7165], l[16501]);
                        }
                        else if (gatewayId === 16 || gatewayId === 17 || gatewayId === 19) {

                            // Show a loading dialog while the data is fetched from the API
                            loadingDialog.show();

                            // Check if there are any active subscriptions
                            // ccqns = Credit Card Query Number of Subscriptions

                            const {result: numOfSubscriptions} = await api.req({a: 'ccqns'}).catch(dump);

                            if (numOfSubscriptions.result > 0) {
                                mobile.settings.account.openSubConfirmOverlay();
                            }

                            // Hide the loading dialog after request completes
                            loadingDialog.hide();
                        }
                    }
                }
            );

            for (const item of menuItems) {
                this.generateMenuItem(this.domNode, item);
            }

            if (u_attr && (!u_attr.b || u_attr.b.m)) {
                this.generateMenuItem(this.domNode, {
                    text: l[16115],
                    icon: 'sprite-mobile-fm-mono icon-user-x-thin-outline',
                    componentClassname: 'delete-account hidden',
                    binding: () => {
                        eventlog(99844);

                        // Please confirm that all your data will be deleted
                        let confirmMessage = l[1974];
                        const $cancelAccountOverlay = $('#mobile-ui-error');
                        const $page = $(this.parentNode);

                        // Search through their Pro plan purchase history
                        for (let i = 0; i < M.account.purchases.length; i++) {
                            // Get payment method name
                            const paymentMethodId = M.account.purchases[i][4];
                            const paymentMethod = pro.getPaymentGatewayName(paymentMethodId).name;

                            // If they have paid with iTunes or Google Play in the past
                            if (paymentMethod === 'apple' || paymentMethod === 'google') {
                                // Update confirmation message to remind them to cancel iTunes or Google Play
                                confirmMessage += ` ${l[8854]}`;
                                break;
                            }
                        }

                        // Show a confirm dialog
                        mobile.settings.account.showAccCancelConfirmDialog($page, confirmMessage);

                        // Show close button
                        $('.text-button', $cancelAccountOverlay).removeClass('hidden');
                    },
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
            const logout = new MegaMobileButton({
                parentNode: this.domNode,
                text: l.mobile_settings_log_out_button,
                componentClassname: "mobile-log-out",
            });
            logout.on('tap', () => {
                mLogout();
                return false;
            });

            // Version number
            const version = new MegaMobileTappable({
                parentNode: this.domNode,
                text: `v. ${  M.getSiteVersion()}`,
                componentClassname: "mobile-mega-version text-only no-deco"
            });

            let versionClickCounter = 0;

            version.rebind('tap.versionupdate', () => {
                if (++versionClickCounter >= 3) {
                    mega.developerSettings.show();

                    if (this.overlayAccount) {
                        mega.ui.overlay.hide();
                    }
                }
                delay('top-version-click', () => {
                    versionClickCounter = 0;
                }, 1000);
            });
        }
    },

    /**
     * Show dialog asking for confirmation and send an email to the user to finish the process if they agree
     * @param {String} $page The jQuery selector for the current page
     * @param {String} confirmMessage The message to be displayed in the confirmation dialog
     */
    showAccCancelConfirmDialog: {
        value: function($page, confirmMessage) {
            'use strict';

            // Show dialog asking for confirmation and continue if they agree
            mobile.messageOverlay.show(l[6181], confirmMessage, false, false, false, true).then(() => {

                loadingDialog.show();

                // Check if 2FA is enabled on their account
                mobile.twofactor.isEnabledForAccount()
                    .then((result) => {

                        loadingDialog.hide();

                        // If 2FA is enabled
                        if (result) {

                            // Show the verify 2FA page to collect the user's PIN
                            return mobile.twofactor.verifyAction.init();
                        }
                    })
                    .then((twoFactorPin) => {

                        // Complete the cancellation process
                        mobile.settings.account.continueAccountCancelProcess($page, twoFactorPin || null);
                    })
                    .catch(tell);
            }).catch(dump);
        },
    },

    /**
     * Finalise the account cancellation process
     * @param {String} $page The jQuery selector for the current page
     * @param {String|null} twoFactorPin The 2FA PIN code or null if not applicable
     */
    continueAccountCancelProcess: {
        value: function($page, twoFactorPin) {

            'use strict';

            // Cache selector
            var $verifyActionPage = $('.mobile.two-factor-page.verify-action-page');

            // Prepare the request
            var request = {a: 'erm', m: u_attr.email, t: 21};

            // If 2FA PIN is set, add it to the request
            if (twoFactorPin !== null) {
                request.mfa = twoFactorPin;
            }

            loadingDialog.show();

            // Make account cancellation request
            api.req(request).then(({result}) => {
                loadingDialog.hide();

                // If something went wrong with the 2FA PIN
                if (result === EFAILED || result === EEXPIRED) {
                    mobile.twofactor.verifyAction.showVerificationError();
                }

                // Check for incorrect email
                else if (result === ENOENT) {
                    $page.removeClass('hidden');
                    $verifyActionPage.addClass('hidden');
                    mobile.messageOverlay.show(l[1513], l[1946]);
                }

                // If successful, show a dialog saying they need to check their email
                else if (result === 0) {
                    $page.removeClass('hidden');
                    $verifyActionPage.addClass('hidden');
                    mobile.showEmailConfirmOverlay();
                    $('#startholder').addClass('no-scroll');
                }
                else {
                    // Oops, something went wrong
                    $page.removeClass('hidden');
                    $verifyActionPage.addClass('hidden');
                    mobile.messageOverlay.show(l[135], l[200]);
                }
            });
        }
    },

    updateCallback: {
        value: function() {
            'use strict';

            const dynamicInfoContainer = this.domNode.querySelector('.dynamic-information');

            const payCardBtn = this.domNode.componentSelector('.payment-card-btn');
            const cancelSubsBtn = this.domNode.componentSelector('.cancel-subscription');
            const delAccountBtn = this.domNode.componentSelector('.delete-account');

            payCardBtn.hide();
            cancelSubsBtn.hide();

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
                if (u_attr.p && M.account.stype === 'S') {
                    // Get the date their subscription will renew, the payment type and gateway
                    const renewTimestamp = M.account.srenew.length > 0 ? M.account.srenew[0] : 0; // Timestamp
                    const gatewayId = M.account.sgwids.length > 0 ? M.account.sgwids[0] : null; // Gateway ID

                    // If Apple or Google subscription don't show payment card button
                    if (gatewayId !== 2 && gatewayId !== 3) {
                        payCardBtn.show();
                    }

                    if (!u_attr.b) {
                        // Display the date their subscription will renew if known
                        if (renewTimestamp > 0) {
                            cancelSubsBtn.subtext = l.renews_on_cancel_btn.replace('%1', time2date(renewTimestamp, 2));
                        }

                        cancelSubsBtn.show();
                    }
                }

                if (delAccountBtn) {
                    delAccountBtn.show();
                }
            });
        },
    },

    /**
     * Show an overlay asking the user if they are sure they want to cancel their subscription
     * @param {String} $page The jQuery selector for the current page
     *
     * Note this is old overlay implementation on top of new one, and that is why it has jQuery. we will update it later
     */
    openSubConfirmOverlay: {
        value: function() {
            'use strict';

            // Cache selectors
            const $cancelSubscriptionOverlay = $('.mobile.cancel-subscription-overlay');
            const $confirmButton = $('.confirm-ok-button', $cancelSubscriptionOverlay);
            const $closeButton = $('.close-button', $cancelSubscriptionOverlay);

            // Display the proper PRO plan icon
            $('.plan-icon', $cancelSubscriptionOverlay).addClass(`pro${u_attr.p}`);

            $cancelSubscriptionOverlay.removeClass('hidden');

            // Add click/tap handler for the Confirm button to cancel their subscription
            $confirmButton.rebind('tap.confirm', () => {

                // Show a loading dialog while the data is fetched from the API
                loadingDialog.show();

                // Cancel the user's subscription/s (cccs = Credit Card Cancel Subscriptions, r = reason)
                api.req({a: 'cccs', r: 'No reason (automated mobile web cancel subscription)'}).then(() => {
                    M.account.stype = 'O';
                    $('.mega-component[href="fm/account/paymentcard"]', this.domNode).addClass('hidden');
                    $('i.icon-slash-circle-thin-outline', this.domNode).parent().addClass('hidden');
                    $cancelSubscriptionOverlay.addClass('hidden');

                    // Hide the loading dialog after request completes
                    loadingDialog.hide();
                    mobile.showToast(l[6999], 6);
                    M.account.lastupdate = 0;
                    mobile.settings.account.updateCallback();
                });

                // Prevent double taps
                return false;
            });

            // On clicking/tapping the Close button
            $closeButton.rebind('tap.close', () => {
                // Hide the overlay
                $cancelSubscriptionOverlay.addClass('hidden');
                return false;
            });
        }
    }
});
