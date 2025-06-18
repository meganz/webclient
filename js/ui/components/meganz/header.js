class MegaHeader extends MegaMobileHeader {

    constructor(options) {

        options.avatarButtonType = MegaButton;

        super(options);

        /* Top block */

        const navNavigation = this.domNode.querySelector('.top-block .nav-navigation');
        const navActions = this.domNode.querySelector('.top-block .nav-actions');
        let wrapper;

        navNavigation.querySelector('.home').classList.add('.hidden');

        // Remove mobile kebab menu
        const kebab = navActions.querySelector('.menu');
        if (kebab) {
            kebab.remove();
        }

        if (!mega.lite.inLiteMode) {

            // Search - Current using old search bar
            this.searchInput = options.parentNode.querySelector('.searcher-wrapper');
            this.searchInput.classList.add('search');
            this.searchInput.classList.remove('hidden');
            navNavigation.prepend(this.searchInput);

            // Notification
            wrapper = mCreateElement(
                'div',
                {class: 'menu-wrapper notif-wrapper notification js-dropdown-notification'},
                navActions
            );
            navActions.prepend(wrapper);

            this.notifButton = new MegaButton({
                parentNode: wrapper,
                type: 'icon',
                componentClassname: 'text-icon alarm',
                icon: 'sprite-fm-mono icon-bell-thin-outline',
                iconSize: 24,
                simpletip: l[862]
            });

            this.notifMenu = options.parentNode.querySelector('.notification-popup');

            wrapper.append(this.notifMenu);

            this.notifButton.on('click.list', e => {
                $.hideContextMenu();
                if (this.notifButton.toggleClass('active')) {
                    this.showNotifMenu();
                }
                else {
                    this.closeNotifMenu(e);
                }

                return false;
            });

            this.notifButton.domNode.prepend(mCreateElement('span', {class: 'js-notification-num icon-badge hidden'}));
        }

        // Contacts menu
        wrapper = mCreateElement('div', {class: 'menu-wrapper contacts-wrapper top-contacts'}, navActions);
        this.contactsButton = new MegaButton({
            parentNode: wrapper,
            type: 'icon',
            componentClassname: 'text-icon contacts flyout-option simpletip',
            icon: 'sprite-fm-mono icon-user-square-thin-outline',
            iconSize: 24,
            dataset: {
                simpletip: l[165],
                simpletipClass: 'mobile-theme-tip',
            },
            onClick: () => {
                if (mega.ui.flyout.name === 'contacts') {
                    mega.ui.flyout.hide();
                }
                else {
                    mega.ui.flyout.showContactsFlyout();
                    eventlog(500656);
                }
            }
        });
        navActions.prepend(wrapper);

        // Chats menu
        wrapper = mCreateElement('div', {class: 'menu-wrapper chats-wrapper top-chats'}, navActions);
        this.chatsButton = new MegaButton({
            parentNode: wrapper,
            type: 'icon',
            componentClassname: 'text-icon chats flyout-option simpletip',
            icon: 'sprite-fm-mono icon-message-chat-circle-thin',
            iconSize: 24,
            dataset: {
                simpletip: l[7997],
                simpletipClass: 'mobile-theme-tip',
            },
            onClick: () => {
                if (!megaChatIsReady) {
                    return;
                }
                if (mega.ui.flyout.name === 'chat') {
                    mega.ui.flyout.hide();
                }
                else {
                    mega.ui.flyout.showChatsFlyout();
                    eventlog(500657);
                }
            }
        });
        mCreateElement('i', {class: 'sprite-fm-mono icon-phone hidden top-chats-call'}, wrapper);
        navActions.prepend(wrapper);

        // Bento Menus
        wrapper = mCreateElement('div', {class: 'menu-wrapper bento-wrapper bento'}, navActions);
        navActions.prepend(wrapper);

        this.bentoButton = new MegaButton({
            parentNode: wrapper,
            type: 'icon',
            componentClassname: 'text-icon bento',
            icon: 'sprite-fm-mono icon-bento-menu',
            iconSize: 24,
            simpletip: l.bento_title
        });

        // Component possibly
        this.bentoMenu = mCreateElement('div', {class: 'bento-menu hidden'}, wrapper);
        this.bentoMenu.items = {
            drive: {
                componentClassname: 'drive',
                text: l.drive,
                href: '/fm',
                icon: 'sprite-fm-mono icon-cloud-thin-outline',
                iconSize: 24,
                activeCondition: () => mega.ui.topmenu.hasClass('drive'),
                eventLog: 500446
            },
            chat: {
                componentClassname: 'chat',
                text: l[7997],
                href: '/fm/chat',
                icon: 'sprite-fm-mono icon-message-chat-circle-thin',
                iconSize: 24,
                activeCondition: () => M.chat,
                eventLog: 500294
            },
            pwm: {
                componentClassname: 'pwm',
                text: l.passwords,
                href: '/fm/pwm',
                icon: 'sprite-fm-mono icon-lock-thin-outline',
                iconSize: 24,
                activeCondition: () => M.currentCustomView.type === 'pwm',
                eventLog: 500628
            },
            vpn: {
                componentClassname: 'vpn extlink',
                text: l.vpn,
                href: 'https://mega.io/vpn',
                target: '_blank',
                icon: 'sprite-fm-mono icon-zap-thin-outline',
                iconSize: 24,
                eventLog: 500629
            },
            business: {
                componentClassname: 'business',
                text: l[19530],
                href: '/fm/user-management',
                icon: 'sprite-fm-mono icon-building',
                iconSize: 24,
                activeCondition: () => M.currentdirid && M.currentdirid.startsWith('user-management'),
                eventLog: 500630
            }
        };

        for (const key in this.bentoMenu.items) {
            if (this.bentoMenu.items.hasOwnProperty(key)) {
                const item = this.bentoMenu.items[key];
                this.bentoMenu.items[key] = [
                    new MegaLink({
                        parentNode: this.bentoMenu,
                        type: 'normal',
                        ...item
                    }),
                    item.activeCondition
                ];
            }
        }

        this.bentoButton.on('click.list', () => {
            if (this.bentoButton.toggleClass('active')) {
                this.showBentoMenu();
            }
            else {
                this.closeBentoMenu();
            }
        });

        if (mega.lite.inLiteMode) {
            const backtomega = new MegaLink({
                parentNode: navActions,
                text: l.back_to_mega,
                type: "normal",
                componentClassname: "outline",
                prepend: true
            });

            backtomega.on('click.backtomega', () => {

                // Remove the local storage variable which triggers MEGA Lite mode to load
                delete localStorage.megaLiteMode;

                // Store a log for statistics (User decided to go back to regular MEGA - Back to MEGA button)
                // Then reload the account back into regular MEGA
                loadingDialog.show();
                Promise.resolve(eventlog(99897)).finally(() => location.reload());
            });
        }

        if (!u_type) {

            const loginBtn = navActions.componentSelector('.login-button');

            loginBtn.addClass('outline').removeClass('action-link').off('tap').rebind('click.auth', () => {
                if (u_type === 0) {
                    mLogout();
                }
                else {
                    var c = $('.dropdown.top-login-popup', pmlayout).attr('class');
                    if (c && c.includes('hidden')) {
                        if (page === 'register') {
                            delay('registerloginevlog', () => eventlog(99818));
                        }
                        tooltiplogin.init();
                        return false;
                    }

                    tooltiplogin.init(1);

                }
            });

            if (u_type === 0) {
                loginBtn.text = l.log_out;
            }

            const signupBtn = new MegaLink({
                parentNode: navActions,
                text: l[968],
                type: "normal",
                componentClassname: "create-account-button primary"
            });

            signupBtn.on('click.signup', () => {
                if (this.hasClass('business-reg')) {
                    loadSubPage('registerb');
                }
                else {
                    if (page === 'login') {
                        delay('loginregisterevlog', () => eventlog(99798));
                    }
                    loadSubPage('register');
                }
            });

            this.topLangButton = new MegaButton({
                parentNode: navActions,
                type: 'normal',
                componentClassname: 'text-icon top-language underline',
                icon: 'sprite-fm-mono icon-languages',
                iconSize: 24,
                prepend: true,
                text: getRemappedLangCode(lang).toUpperCase(),
                onClick: () => {
                    langDialog.show();
                }
            });

            // Help menu
            wrapper = mCreateElement('div', {class: 'menu-wrapper help-wrapper top-help'});
            navActions.prepend(wrapper);

            this.topHelpButton = new MegaButton({
                parentNode: wrapper,
                type: 'icon',
                componentClassname: 'text-icon top-help',
                icon: 'sprite-fm-mono icon-help-circle-thin-outline',
                iconSize: 24,
                prepend: true
            });

            this.topHelpMenu = mCreateElement('div', {class: 'top-help-menu hidden header-dropdown-menu'}, wrapper);

            const items = Object.create(null);

            items.help = new MegaLink({
                parentNode: this.topHelpMenu,
                type: 'fullwidth',
                componentClassname: 'helpcentre extlink',
                text: l[384],
                target: '_blank',
                href: 'https://help.mega.io/'
            });

            mCreateElement('div', {class: 'horizontal-divider'}, this.topHelpMenu);

            items.csp = new MegaButton({
                parentNode: this.topHelpMenu,
                type: 'fullwidth',
                componentClassname: 'cookie-settings',
                text: l[24644],
                onClick: () => {
                    if ('csp' in window) {
                        csp.trigger().dump('csp.trigger');
                    }
                }
            });

            items.cookie = new MegaLink({
                parentNode: this.topHelpMenu,
                type: 'fullwidth',
                componentClassname: 'cookie-policy extlink',
                text: l[24629],
                target: '_blank',
                href: `${getBaseUrl()}/cookie`
            });

            mCreateElement('div', {class: 'horizontal-divider'}, this.topHelpMenu);

            items.terms = new MegaLink({
                parentNode: this.topHelpMenu,
                type: 'fullwidth',
                componentClassname: 'terms-of-service extlink',
                text: l[385],
                target: '_blank',
                href: 'https://mega.io/terms'
            });

            items.privacy = new MegaLink({
                parentNode: this.topHelpMenu,
                type: 'fullwidth',
                componentClassname: 'privacy-policy extlink',
                text: l[386],
                target: '_blank',
                href: 'https://mega.io/privacy'
            });

            mCreateElement('div', {class: 'horizontal-divider'}, this.topHelpMenu);

            items.copyright = new MegaLink({
                parentNode: this.topHelpMenu,
                type: 'fullwidth',
                componentClassname: 'copyright extlink',
                text: l.ra_type_copyright,
                target: '_blank',
                href: 'https://mega.io/copyright'
            });

            this.topHelpMenu.items = items;

            // Lets kill tap and move to click events
            this.topHelpButton.rebind('click', e => {
                if (this.topHelpButton.toggleClass('active')) {
                    this.showTopHelpMenu();
                }
                else {
                    this.closeTopHelpMenu(e);
                }
            });
        }

        // Temporary account status items fetch from old header until we revamp this
        let oldPopups = document.getElementById('header-account-states-popups');

        if (oldPopups) {
            oldPopups = oldPopups.cloneNode(true);
            oldPopups.id = 'old-header-account-states-popups';
            const remove = oldPopups.querySelectorAll(
                '.js-back-to-mega-button, .js-dropdown-account, .js-more-menu, .js-dropdown-notification');

            for (let i = remove.length - 1; i >= 0; i--) {
                remove[i].parentNode.removeChild(remove[i]);
            }
            navActions.prepend(oldPopups);
        }

        this.loader = mCreateElement('i', {class: 'fmdb-loader sprite-fm-uni icon-loading icon24'});

        navActions.prepend(this.loader);

        /* Bottom block */

        this.domNode.querySelector('.bottom-block .nav-navigation').textContent = '';
        this.domNode.querySelector('.bottom-block .nav-actions').textContent = '';

        this.resetBottomBlock = nop;
    }

    handleMenu(type, close) {

        const actions = close ? [
            'removeClass',
            'add',
            _ => _(),
            'removeEventListener'
        ] : [
            'addClass',
            'remove',
            onIdle,
            'addEventListener'
        ];

        mega.ui.header[`${type}Button`][actions[0]]('active');
        mega.ui.header[`${type}Menu`].classList[actions[1]]('hidden');

        if (bodyel) {

            actions[2](() => {

                const fcType = type.replace(/^./, char => char.toUpperCase());

                fmholder[actions[3]]('mouseup', mega.ui.header[`close${fcType}Menu`], true);
                fmholder[actions[3]]('contextmenu', mega.ui.header[`close${fcType}Menu`], true);
            });
        }
    }

    isSubmenuClose(opts, e) {

        return !opts[0] || e && (e.target === opts[0] ||
            e.target.closest([opts[1]]) && (!e.target.closest('button, a') || e.which !== 1) ||
            e.currentTarget === fmholder && e.target.closest(opts[2]));
    }

    closeNotifMenu(e) {

        if (mega.ui.header.isSubmenuClose([mega.ui.header.notifMenu, '.js-notification-popup', 'button.alarm'], e)) {
            return;
        }

        mega.ui.header.notifButton.parentNode.classList.remove('show');

        mega.ui.header.handleMenu('notif', true);
        notify.markAllNotificationsAsSeen();
        notify.dynamicNotifCountdown.removeDynamicNotifCountdown();
        mega.ui.header.notifButton.icon = mega.ui.header.notifButton.icon.replace('regular-filled', 'thin-outline');
    }

    showNotifMenu() {
        mega.ui.header.notifButton.parentNode.classList.add('show');
        notify.renderNotifications();
        mega.ui.header.handleMenu('notif');
        mega.ui.header.notifButton.icon = mega.ui.header.notifButton.icon.replace('thin-outline', 'regular-filled');
        if (document.body.classList.contains('rtl')) {
            this.notifMenu.style.right = fmconfig.leftPaneWidth <= 270 ?
                `-${8 + (270 - fmconfig.leftPaneWidth)}px` : '-8px';
        }
        eventlog(500322);
    }

    closeAvatarMenu(e) {

        if (mega.ui.header.isSubmenuClose([mega.ui.header.avatarMenu, '.header-dropdown-menu', 'button.avatar'], e) ||
            e && (e.target.closest('.sub-menu-wrap') || e.target.closest('.top-mega-version'))) {
            return;
        }

        if (mega.ui.header.setStatus) {
            mega.ui.header.setStatus.classList.add('hidden');
        }

        mega.ui.header.handleMenu('avatar', true);
    }

    showAvatarMenu() {

        if (M.chat) {
            mega.ui.header.setStatus.classList.remove('hidden');
        }
        else {
            mega.ui.header.setStatus.classList.add('hidden');
        }

        MegaStorageBlock.checkUpdate();

        mega.ui.header.updateUserName(u_attr.fullname);
        mega.ui.header.updateEmail(u_attr.email);
        mega.ui.header.handleMenu('avatar');

        if (u_attr.p) {
            mega.ui.header.domNode.componentSelector('.priority-support').removeClass('hidden');
        }

        eventlog(500323);
    }

    closeBentoMenu(e) {

        if (mega.ui.header.isSubmenuClose([mega.ui.header.bentoMenu, '.bento-menu', 'button.bento'], e)) {
            return;
        }

        mega.ui.header.handleMenu('bento', true);
    }

    showBentoMenu() {

        Object.values(this.bentoMenu.items).forEach(item => {
            if (item[1] && item[1]()) {
                item[0].addClass('active');
            }
            else {
                item[0].removeClass('active');
            }
        });

        mega.ui.header.handleMenu('bento');

        eventlog(500646);
    }

    closeTopHelpMenu(e) {

        if (mega.ui.header.isSubmenuClose([mega.ui.header.topHelpMenu, '.top-help-menu', 'button.top-help'], e)) {
            return;
        }

        mega.ui.header.handleMenu('topHelp', true);
    }

    showTopHelpMenu() {
        mega.ui.header.handleMenu('topHelp');
    }

    updateUserName(newName) {
        const elem = this.avatarMenu.querySelector('.avatar-menu-name');
        elem.textContent = newName;
        elem.dataset.simpletip = newName;

        if (elem.scrollWidth > elem.offsetWidth) {
            elem.classList.add('simpletip');
        }
        else {
            elem.classList.remove('simpletip');
        }
    }

    updateEmail(newEmail) {
        const elem = this.avatarMenu.querySelector('.avatar-menu-email');
        elem.textContent = newEmail;
        elem.dataset.simpletip = newEmail;

        if (elem.scrollWidth > elem.offsetWidth) {
            elem.classList.add('simpletip');
        }
        else {
            elem.classList.remove('simpletip');
        }
    }

    set headerOptions(types) {
        for (var key in types) {
            if (types.hasOwnProperty(key)) {
                var value = types[key];
                const elements = this.domNode.getElementsByClassName(key);

                for (i = elements.length; i--;) {

                    const element = elements[i];

                    if (typeof value === 'string') {
                        element.textContent = value;
                    }

                    element.classList[value ? 'remove' : 'add']('hidden');
                }
            }
        }
    }

    update() {

        this.headerOptions = MegaHeader.getType();
        mega.ui.topmenu.megaLink.text = MegaHeader.getHeading();

        if (u_type || window.is_eplusplus) {
            this.bentoMenu.items.chat[0].show();
        }
        else {
            this.bentoMenu.items.chat[0].hide();
        }

        if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === 1 || u_attr.b.s === 2) && u_privk) {
            this.bentoMenu.items.business[0].show();
        }
        else {
            this.bentoMenu.items.business[0].hide();
        }

        if (M.chat && this.activityStatus) {
            window.mega.ui.searchbar.refresh();
            this.activityStatus.classList.remove('hidden');
        }
        else if (this.activityStatus) {
            this.activityStatus.classList.add('hidden');
        }

        tooltiplogin.init(1);
        if (mega.ui.flyout) {
            mega.ui.flyout.closeIfNeeded();
        }
    }

    renderLoggedIn(replace) {

        // logged in but ephemeral
        if (u_type === 0) {

            const navActions = this.domNode.querySelector('.top-block .nav-actions');
            const loginLink = new MegaLink({
                parentNode: navActions,
                text: l.log_in,
                type: "normal",
                componentClassname: "action-link login-button"
            });

            mBroadcaster.once('login2', () => {
                this.renderLoggedIn(loginLink);
            });

            return;
        }

        super.renderLoggedIn(replace);

        const registerBtn = this.domNode.componentSelector('.create-account-button');
        if (registerBtn) {
            registerBtn.destroy();
        }

        // Avatar Menu
        useravatar.loadAvatar(u_handle).catch(dump).finally(() => {

            const avatarMeta = generateAvatarMeta(u_handle);
            const shortNameEl = mCreateElement('span', {}, [document.createTextNode(avatarMeta.shortName)]);

            const avatar = mCreateElement('div', {class: `${u_handle} avatar-wrapper`}, [
                avatarMeta.avatarUrl ? mCreateElement('img', {src: avatarMeta.avatarUrl})
                    : mCreateElement('div', {class: `color${avatarMeta.color}`}, [shortNameEl])
            ]);

            // Avatar menu, this can be component later
            this.avatarMenu = mCreateElement('div', {class: 'avatar-menu hidden header-dropdown-menu'}, [
                mCreateElement('div', {class: 'avatar-menu-header'}, [
                    mCreateElement('div', {class: 'avatar-menu-profile'}, [avatar.cloneNode(true)]),
                    mCreateElement('div', {class: 'avatar-menu-details'}, [
                        mCreateElement('div', {class: 'avatar-menu-name', 'data-simpletip': u_attr.fullname},
                                       [document.createTextNode(u_attr.fullname)]),
                        mCreateElement('div', {class: 'avatar-menu-email', 'data-simpletip': u_attr.email},
                                       [document.createTextNode(u_attr.email)])
                    ])
                ])
            ], this.avatarButton.domNode.parentNode);

            this.avatarMenu.Ps = new PerfectScrollbar(this.avatarMenu);

            window.addEventListener('resize', SoonFc(90, this.avatarMenu.Ps.update));

            this.activityStatus = mCreateElement('div', {'class': 'activity-status-block js-activity-status hidden'}, [
                mCreateElement('div', {'class': 'loading-animation'}),
                mCreateElement('div', {'class': 'activity-status top offline'})
            ]);
            this.avatarButton.domNode.appendChild(this.activityStatus);

            // Lets kill tap and move to click events
            this.avatarButton.off('tap').rebind('click', e => {
                if (this.avatarButton.toggleClass('active')) {
                    this.showAvatarMenu();
                }
                else {
                    this.closeAvatarMenu(e);
                }
            });

            const _buildInteractable = item => {
                const interactable = item.href ? MegaLink : MegaButton;

                return new interactable({
                    parentNode: this.avatarMenu,
                    type: 'fullwidth',
                    ...item
                });
            };

            const detailBlock = this.avatarMenu.querySelector('.avatar-menu-details');

            _buildInteractable({
                parentNode: detailBlock,
                type: 'text',
                componentClassname: 'to-my-profile',
                text: l[16668],
                href: 'fm/dashboard',
                eventLog: 500445
            });

            this.storageBlock = new MegaStorageBlock({
                parentNode: this.avatarMenu
            });

            mCreateElement('div', {class: 'horizontal-divider'}, this.avatarMenu);

            _buildInteractable({
                componentClassname: 'download-recovery-key',
                text: l.recovery_key_title,
                onClick: () => {
                    M.showRecoveryKeyDialog(2);
                },
                eventLog: 500312
            });

            mCreateElement('div', {class: 'horizontal-divider'}, this.avatarMenu);

            const _createSubMenu = (options) => {

                const wrapper = mCreateElement('div', {class: 'sub-menu-wrap'}, this.avatarMenu);
                options.items[0].parentNode = wrapper;
                const btn = _buildInteractable(options.items[0]);

                const submenu = mCreateElement('div', {class: options.submenuClass}, wrapper);

                for (var i = 1; i < options.items.length; i++) {

                    const item = options.items[i];

                    if (item.type === 'divider') {
                        mCreateElement('div', {class: 'horizontal-divider'}, submenu);
                    }
                    else {
                        item.parentNode = submenu;
                        _buildInteractable(item);
                    }
                }

                wrapper.addEventListener('mouseover', () => {

                    $(submenu).addClass('active').position({
                        my: "right top",
                        at: "left top",
                        of: btn.domNode,
                        collision: "flipfit"
                    });
                });

                wrapper.addEventListener('mouseout', () => {
                    submenu.classList.remove('active');
                });

                return wrapper;
            };

            const setPresence = presence => {

                if (!megaChatIsReady && !megaChatIsDisabled) {

                    localStorage.megaChatPresence = presence;
                    localStorage.megaChatPresenceMtime = unixtime();
                    loadSubPage('fm/chat');
                }

                this.closeAvatarMenu();
            };

            this.setStatus = _createSubMenu({
                submenuClass: 'header-dropdown-menu sub-menu status',
                items: [
                    {
                        componentClassname: 'set-status',
                        text: l[24845],
                        rightIcon: 'sprite-fm-mono icon-chevron-right-thin-outline'
                    },
                    {
                        icon: 'activity-status online',
                        iconSize: 8,
                        componentClassname: 'online',
                        text: l[5923],
                        onClick: () => {
                            setPresence('chat');
                        },
                        dataset: {presence: 'online'}
                    },
                    {
                        icon: 'activity-status away',
                        iconSize: 8,
                        componentClassname: 'away',
                        text: l[5924],
                        onClick: () => {
                            setPresence('away');
                        },
                        dataset: {presence: 'away'}
                    },
                    {
                        icon: 'activity-status busy',
                        iconSize: 8,
                        componentClassname: 'busy',
                        text: l[5925],
                        subtext: l[19786],
                        onClick: () => {
                            setPresence('dnd');
                        },
                        dataset: {presence: 'dnd'}
                    },
                    {
                        icon: 'activity-status offline',
                        iconSize: 8,
                        componentClassname: 'offline',
                        text: l[5926],
                        subtext: l[19787],
                        onClick: () => {
                            setPresence('offline');
                        },
                        dataset: {presence: 'offline'}
                    }
                ]
            });

            _buildInteractable({
                componentClassname: 'settings',
                text: l[823],
                href: 'fm/account',
                eventLog: 500325
            });

            _buildInteractable({
                componentClassname: 'download-desktop-app extlink',
                target: '_blank',
                text: l.install_desktop_app,
                href: 'https://mega.io/desktop',
                eventLog: 500327
            });

            _buildInteractable({
                componentClassname: 'download-pwm-ext extlink',
                target: '_blank',
                text: l.try_pass_ext_download,
                href: this.getPwmExtensionUrl()
            });

            _buildInteractable({
                componentClassname: 'reload-account',
                text: l[23433],
                onClick: () => {
                    M.reload();
                }
            });

            _buildInteractable({
                componentClassname: 'achievements hidden',
                text: l[16117],
                onClick() {
                    mega.achievem.achievementsListDialog();
                    eventlog(500809);
                }
            });

            if (mega.achievem) {
                mega.achievem.enabled()
                    .then(() => {
                        this.domNode.componentSelector('.achievements').show();
                    })
                    .catch(() => {
                        this.domNode.componentSelector('.achievements').hide();
                    });
            }

            _buildInteractable({
                type: 'normal',
                componentClassname: 'logout secondary',
                text: l.log_out,
                onClick: () => {
                    mLogout();
                },
                eventLog: 500329
            });


            _buildInteractable({
                componentClassname: 'select-language small-btn',
                text: l[670],
                onClick: () => {
                    langDialog.show();
                }
            });

            this.support = _createSubMenu({
                submenuClass: 'sub-menu support',
                items: [
                    {
                        componentClassname: 'support small-btn',
                        text: l[383],
                        rightIcon: 'sprite-fm-mono icon-chevron-right-thin-outline'
                    },
                    {
                        componentClassname: 'feedback',
                        text: l.join_survey_share_opinion,
                        onClick: () => {
                            mega.config.set('rvonbrddl', 1);
                            window.open(
                                'https://survey.mega.co.nz/index.php?r=survey/index&sid=692176&lang=en',
                                '_blank',
                                'noopener,noreferrer'
                            );
                            eventlog(500328);
                        }
                    },
                    {
                        componentClassname: 'helpcentre extlink',
                        text: l[384],
                        target: '_blank',
                        href: 'https://help.mega.io/'
                    },
                    {
                        componentClassname: 'priority-support hidden',
                        text: l.menu_item_priority_support,
                        href: '/support'
                    },
                    {
                        componentClassname: 'megaio extlink',
                        text: l.website_label,
                        target: '_blank',
                        href: 'https://mega.io/'
                    }
                ]
            });

            this.legal = _createSubMenu({
                submenuClass: 'sub-menu legal',
                items: [
                    {
                        componentClassname: 'legal small-btn',
                        text: l[518],
                        rightIcon: 'sprite-fm-mono icon-chevron-right-thin-outline'
                    },
                    {
                        componentClassname: 'cookie-settings',
                        text: l[24644],
                        onClick: () => {
                            if ('csp' in window) {
                                csp.trigger().dump('csp.trigger');
                            }
                        }
                    },
                    {
                        componentClassname: 'cookie-policy extlink',
                        text: l[24629],
                        target: '_blank',
                        href: `${getBaseUrl()}/cookie`
                    },
                    {
                        type: 'divider'
                    },
                    {
                        componentClassname: 'terms-of-service extlink',
                        text: l[385],
                        target: '_blank',
                        href: 'https://mega.io/terms'
                    },
                    {
                        componentClassname: 'privacy-policy extlink',
                        text: l[386],
                        target: '_blank',
                        href: 'https://mega.io/privacy'
                    },
                    {
                        type: 'divider'
                    },
                    {
                        componentClassname: 'copyright extlink',
                        text: l.ra_type_copyright,
                        target: '_blank',
                        href: 'https://mega.io/copyright'
                    }
                ]
            });

            const footer = mCreateElement('div', {class: 'avatar-menu-footer'}, this.avatarMenu);

            let versionClickCounter = 0;

            _buildInteractable({
                parentNode: footer,
                type: 'text',
                componentClassname: 'version top-mega-version',
                text: `V.${M.getSiteVersion()}`,
                onClick: () => {
                    if (++versionClickCounter >= 3) {
                        msgDialog('info', '', 'Developer tools have moved. Ask the team for access!');
                    }
                    delay('top-version-click', () => {
                        versionClickCounter = 0;
                    }, 1000);
                }
            });
        });
    }

    static init(update) {
        const {topmenu, header} = mega.ui;

        topmenu.hide();

        if (update) {
            header.update();
        }
    }

    static types(index) {
        const type = [
            { // logged in default
                'home': false,
                'top-block': true,
                'search': true,
                'notification': !pfid && u_type,
                'bottom-block': false,
                'avatar': true,
                'bento': u_type || is_eplusplus,
                'heading': true,
                'top-help': !u_type,
                'top-language': !u_type,
                'download-desktop-app': M.currentCustomView.type !== 'pwm' && !window.useMegaSync,
                'download-pwm-ext': M.currentCustomView.type === 'pwm',
                'top-contacts': !pfid && u_type,
                'top-chats': !pfid && u_type,
            },
            { // logged out
                'home': false,
                'top-block': true,
                'search': true,
                'notification': false,
                'bottom-block': false,
                'avatar': false,
                'bento': false,
                'heading': true,
                'top-help': true,
                'top-language': true,
                'download-desktop-app': false,
                'download-pwm-ext': false,
                'top-contacts': false,
                'top-chats': false,
            }
        ][index];

        if (pfcol || // Album link
            M.chat || // Chat or meetings
            M.currentCustomView.type === 'pwm' || // password manager
            M.currentdirid && (
                M.currentdirid.startsWith('account') || // settings
                M.currentdirid === 'dashboard' || // dashboard
                M.currentdirid.startsWith('user-management') // Business pages
            )
        ) {
            type.search = false;
        }
        if (!megaChatIsReady) {
            type['top-chats'] = false;
        }
        if (M.chat) {
            type['top-contacts'] = false;
            type['top-chats'] = false;
        }

        return type;
    }

    static getPage() {
        if (is_fm()) {
            if (pfid) {
                return (pfcol) ? 'collectionlink' : 'folderlink';
            }

            if ([M.RootID, 's4', 'shares', 'out-shares', 'public-links', 'faves', M.RubbishID, 'recents',
                 'file-requests'].includes(M.currentrootid) ||
                M.isGalleryPage() || M.isAlbumsPage() ||
                M.currentrootid === M.InboxID || // Temporary title for backup
                M.onDeviceCenter ||
                M.currentdirid === 'transfers' || M.search) {
                return 'drive';
            }
            else if (M.currentCustomView.type === 'pwm') {
                return 'pwm';
            }
            else if (M.currentdirid === 'account') {
                return 'settings';
            }
        }
        return page;
    }

    static getType() {
        const iType = u_attr ? 0 : 1;

        return this.types(iType);
    }

    set topBlockBottomBorder(show) {

        const topBlock = this.domNode.querySelector('.top-block');

        if (topBlock) {
            topBlock.classList[show ? 'add' : 'remove']('border-bottom');
        }
    }

    getPwmExtensionUrl(browser = ua.details.browser) {
        return browser === 'Edgium' ? 'https://microsoftedge.microsoft.com/addons/detail/' +
            'mega-pass-secure-passwor/hjdopmdfeekbcakjbbienpbkdldkalfe' :
            browser === 'Firefox' ? 'https://addons.mozilla.org/en-US/firefox/addon/mega-password-manager/' :
                'https://chromewebstore.google.com/detail/mega-pass/deelhmmhejpicaaelihagchjjafjapjc';
    }
}

(mega => {
    "use strict";

    lazy(mega.ui, 'header', () => new MegaHeader({
        parentNode: pmlayout,
        componentClassname: 'mega-header',
        prepend: true
    }));

})(window.mega);

lazy(MegaHeader, 'headings', () => {
    'use strict';

    // We do not need mobile ones
    delete MegaMobileHeader.headings;

    return Object.freeze({
        'drive': l.drive,
        'pwm': l.mega_pwm,
        'settings': l[823],
        'folderlink': l[808],
        'collectionlink': l.album_link,
        'device-centre': l.device_centre,
    });
});
