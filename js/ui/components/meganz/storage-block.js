class MegaStorageBlock extends MegaComponent {

    constructor(options) {
        super(options);

        this.domNode.classList.add('storage-block');

        const infoBlock = mCreateElement('div', {class: 'info'}, [
            mCreateElement('div', {class: 'loader menus-sprite loading'})
        ]);

        this.storageBlock = mCreateElement('section', {class: 'js-storage-usage storage-usage'}, [
            mCreateElement('div', {class: 'storage-usage-panel js-storage-usage-block'}, [
                mCreateElement('div', {class: 'title-block'}, [
                    mCreateElement('div', {class: 'plan'}),
                    mCreateElement('div', {class: 'text-and-tooltip'}, [
                        mCreateElement('div', {class: 'storage-txt'}),
                        mCreateElement('i', {class: 'icon sprite-fm-mono icon-info storage-limit-icon hidden'}),
                        mCreateElement('div', {class: 'lp-storage-limit-popup'}, [
                            document.createTextNode(l.storage_limit_tooltip)
                        ])
                    ])
                ]),
                mCreateElement('div', {class: 'storage-graph js-storagegraph hidden'}, [
                    mCreateElement('span')
                ]),
                infoBlock
            ]),
            mCreateElement('div', {class: 'js-lp-storage-information-popup lp-storage-information-popup hidden'})
        ], this.domNode);

        let eventid = 500477;

        if (this.parentNode === mega.ui.header.avatarMenu) {
            eventid = 500478;
        }

        // Upgrade button
        MegaTopMenu.renderUpgradeButton(infoBlock, eventid);
        if (options.achievements && u_attr && (!u_attr.p || u_attr.p >= pro.ACCOUNT_LEVEL_FEATURE) && !u_attr.b) {
            const achieveWrap = document.createElement('div');
            achieveWrap.className = 'achieve-link hidden';
            MegaButton.factory({
                parentNode: achieveWrap,
                text: l.unlock_achievement_btn,
                icon: 'sprite-fm-mono icon-rocket-thin-outline',
                onClick() {
                    mega.achievem.achievementsListDialog();
                    eventlog(500808);
                }
            });
            infoBlock.appendChild(achieveWrap);
            if (mega.achievem) {
                mega.achievem.enabled().then(() => {
                    achieveWrap.classList.remove('hidden');
                });
            }
        }

        M.onFileManagerReady(() => this.checkUpdate());
    }

    // TODO: need further update to make more fit on component
    async checkUpdate(data) {

        const _checkCondition = () => !u_type || !fminitialized || (!data && M.storageQuotaCache);

        if (_checkCondition()) {

            if (u_type === 0 && this.storageBlock) {
                this.storageBlock.classList.add('hidden');
            }

            return false;
        }

        this.storageBlock.classList.remove('hidden');

        this.showLoading();

        M.storageQuotaCache = data || await M.getStorageQuota();

        let storageHtml;
        const {percent, max, used, isAlmostFull, isFull} = M.storageQuotaCache;
        const space = bytesToSize(max, 0);
        const space_used = bytesToSize(used);

        this.storageBlock.classList.remove('over');
        this.storageBlock.classList.remove('warning');

        if (isFull) {
            this.storageBlock.classList.add('over');
        }
        else if (isAlmostFull) {
            this.storageBlock.classList.add('warning');
        }

        const isFlexPlan = () => u_attr.b || u_attr.pf;
        const isFlexPlanActive = () => u_attr.b && u_attr.b.m && u_attr.b.s === pro.ACCOUNT_STATUS_ENABLED
            || u_attr.pf && u_attr.pf.s === pro.ACCOUNT_STATUS_ENABLED;
        const $upgradeBtn = $('.info a.upgrade', this.storageBlock);

        // If Business or Pro Flexi always show the plan name (even if expired, which is when u_attr.p is undefined)
        if (isFlexPlan()) {
            this.storageBlock.querySelector('.plan').textContent = pro.getProPlanName(
                u_attr.b ? pro.ACCOUNT_LEVEL_BUSINESS : pro.ACCOUNT_LEVEL_PRO_FLEXI
            );

            // Show only space_used for Business and Pro Flexi accounts
            storageHtml = `<span class="lp-sq-used">${space_used}</span>`;
            if (isFlexPlanActive()) {
                $upgradeBtn.addClass('hidden');
            }
        }
        else {
            this.storageBlock.querySelector('.plan').textContent = pro.getProPlanName(u_attr.p || l[1150]);
            storageHtml = l[1607].replace('%1', `<span class="lp-sq-used">${space_used}</span>`)
                .replace('%2', `<span class="lp-sq-max">${space}</span>`);
            this.storageBlock.querySelector('.js-storagegraph').classList.remove('hidden');
            $('.js-storagegraph span', this.storageBlock).outerWidth(`${percent}%`);

            // Check if user (not a Business or Pro Flexi one) is in the fmpup (FM / Photos upgrade point)
            // variant group and change the upgrade point UI if so
            if (!data && M.isInExperiment('fmpup')) {
                const $storageLimitIcon = $('.storage-limit-icon', this.storageBlock);

                const _sendEvent = (eventId) => {
                    // Send eventlog and a message with the tab the user was on
                    // (Drive / Photos) when they clicked the buttons
                    const isCloudDrive = M.currentrootid === M.RootID;
                    const eventMessage = `${isCloudDrive ? 'Drive' : 'Photos'} tab selected`;

                    eventlog(eventId, eventMessage);
                };

                if (this.parentNode !== mega.ui.header.avatarMenu) {
                    $upgradeBtn.removeClass('hidden').rebind('click.sendEvent', () => {
                        _sendEvent(500282);
                    });
                }

                this.storageBlock.querySelector('.text-and-tooltip').classList.remove('hidden');

                if (isAlmostFull || isFull) {
                    $storageLimitIcon.removeClass('hidden').rebind('click.sendEvent', () => {
                        _sendEvent(500283);

                        const hcArticleURL = 'https://help.mega.io/plans-storage/space-storage/storage-exceeded';
                        window.open(hcArticleURL, '_blank', 'noopener noreferrer');
                    });
                }
            }
        }

        $('.storage-txt', this.storageBlock).safeHTML(storageHtml);

        this.hideLoading();

        const ach = this.domNode.querySelector('.achieve-link');
        if (ach && !(!u_attr.p || u_attr.p >= pro.ACCOUNT_LEVEL_FEATURE) && !u_attr.b) {
            ach.classList.add('hidden');
        }

        if (!isFlexPlan() && (!u_attr.tq || !this.storageBlock.classList.contains('caption-running'))) {
            this.storageBlock.classList.add('caption-running');
            return this.createLeftStorageBlockCaption(this.storageBlock, space);
        }
    }

    showLoading() {

        this.loaderSpinner = this.loaderSpinner || this.storageBlock.querySelector('.loader');

        // minimize DOM ops when not needed by only triggering the loader if really needed
        if (this.loaderSpinner) {
            this.loaderSpinner.classList.add('loading');
        }
    }

    hideLoading() {

        this.loaderSpinner = this.loaderSpinner || this.storageBlock.querySelector('.loader');

        if (this.loaderSpinner) {
            this.loaderSpinner.remove();
        }
    }

    async createLeftStorageBlockCaption(container, storageQuota) {

        let checked = false;
        const $storageBlock = $(container);
        const $popup = $('.js-lp-storage-information-popup', $storageBlock.parent()).removeClass('hidden');
        const $storageLimitIcon = $('.storage-limit-icon', $storageBlock);
        const $storageLimitPopup = $('.lp-storage-limit-popup', $storageBlock);

        $storageBlock.rebind('mouseenter.storage-usage', () => {
            if (!checked) {
                checked = true;

                Promise.resolve(!u_attr.p || u_attr.tq || M.getTransferQuota())
                    .then((res) => {
                        if (typeof res === 'object') {
                            // base transfer quota from getTransferQuota()
                            res = res.base;
                        }
                        if (typeof res === 'number') {
                            res = bytesToSize(res, 3, 4);
                        }

                        if (u_attr.p) {
                            u_attr.tq = res;
                            $popup.text(l.storage_usage_caption_pro.replace('%1', storageQuota)
                                .replace('%2', u_attr.tq));
                        }
                        else {
                            $popup.text(l.storage_usage_caption_free.replace('%1', storageQuota));
                        }
                    });
            }

            delay('storage-information-popup-mouseenter', () => {
                if (!$storageLimitIcon.is(':hover')) {
                    $popup.addClass('hovered');
                }
            }, 1e3);
        });

        $storageBlock.rebind('mouseleave.storage-usage', () => {
            delay.cancel('storage-information-popup-mouseenter');
            delay.cancel('storage-information-popup-mouseleave');
            $popup.removeClass('hovered');
            $storageLimitPopup.removeClass('hovered');
        });

        $storageLimitIcon.rebind('mouseenter.storage-limit', () => {
            delay('storage-limit-popup-mouseenter', () => {
                $storageLimitPopup.addClass('hovered');
                $popup.removeClass('hovered');
            }, 1e3);
        });

        $storageLimitIcon.rebind('mouseleave.storage-limit', () => {
            delay.cancel('storage-limit-popup-mouseenter');
            $storageLimitPopup.removeClass('hovered');
            delay('storage-information-popup-mouseleave', () => {
                if ($storageBlock.is(':hover')) {
                    $popup.addClass('hovered');
                }
            }, 1e3);
        });
        $('.achieve-link', this.domNode).rebind('mouseenter.storage-usage', () => {
            delay.cancel('storage-information-popup-mouseenter');
            delay.cancel('storage-information-popup-mouseleave');
            $popup.removeClass('hovered');
            $storageLimitPopup.removeClass('hovered');
            return false;
        });
    }

    static async checkUpdate() {

        await mega.ui.topmenu.storageBlock.checkUpdate();

        if (mega.ui.header.avatarMenu && !mega.ui.header.avatarMenu.classList.contains('hidden')) {
            mega.ui.header.storageBlock.checkUpdate(M.storageQuotaCache);
        }
    }
}
