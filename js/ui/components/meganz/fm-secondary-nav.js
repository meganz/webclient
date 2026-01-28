class MegaNavCard extends MegaComponent {

    constructor(options) {
        super(options);
        const node = this.validateNavNode(options.nodeHandle);
        if (!node) {
            console.error('Invalid node handle', options.nodeHandle);
            return;
        }

        Object.defineProperty(this, 'node', {
            value: node,
            writable: false
        });

        Object.defineProperty(this, 'handle', {
            value: options.nodeHandle,
            writable: false
        });

        this.addClass('secondary-nav-card');

        let wrapper = document.createElement('div');
        wrapper.className = 'fm-item-info-block';

        const labelWrapper = document.createElement('div');
        labelWrapper.className = 'fm-item-label-block';

        let subNode = document.createElement('i');
        subNode.className = 'fm-icon';
        labelWrapper.appendChild(subNode);

        subNode = document.createElement('div');
        subNode.className = 'fm-item-name';
        if (typeof options.onContextMenu === 'function') {
            const contextName = new MegaComponent({
                nodeType: 'button',
                parentNode: labelWrapper,
                componentClassname: 'fm-context-name',
                id: `cardctx_${this.handle}`,
            });
            contextName.domNode.appendChild(subNode);
            const icon = document.createElement('i');
            icon.className = 'sprite-fm-mono icon-chevron-down-thin-outline';
            contextName.domNode.appendChild(icon);
            contextName.on('click', options.onContextMenu);
        }
        else {
            labelWrapper.appendChild(subNode);
        }

        subNode = document.createElement('div');
        subNode.className = 'fm-label-badge';
        labelWrapper.appendChild(subNode);
        wrapper.appendChild(labelWrapper);

        subNode = document.createElement('div');
        subNode.className = 'fm-item-badge';
        wrapper.appendChild(subNode);

        this.domNode.appendChild(wrapper);

        wrapper = document.createElement('div');
        wrapper.className = 'fm-item-actions-block';
        this.primaryOptions = {
            parentNode: wrapper,
            ...options.primaryButton,
            componentClassname: `primary ${options.primaryButton.componentClassname || ''}`,
        };
        MegaButton.factory(this.primaryOptions);
        this.secondaryOptions = {
            parentNode: wrapper,
            ...options.secondaryButton,
            componentClassname: `secondary outline ${options.secondaryButton.componentClassname || ''}`
        };
        if (this.isSync || this.isBackup) {
            this.secondaryOptions.componentClassname = this.secondaryOptions.componentClassname.replace(' outline', '');
        }
        MegaButton.factory(this.secondaryOptions);

        this.domNode.appendChild(wrapper);
        this.update();
    }

    validateNavNode(handle) {
        if (!handle) {
            return false;
        }
        const node = M.getNodeByHandle(handle);
        if (node) {
            if (node.h in M.dcd) {
                this.isDevice = true;
                return node;
            }
            if (node.s4) {
                this.isS4 = true;
                return node;
            }
            if (node.t === 1 || M.onDeviceCenter && node.t === 2) {
                if (M.onDeviceCenter) {
                    const { folder } = mega.devices.ui.getCurrentDirData();
                    if (!folder) {
                        return false;
                    }
                    if (node.h === M.RootID) {
                        folder.name = l[164];
                    }
                    this.isBackup = M.getNodeRoot(handle) === M.InboxID;
                    this.isSync = !this.isBackup;
                    return folder;
                }
                this.isFolder = true;
                return node;
            }
            return false;
        }
        if (mega.gallery && mega.gallery.albums && handle in mega.gallery.albums.store) {
            this.isAlbum = true;
            return mega.gallery.albums.store[handle];
        }
        return false;
    }

    get isSharedRoot() {
        return !!this.node.su;
    }

    get badgeHtml() {
        if (this._lastShareName && !this.isSharedRoot) {
            delete this._lastShareName;
        }
        if (this.isSharedRoot) {
            const { su } = this.node;
            const data = {
                n: M.getNameByHandle(su),
                m: M.u[su].m
            };
            if (this._lastShareName && data.n === this._lastShareName.n && data.m === this._lastShareName.m) {
                return '';
            }
            this._lastShareName = data;
            return `
                <div class="fm-item-badge">
                    <div class="fm-share-avatar"></div>
                    <div class="fm-share-user">${escapeHTML(data.n)}</div>
                    <span class="dot">.</span>
                    <div class="fm-share-email">${escapeHTML(data.m)}</div>
                </div>
            `;
        }
        else if (this.isAlbum) {
            let img = 0;
            let vid = 0;
            const { nodes } = this.node;
            let i = nodes.length;
            while (--i >= 0) {
                if (M.isGalleryVideo(nodes[i])) {
                    vid++;
                }
                else {
                    img++;
                }
            }
            const txt = [];
            if (img) {
                txt.push(mega.icu.format(l.photos_count_img, img));
            }
            if (vid) {
                txt.push(mega.icu.format(l.photos_count_vid, vid));
            }
            return `
                <div class="fm-item-badge">
                    <span class="album-counts">${escapeHTML(txt.join(', '))}</span>
                </div>
            `;
        }
        else if (this.isS4) {
            const bucket = s4.utils.getBucketNode(this.node);
            const url = s4.kernel.bucket.getHostDomain(bucket.h);
            return `
                <div class="fm-item-badge s4 selectable-txt">
                    ${escapeHTML(url)}
                </div>
            `;
        }
        return '';
    }

    get labelBadgeHtml() {
        if (this.isSharedRoot) {
            const { r } = this.node;
            const iconClass = r === 1 ? 'icon-edit-02-thin-outline' :
                r === 2 ? 'icon-star-thin-outline' : 'icon-eye-reveal1';
            return `
                <div class="fm-label-badge shared rights-${r}">
                    <i class="sprite-fm-mono ${iconClass}"></i>
                    ${escapeHTML(r === 1 ? l[56] : r === 2 ? l[57] : l[55])}
                </div>
            `;
        }
        else if (this.isDevice || this.isBackup || this.isSync) {
            return `
                <div class="fm-label-badge">
                    <i class="sprite-fm-mono icon-question-filled dc-badge-info-icon simpletip"></i>
                </div>
            `;
        }
        return '<div class="fm-label-badge"></div>';
    }

    set icon(iconClass) {
        this.domNode.querySelector('i.fm-icon').className = iconClass;
    }

    set name(name) {
        this.domNode.querySelector('.fm-item-name').textContent = name;
    }

    set badge(badgeHtml) {
        if (!badgeHtml) {
            return;
        }
        const node = this.domNode.querySelector('.fm-item-badge');
        if (!node) {
            return;
        }
        node.parentElement.replaceChild(parseHTML(badgeHtml), node);
    }

    set labelBadge(badgeHtml) {
        if (!badgeHtml) {
            return;
        }
        const node = this.domNode.querySelector('.fm-label-badge');
        if (!node) {
            return;
        }
        node.parentElement.replaceChild(parseHTML(badgeHtml), node);
    }

    updateBadge() {
        let didRender = false;
        if (!this.isDevice && !this.isSync && !this.isBackup) {
            const html = this.badgeHtml;
            this.badge = html;
            didRender = !!html || this.isSharedRoot;
        }
        else if (this.isSync || this.isBackup) {
            const { status } = this.node;
            if (status.priority > 0 && status.priority <= mega.devices.utils.StatusUI.folderHandlers.length) {
                const statusName = mega.devices.utils.StatusUI.statusClass(status, this.isSync, this.isBackup);
                const itemNode = this.domNode.querySelector('.fm-item-badge');
                itemNode.textContent = '';
                itemNode.classList.add('dc-badge-status', statusName);
                mega.devices.utils.StatusUI.get(status)({
                    status,
                    itemNode,
                    iClass: 'dc-status',
                    isDevice: false,
                    showBanner: true,
                });
                didRender = true;
            }
        }
        else if (this.isDevice) {
            const { status } = this.node;
            const statusName = mega.devices.utils.StatusUI.statusClass(status, false, false, this.isDevice);
            const itemNode = this.domNode.querySelector('.fm-item-badge');
            itemNode.textContent = '';
            itemNode.classList.add('dc-badge-status', statusName);
            mega.devices.utils.StatusUI.get(status)({
                status,
                itemNode,
                iClass: 'dc-status',
                isDevice: true,
                showBanner: false,
            });
            didRender = true;
        }
        return didRender;
    }

    update() {
        this.name = this.isAlbum ? this.node.label : this.node.name;
        if (this.updateBadge()) {
            this.removeClass('middle');
        }
        else {
            this.addClass('middle');
        }
        this.labelBadge = this.labelBadgeHtml;
        if (this.isSharedRoot) {
            const parentNode = this.domNode.querySelector('.fm-share-avatar');
            if (parentNode) {
                this.avatar = this.avatar && this.avatar.parentNode === parentNode ? this.avatar :
                    new MegaAvatarComponent({
                        parentNode,
                        userHandle: this.node.su,
                    });
                this.avatar.update();
            }
            let iconClass = `fm-icon item-type-icon icon-${fileIcon(this.node)}-24`;
            if (mega.keyMgr.getWarningValue('cv') === '1') {
                const ed = authring.getContactAuthenticated(this.node.su, 'Ed25519');

                if (!(ed && ed.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON)) {
                    iconClass = `${iconClass} sprite-fm-uni-after icon-warning-after`;
                }
            }
            this.icon = iconClass;
        }
        else if (this.isAlbum) {
            this.icon = 'fm-icon sprite-fm-uni mime-image-stack-solid';
        }
        else if (this.isDevice) {
            this.icon = `fm-icon sprite-fm-theme icon-${this.node.icon}-filled`;
        }
        else if (this.isSync) {
            this.icon = `fm-icon item-type-icon icon-${this.node.icon}-24`;
        }
        else if (this.isBackup) {
            this.icon = 'fm-icon item-type-icon icon-folder-backup-24';
        }
        else if (!folderlink && this.node.t && this.node.lbl) {
            const lbl = MegaNodeComponent.label[this.node.lbl | 0] || '';
            this.icon = `fm-icon item-type-icon icon-${fileIcon(this.node)}-24 ${lbl}`;
        }
        else {
            this.icon = `fm-icon item-type-icon icon-${fileIcon(this.node)}-24`;
        }
    }
}

/**
 * @property {*} mega.ui.secondaryNav
 */
lazy(mega.ui, 'secondaryNav', () => {
    'use strict';

    if ($.hasWebKitDirectorySupport === undefined) {
        $.hasWebKitDirectorySupport = 'webkitdirectory' in document.createElement('input');
    }

    const viewModeIcons = [
        'icon-view-small-list-thin',
        'icon-grid-4-thin-outline',
        'icon-image-04-thin-outline',
        'icon-view-medium-list-thin'
    ];
    const downloadMenu = document.createElement('div');
    downloadMenu.className = 'fm-download-dropdown';
    const downloadStandard = new MegaButton({
        parentNode: downloadMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon',
        icon: 'sprite-fm-mono icon-download-standard',
        text: l[5928],
        onClick: () => {
            $.hideContextMenu();
            if (!mega.ui.secondaryNav.dlId) {
                return;
            }
            M.addDownload([mega.ui.secondaryNav.dlId]);
            delete mega.ui.secondaryNav.dlId;
        }
    });
    const downloadZip = new MegaButton({
        parentNode: downloadMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon',
        icon: 'sprite-fm-mono icon-download-zip',
        text: l[864],
        onClick: () => {
            $.hideContextMenu();
            if (!mega.ui.secondaryNav.dlId) {
                return;
            }
            M.addDownload([mega.ui.secondaryNav.dlId], true);
            delete mega.ui.secondaryNav.dlId;
        }
    });
    const downloadMegaSync = new MegaButton({
        parentNode: downloadMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon',
        icon: 'sprite-fm-mono icon-session-history',
        text: l.btn_dlwitdeskapp,
        onClick: () => {
            $.hideContextMenu();
            if (!mega.ui.secondaryNav.dlId) {
                return;
            }

            megasync.isInstalled((err, is) => {
                if (fmconfig.dlThroughMEGAsync && (!err || is)) {
                    $('.megasync-overlay').removeClass('downloading');
                    M.addDownload([mega.ui.secondaryNav.dlId]);
                }
                else {
                    dlmanager.showMEGASyncOverlay();
                }

                delete mega.ui.secondaryNav.dlId;
                $.hideContextMenu();
            });
        }
    });

    let infoButtonBound = false;
    let layoutButtonBound = false;
    let smallButtonBound = false;
    const layoutMenu = document.createElement('div');
    layoutMenu.className = 'fm-layout-dropdown';
    layoutMenu.appendChild(parseHTML(`<span class="layout-label">${escapeHTML(l.layout_menu)}</span>`));
    const viewChangeHandler = (viewValue) => {
        if (fmconfig.uiviewmode | 0) {
            mega.config.set('viewmode', viewValue);
        }
        else {
            fmviewmode(M.currentdirid, viewValue);
        }

        const isSearch = String(M.currentdirid).startsWith('search/');

        if (folderlink && isSearch) {
            M.viewmode = viewValue;
            $.hideContextMenu();
            M.renderMain();
        }
        else {
            M.openFolder(M.currentdirid, true).then(reselect.bind(null, 1));
        }

        if (isSearch) {
            mega.ui.searchbar.reinitiateSearchTerm();
        }

        if (viewValue === 2 && mega.ui.mNodeFilter) {
            mega.ui.mNodeFilter.resetFilterSelections();
        }
        const button = mega.ui.secondaryNav.layoutButton;
        if (button) {
            button.classList.remove('active');
            const icon = button.querySelector('i');
            if (icon) {
                icon.classList.remove(...viewModeIcons);
                icon.classList.add(viewModeIcons[viewValue]);
            }
        }

        if (viewValue === 0) {
            eventlog(500724, true);
        }
        else if (viewValue === 1) {
            eventlog(500725, true);
        }
        else if (viewValue === 2) {
            eventlog(500726, true);
        }
        else if (viewValue === 3) {
            eventlog(500757, true);
        }
    };

    const _btnOptsTemplate = {
        parentNode: layoutMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon',
        onClick(ev) {
            if (!ev.currentTarget.rightIcon) {
                viewChangeHandler(this.attr('viewmode') | 0);
            }
        }
    };

    const layoutButtons = [
        new MegaButton({
            ..._btnOptsTemplate,
            icon: 'sprite-fm-mono icon-view-small-list-thin',
            text: l.compact_list_view,
            attr: {viewmode: 0}
        }),
        new MegaButton({
            ..._btnOptsTemplate,
            icon: 'sprite-fm-mono icon-view-medium-list-thin',
            text: l.filter_view_list,
            attr: {viewmode: 3}
        }),
        new MegaButton({
            ..._btnOptsTemplate,
            icon: 'sprite-fm-mono icon-grid-4-thin-outline',
            text: l.grid_view,
            attr: {viewmode: 1}
        }),
        new MegaButton({
            ..._btnOptsTemplate,
            icon: 'sprite-fm-mono icon-image-04-thin-outline',
            text: l.md_view,
            attr: {viewmode: 2}
        })
    ];

    /**
     * Grid view only elements from here
     */

    // Grid view extra buttons
    const extraBtnWrapper = document.querySelector('.fm-header-grid-extra');
    const selectAllGrid = extraBtnWrapper.querySelector('.select-all-checkbox');
    const selectAllList = document.querySelectorAll('.grid-table .select-all-checkbox');

    // Sorting menu for grid view
    const columnMenu = document.createElement('div');
    columnMenu.className = 'fm-col-dropdown';
    columnMenu.appendChild(parseHTML(`<span class="layout-label">${escapeHTML(l[6170])}</span>`));

    const gridSortDirBtn = new MegaButton({
        parentNode: extraBtnWrapper,
        onClick: () => {
            if (M.sortmode) {
                M.doSort(M.sortmode.n || 'name', -M.sortmode.d || 1);
                M.previousdirid = M.currentdirid; // fix for avoid deselection on sort
                M.renderMain();
            }
        },
        componentClassname: 'sort-direction-button asc text-icon',
        icon: 'sprite-fm-mono icon-up',
        text: 'test',
        iconSize: 16
    });

    _btnOptsTemplate.parentNode = columnMenu;
    _btnOptsTemplate.onClick = function(ev) {

        let colkey = this.attr('colkey');
        if (columnMenu.classList.contains('sort') && !ev.currentTarget.active) {
            M.doSort(colkey, M.sortmode.d);
            M.previousdirid = M.currentdirid; // fix for avoid deselection on sort
            M.renderMain();
        }
        else if (columnMenu.classList.contains('column')) {

            if (colkey === 'name') {
                colkey = 'fname';
            }

            if (colkey === 'date') {
                colkey = 'timeAd';
            }

            if (colkey === 'mtime') {
                colkey = 'timeMd';
            }

            M.columnsWidth.cloud[colkey].viewed = !ev.currentTarget.active;

            M.columnsWidth.cloud.fname.lastOffsetWidth = null;
            M.columnsWidth.updateColumnStyle();

            var columnPreferences = mega.config.get('fmColPrefs');
            if (columnPreferences === undefined) {
                columnPreferences = 108; // default
            }
            var colConfigNb = getNumberColPrefs(colkey);
            if (colConfigNb) {
                if (M.columnsWidth.cloud[colkey].viewed) {
                    columnPreferences |= colConfigNb;
                }
                else {
                    columnPreferences &= ~colConfigNb;
                }
            }
            mega.config.set('fmColPrefs', columnPreferences);

            if (M.megaRender && M.megaRender.megaList) {
                if (M.megaRender.megaList._scrollIsInitialized) {
                    M.megaRender.megaList.scrollUpdate();
                }
                else {
                    M.megaRender.megaList.resized();
                }
            }
        }
        if (typeof $.hideContextMenu === 'function') {
            $.hideContextMenu();
        }
    };
    _btnOptsTemplate.rightIcon =
        `sprite-fm-mono icon-check-thin-outline ${MegaInteractable.iconSizesClass[24]}`;

    const colBtnsText = {
        'name': l[86],
        'fav': l[5871],
        'label': l[17398],
        'date': l[17445],
        'mtime': l[94],
        'type': l[93],
        'size': l[87],
        'versions': l[17150],
        'playtime': l.duration
    };

    const colBtnTextkeys = Object.keys(colBtnsText);
    let timeAdBtn;

    for (let i = 0; i < colBtnTextkeys.length; i++) {
        const btn = new MegaButton({
            ..._btnOptsTemplate,
            text: colBtnsText[colBtnTextkeys[i]]
        });
        btn.attr('colkey', colBtnTextkeys[i]);
        if (colBtnTextkeys[i] === 'date') {
            timeAdBtn = btn;
        }
    }

    const _allAction = ev => {
        if (selectionManager) {

            const {container} = M.megaRender || {};

            if (container) {
                container.classList.add('animate-select');
            }

            if (ev.target.classList.contains('all-selected') || ev.target.classList.contains('some-selected')) {
                selectionManager.clear_selection();
                ev.target.classList.remove('all-selected', 'some-selected');
            }
            else {
                selectionManager.select_all();
                ev.target.classList.add('all-selected');
            }
        }
    };

    const updateColBtnText = () => {
        timeAdBtn.text = l[17445];
        colBtnsText.date = l[17445];
    };

    selectAllGrid.addEventListener('click', _allAction);
    selectAllList.forEach(chbx => {
        chbx.addEventListener('click', _allAction);
    });

    const _filterColumns = () => {
        const columnKeys = Object.keys(colBtnsText);

        // if it is on icon view, we need to update grid header value for filtering dropdown
        if (M.onIconView && typeof $.gridHeader === 'function') {
            $.gridHeader();
        }

        for (let i = 0; i < columnKeys.length; i++) {

            const colBtn = columnMenu.componentSelector(`[colkey="${columnKeys[i]}"]`);
            let colkey = columnKeys[i];
            let forceHide = false;

            if (colBtn) {

                if (colkey === 'name') {
                    colkey = 'fname';
                }

                if (colkey === 'date') {
                    colkey = 'timeAd';
                }

                if (colkey === 'mtime') {
                    colkey = 'timeMd';
                }

                if (colkey === 'versions' && mega.lite.inLiteMode ||
                    M.currentdirid === 'faves' && colkey === 'fav') {
                    forceHide = true;
                }

                const colValue = M.columnsWidth.cloud[colkey];

                colBtn.toggleClass('active', colValue.viewed);
                colBtn.toggleClass('hidden', forceHide || !!colValue.disabled);
            }
        }
    };

    const gridSortByBtn = new MegaButton({
        parentNode: extraBtnWrapper,
        onClick: ev => {

            $.hideContextMenu();

            if (ev.currentTarget.active) {
                ev.currentTarget.removeClass('active');
                return;
            }

            _filterColumns();

            ev.currentTarget.addClass('active');

            if (M.sortmode) {

                const prevActiveButtons = columnMenu.componentSelectorAll('.active');
                const activeButton = columnMenu.componentSelector(`[colkey="${M.sortmode.n}"]`);

                for (let i = 0; i < prevActiveButtons.length; i++) {
                    prevActiveButtons[i].removeClass('active');
                }

                if (activeButton) {
                    activeButton.addClass('active');
                }
                else if (M.sortmode.n === 'ts') {
                    timeAdBtn.addClass('active');
                }
            }

            columnMenu.className = 'fm-col-dropdown sort';
            columnMenu.querySelector('.layout-label').textContent = l[6170];

            updateColBtnText();

            mega.ui.menu.show({
                name: 'fm-sort-menu',
                classList: ['fm-sort-menu'],
                event: ev,
                eventTarget: ev.currentTarget,
                contents: [columnMenu],
                resizeHandler: true,
                onClose: () => {
                    gridSortByBtn.removeClass('active');
                },
                pos: 'bottomRight'
            });
            return false;
        },
        componentClassname: 'sort-by-button text-icon',
        type: 'icon',
        icon: 'sprite-fm-mono icon-chevron-up-down',
        iconSize: 16,
        simpletip: l[6170],
        simpletipPos: 'top'
    });

    const showColumnSelectionMenu = (ev) => {

        ev.currentTarget.domNode = ev.currentTarget.querySelector('i');

        columnMenu.className = 'fm-col-dropdown column';
        columnMenu.querySelector('.layout-label').textContent = l.column_selection_title;

        _filterColumns();

        columnMenu.componentSelector('[colkey="fav"]').addClass('hidden');
        updateColBtnText();

        mega.ui.menu.show({
            name: 'fm-col-select-menu',
            classList: ['fm-col-select-menu'],
            event: ev,
            eventTarget: ev.currentTarget,
            contents: [columnMenu],
            resizeHandler: true,
            onClose: () => {
                ev.target.classList.remove('active');
            }
        });
    };

    const handleNodeSelection = (container) => {
        let selectAllCheckbox;
        let isSkipOnDeviceCentre = false;
        const itemsNum = $.selected.length;
        const $container = $(container);

        if (M.onDeviceCenter) {
            const {device, folder} = mega.devices.ui.getCurrentDirData();
            isSkipOnDeviceCentre = !device || (!folder && M.currentCustomView.nodeID.length > 8);
        }

        // delay for selection check box flicker when controlled by keyboard
        delay('animate-select', () => {
            $container.toggleClass('selection-on', !!itemsNum);

            // Remove animation class after 300ms
            delay('animate-select-remove', () => {
                $container.removeClass('animate-select');
            }, 301);
        }, 50);

        // if it is device centre or empty, which make container undefined we do not need below
        if (!isSkipOnDeviceCentre && container) {

            if (M.onIconView) {
                selectAllCheckbox = document.querySelector('.fm-header-grid-extra > .select-all-checkbox');
            }
            else {
                let table = container;

                if (table.nodeName !== 'TABLE') {
                    table = table.closest('table');
                }

                if (table) {
                    selectAllCheckbox = table.querySelector('.select-all-checkbox');
                }
            }

            if (selectAllCheckbox) {

                selectAllCheckbox.classList.remove('all-selected', 'some-selected');

                if (itemsNum) {
                    selectAllCheckbox.classList.add(M.v.length === itemsNum ? 'all-selected' : 'some-selected');
                }
            }
        }
    };

    let dcChipShown = false;
    let startedScrolling = false;
    let scrollHandler = false;
    let chipsViewWrapShown = false;
    let moveUpTimer = false;
    let showBreadcrumbs = false;

    const toggleGridExtraButtons = hide => extraBtnWrapper.classList.toggle('hidden', hide);

    return {
        domNode: document.querySelector('.fm-right-header'),
        gridSortDirBtn,
        showColumnSelectionMenu,
        handleNodeSelection,
        toggleGridExtraButtons,

        get bannerHolder() {
            return document.querySelector('.fm-banner-holder');
        },

        get actionsHolder() {
            return this.domNode.querySelector('.fm-header-buttons');
        },
        get cardHolder() {
            return this.domNode.querySelector('.fm-card-holder');
        },
        get breadcrumbHolder() {
            return this.domNode.querySelector('.fm-breadcrumbs-wrapper');
        },
        get layoutButton() {
            return this.domNode.querySelector('.fm-files-view-icon');
        },
        get layoutIcon() {
            const i = this.layoutButton ? this.layoutButton.querySelector('i') : false;
            if (i) {
                return [...i.classList].filter(c => c.startsWith('icon-'))[0];
            }
            return '';
        },
        get infoButton() {
            return this.domNode.querySelector('.fm-header-info');
        },
        get selectionBar() {
            return this.domNode.querySelector('.selection-status-bar');
        },
        get filterChipsHolder() {
            return this.domNode.querySelector('.fm-filter-chips-wrapper');
        },
        get chipsViewsWrapper() {
            return this.domNode.querySelector('.fm-header-chips-and-view-buttons');
        },
        get ps() {
            if (M.onDeviceCenter) {
                const config = {
                    'device-centre-devices': 'devices',
                    'device-centre-folders': 'folders'
                };
                const renderSection = mega.devices.ui.getRenderSection();
                if (config[renderSection]) {
                    return document.querySelector(`.fm-right-files-block .ps.${config[renderSection]}`);
                }
            }
            return document.querySelector('.fm-right-files-block .ps:not(.breadcrumb-dropdown)');
        },
        get smallNavButton() {
            return this.domNode.querySelector('.fm-small-nav');
        },
        get isSmall() {
            return document.body.classList.contains('small-nav');
        },
        openNewMenu(ev) {
            if (
                M.InboxID &&
                (M.currentrootid === M.InboxID || M.getNodeRoot(String(M.currentdirid).split('/').pop()) === M.InboxID)
            ) {
                return;
            }

            const items = ['.fileupload-item', '.folderupload-item', '.app-dl-hint'];
            const target = ev.currentTarget instanceof MegaComponent ? ev.currentTarget.domNode : ev.currentTarget;
            if (this.cardComponent && (this.cardComponent.domNode.contains(target) || this.isSmall)) {
                items.push('.newfolder-item', '.newfile-item');
            }
            else if (M.currentrootid === M.RootID) {
                items.push('.import-from-link');
            }
            M.contextMenuUI(ev, 8, items);

            eventlog(500721);
        },
        openDownloadMenu(ev) {
            const target = ev.currentTarget;
            const id = M.currentdirid.split('/').pop();
            if (id) {
                const classList =  ['fm-download-menu', 'fm-thin-dropdown'];
                if (folderlink) {
                    if (window.useMegaSync && (useMegaSync === 2 || useMegaSync === 3)) {
                        downloadMegaSync.show();
                        downloadStandard.hide();
                        downloadZip.hide();
                    }
                    else {
                        downloadMegaSync.hide();
                        downloadStandard.show();
                        downloadZip.show();
                    }
                    classList.push('fl-download');
                }
                else {
                    downloadStandard.show();
                    downloadZip.show();
                    downloadMegaSync.hide();
                }
                this.dlId = id;
                mega.ui.menu.show({
                    name: 'fm-download-items',
                    classList,
                    event: ev,
                    eventTarget: target,
                    contents: [downloadMenu],
                    resizeHandler: true,
                    onClose: () => {
                        target.domNode.classList.remove('active');
                    }
                });
            }
        },
        openContextMenu(ev) {
            let { id, classList } = ev.currentTarget;
            if (classList.contains('active')) {
                ev.stopPropagation();
                $.hideContextMenu();
                classList.remove('active');
                return false;
            }
            if (id) {
                if (id.startsWith('pathbc-')) {
                    id = id.replace('pathbc-', '');
                }
                $.selected = [id];
                if (id === M.RootID) {
                    ev.currentTarget.classList.add('cloud-drive');
                }

                M.contextMenuUI(ev, 1);
                ev.currentTarget.classList.remove('cloud-drive');
            }
        },
        addActionButton(options) {
            if (!options.componentClassname) {
                if (d) {
                    console.warn('Cannot add secondary nav action button without a class name');
                }
                return;
            }
            const sel = `.${options.componentClassname.split(' ').filter(c => c.startsWith('fm-')).join('.')}`;
            const holder = this.actionsHolder || mega.ui.header.domNode.querySelector('.fm-header-buttons');

            if (!holder) {
                return false;
            }

            if (sel === '.' || holder.querySelector(sel)) {
                if (d && sel === '.') {
                    console.warn('No fm- prefixed class found', options.componentClassname);
                }
                return;
            }
            const button = new MegaButton({
                parentNode: holder,
                ...options,
                componentClassname: `${options.componentClassname} hidden`,
            });
            if (options.title) {
                button.domNode.title = options.title;
            }
        },
        showActionButtons(...selectors) {
            const holder = this.actionsHolder || mega.ui.header.domNode.querySelector('.fm-header-buttons');
            if (!holder) {
                return;
            }
            this.hideActionButtons();
            let shown = false;
            for (let i = 0; i < selectors.length; i++) {
                const selector = selectors[i];
                const elem = holder.querySelector(selector);
                if (elem) {
                    if (shown) {
                        elem.classList.add('secondary');
                    }
                    else {
                        elem.classList.add('primary');
                    }
                    elem.classList.remove('hidden');
                    shown = true;
                }
            }
            if (shown) {
                holder.classList.remove('hidden');
            }
        },
        hideActionButtons() {
            let holder = this.actionsHolder;
            if (!holder) {
                const {ps} = this;

                if (!(holder = mega.ui.header.domNode.querySelector('.fm-header-buttons'))) {
                    return false;
                }

                if (!this.isSmall && ps && !(ps.scrollTop !== 0 && !M.search)) {
                    // Scrolled back up. Place back and hide.
                    holder.parentNode.classList.add('contract');
                    holder.parentNode.classList.remove('expand');
                    this.domNode.querySelector('.fm-card-holder').before(holder);
                    holder = this.actionsHolder;
                    holder.classList.add('open');
                    holder.classList.remove('collapse');
                    startedScrolling = false;
                }
            }
            for (const child of holder.children) {
                child.classList.add('hidden');
                child.classList.remove('primary', 'secondary');
                child.id = '';
            }
            holder.classList.add('hidden');
        },
        showCard(nodeHandle, primaryButton, secondaryButton, onContextMenu) {
            this.hideCard();
            this.cardComponent = new MegaNavCard({
                parentNode: this.cardHolder,
                nodeHandle,
                primaryButton,
                secondaryButton,
                onContextMenu,
            });
            if (M.onDeviceCenter && this.isSmall) {
                // Device centre re-render will replace the card. Reinit the buttons.
                this.collapse();
            }
        },
        updateCard(handle) {
            if (!this.cardComponent) {
                return;
            }
            const { node, isSharedRoot } = this.cardComponent;
            if (node.h === handle) {
                this.cardComponent.update();
                return;
            }
            if (handle.length === 11) {
                if (!isSharedRoot || node.su !== handle) {
                    return;
                }
                this.cardComponent.update();
            }
        },
        hideCard() {
            if (this.cardComponent) {
                this.cardComponent.destroy();
            }
            this.cardHolder.textContent = '';
            if (this.isSmall) {
                const buttons = mega.ui.header.domNode.componentSelectorAll('.fm-header-buttons .card-copy');
                for (let i = buttons.length; i--;) {
                    buttons[i].destroy();
                }
            }
            delete this.cardComponent;
        },
        showBreadcrumb() {
            this.breadcrumbHolder.classList.remove('hidden');
            showBreadcrumbs = true;
        },
        hideBreadcrumb() {
            this.breadcrumbHolder.classList.add('hidden');
            showBreadcrumbs = false;
            if (this.isSmall) {
                delay('navchecksmallcrumb', () => {
                    if (this.isSmall && this.cardComponent) {
                        this.breadcrumbHolder.classList.remove('hidden');
                    }
                });
            }
        },
        updateInfoPanelButton(show) {
            if (!infoButtonBound) {
                infoButtonBound = true;
                this.infoButton.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    $.hideContextMenu();
                    if (mega.ui.mInfoPanel.isOpen()) {
                        mega.ui.mInfoPanel.hide();
                        eventlog(500727);
                        return;
                    }
                    const id = String(M.currentdirid || '').split('/').pop();
                    mega.ui.mInfoPanel.show($.selected.length ? $.selected : id ? [id] : []);
                    eventlog(500727);
                });
            }
            this.infoButton.classList[show ? 'remove' : 'add']('hidden');
        },
        updateGalleryLayout(hide) {
            if (hide) {
                layoutButtons[3].hide();
            }
            else {
                layoutButtons[3].show();
            }
        },
        updateLayoutButton(hide) {
            if (!layoutButtonBound) {
                this.layoutButton.addEventListener('click', (ev) => {
                    ev.stopPropagation();

                    if (this.layoutButton.classList.contains('active')) {
                        this.layoutButton.classList.remove('active');
                        mega.ui.menu.hide();
                        return;
                    }

                    const event = new MegaDataEvent(ev);
                    event.currentTarget = ev.currentTarget;
                    this.showLayoutDropdown(event);
                    eventlog(500723);
                });
                layoutButtonBound = true;
            }
            const icon = this.layoutButton.querySelector('i');
            const viewValue = M.gallery ? 2 : M.viewmode;
            if (icon) {
                icon.classList.remove(...viewModeIcons);
                icon.classList.add(viewModeIcons[viewValue]);
            }
            const checkedIcon = `sprite-fm-mono icon-check-thin-outline ${MegaInteractable.iconSizesClass[24]}`;

            for (let i = 0; i < layoutButtons.length; i++) {
                layoutButtons[i].rightIcon = viewValue === +layoutButtons[i].attr('viewmode') ? checkedIcon : '';
            }

            delay('updateLayoutButton', () => {
                if (hide) {
                    this.layoutButton.classList.add('hidden');
                }
                else {
                    this.layoutButton.classList.remove('hidden');
                }
            }, 100);

            updateColBtnText();

            const hideExtraMenu = M.gallery || M.albums || !M.onIconView || !M.v.length;

            toggleGridExtraButtons(hideExtraMenu);

            this.gridSortDirBtn.icon = `sprite-fm-mono icon-${M.sortmode && M.sortmode.d === 1 ? 'up' : 'down'}`;
            this.gridSortDirBtn.text = M.sortmode && colBtnsText[M.sortmode.n === 'ts' ? 'date' : M.sortmode.n];
        },
        showLayoutDropdown(ev) {
            $.hideContextMenu();
            ev.currentTarget.domNode = ev.currentTarget;
            ev.currentTarget.domNode.classList.add('active');
            mega.ui.menu.show({
                name: 'fm-layout',
                classList: ['fm-layout-menu'],
                event: ev,
                eventTarget: ev.currentTarget,
                contents: [layoutMenu],
                resizeHandler: true,
                onClose: () => {
                    this.layoutButton.classList.remove('active');
                }
            });
            return false;
        },
        showSelectionBar() {
            if (!this.filterChipsHolder.classList.contains('hidden')) {
                this.filterChipsHolder.classList.add('hidden');
            }
            if (!this.selectionBar.classList.contains('hidden')) {
                return;
            }
            this.selectionBar.classList.remove('hidden');
            if (this.chipsViewsWrapper.classList.contains('hidden')) {
                this.chipsViewsWrapper.classList.remove('hidden');
                chipsViewWrapShown = false;
            }
            else {
                chipsViewWrapShown = true;
            }
            if (M.gallery) {
                this.selectionBar.classList.add('gallery-pad');
                const media = document.getElementById('media-section-controls');
                if (media) {
                    media.classList.add('hidden');
                }
            }
            if (M.onDeviceCenter) {
                const dcChip = document.querySelector('.dc-filter-chips-wrapper');
                dcChipShown = dcChip ? !dcChip.classList.contains('hidden') : false;
                mega.devices.ui.filterChipUtils.hide();
            }
        },
        hideSelectionBar() {
            if (this.selectionBar.classList.contains('hidden')) {
                return;
            }
            this.selectionBar.classList.add('hidden');
            this.selectionBar.classList.remove('gallery-pad');
            if (M.gallery) {
                const media = document.getElementById('media-section-controls');
                if (media) {
                    media.classList.remove('hidden');
                }
            }
            if (mega.ui.mNodeFilter.viewEnabled && M.v.length > 0) {
                this.filterChipsHolder.classList.remove('hidden');
            }
            if (!chipsViewWrapShown) {
                this.chipsViewsWrapper.classList.add('hidden');
            }
            this.chipsViewsWrapper.classList.remove('top-spacer');
            if (M.onDeviceCenter && dcChipShown) {
                mega.devices.ui.filterChipUtils.resetSelections(true);
            }
        },
        onPageChange() {
            dcChipShown = false;
            chipsViewWrapShown = true;
            if (window.selectionManager) {
                // selectionManager should eventually reset but this needs to be empty now for some context menu updates
                selectionManager.selected_list = [];
            }
            if (scrollHandler) {
                scrollHandler.target.removeEventListener('scroll', scrollHandler.handler);
                scrollHandler = false;
            }
            if (this.isSmall) {
                return;
            }
            if (!this.actionsHolder) {
                this.domNode.classList.remove('buttons-up');
                const buttons = mega.ui.header.domNode.querySelector('.fm-header-buttons');
                buttons.parentNode.classList.remove('expand');
                this.domNode.querySelector('.fm-card-holder')
                    .before(buttons);
                this.actionsHolder.classList.add('open', 'hidden');
                this.actionsHolder.classList.remove('collapse');
            }
            if (moveUpTimer) {
                moveUpTimer.abort();
                moveUpTimer = false;
            }
        },
        bindScrollEvents(ps) {
            ps = ps || this.ps;
            startedScrolling = false;
            if (!ps) {
                return true;
            }
            if (scrollHandler) {
                scrollHandler.target.removeEventListener('scroll', scrollHandler.handler);
            }
            scrollHandler = {
                handler: (e) => {
                    if (!e.isTrusted || this.isSmall) {
                        return;
                    }
                    const { offsetHeight, scrollHeight } = ps;
                    if (
                        !startedScrolling &&
                        this.actionsHolder &&
                        scrollHeight - offsetHeight <= this.actionsHolder.getBoundingClientRect().height
                    ) {
                        // Don't animate if it might just bounce back up again with the new space.
                        return;
                    }
                    if (e.target.scrollTop === 0) {
                        this.moveButtonsDown();
                        return;
                    }
                    if (!startedScrolling) {
                        this.moveButtonsUp();
                    }
                },
                target: ps,
            };
            ps.addEventListener('scroll', scrollHandler.handler);
            if (ps.scrollTop === 0) {
                return true;
            }
            if (this.actionsHolder) {
                this.actionsHolder.classList.remove('open');
                const actions = mega.ui.header.domNode.querySelector('.nav-secondary-actions');
                actions.appendChild(this.actionsHolder);
                actions.classList.remove('hidden');
                actions.classList.add('expand');
                actions.classList.remove('contract');
            }
            startedScrolling = true;
            return false;
        },
        moveButtonsUp(expedite) {
            if (!this.actionsHolder) {
                return;
            }
            // Scroll down animation.
            // 1) Swap open for collapse in secondary nav
            // 2) Move DOM node to header
            // 3) Remove collapse and add expand in the header.
            this.domNode.classList.add('buttons-up');
            this.actionsHolder.classList.add('collapse');
            this.actionsHolder.classList.remove('open');
            startedScrolling = true;
            const doMove = () => {
                moveUpTimer = false;
                const actions = mega.ui.header.domNode.querySelector('.nav-secondary-actions');
                actions.appendChild(this.actionsHolder);
                actions.classList.remove('hidden');
                actions.firstElementChild.classList.remove('collapse');
                actions.classList.add('expand');
                actions.classList.remove('contract');
                // Force reposition since resize may not always trigger correctly
                $.tresizer();
                if (mega.ui.menu.name && mega.ui.menu.onResize) {
                    mega.ui.menu.onResize();
                }
            };
            if (expedite) {
                return doMove();
            }
            moveUpTimer = tSleep(0.1);
            moveUpTimer.then(doMove);
        },
        moveButtonsDown() {
            if (this.isSmall) {
                return;
            }
            // Scroll up animation
            // 1) Swap expand for contract in the header
            // 2) Move DOM node to secondary nav
            // 3) Ensure open over collapse on secondary nav
            if (moveUpTimer) {
                moveUpTimer.abort();
                moveUpTimer = false;
                this.actionsHolder.classList.remove('collapse');
                this.actionsHolder.classList.add('open');
                return;
            }
            if (!this.actionsHolder) {
                this.domNode.classList.remove('buttons-up');
                const buttons = mega.ui.header.domNode.querySelector('.fm-header-buttons');
                buttons.parentNode.classList.add('contract');
                buttons.parentNode.classList.remove('expand');
            }
            requestAnimationFrame(() => {
                if (!this.actionsHolder) {
                    this.domNode.querySelector('.fm-card-holder')
                        .before(mega.ui.header.domNode.querySelector('.fm-header-buttons'));
                }
                this.actionsHolder.classList.add('open');
                this.actionsHolder.classList.remove('collapse');
                // Force reposition since resize may not always trigger correctly
                $.tresizer();
                if (mega.ui.menu.name && mega.ui.menu.onResize) {
                    mega.ui.menu.onResize();
                }
                startedScrolling = false;
            });
        },
        updateInfoChipsAndViews(hide) {
            if (hide) {
                this.chipsViewsWrapper.classList.add('hidden');
                return;
            }
            this.chipsViewsWrapper.classList.remove('hidden');
        },
        showBanner(opts) {
            // @todo migrate the banner component to be available here
            const banner = this.bannerHolder.querySelector('.new-banner');
            const icon = banner.querySelector('.banner.left-icon');
            const {
                name, title, type, msgText, msgHtml, ctaHref, ctaText,
                ctaEvent, onCtaClick, onClose
            } = opts;

            this.bannerOpts = { ...opts, banner };

            icon.classList.remove(
                'icon-alert-triangle-thin-outline', 'icon-alert-circle-thin-outline', 'icon-check-circle-thin-outline'
            );
            if (type === 'error') {
                icon.classList.add('icon-alert-triangle-thin-outline');
            }
            else if (type === 'warning') {
                icon.classList.add('icon-alert-circle-thin-outline');
            }
            else if (type === 'success') {
                icon.classList.add('icon-check-circle-thin-outline');
            }

            const titleText = banner.querySelector('.banner.title-text');
            const messageText = banner.querySelector('.banner.message-text');
            const contentBox = banner.querySelector('.content-box');
            const endBox = banner.querySelector('.end-box');
            const cta = contentBox.componentSelector('.action-link') || new MegaLink({
                parentNode: contentBox,
                componentClassname: 'action-link',
                type: 'normal',
            });
            const dismiss = endBox.componentSelector('button.icon-only') || new MegaButton({
                parentNode: endBox,
                type: 'icon',
                icon: 'sprite-fm-mono icon-dialog-close',
                iconSize: 24,
                componentClassname: 'text-icon',
            });
            const alert = banner.querySelector('.mega-component.alert');

            alert.classList.remove('warning', 'error', 'success');
            alert.classList.add(type);
            titleText.textContent = title;
            if (msgHtml) {
                messageText.textContent = '';
                messageText.appendChild(parseHTML(msgHtml));
            }
            else {
                messageText.textContent = msgText;
            }
            cta.href = ctaHref;
            cta.text = ctaText;
            cta.rebind('click.eventLog', () => {
                if (ctaEvent) {
                    eventlog(ctaEvent);
                }
                if (typeof onCtaClick === 'function') {
                    onCtaClick();
                }
            });

            dismiss.rebind('click', () => {
                if (typeof onClose === 'function') {
                    onClose();
                }
                this.hideBanner(name);
            });

            banner.classList.remove('warning', 'error', 'hidden');
            banner.classList.add(type);
            clickURLs();
        },
        hideBanner(id) {
            if (!this.bannerOpts) {
                return false;
            }

            const { name, banner, closeEvent, onClose } = this.bannerOpts;

            if (id && id !== name) {
                return false;
            }

            banner.classList.add('hidden');
            if (typeof closeEvent === 'number') {
                eventlog(closeEvent);
            }
            if (typeof onClose === 'function') {
                onClose();
            }
        },
        extHideFilterChip() {
            if (mega.ui.mNodeFilter.selectedFilters.value) {
                return;
            }
            this.filterChipsHolder.classList.add('hidden');
        },
        extShowFilterChip() {
            this.filterChipsHolder.classList.remove('hidden');
        },
        updateSmallNavButton(show) {
            if (!smallButtonBound) {
                smallButtonBound = true;
                this.smallNavButton.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    $.hideContextMenu();
                    if (this.isSmall) {
                        this.expand();
                        fmconfig.smallNav = 0;
                        eventlog(500957);
                    }
                    else {
                        this.collapse();
                        fmconfig.smallNav = 1;
                        eventlog(500956);
                    }
                });
            }
            this.smallNavButton.classList[show ? 'remove' : 'add']('hidden');
        },
        collapse() {
            document.body.classList.add('small-nav');
            const icon = this.smallNavButton.querySelector('i');
            icon.classList.add('icon-chevrons-down-thin-outline');
            icon.classList.remove('icon-chevrons-up-thin-outline');
            this.smallNavButton.dataset.simpletip = l.show_options;
            if (!showBreadcrumbs) {
                this.showBreadcrumb();
                showBreadcrumbs = false;
            }
            this.moveButtonsUp(true);
            if (this.cardComponent) {
                const { primaryOptions, secondaryOptions } = this.cardComponent;
                const parentNode = mega.ui.header.domNode.querySelector('.fm-header-buttons');
                parentNode.classList.remove('hidden');
                let button = new MegaButton({
                    ...primaryOptions,
                    parentNode,
                    componentClassname: `${primaryOptions.componentClassname} card-copy`,
                });
                button.domNode.title = primaryOptions.text;
                button = new MegaButton({
                    ...secondaryOptions,
                    parentNode,
                    componentClassname: `${secondaryOptions.componentClassname} card-copy`,
                });
                button.domNode.title = secondaryOptions.text;
            }
        },
        expand() {
            document.body.classList.remove('small-nav');
            const icon = this.smallNavButton.querySelector('i');
            icon.classList.add('icon-chevrons-up-thin-outline');
            icon.classList.remove('icon-chevrons-down-thin-outline');
            this.smallNavButton.dataset.simpletip = l.hide_options;
            if (!showBreadcrumbs) {
                this.hideBreadcrumb();
            }
            if (this.cardComponent) {
                const buttons = mega.ui.header.domNode.componentSelectorAll('.fm-header-buttons .card-copy');
                for (let i = buttons.length; i--;) {
                    buttons[i].parentNode.classList.add('hidden');
                    buttons[i].destroy();
                }
            }
            if (!scrollHandler || !scrollHandler.target || scrollHandler.target.scrollTop === 0) {
                this.moveButtonsDown();
            }
        }
    };
});
