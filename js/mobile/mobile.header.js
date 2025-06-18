class MegaMobileHeader extends MegaComponent {

    constructor(options) {

        super(options);

        // Build: Top Block

        let targetNode = this.domNode;
        this.topBlock = document.createElement('div');
        this.topBlock.className = 'block top-block';
        targetNode.appendChild(this.topBlock);

        this.bannerHolder = document.createElement('div');
        this.bannerHolder.className = 'block banner-block';
        targetNode.appendChild(this.bannerHolder);

        targetNode = this.topBlock;
        let subNode = document.createElement('div');
        subNode.className = 'nav-navigation';
        targetNode.appendChild(subNode);

        const megaLink = new MegaLink({
            parentNode: subNode,
            type: 'icon',
            componentClassname: 'text-icon home',
            icon: 'sprite-fm-illustration-wide img-mega-logo',
            iconSize: 24
        });
        megaLink.on('tap.home', () => {
            loadSubPage(u_attr ? 'fm' : 'start');

            if (mega.ui.topmenu.visible) {
                mega.ui.topmenu.hide();
            }
        });

        const actionsNode = document.createElement('div');
        actionsNode.className = 'nav-actions';
        targetNode.appendChild(actionsNode);

        this.avatarButtonType = options.avatarButtonType || MegaLink;

        if (u_attr) {
            this.renderLoggedIn();
        }
        else {
            const loginLink = new MegaLink({
                parentNode: actionsNode,
                text: l.log_in,
                type: "normal",
                componentClassname: "action-link login-button"
            });

            loginLink.on('tap', () => {

                login_next = getCleanSitePath();
                loadSubPage('login');
            });

            mBroadcaster.once('login2', () => {
                this.renderLoggedIn(loginLink);
            });
        }

        const menuButton = new MegaButton({
            parentNode: actionsNode,
            type: 'icon',
            componentClassname: 'text-icon menu',
            icon: 'sprite-mobile-fm-mono icon-menu-thin-outline',
            iconSize: 24
        });

        menuButton.on('tap.list', () => {
            if (!mega.ui.topmenu.visible) {
                mega.ui.topmenu.show();
            }
        });

        // Search bar will come in version 2
        /* const searchButton = new MegaButton({
            parentNode: actionsNode,
            type: 'icon',
            componentClassname: 'text-icon search',
            icon: 'sprite-mobile-fm-mono icon-search-thin-outline',
            iconSize: 24
        });
        searchButton.on('tap.search', () => {
            if (!this.visibleSearchWrapper) {
                this.showSearchWrapper();
            }
        }); */

        // Search bar will come in version 2
        // MegaMobileHeader.buildSearch.call(this, topBlock);

        // Build: Bottom Block

        targetNode = this.domNode;
        subNode = document.createElement('div');
        subNode.className = 'bottom-block hidden';
        targetNode.appendChild(subNode);
        this.bottomBlock = subNode;

        subNode = document.createElement('div');
        subNode.className = 'block';
        this.bottomBlock.appendChild(subNode);

        targetNode = subNode;
        subNode = document.createElement('div');
        subNode.className = 'nav-navigation';
        targetNode.appendChild(subNode);

        const backLink = new MegaLink({
            parentNode: subNode,
            type: 'icon',
            componentClassname: 'text-icon back',
            icon: 'sprite-mobile-fm-mono icon-arrow-left-thin-outline',
            iconSize: 24
        });

        backLink.on('tap.back', () => {

            if (!M.currentdirid || M.currentrootid === 'out-shares' || M.currentrootid === 'public-links'
                    || M.currentdirid.startsWith('account/')) {

                if (typeof mobile.settingsHelper.currentPage !== 'undefined'){
                    mobile.settingsHelper.currentPage.hide();

                    if (String(M.currentdirid).split('/').pop() === 'verify') {
                        return loadSubPage('fm/account');
                    }

                    if (typeof mobile.settingsHelper.currentPage.back === 'function') {
                        return mobile.settingsHelper.currentPage.back();
                    }
                }

                // @todo: Refactor back button logic. `history.back` is incorrect here
                if (M.currentdirid === 'account/security'
                    || M.currentdirid === 'account/notifications'
                    || M.currentdirid === 'account/file-management') {
                    return loadSubPage('fm/account/settings');
                }
                if (M.currentdirid === 'account/settings') {
                    return loadSubPage('fm');
                }

                history.back();
            }
            else {
                M.openFolder(M.getNodeParent(M.currentdirid));
            }
        });

        subNode = document.createElement('div');
        subNode.className = 'nav-actions';
        targetNode.appendChild(subNode);

        // Rubbish bin icon is visible only on the Rubbish bin page
        const binIcon = new MegaButton({
            parentNode: subNode,
            type: 'icon',
            componentClassname: 'text-icon clear-bin hidden',
            icon: 'sprite-mobile-fm-mono icon-trash-thin-outline',
            iconSize: 24
        });

        binIcon.on('tap.delete', () => {
            const actionsButton = [
                {
                    type: 'normal',
                    text: l[1018],
                    className: '',
                    onClick: mobile.rubbishBin.emptyRubbishBin
                }
            ];

            mega.ui.sheet.show({
                'name': 'empty-bin',
                'type': 'modal',
                'title': l.empty_rubbish_bin,
                'icon': 'sprite-mobile-fm-mono icon-trash-thin-outline clear-bin',
                'showClose': true,
                'contents': [l.empty_rubbish_bin_info],
                'actions': actionsButton
            });
        });

        const createFolderButton = new MegaButton({
            parentNode: subNode,
            type: 'icon',
            componentClassname: 'text-icon create-folder',
            icon: 'sprite-mobile-fm-mono icon-folder-plus-thin-outline',
            iconSize: 24
        });
        createFolderButton.on('tap.createFolder', () => {

            if (!validateUserAction()) {
                return false;
            }

            if (!mobile.createFolder) {
                mobile.createFolder = new MobileNodeNameControl({type: 'create'});
            }

            // Show the create folder overlay
            mobile.createFolder.show();
        });

        const title = document.createElement('h1');
        title.className = 'heading';
        targetNode.appendChild(title);

        if (!pfcol) {
            const filterButton = new MegaButton({
                parentNode: subNode,
                type: 'icon',
                componentClassname: 'text-icon filter',
                icon: 'sprite-mobile-fm-mono icon-filter-thin-outline',
                iconSize: 24
            });
            filterButton.on('tap.filter', () => {
                MegaMobileHeader.showFilters.call(this);
            });

            this.closeButton = new MegaButton({
                parentNode: subNode,
                type: 'icon',
                componentClassname: 'text-icon close',
                icon: 'sprite-mobile-fm-mono icon-dialog-close',
                iconSize: 24
            });
        }

        const _throttledUpdate = SoonFc(100, this.update.bind(this));

        mBroadcaster.addListener('mega:openfolder', _throttledUpdate);
        mBroadcaster.addListener('pagechange', _throttledUpdate);
        window.addEventListener('resize', () => this.resetBottomBlock());
    }

    // Options: setter

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

                    element.classList.remove('hidden', 'mobile-hide-phone', 'mobile-hide-tablet');

                    if (value) {
                        if (value.hidePhone) {
                            element.classList.add('mobile-hide-phone');
                        }
                        if (value.hideTablet) {
                            element.classList.add('mobile-hide-tablet');
                        }
                    }
                    else {
                        element.classList.add('hidden');
                    }

                    if (element === this.bottomBlock) {
                        if (pfcol && M.v.length) {
                            element.classList.add('hidden');
                        }
                        else {
                            this.resetBottomBlock();
                        }
                    }
                }
            }
        }
    }

    // Search: visibility methods

    get visibleSearchWrapper() {
        const searchWrapper = this.domNode.querySelector('.search-wrapper');
        if (searchWrapper) {
            return window.getComputedStyle(searchWrapper).visibility === 'visible';
        }
        return false;
    }

    showSearchWrapper() {
        const searchWrapper = this.domNode.querySelector('.search-wrapper');
        if (searchWrapper) {
            searchWrapper.classList.add('visible');
        }
    }

    hideSearchWrapper() {
        const searchWrapper = this.domNode.querySelector('.search-wrapper');
        if (searchWrapper) {
            searchWrapper.classList.remove('visible');
        }
    }

    showBottomBlock() {

        if (this.bottomBlock.style.height !== `${this.bottomBlock.originalHeight}px`) {
            this.bottomBlock.style.height = `${this.bottomBlock.originalHeight}px`;
        }
    }

    hideBottomBlock() {

        if (this.bottomBlock.style.height !== `0px`) {
            this.bottomBlock.style.height = `0px`;
        }
    }

    update() {
        const noTabletView = isPublicLink() || page === 'keybackup' || page.startsWith('businesssignup');

        const _hide = () => {

            mainlayout.classList.add('no-tablet-layout');
            this.hide();
        };

        if (is_fm() || noTabletView || page === 'support') {

            mainlayout.classList[noTabletView ? 'add' : 'remove']('no-tablet-layout');

            const type = MegaMobileHeader.getType();

            if (type['bottom-block']) {
                type.heading = MegaMobileHeader.getHeading();
            }

            this.headerOptions = type;

            this.show();
        }
        else {
            _hide();
        }
    }

    resetBottomBlock() {

        this.bottomBlock.removeAttribute('style');

        onIdle(() => {
            this.bottomBlock.originalHeight = this.bottomBlock.offsetHeight;
            this.showBottomBlock();
        });
    }

    renderLoggedIn(replace) {

        const actionsNode = this.domNode.querySelector('.top-block .nav-actions');

        this.avatarButton = new this.avatarButtonType({
            parentNode: actionsNode,
            type: 'normal',
            componentClassname: 'avatar'
        });

        useravatar.loadAvatar(u_handle).catch(dump).finally(() => {

            const avatarMeta = generateAvatarMeta(u_handle);

            const shortNameEl = mCreateElement('span');
            shortNameEl.textContent = avatarMeta.shortName;

            const avatar = mCreateElement('div', {class: `${u_handle} avatar-wrapper`}, [
                avatarMeta.avatarUrl ? mCreateElement('img', {src: avatarMeta.avatarUrl})
                    : mCreateElement(
                        'div',
                        {class: `color${avatarMeta.color} avatar-wrapper ${u_handle} small-rounded-avatar`},
                        [shortNameEl]
                    )
            ]);

            this.avatarButton.domNode.appendChild(avatar);

            this.avatarButton.on('tap.account', () => {

                if (!is_fm() || pfid) {
                    return mobile.settings.account.init();
                }

                loadSubPage('fm/account');

                if (mega.ui.topmenu.visible) {
                    mega.ui.topmenu.hide();
                }
            });
        });

        if (replace) {

            replace.domNode.replaceWith(this.avatarButton.domNode);
            replace.destroy();
        }
    }

    static init(update) {
        MegaMobileTopMenu.init();

        if (!mega.ui.header) {
            mega.ui.header = new MegaMobileHeader({
                parentNode: mainlayout,
                componentClassname: 'mega-header',
                prepend: true
            });
        }

        if (update) {
            mega.ui.header.update();
        }
    }

    static buildSearch(parent) {
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'search-wrapper';
        parent.appendChild(searchWrapper);

        const closeSearchButton = new MegaButton({
            parentNode: searchWrapper,
            type: 'icon',
            componentClassname: 'text-icon js-btncloseSearch',
            icon: 'sprite-mobile-fm-mono icon-arrow-left-thin-outline',
            iconSize: 24
        });
        closeSearchButton.on('tap.closeSearch', () => {
            this.hideSearchWrapper();
        });

        const searchForm = document.createElement('form');
        searchForm.className = 'search-box';
        searchForm.id = 'main-search-mobile-form';
        searchWrapper.appendChild(searchForm);

        let subNode = document.createElement('i');
        subNode.className = 'sprite-mobile-fm-mono icon-search-thin-outline';
        searchForm.append(subNode);

        subNode = document.createElement('input');
        subNode.type = 'text';
        subNode.placeholder = l[102];
        subNode.className = 'search-input js-filesearcher';
        searchForm.appendChild(subNode);

        const clearSearchButton = new MegaButton({
            parentNode: searchForm,
            type: 'icon',
            componentClassname: 'text-icon js-btnclearSearch hidden',
            icon: 'sprite-mobile-fm-mono icon-close-component',
            iconSize: 16
        });
        clearSearchButton.domNode.type = 'button';
    }

    static showFilters() {
        M.safeShowDialog('mobile-header-filters', () => {
            mega.ui.sheet.clear();

            mega.ui.sheet.showClose = true;
            let targetNode, subNode, viewGroup;

            // show view options if the page is not a shared items page
            if (!['shares','out-shares','public-links'].includes(M.currentdirid)) {
                targetNode = document.createElement('div');
                targetNode.className = 'filter px-6';
                subNode = document.createElement('h3');
                subNode.textContent = l.filter_view;
                targetNode.appendChild(subNode);

                const views = [
                    {
                        parentNode: targetNode,
                        label: l.filter_view_list,
                        value: 'list',
                        checked: !M.onIconView // temporary fallback for cover album and compact list view
                    },
                    {
                        parentNode: targetNode,
                        label: l.filter_view_grid,
                        value: 'grid',
                        checked: M.onIconView
                    },
                ];

                viewGroup = new MegaMobileRadioGroup({
                    name: 'view',
                    radios: views,
                    align: 'right'
                });

                mega.ui.sheet.addContent(targetNode);
            }

            targetNode = document.createElement('div');
            targetNode.className = 'filter px-6';
            subNode = document.createElement('h3');
            subNode.textContent = l[6170];
            targetNode.appendChild(subNode);

            const {n, d} = M.sortmode || {};

            const sorts = [
                {
                    parentNode: targetNode,
                    label: l[86],
                    value: 'name',
                    checked: n === 'name',
                    className: 'name'
                }, {
                    parentNode: targetNode,
                    label: l[87],
                    value: 'size',
                    checked: n === 'size',
                    className: 'size'
                }
            ];

            if (M.currentdirid !== 'shares' && M.currentdirid !== 'out-shares') {

                sorts.push({
                    parentNode: targetNode,
                    label: l[93],
                    value: 'type',
                    checked: n === 'type',
                    className: 'type'
                }, {
                    parentNode: targetNode,
                    label: M.currentdirid === 'public-links' ? l[20694] : l[17445],
                    value: 'date',
                    checked: n === 'date' || n === 'ts',
                    className: 'date-added'
                }, {
                    parentNode: targetNode,
                    label: l[94],
                    value: 'mtime',
                    checked: n === 'mtime',
                    className: 'last-modified'
                });
            }

            if (M.isLabelExistNodeList(M.v)) {

                sorts.push({
                    parentNode: targetNode,
                    label: l[17398],
                    value: 'label',
                    checked: n === 'label',
                    className: 'label'
                });
            }

            if (M.currentdirid === 'shares') {

                sorts.push({
                    parentNode: targetNode,
                    label: l[5905],
                    value: 'owner',
                    checked: n === 'owner',
                    className: 'owner'
                }, {
                    parentNode: targetNode,
                    label: l[5906],
                    value: 'access',
                    checked: n === 'access',
                    className: 'access-permission'
                });
            }
            else {
                if (M.currentrootid !== M.RubbishID && M.currentrootid !== 'shares') {

                    sorts.push({
                        parentNode: targetNode,
                        label: l[5871],
                        value: 'fav',
                        checked: n === 'fav',
                        className: 'favourite'
                    });
                }

                if (M.currentdirid === 'out-shares') {

                    sorts.push({
                        parentNode: targetNode,
                        label: l[1036],
                        value: 'sharedwith',
                        checked: n === 'sharedwith',
                        className: 'shared-with'
                    }, {
                        parentNode: targetNode,
                        label: l[20670],
                        value: 'date',
                        checked: n === 'date',
                        className: 'share-created'
                    });
                }
            }

            var orderArrow;

            const sortByGroup = new MegaMobileRadioGroup({
                name: 'sortby',
                radios: sorts,
                align: 'right',
                onChange: function() {
                    if (orderArrow) {
                        const labelWrapper = this.domNode.querySelector('.label-wrapper');
                        if (labelWrapper) {
                            labelWrapper.appendChild(orderArrow.domNode);
                            orderArrow.value = 1;
                            orderArrow.icon = `sprite-mobile-fm-mono icon-arrow-up-thin-outline`;
                        }
                    }
                }
            });

            mega.ui.sheet.addContent(targetNode);

            const selectedRadio = sortByGroup.getChild(sortByGroup.value || 'name');

            let orderArrowParent;
            if (selectedRadio && selectedRadio.domNode) {
                orderArrowParent = selectedRadio.domNode.querySelector('.label-wrapper');
            }

            orderArrow = new MegaButton({
                parentNode: orderArrowParent,
                type: 'icon',
                icon: `sprite-fm-mono icon-arrow-${d < 0 ? 'down' : 'up'}-thin-outline`,
                iconSize: 24,
                componentClassname: 'text-icon sort-arrow no-active',
            });

            orderArrow.value = d || 1;

            orderArrow.on('tap.sortDirection', function() {
                this.value *= -1;
                this.icon = `sprite-fm-mono icon-arrow-${this.value < 0 ? 'down' : 'up'}-thin-outline`;
            });

            const applyButton = new MegaButton({
                parentNode: mega.ui.sheet.actionsNode,
                type: 'normal',
                text: l.filter_apply
            });

            applyButton.on('tap.applyFilters', () => {
                mega.ui.sheet.hide();

                const fileManagerBlock = document.querySelector('.mobile.file-manager-block');

                // skip if only the sorting or ordering is changed
                if (viewGroup && viewGroup.value === 'grid' && !M.onIconView) {
                    mobile.cloud.enableGridView(fileManagerBlock);
                }
                else if (viewGroup && viewGroup.value === 'list' && !M.onListView) {
                    mobile.cloud.enableListView(fileManagerBlock);
                }

                M.doSort(sortByGroup.value, orderArrow.value);
                M.renderMain();

                mega.ui.sheet.hide();
            });

            mega.ui.sheet.name = 'mobile-header-filters';
            mega.ui.sheet.safeShow = true;

            mega.ui.sheet.show();
        });
    }

    // Header: Types and headings
    /*
        Types:
        0 Root page
        1 Non root page
        2 Account page
        3 Account pages start with fm/account
    */
    static types(index) {
        const showBinIcon = M.currentrootid === M.RubbishID && M.v.length;

        return [
            {
                'top-block': true,
                'search': true,
                'close': false,
                'menu': true,
                get 'bottom-block'() {
                    return !!M.currentdirid; // no currentdirid means it is not found
                },
                'back': false,
                'filter': true,
                'heading': true,
                'clear-bin': showBinIcon,
                'create-folder': false
            },
            {
                'top-block': true,
                'search': true,
                'close': false,
                'menu': true,
                'bottom-block': true,
                'back': true,
                'filter': true,
                'heading': true,
                'clear-bin': showBinIcon,
                'create-folder': false
            },
            {
                'top-block': {hideTablet: false, hidePhone: true},
                'search-wrapper': false,
                'close': false,
                'menu': true,
                'bottom-block': true,
                'back': {hideTablet: true, hidePhone: false},
                'filter': false,
                'heading': true,
                'clear-bin': false,
                'create-folder': false
            },
            {
                'top-block': {hideTablet: false, hidePhone: true},
                'search-wrapper': false,
                'close': false,
                'menu': true,
                'bottom-block': true,
                'back': true,
                'filter': false,
                'heading': true,
                'clear-bin': false,
                'create-folder': false
            },
            {
                'top-block': false,
                'search': false,
                'close': true,
                'menu': false,
                'bottom-block': true,
                get back() {
                    return M.currentrootid !== M.currentdirid;
                },
                'filter': false,
                'heading': true,
                'clear-bin': false,
                get 'create-folder'() {
                    return M.getNodeRights(M.currentdirid) > 0;
                }
            }
        ][index];
    }

    static getPage() {
        if (is_fm()) {
            if (pfid) {
                return;
            }
            if (is_mobile && mobile.nodeSelector.active) {
                return mobile.nodeSelector.type;
            }
            if (M.currentdirid === M.RootID) {
                return 'fm';
            }
            else if (M.currentdirid === M.RubbishID) {
                return 'fm/rubbish';
            }
        }
        return page;
    }

    static getType() {
        let iType = 0;
        if (M.currentdirid && M.currentrootid !== M.currentdirid) {
            iType = 1;
        }
        if (page === 'fm/account' || page === 'keybackup') {
            iType = 2;
        }
        if (page.startsWith('fm/account/') || page === 'support') {
            iType = 3;
        }
        if (is_mobile && mobile.nodeSelector.active) {
            iType = 4;
        }

        return MegaMobileHeader.types(iType);
    }

    static getHeading() {

        if (!M.currentdirid) {
            return;
        }

        let heading = this.headings[this.getPage()];

        if (!heading) {

            const nodeId = M.currentCustomView.nodeID || M.currentdirid;

            console.assert(nodeId, 'Node id missing, cannot get name');

            if (M.d[nodeId]) {
                heading = M.d[nodeId].name;
            }
        }

        return heading;
    }
}

lazy(MegaMobileHeader, 'headings', () => {
    'use strict';

    return Object.freeze({
        'fm': l[164],
        'fm/shares': l.shared_items,
        'fm/out-shares': l.shared_items,
        'fm/public-links': l.shared_items,
        'fm/rubbish': l[167],
        'fm/account': l[403],
        'fm/account/achievements': l[16117],
        'fm/account/cancel': l[7165],
        'fm/account/invite-friends': l[17465],
        'fm/account/invites': l.invite_bonuses,
        'fm/account/my-details': l.settings_account_details,
        'fm/account/name': l[86],
        'fm/account/country': l[481],
        'fm/account/add-phone-number': l[20222],
        'fm/account/avatar': l[20164],
        'fm/account/security/change-password': l[23262],
        'fm/account/security/change-email': l[7743],
        'fm/account/security/verify': l[7730],
        'fm/account/delete': l[16115],
        'fm/account/delete/verify': l[16115],
        'fm/account/qr-code': l[17754],
        'fm/account/qr-code-settings': l.settings_account_qr_code_set,
        'fm/account/delete': l[16115],
        'fm/account/plan': l[16166],
        'fm/account/notifications': l[862],
        'fm/two-factor-confirmation': l[19194],
        'fm/account/security': l.mobile_settings_privacy_security_title,
        'fm/account/security/backup-key': l[8839],
        'fm/account/security/lost-auth-device': l.lost_auth_device,
        'fm/account/security/two-factor-authentication': l[19194],
        'fm/account/security/session-history': l[429],
        'fm/account/settings': l[823],
        'fm/account/file-management': l[16159],
        'fm/account/file-management/file-version': l[20168],
        'fm/account/file-management/rubbish-cleaning': l.settings_file_management_rubbish_cleaning,
        'fm/account/about': l[16112],
        'fm/account/support': l[383],
        'fm/account/paymentcard': l.payment_card,
        'fm/account/about/terms-policies': l.mobile_settings_tos_title,
        'move': l.move_to,
        'copy': l.copy_to,
        'support': l[516],
        'keybackup': l[8839]
    });
});
