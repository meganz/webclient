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
                    <div class="fm-share-avatar">
                        <div class="avatar"></div>
                    </div>
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
                if (mega.gallery.isVideo(nodes[i])) {
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
            MegaNodeComponent.mAvatarNode(this.node.su, this.domNode.querySelector('.fm-share-avatar .avatar'));
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
                icon.classList.remove(
                    'icon-view-small-list-thin', 'icon-grid-4-thin-outline', 'icon-image-04-thin-outline'
                );
                icon.classList.add(
                    viewValue === 0 ? 'icon-view-small-list-thin' :
                        viewValue === 1 ? 'icon-grid-4-thin-outline' : 'icon-image-04-thin-outline'
                );
            }
        }
    };
    const layoutList = new MegaButton({
        parentNode: layoutMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon',
        icon: 'sprite-fm-mono icon-view-small-list-thin',
        text: l.filter_view_list,
        onClick(ev) {
            if (!ev.currentTarget.rightIcon) {
                viewChangeHandler(0);
                eventlog(500724);
            }
        }
    });
    const layoutGrid = new MegaButton({
        parentNode: layoutMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon',
        icon: 'sprite-fm-mono icon-grid-4-thin-outline',
        text: l.grid_view,
        onClick(ev) {
            if (!ev.currentTarget.rightIcon) {
                viewChangeHandler(1);
                eventlog(500725);
            }
        }
    });
    const layoutGallery = new MegaButton({
        parentNode: layoutMenu,
        type: 'fullwidth',
        componentClassname: 'text-icon hidden',
        icon: 'sprite-fm-mono icon-image-04-thin-outline',
        text: l.md_view,
        onClick(ev) {
            if (!ev.currentTarget.rightIcon) {
                viewChangeHandler(2);
                eventlog(500726);
            }
        }
    });
    let filterChipShown = false;
    let dcChipShown = false;

    return {
        domNode: document.querySelector('.fm-right-header'),
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
                    mega.ui.mInfoPanel.show($.selected);
                    eventlog(500727);
                });
            }
            this.infoButton.classList[show ? 'remove' : 'add']('hidden');
        },
        updateGalleryLayout(hide) {
            if (hide) {
                layoutGallery.hide();
            }
            else {
                layoutGallery.show();
            }
        },
        updateLayoutButton(hide) {
            if (!layoutButtonBound) {
                this.layoutButton.addEventListener('click', (ev) => {
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
                icon.classList.remove(
                    'icon-view-small-list-thin', 'icon-grid-4-thin-outline', 'icon-image-04-thin-outline'
                );
                icon.classList.add(
                    viewValue === 0 ? 'icon-view-small-list-thin' :
                        viewValue === 1 ? 'icon-grid-4-thin-outline' : 'icon-image-04-thin-outline'
                );
            }
            const checkedIcon = `sprite-fm-mono icon-check-thin-outline ${MegaInteractable.iconSizesClass[24]}`;
            layoutList.rightIcon = viewValue === 0 ? checkedIcon : '';
            layoutGrid.rightIcon = viewValue === 1 ? checkedIcon : '';
            layoutGallery.rightIcon = viewValue === 2 ? checkedIcon : '';
            if (hide) {
                this.layoutButton.classList.add('hidden');
            }
            else {
                this.layoutButton.classList.remove('hidden');
            }
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
