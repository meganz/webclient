mega.ui.pm = {

    async initUI() {
        'use strict';

        if (!mega.pm.casRan) {
            mega.pm.casRan = true;
            await mega.pm.checkActiveSubscription().catch(tell);

            mBroadcaster.addListener('pagechange', page => {
                if (page === 'fm/pwm' && !mega.pm.pwmFeature && !u_attr.b && !u_attr.pf) {
                    if (mega.pm.plan && mega.pm.plan.trial) {
                        this.subscription.freeTrial();
                    }
                    else {
                        this.subscription.featurePlan();
                    }
                }
            });
        }

        const nodeID = M.currentdirid === 'pwm' ? 'pwm' : M.currentCustomView.nodeID;

        MegaHeader.init(true);

        if (fmholder) {
            fmholder.classList.add('pmholder');
        }

        if (pmlayout) {
            // Manually close some old elements after layout update, deprecate this after merging
            pmlayout.querySelector('.section.conversations').classList.add('hidden');
            pmlayout.querySelector('.js-fm-left-panel').classList.add('hidden');
        }

        queueMicrotask(() => {
            mBroadcaster.sendMessage('pwm-initialized');
        });

        // Business and flexi user has read only access to password manager even it is expired
        if (!mega.pm.pwmFeature && !u_attr.b && !u_attr.pf) {
            return;
        }

        if (nodeID === 'account') {
            this.list.hide();
            mega.ui.pm.settings.initUI();
        }
        else {
            mega.ui.pm.settings.closeUI();

            if (nodeID !== 'pwm') {
                this.comm.saveLastSelected(nodeID);
            }

            this.list.show().then(() => {
                if (window.pwmredir) {
                    const [type, action, target] = window.pwmredir;
                    delete window.pwmredir;

                    if (action === 'add') {
                        mega.ui.topnav.domNode.componentSelector('.add-btn').trigger('click');

                        if (type === 'pwd') {
                            eventlog(500874);
                            this.menu.domNode.componentSelector('.pwd-item').trigger('click');
                        }
                        else if (type === 'cc') {
                            eventlog(500875);
                            this.menu.domNode.componentSelector('.cc-item').trigger('click');
                        }
                    }
                    else if (action === 'edit' && M.d[target]) {
                        const item = this.list.passwordList.componentSelector(`#${CSS.escape(target)}`);
                        if (item) {
                            const result = item.trigger('click.selectItem');
                            const triggerEdit = () => {
                                this.contextMenu.domNode.componentSelector('.edit-item').trigger('click');
                            };
                            if (result instanceof Promise) {
                                result.then(triggerEdit);
                            }
                            else if (
                                result === true &&
                                !(
                                    mega.ui.pm.overlay.visible &&
                                    mega.ui.passform &&
                                    mega.ui.passform.formType === 'update'
                                )
                            ) {
                                triggerEdit();
                            }

                            if (type === 'pwd') {
                                eventlog(500876);
                            }
                            else if (type === 'cc') {
                                eventlog(500877);
                            }
                        }
                    }
                }
            })
                .catch(tell);
        }

        if (navigator.onLine) {
            this._online();
        }
        else {
            this._offline();
        }

        window.addEventListener('online', this._online);
        window.addEventListener('offline', this._offline);

        document.body.classList.add('pwm-ui');

        if (d) {
            console.info('PWM Initialized.');
        }

        // if user visit pwm page, we treated they are finished promotion and update their flags
        mega.ui.onboarding.flagStorage.setSync(OBV4_FLAGS.CLOUD_DRIVE_MP_BUBBLE,1);

        // Change to PWM logo
        mega.ui.topmenu.megaLink.icon = 'sprite-fm-uni icon-pwm';

        // Remove chat padding hack for rtl
        mega.ui.header.domNode.style.paddingInlineEnd = '';

        // Check if the info panel exists and close it if it is open
        if (mega.ui.mInfoPanel) {
            mega.ui.mInfoPanel.hide();
        }
    },

    closeUI() {
        'use strict';

        document.body.classList.remove('pwm-ui');

        if (!mega.pm.pwmFeature && !u_attr.b && !u_attr.pf) {
            return;
        }

        if (this.list) {
            this.list.removeResizeListener();
            this.list.hide();
        }

        mega.ui.pm.settings.closeUI();

        window.removeEventListener('online', this._online);
        window.removeEventListener('offline', this._offline);

        // Change to Mega logo
        mega.ui.topmenu.megaLink.icon = 'sprite-fm-uni icon-mega-logo';
    },

    _online() {
        'use strict';

        mega.ui.alerts.hideSlots();

        const nodeID = M.currentdirid === 'pwm' ? 'pwm' : M.currentCustomView.nodeID;
        mega.ui.pm.settings.utils.handleImportFlow(nodeID, false);
    },

    _offline() {
        'use strict';

        mega.ui.banner.show('', l.no_internet, '', 'error', false, true, true);

        const nodeID = M.currentdirid === 'pwm' ? 'pwm' : M.currentCustomView.nodeID;
        mega.ui.pm.settings.utils.handleImportFlow(nodeID, true);
    },

    comm: {
        createItem: mega.pm.createItem,
        updateItem: mega.pm.updateItem,
        deleteItem: mega.pm.deleteItem,
        saveLastSelected: mega.pm.saveLastSelected,
        getLastSelected: mega.pm.getLastSelected,
        getSortData: mega.pm.getSortData,
        setSortData: mega.pm.setSortData,
        loadVault: mega.pm.loadVault,
        loadTLDs: mega.pm.loadTLDs
    },

    /* Some utility variables and listeners from the extension */

    POPUP_SIDE_MARGIN: 24,
    POPUP_TOP_MARGIN: 24,

    /*
    These favicon retrieval utility functions are temporary.
    In the future, API will fetch favicons from the manifest in real-time and provide us with their base64 encoding.
    This will eliminate the need for manual handling.
    However, this suggestion has been postponed to the next version.
    */

    SUPPORTED_FAVICON: new Set([
        "adobe", "airbnb", "aliexpress", "allrecipes", "amazon", "americanexpress", "apple",
        "battle", "bbc", "bestbuy", "bitly", "bloomberg", "booking",
        "canva", "capitalone", "citi", "clevelandclinic", "cnn", "coursera", "craigslist", "cricbuzz",
        "dell", "discord", "disneyplus", "dropbox",
        "ea", "ebay", "espn", "etsy", "eventbrite", "expedia",
        "facebook", "fandom", "fedex", "figma", "flipkart", "forbes", "foxnews",
        "gamespot", "github", "gog", "google",
        "healthline", "hotels", "hulu",
        "ibm", "imdb", "imgur", "indeed", "instagram", "investing", "irs",
        "kickstarter",
        "linkedin", "linktree", "live",
        "mapquest", "medium", "meetup", "mega", "messenger", "mlb",
        "netflix", "nytimes", "nih", "nike", "nintendo",
        "ok", "openai", "outbrain",
        "patreon", "paypal", "pinterest", "playstation",
        "quora",
        "reddit", "roblox", "rockstargames", "rottentomatoes",
        "samsung", "shopify", "snapchat", "soundcloud", "speedtest", "spotify", "stackoverflow", "steampowered",
        "t-mobile", "taboola", "target", "telegram", "temu", "thehomedepot", "ticketmaster", "tiktok",
        "theguardian", "tripadvisor", "tumblr", "twitch",
        "uber", "usatoday", "usnews", "usps",
        "vimeo", "vk",
        "walmart", "webmd", "wix", "wordpress",
        "x", "xero",
        "yahoo", "yelp", "youtube",
        "zillow", "zoom"
    ]),
    subscription: {
        freeTrialFlag: 0,
        daysLeft: 14,
        freeTrialContainer: null,
        featurePlanContainer: null,
        freeTrial() {
            'use strict';

            if (!this.freeTrialContainer) {
                const startDate = time2date(Date.now() / 1000 + this.daysLeft * 24 * 60 * 60, 2);

                const timelineData = [
                    {
                        icon: 'sprite-fm-mono icon-lock-thin-outline',
                        day: l[1301],
                        description: l.free_trial_today_desc
                    },
                    {
                        icon: 'sprite-fm-mono icon-bell-thin-outline',
                        day: mega.icu.format(l.on_day_n, 10),
                        description: l.email_before_trial_end
                    },
                    {
                        icon: 'sprite-fm-mono icon-star-thin-outline',
                        day: mega.icu.format(l.on_day_n, 14),
                        description: l.free_trial_end_desc.replace('%1', startDate)
                    }
                ];

                const container = document.createElement('div');
                container.className = 'timeline-container';

                const subtitle = document.createElement('h3');
                subtitle.textContent = l.heres_how_it_works;
                container.appendChild(subtitle);

                const timeline = document.createElement('div');
                timeline.className = 'timeline';

                for (let i = 0; i < timelineData.length; i++) {
                    const item = timelineData[i];
                    const timelineItem = document.createElement('div');
                    timelineItem.className = 'timeline-item';

                    const icon = document.createElement('i');
                    icon.className = `timeline-icon ${item.icon}`;

                    const verticalBar = document.createElement('div');
                    verticalBar.className = 'timeline-bar';

                    const day = document.createElement('p');
                    day.className = 'timeline-day';
                    day.textContent = item.day;

                    const description = document.createElement('p');
                    description.className = 'timeline-description';
                    description.textContent = item.description;

                    timelineItem.appendChild(icon);
                    timelineItem.appendChild(day);
                    if (i !== timelineData.length - 1) {
                        timelineItem.appendChild(verticalBar);
                    }
                    timelineItem.appendChild(description);

                    timeline.appendChild(timelineItem);
                }

                container.appendChild(timeline);

                this.freeTrialContainer = [container];
            }

            this.freeTrialFlag = 1;
            this.initDialog(this.freeTrialContainer);
        },

        featurePlan() {
            'use strict';

            if (!this.featurePlanContainer) {
                const contentTitle = document.createElement('div');
                contentTitle.className = 'subscription-content-title';
                contentTitle.textContent = l.benefits_label;

                const benefitsList = [];
                const items = [
                    {
                        icon: 'sprite-fm-mono icon-devices-thin-outline',
                        text: l.benefit_one
                    },
                    {
                        icon: 'sprite-pm-mono icon-magic-wand-thin-outline',
                        text: l.benefit_two
                    },
                    {
                        icon: 'sprite-fm-mono icon-globe-americas-thin-outline',
                        text: l.benefit_three
                    }
                ];

                for (let i = 0; i < items.length; i++) {
                    const item = document.createElement('div');
                    item.className = 'benefits-list';

                    const icon = document.createElement('i');
                    icon.className = items[i].icon;
                    item.appendChild(icon);

                    const text = document.createElement('span');
                    text.textContent = items[i].text;
                    item.appendChild(text);

                    benefitsList.push(item);
                }

                this.featurePlanContainer = [contentTitle, ...benefitsList];
            }

            this.freeTrialFlag = 0;
            this.initDialog(this.featurePlanContainer);
        },

        initDialog(content) {
            'use strict';

            let name = 'feature-plan-dialog';
            let title =  l.subscribe_title;
            let classList = ['subscription-dialog'];
            let ctaText = l.subscribe_btn;
            let eventId = 500563;

            if (this.freeTrialFlag) {
                name = 'free-trial-dialog';
                title = l.try_mega_pass;
                classList = ['free-trial'];
                ctaText = l.start_free_trial;
                eventId = 500564;
            }

            const ctaBinding = page => {
                eventlog(eventId);
                this.hideDialog();
                loadSubPage(page);
            };

            mega.ui.sheet.show({
                name,
                title,
                titleType: 'h1',
                classList,
                contents: content,
                centered: false,
                showClose: false,
                navImage: 'pwm-image',
                preventBgClosing: true,
                actions: [
                    {
                        type: 'normal',
                        text: l[18682],
                        className: 'secondary',
                        onClick: () => ctaBinding('fm')
                    },
                    {
                        type: 'normal',
                        text: ctaText,
                        onClick: () => ctaBinding('propay_pwm')
                    }
                ]
            });

            mega.ui.sheet.addClass(...classList);
            mega.ui.sheet.contentNode.Ps = new PerfectScrollbar(mega.ui.sheet.contentNode);
            loadingDialog.hide();
        },

        hideDialog() {
            'use strict';

            const {sheet} = mega.ui;

            if (sheet.visible &&
                (sheet.name === 'free-trial-dialog' ||
                sheet.name === 'feature-plan-dialog')) {
                sheet.hide();
                if (sheet.contentNode.Ps) {
                    sheet.contentNode.Ps.destroy();
                }
                sheet.removeClass('subscription-dialog', 'free-trial');
            }
        }
    }
};

(mega => {
    "use strict";

    lazy(mega.ui.pm, 'overlay', () => new MegaOverlay({
        parentNode: mega.ui.pm.list.domNode,
        componentClassname: 'mega-overlay pm-overlay',
        wrapperClassname: 'overlay',
        scrollOverlay: true,
    }));

    lazy(mega.ui.pm, 'menu', () => new MegaPMMenu({
        parentNode: document.body,
        componentClassname: 'menu-container context-menu',
        wrapperClassname: 'menu'
    }));

    lazy(mega.ui.pm, 'contextMenu', () => new MegaContextMenu());

})(window.mega);
