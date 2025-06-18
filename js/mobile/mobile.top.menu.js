class MegaMobileTopMenu extends MegaComponent {

    constructor(options) {
        super(options);

        if (!this.domNode) {
            return;
        }

        const subNode = document.createElement('div');
        subNode.className = 'top-nav';
        this.domNode.appendChild(subNode);

        this.megaLink = new MegaLink({
            parentNode: subNode,
            type: 'icon',
            componentClassname: 'text-icon home',
            icon: 'sprite-fm-illustration-wide img-mega-logo',
            iconSize: 24
        });
        this.megaLink.on('tap.home', async() => {

            if (mega.ui.viewerOverlay.confirmDiscard && !await mega.ui.viewerOverlay.confirmDiscard()) {
                return false;
            }

            loadSubPage(u_attr ? 'fm' : 'start');

            if (mega.ui.topmenu.visible) {
                mega.ui.topmenu.hide();
            }
        });

        const closeButton = new MegaButton({
            parentNode: subNode,
            type: 'icon',
            componentClassname: 'text-icon close',
            icon: 'sprite-mobile-fm-mono icon-dialog-close',
            iconSize: 24
        });
        closeButton.on('tap.close', () => {
            if (mega.ui.topmenu.visible) {
                mega.ui.topmenu.hide();
            }
        });

        this.menuNode = document.createElement('nav');
        this.menuNode.className = 'menu';
        this.domNode.append(this.menuNode);

        // TODO: This is for support old page we should deprecate once new page is delivered
        mBroadcaster.addListener('beforepagechange', () => {
            $('.mobile.main-block').addClass('hidden');
        });

        this.domNode.addEventListener('transitionend', evt => {
            if (evt.target === this.domNode) {
                this.domNode.classList.remove('animate');
            }
        });

        this.menuNode = this.domNode.querySelector('.menu');
        this.menuNode.textContent = '';

        this.renderMenuItems();

        this.toggleActive();
        mBroadcaster.addListener('pagechange', () => this.toggleActive());

        // TODO: This is for support old page we should deprecate once new page is delivered
        mBroadcaster.addListener('beforepagechange', () => {
            $('.mobile.main-block, .mobile.old-page').addClass('hidden');
        });

        if (is_touchable) {

            const _gestureHandler = () => {

                if (document.body.offsetWidth < 769) {

                    if (this.gesture) {
                        return;
                    }

                    this.gesture = new MegaGesture({
                        domNode: this.domNode,
                        onTouchMove: ev => {

                            const xDiff = this.gesture.xStart - ev.touches[0].clientX;

                            this.domNode.style.transform = `translateX(${Math.max(0, -xDiff)}px)`;
                        },
                        onSwipeRight: () => {

                            this.hide(true);
                            this.trigger('close');
                        },
                        onTouchEnd: () => {
                            this.domNode.style.transform = '';
                        }
                    });
                }
                else if (this.gesture) {
                    this.gesture.destroy();
                    delete this.gesture;
                }
            };

            _gestureHandler();

            window.addEventListener('resize', _gestureHandler);
        }
    }

    closeActiveOverlays() {
        if (mobile.nodeSelector.active) {
            mobile.nodeSelector.hide();
        }
    }

    renderMenuItems() {

        const menuOpts = {
            type: 'fullwidth',
            componentClassname: 'text-icon menu-item',
            iconSize: 24
        };

        for (const item of this.menuItems) {

            let menuItem;

            // Infer the tappable type
            if (item.binding) {
                menuItem = new MegaButton({
                    ...menuOpts,
                    ...item,
                    parentNode: this.menuNode,
                    componentClassname:
                        `${menuOpts.componentClassname} ${item.typeClassname || ''} ${item.name || ''}`
                });
                menuItem.on('click.nav', event => {
                    this.closeActiveOverlays();
                    item.binding(event);
                });
            }
            else if (item.href) {
                menuItem = new MegaLink({
                    ...menuOpts,
                    ...item,
                    parentNode: this.menuNode,
                    componentClassname:
                        `${menuOpts.componentClassname} ${item.typeClassname || ''} ${item.name || ''}`
                });

                menuItem.domNode.dataset.section = item.href;

                menuItem.on('beforeRedirect.topmenu', () => {

                    mega.ui.topmenu.hide();
                    return this.closeActiveOverlays();
                });

                if (menuItem.href === '/login') {

                    menuItem.on('beforeRedirect.beforeLogin', () => {
                        login_next = page;
                    });

                    mBroadcaster.once('login2', () => {

                        this.destroy();
                        delete mega.ui.topmenu;

                        MegaMobileTopMenu.init();
                    });
                }
            }
            else if (item.type === 'ext' && typeof item.initiator === 'function') {
                item.initiator(this.menuNode);
            }
            else if (item.type === 'spacer') {
                const spacer = document.createElement('div');
                spacer.className = `spacer ${item.typeClassname}`;
                this.menuNode.appendChild(spacer);
            }

            if (item.avatar) {
                menuItem.addClass('account-tablet');

                useravatar.loadAvatar(u_handle).catch(dump).finally(() => {

                    const avatarMeta = generateAvatarMeta(u_handle);
                    const shortNameEl = mCreateElement('span');
                    shortNameEl.textContent = avatarMeta.shortName;

                    const avatar = avatarMeta.avatarUrl
                        ? mCreateElement('img', {src: avatarMeta.avatarUrl})
                        : mCreateElement('div', {class: `color${avatarMeta.color}`}, [shortNameEl]);

                    const avatarContainer = mCreateElement('div', {class: 'avatar'}, [avatar]);

                    menuItem.domNode.prepend(avatarContainer);
                });

                menuItem.domNode.dataset.section = '/fm/account';
                menuItem.on('beforeRedirect.topmenu', () => {
                    if (mobile.nodeSelector.active) {
                        mobile.nodeSelector.hide('/fm/account');
                    }
                    return false;
                });
            }

            if (item.hasTree) {

                const treeWrap = mCreateElement(
                    'div',
                    {class: `fm-tree-panel ${item.treeWrapClass} ${item.typeClassname || ''}`},
                    [menuItem.domNode], this.menuNode);

                const expandArrow = new MegaButton({
                    parentNode: treeWrap,
                    type: 'icon',
                    icon: 'sprite-fm-mono icon-chevron-down-thin-outline',
                    iconSize: 16,
                    componentClassname: 'tree-expander',
                    prepend: true
                });

                const tree = mCreateElement('div', {class: `content-panel ${item.hasTree}`}, [
                    mCreateElement('div', {class: 'tree'})
                ], treeWrap);

                expandArrow.on('click.treeExpand', () => {
                    if (expandArrow.toggleClass('expanded')) {
                        tree.classList.add('active');
                    }
                    else {
                        tree.classList.remove('active');
                    }

                    M.addTreeUIDelayed();
                });

                menuItem.on(item.href ? 'beforeRedirect.treeExpand' : 'click.treeExpand', () => {
                    if (menuItem.active) {
                        expandArrow.trigger('click.treeExpand');
                    }
                });
            }

            if (item.name === 'rubbish-bin') {
                this.rubbishBtn = menuItem;
            }
        }
    }

    get menuItems() {
        return u_attr ? [
            {
                text: l[403],
                href: '/fm/account',
                componentClassname: 'account-tablet text-icon menu-item',
                avatar: true
            },
            {
                text: l[164],
                icon: 'sprite-mobile-fm-mono icon-cloud-thin-outline',
                href: '/fm',
                eventLog: 99901
            },
            {
                text: l.shared_items,
                icon: 'sprite-mobile-fm-mono icon-share-thin-outline',
                href: '/fm/shares',
                eventLog: 99902
            },
            {
                text: l[167],
                icon: 'sprite-mobile-fm-mono icon-trash-thin-outline',
                href: '/fm/rubbish',
                eventLog: 99846
            },
            {
                text: l.mobile_settings_lang_title,
                subtext: languages[lang][2],
                icon: 'sprite-mobile-fm-mono icon-globe-01-thin-outline',
                binding: mobile.languageMenu.init
            },
            {
                text: l[823],
                icon: 'sprite-fm-mono icon-settings-thin-outline',
                href: '/fm/account/settings',
                eventLog: 99903
            }
        ] : [
            {
                text: l.mobile_settings_website_title,
                icon: 'sprite-mobile-fm-mono icon-globe-01-thin-outline',
                href: 'https://mega.io'
            },
            {
                text: l[1361],
                icon: 'sprite-mobile-fm-mono icon-dollar-sign-thin',
                href: '/pro'
            },
            {
                text: l[384],
                icon: 'sprite-mobile-fm-mono icon-headset-thin-outline',
                href: 'help'
            },
            {
                text: l.mobile_settings_appearance_title,
                icon: 'sprite-mobile-fm-mono icon-palette-thin-outline',
                binding: mobile.appearance.init
            },
            {
                text: l.mobile_settings_lang_title,
                subtext: languages[lang][2],
                icon: 'sprite-mobile-fm-mono icon-globe-01-thin-outline',
                binding: mobile.languageMenu.init
            },
            {
                text: l.log_in,
                icon: 'sprite-mobile-fm-mono icon-log-out-thin-outline',
                href: '/login'
            }
        ];
    }

    static init() {

        if (!mega.ui.topmenu) {
            mega.ui.topmenu = new MegaMobileTopMenu({
                parentNode: mainlayout,
                componentClassname: 'mega-top-menu',
                prepend: true
            });
        }
    }

    static getPageRoot() {
        const {active: selActive, origin: selOrigin} = is_mobile && mobile.nodeSelector || {};
        const page = selActive ? `fm/${selOrigin}` : window.page;
        const root = selActive ? M.getNodeRoot(selOrigin) : (M.currentrootid || M.getNodeRoot(M.currentdirid));

        if (!is_fm()) {
            return page;
        }

        if (/\/(notifications|about|support|file-management|settings)$/.test(page) ||
            page.includes('security') && !page.includes('change-password')
            && !page.includes('change-email') && !page.includes('verify')) {

            return '/fm/account/settings';
        }
        else if (page.startsWith('fm/account')) {
            return '/fm/account';
        }
        else if (page.endsWith('account')) {
            return `/${page}`;
        }
        else if (page === 'fm' || `fm/${root}` === `fm/${M.RootID}`) {
            return '/fm';
        }
        else if (`fm/${root}` === `fm/${M.RubbishID}`) {
            return '/fm/rubbish';
        }
        return `/fm/${root || M.RootID}`;
    }

    // General methods for the top menu
    get visible() {
        return getComputedStyle(this.domNode).position === 'relative' ||
            this.domNode.classList.contains('active');
    }

    show() {
        this.domNode.classList.add('active', 'animate');
    }

    hide(noDelay) {

        if (noDelay) {
            this.domNode.classList.add('no-delay');
        }

        this.domNode.classList.add('animate');
        this.domNode.classList.remove('active');

        onIdle(() => this.domNode.classList.remove('no-delay'));
    }

    toggleActive() {

        const page = MegaMobileTopMenu.getPageRoot();

        // if (mega.flags.ab_ads) {
            mega.commercials.mobileFmTabHander();
        // }

        for (const item of this.domNode.querySelectorAll('.menu-item')) {

            const isASharesPage = item.dataset.section === '/fm/shares' &&
                (M.currentrootid === 'out-shares' || M.currentrootid === 'public-links');
            const isSupportPage = item.dataset.section === '/fm/account/settings' && page === 'support';

            if (item.dataset.section === page || isASharesPage || isSupportPage) {

                item.component.addClass('active');
                if (item.dataset.section !== '/fm/account') {
                    item.component.icon = item.component.icon.replace('outline', 'solid');
                }
            }
            else if (item.component.active) {
                item.component.removeClass('active');
                if (item.dataset.section !== '/fm/account') {
                    item.component.icon = item.component.icon.replace('solid', 'outline');
                }
            }
        }
    }

    static renderUpgradeButton(userInfoContainer, eventid) {

        let btn;

        if (u_attr && !u_attr.pf && !u_attr.b) {
            btn = new MegaLink({
                parentNode: userInfoContainer,
                href: 'pro',
                componentClassname: 'upgrade outline',
                text: l[433],
                eventLog: eventid
            });
        }

        // If expired business master account show reactivate button
        else if (u_attr && (u_attr.b && u_attr.b.m && u_attr.b.s !== pro.ACCOUNT_STATUS_ENABLED
            || u_attr.pf && u_attr.pf.s !== pro.ACCOUNT_STATUS_ENABLED)) {

            btn = new MegaLink({
                parentNode: userInfoContainer,
                href: 'repay',
                componentClassname: 'upgrade outline',
                text: l.mobile_account_reactivate,
                eventLog: eventid
            });
        }

        if (btn) {
            btn.rebind('beforeRedirect', () => {
                if (this.overlayAccount || is_mobile && mobile.settings.account.overlayAccount) {
                    mega.ui.overlay.hide();
                }
            });
        }

        return btn;
    }
}
