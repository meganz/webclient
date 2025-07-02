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
        labelWrapper.appendChild(subNode);

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
        MegaButton.factory({
            parentNode: wrapper,
            ...options.primaryButton,
            componentClassname: `primary ${options.primaryButton.componentClassname || ''}`,
        });
        const secondaryBtn = new MegaButton({
            parentNode: wrapper,
            ...options.secondaryButton,
            componentClassname: `secondary outline ${options.secondaryButton.componentClassname || ''}`
        });
        if (this.isSync || this.isBackup) {
            secondaryBtn.removeClass('outline');
        }
        if (typeof options.onContextMenu === 'function') {
            MegaButton.factory({
                parentNode: wrapper,
                type: 'icon',
                icon: 'sprite-fm-mono icon-side-menu',
                componentClassname: 'transparent-icon fm-header-context',
                id: `fmhead_${this.handle}`,
                onClick: (ev) => {
                    options.onContextMenu(ev);
                }
            });
        }

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
        if (this.isSharedRoot) {
            const { su } = this.node;
            return `
                <div class="fm-item-badge">
                    <div class="fm-share-avatar"></div>
                    <div class="fm-share-user">${escapeHTML(M.getNameByHandle(su))}</div>
                    <span class="dot">.</span>
                    <div class="fm-share-email">${escapeHTML(M.u[su].m)}</div>
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
                    <i class="sprite-fm-mono icon-info-thin-outline dc-badge-info-icon simpletip"></i>
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
            didRender = !!html;
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
                this.avatar = this.avatar || new MegaAvatarComponent({
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
            if (!mega.ui.secondaryNav.dlId) {
                return;
            }
            M.addDownload([mega.ui.secondaryNav.dlId]);
            delete mega.ui.secondaryNav.dlId;
        }
    });
    MegaButton.factory({
        parentNode: downloadMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon',
        icon: 'sprite-fm-mono icon-download-zip',
        text: l[864],
        onClick: () => {
            if (!mega.ui.secondaryNav.dlId) {
                return;
            }
            M.addDownload([mega.ui.secondaryNav.dlId], true);
            delete mega.ui.secondaryNav.dlId;
            $.hideContextMenu();
        }
    });
    const downloadMegaSync = new MegaButton({
        parentNode: downloadMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon',
        icon: 'sprite-fm-mono icon-session-history',
        text: l.btn_dlwitdeskapp,
        onClick: () => {
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

        if (folderlink && String(M.currentdirid).startsWith('search')) {
            M.viewmode = viewValue;
            $.hideContextMenu();
            M.renderMain();
        }
        else {
            M.openFolder(M.currentdirid, true).then(reselect.bind(null, 1));
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

        if (page === 'fm/public-links') {
            timeAdBtn.text = l[20694];
            colBtnsText.date = l[20694];
        }
        else if (page === 'fm/file-requests') {
            timeAdBtn.text = l.file_request_page_label_request_created;
            colBtnsText.date = l.file_request_page_label_request_created;
        }
        else {
            timeAdBtn.text = l[17445];
            colBtnsText.date = l[17445];
        }
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

                if ((colkey === 'versions' || colkey === 'size') && mega.lite.inLiteMode ||
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

    let filterChipShown = false;
    let dcChipShown = false;

    const toggleGridExtraButtons = hide => extraBtnWrapper.classList.toggle('hidden', hide);

    return {
        domNode: document.querySelector('.fm-right-header'),
        gridSortDirBtn,
        showColumnSelectionMenu,
        handleNodeSelection,
        toggleGridExtraButtons,
        get bannerHolder() {
            return this.domNode.querySelector('.fm-banner-holder');
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
        openNewMenu(ev) {
            if (
                M.InboxID &&
                (M.currentrootid === M.InboxID || M.getNodeRoot(M.currentdirid.split('/').pop()) === M.InboxID)
            ) {
                return;
            }

            M.contextMenuUI(ev, 8, ['.fileupload-item', '.folderupload-item', '.newfolder-item', '.newfile-item']);
            eventlog(500721);
        },
        openDownloadMenu(ev) {
            const target = ev.currentTarget;
            const id = M.currentdirid.split('/').pop();
            if (id) {
                const classList =  ['fm-download-menu', 'fm-thin-dropdown'];
                if (folderlink) {
                    downloadMegaSync.show();
                    downloadStandard.hide();
                    classList.push('fl-download');
                }
                else {
                    downloadStandard.show();
                    downloadMegaSync.hide();
                }
                this.dlId = id;
                mega.ui.menu.show({
                    name: 'fm-download-items',
                    classList,
                    event: ev,
                    eventTarget: target,
                    contents: [downloadMenu],
                    onClose: () => {
                        target.domNode.classList.remove('active');
                    }
                });
            }
        },
        openContextMenu(ev) {
            let { id } = ev.currentTarget.domNode;
            if (id) {
                if (id.startsWith('fmhead_')) {
                    id = id.replace('fmhead_', '');
                }
                $.selected = [id];
                if (id === M.RootID) {
                    ev.currentTarget.domNode.classList.add('cloud-drive');
                }

                M.contextMenuUI(ev.originalEvent, 1);
                ev.currentTarget.domNode.classList.add('active');
                ev.currentTarget.domNode.classList.remove('cloud-drive');
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
            if (sel === '.' || this.actionsHolder.querySelector(sel)) {
                if (d && sel === '.') {
                    console.warn('No fm- prefixed class found', options.componentClassname);
                }
                return;
            }
            MegaButton.factory({
                parentNode: this.actionsHolder,
                ...options,
                componentClassname: `${options.componentClassname} hidden`,
            });
        },
        showActionButtons(primarySelector, secondarySelector, contextMenuItem) {
            this.hideActionButtons();
            if (primarySelector) {
                const primary = this.actionsHolder.querySelector(primarySelector);
                if (primary) {
                    primary.classList.remove('hidden');
                    primary.classList.add('primary');
                }
            }
            if (secondarySelector) {
                const secondary = this.actionsHolder.querySelector(secondarySelector);
                if (secondary) {
                    secondary.classList.remove('hidden');
                    secondary.classList.add('secondary');
                }
            }
            contextMenuItem = false;
            // if (contextMenuItem) {
            //     const context = this.actionsHolder.querySelector('.fm-context');
            //     context.id = `fmhead_${contextMenuItem}`;
            //     context.classList.remove('hidden');
            // }
            if (primarySelector || secondarySelector || contextMenuItem) {
                this.actionsHolder.classList.remove('hidden');
            }
        },
        hideActionButtons() {
            const children = this.actionsHolder.children;
            for (const child of children) {
                child.classList.add('hidden');
                child.classList.remove('primary', 'secondary');
                child.id = '';
            }
            this.actionsHolder.classList.add('hidden');
        },
        showCard(nodeHandle, primaryButton, secondaryButton, onContextMenu) {
            this.hideCard();
            this.cardComponent = new MegaNavCard({
                parentNode: this.cardHolder,
                nodeHandle,
                primaryButton,
                secondaryButton,
                // onContextMenu,
            });
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
            delete this.cardComponent;
        },
        showBreadcrumb() {
            this.breadcrumbHolder.classList.remove('hidden');
        },
        hideBreadcrumb() {
            this.breadcrumbHolder.classList.add('hidden');
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
            if (!this.selectionBar.classList.contains('hidden')) {
                return;
            }
            this.selectionBar.classList.remove('hidden');
            if (this.filterChipsHolder.classList.contains('hidden')) {
                filterChipShown = false;
            }
            else {
                this.filterChipsHolder.classList.add('hidden');
                filterChipShown = true;
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
                filterChipShown = false;
                const media = document.getElementById('media-section-controls');
                if (media) {
                    media.classList.remove('hidden');
                }
            }
            if (filterChipShown) {
                this.filterChipsHolder.classList.remove('hidden');
            }
            if (M.onDeviceCenter && dcChipShown) {
                mega.devices.ui.filterChipUtils.resetSelections(true);
            }
        },
        onPageChange() {
            filterChipShown = false;
            dcChipShown = false;
            if (window.selectionManager) {
                // selectionManager should eventually reset but this needs to be empty now for some context menu updates
                selectionManager.selected_list = [];
            }
        },
    };
});
