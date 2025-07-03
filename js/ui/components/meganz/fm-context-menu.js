(mega => {
    'use strict';

    let _holdSubmenu = null;

    class MegaContextBase extends MegaComponentGroup {
        constructor(parentNode) {
            super();
            this.domNode = document.createElement('div');
            parentNode.appendChild(this.domNode);
        }

        addClass(...classes) {
            this.domNode.classList.add(...classes);
            return this;
        }

        removeClass(...classes) {
            this.domNode.classList.remove(...classes);
            return this;
        }
    }

    class MegaContextSubMenu extends MegaContextBase {
        constructor(parentNode, options) {
            super(parentNode);
            this.addClass('context-button', 'submenu-button');

            this.filtered = [];
            this.text = options.dropdownText;
            this.icon = options.dropdownIcon;
            this.rightBadge = options.rightBadge || {};
            const parent = new MegaButton({
                parentNode: this.domNode,
                text: this.text,
                icon: this.icon,
                rightIcon: 'sprite-fm-mono icon-chevron-right-thin-outline',
                rightIconSize: 24,
                type: 'fullwidth',
                componentClassname: 'context-button text-icon',
                onClick: (ev) => {
                    if (this.filtered.length === 1) {
                        this.getChild(this.filtered[0]).trigger('click');
                    }
                    else if (typeof options.onClick === 'function') {
                        options.onClick(ev);
                    }
                    else {
                        const childmenu = this.getChild('childMenu');

                        if (_holdSubmenu) {
                            _holdSubmenu.classList.add('hidden');
                            if (_holdSubmenu === childmenu) {
                                _holdSubmenu = null;
                                return false;
                            }
                            _holdSubmenu = null;
                        }

                        _holdSubmenu = childmenu;
                        _holdSubmenu.classList.remove('hidden');

                        return false;
                    }
                }
            });

            let _childMenuHideTimer = null;

            this.domNode.addEventListener('mouseenter', () => {

                if (_holdSubmenu && _holdSubmenu !== this.getChild('childMenu') && this.filtered.length > 1) {
                    _holdSubmenu = null;
                }

                if (_childMenuHideTimer) {
                    clearTimeout(_childMenuHideTimer);
                    _childMenuHideTimer = null;
                }
                if (this.filtered.length > 1 && !_holdSubmenu) {
                    // Close all other open submenus before opening this one
                    const allSubmenus = document.querySelectorAll('.context-submenu:not(.hidden)');
                    for (const submenu of allSubmenus) {
                        if (submenu !== this.getChild('childMenu')) {
                            submenu.classList.add('hidden');
                        }
                    }
                    const childMenu = this.getChild('childMenu');
                    childMenu.classList.remove('hidden');
                    const {x, y} = getHtmlElemPos(parent.domNode);
                    const menuPos = M.reCalcMenuPosition(parent.domNode, x, y, 'submenu');
                    childMenu.style.top = menuPos.top;
                }
            });

            this.domNode.addEventListener('mouseleave', () => {
                if (this.filtered.length > 1) {
                    if (_childMenuHideTimer) {
                        clearTimeout(_childMenuHideTimer);
                    }
                    _childMenuHideTimer = setTimeout(() => {
                        if (!_holdSubmenu) {
                            this.getChild('childMenu').classList.add('hidden');
                            _childMenuHideTimer = null;
                        }
                    }, 150);
                }
            });
            this.addChild('parent', parent);

            const subMenu = document.createElement('div');
            subMenu.className = 'context-submenu hidden';
            this.addChild('childMenu', subMenu);
            this.domNode.appendChild(subMenu);
            for (const option of options.children) {
                this.addChild(option.buttonId, new MegaButton({
                    parentNode: subMenu,
                    type: 'fullwidth',
                    componentClassname: 'context-button text-icon',
                    ...option,
                }));
            }
        }

        createButton(options) {
            const subMenu = this.getChild('childMenu');
            const button = new MegaButton({
                parentNode: subMenu,
                type: 'fullwidth',
                componentClassname: 'context-button text-icon',
                ...options
            });
            this.addChild(options.buttonId, button);
            if (options.position) {
                this.reposition(options.position, button);
            }
        }

        reposition(position, component) {
            const childMenu = this.getChild('childMenu');
            if (position === 'firstchild') {
                childMenu.insertBefore(component.domNode, childMenu.firstChild);
            }
            else if (position !== 'childMenu' && position !== 'parent' && this.getChild(position)) {
                const prev = this.getChild(position);
                childMenu.insertBefore(component.domNode, prev.domNode);
            }
        }

        show(ids) {
            this.filtered = ids.filter(id => this.childMap[id]);
            const parent = this.getChild('parent');
            if (this.filtered.length === 1) {
                const real = this.getChild(this.filtered[0]);
                parent.icon = real.icon;
                parent.text = real.text;
                parent.rightIcon = '';
                parent.rightBadge = real.rightBadge;
            }
            else {
                parent.icon = this.icon;
                parent.text = this.text;
                parent.rightIcon = 'sprite-fm-mono icon-chevron-right-thin-outline';
                parent.rightIconSize = 24;
                parent.rightBadge = this.rightBadge;
                this.eachEntry((id, child) => {
                    if (id !== 'parent' && id !== 'childMenu') {
                        if (this.filtered.includes(id)) {
                            child.show();
                        }
                        else {
                            child.hide();
                        }
                    }
                });
            }
            if (this.filtered.length) {
                this.removeClass('hidden');
                return true;
            }
            this.hide();
            return false;
        }

        hide() {
            this.eachEntry((id, child) => {
                if (id !== 'parent' && id !== 'childMenu') {
                    child.hide();
                }
            });
            const childMenu = this.getChild('childMenu');
            childMenu.style.height = 'auto';
            childMenu.style.top = '';
            childMenu.classList.add('hidden');
            childMenu.classList.remove('left-position', 'right-position', 'overlap-left', 'overlap-right');
            this.addClass('hidden');
        }
    }

    class MegaContextSection extends MegaContextBase {
        constructor(parentNode, options) {
            super(parentNode);
            this.addClass('context-section');

            for (const option of options) {
                if (option.submenu) {
                    this.createSubmenu(option);
                }
                else {
                    this.createButton(option);
                }
            }
        }

        createSubmenu(options) {
            const menu = new MegaContextSubMenu(this.domNode, options.submenu);
            this.addChild(options.buttonId, menu);
            if (options.position) {
                this.reposition(options.position, menu);
            }
        }

        createButton(options) {
            if (options.submenuItem) {
                const subMenu = this.getChild(options.submenuItem);
                if (subMenu instanceof MegaContextSubMenu) {
                    subMenu.createButton(options);
                }
                return;
            }
            const button = new MegaButton({
                parentNode: this.domNode,
                type: 'fullwidth',
                componentClassname: 'context-button text-icon',
                ...options
            });
            this.addChild(options.buttonId, button);
            if (options.position) {
                this.reposition(options.position, button);
            }
        }

        reposition(position, component) {
            if (position === 'firstchild') {
                this.domNode.insertBefore(component.domNode, this.domNode.firstChild);
            }
            else if (this.getChild(position)) {
                const prev = this.getChild(position);
                this.domNode.insertBefore(component.domNode, prev.domNode);
            }
        }

        show(ids) {
            let didShow = false;
            this.eachEntry((key, child) => {
                if (!(child instanceof MegaButton)) {
                    didShow = child.show(ids) || didShow;
                }
                else if (ids.includes(key)) {
                    child.show();
                    didShow = true;
                }
                else {
                    child.hide();
                }
            });
            if (didShow) {
                this.removeClass('hidden');
            }
            else {
                this.addClass('hidden');
            }
            return didShow;
        }

        hide() {
            this.each(child => child.hide());
        }
    }

    const labelColours = [
        'red',
        'orange',
        'yellow',
        'green',
        'blue',
        'purple',
        'grey',
    ];

    class MegaLabelSection extends MegaComponent {
        constructor(options) {
            super(options);
            this.addClass('context-section', 'context-label-section');
            let wrapper = document.createElement('div');
            wrapper.className = 'label-header';
            const span = document.createElement('span');
            span.textContent = l[17398];
            wrapper.appendChild(span);
            MegaButton.factory({
                parentNode: wrapper,
                type: 'text',
                text: l[83],
                componentClassname: 'clear-labels',
                onClick: () => {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    M.labeling(mega.ui.contextMenu.selectedItems, 0);
                    this.selected = new Set([0]);
                }
            });
            this.domNode.appendChild(wrapper);
            wrapper = document.createElement('div');
            wrapper.className = 'label-container';
            for (let i = 0; i < labelColours.length; i++) {
                MegaButton.factory({
                    parentNode: wrapper,
                    type: 'icon',
                    componentClassname: `colour-item ${labelColours[i]}-colour-label`,
                    dataset: {
                        labelId: i + 1,
                    },
                    onClick: (ev) => {
                        if (M.isInvalidUserStatus()) {
                            return;
                        }
                        let labelId = ev.currentTarget.hasClass('selected') ? 0 : i + 1;
                        const sel = mega.ui.contextMenu.selectedItems;
                        if (sel.length > 1 && sel.some(h => M.d[h].lbl !== i + 1)) {
                            // Multiple selected with different labels.
                            labelId = i + 1;
                        }
                        M.labeling(sel, labelId);
                        M.fmEventLog(500687);
                        this.selected = new Set([labelId]);
                    }
                });
            }
            this.domNode.appendChild(wrapper);
            this.selected = false;
        }

        show(ids) {
            if (ids.includes('colour-label-items')) {
                super.show();
                return true;
            }
            super.hide();
            return false;
        }

        set selected(colourIds) {
            const labels = this.domNode.querySelectorAll('.colour-item');
            let hasSelection = false;
            for (const label of labels) {
                if (colourIds && colourIds.has(label.dataset.labelId)) {
                    label.classList.add('selected');
                    hasSelection = true;
                }
                else {
                    label.classList.remove('selected');
                }
            }
            if (hasSelection) {
                this.domNode.componentSelector('.clear-labels').show();
            }
            else {
                this.domNode.componentSelector('.clear-labels').hide();
            }
        }
    }

    /**
     * @property {*} mega.ui.contextMenu Context UI.
     */
    lazy(mega.ui, 'contextMenu', () => {
        const menu = document.createElement('div');
        menu.className = 'fm-context-body';
        const sections = new MegaComponentGroup();

        const optionalOptions = [];
        if (pfid) {
            optionalOptions.push({
                buttonId: 'vhl-item',
                text: 'Toggle',
                icon: 'sprite-fm-mono icon-warning-triangle',
                onClick() {
                    for (let i = mega.ui.contextMenu.selectedItems.length; i--;) {
                        let n = M.d[mega.ui.contextMenu.selectedItems[i]];
                        if (n) {
                            if ((n.vhl |= 1) > 3) {
                                n.vhl = 0;
                            }
                            $(`#${n.h}`).removeClassWith('highlight').addClass(`highlight${++n.vhl}`);

                            while ((n = M.d[n.p])) {
                                if (!n.vhl) {
                                    n.vhl = 1;
                                }
                            }
                        }
                    }
                    M.clearSelectedNodes();
                },
            });
        }
        if (optionalOptions.length) {
            sections.addChild('optional', new MegaContextSection(menu, optionalOptions));
        }
        sections.addChild('upload', new MegaContextSection(menu, [
            {
                buttonId: 'fileupload-item',
                text: l[99],
                icon: 'sprite-fm-mono icon-file-upload-thin-outline',
                onClick() {
                    eventlog(500011);
                    document.getElementById('fileselect1').click();
                }
            },
            {
                buttonId: 'folderupload-item',
                text: l[98],
                icon: 'sprite-fm-mono icon-folder-arrow-01-thin-outline',
                onClick() {
                    eventlog(500009);
                    document.getElementById('fileselect2').click();
                }
            },
        ]));
        sections.addChild('create', new MegaContextSection(menu, [
            {
                buttonId: 'newfolder-item',
                text: l[68],
                icon: 'sprite-fm-mono icon-folder-plus-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    createFolderDialog();
                    eventlog(500007);
                }
            },
            {
                buttonId: 'newfile-item',
                text: l[23047],
                icon: 'sprite-fm-mono icon-file-plus-01-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    createFileDialog();
                    eventlog(500722);
                }
            },
            {
                buttonId: 'new-bucket-item',
                text: l.s4_create_bkt,
                icon: 'sprite-fm-mono icon-bucket-objects-regular-outline',
                onClick() {
                    return s4.ui.showDialog(s4.buckets.dialogs.create);
                }
            },
            {
                buttonId: 'new-album-item',
                text: l.new_album,
                icon: 'sprite-fm-mono icon-rectangle-stack-plus-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    mega.gallery.albums.openDialog('AlbumNameDialog');
                }
            },
            {
                buttonId: 'new-share-item',
                text: l[16533],
                icon: 'sprite-fm-mono icon-folder-users-thin-outline',
                onClick() {
                    openNewSharedFolderDialog().catch(dump);
                }
            },
            {
                buttonId: 'new-link-item',
                text: l[20667],
                icon: 'sprite-fm-mono icon-link-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    if (u_type === 0) {
                        ephemeralDialog(l[1005]);
                    }
                    else {
                        M.initFileAndFolderSelectDialog('create-new-link')
                            .then((nodes) => {
                                if (nodes.length) {
                                    return M.getLinkAction(nodes);
                                }
                            })
                            .catch(tell);
                    }
                }
            }
        ]));
        sections.addChild('rubbish', new MegaContextSection(menu, [
            {
                buttonId: 'clearbin-item',
                text: l[7741],
                icon: 'sprite-fm-mono icon-dialog-close-thin',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    doClearbin(true);
                }
            },
        ]));

        const playPreviewItem = (fullscreen, video) => {
            if (M.isInvalidUserStatus()) {
                return;
            }

            if (window.pfcol) {
                closeDialog();
                mega.gallery.playSlideshow(
                    mega.gallery.getAlbumIdFromPath(),
                    fullscreen,
                    video
                );
                return;
            }

            if (M.isAlbumsPage(2)) {
                mega.gallery.playSlideshow(mega.gallery.getAlbumIdFromPath(), fullscreen, video);
                return;
            }

            // Close node Info panel as not needed immediately after opening Preview
            mega.ui.mInfoPanel.hide();
            closeDialog();
            if (video) {
                $.autoplay = mega.ui.contextMenu.selectedItems[0];
            }
            slideshow(mega.ui.contextMenu.selectedItems[0]);
        };
        sections.addChild('primary', new MegaContextSection(menu, [
            {
                buttonId: 'open-item',
                text: l[865],
                icon: 'sprite-fm-mono icon-opened-folder',
                onClick() {
                    const originalTarget = mega.ui.contextMenu.selectedItems[0];
                    let target = originalTarget;
                    let isInboxRoot = false;

                    if (
                        M.currentrootid === 'out-shares' ||
                        M.currentrootid === 'public-links' ||
                        M.currentrootid === 'file-requests'
                    ) {
                        target = `${M.currentrootid}/${target}`;
                    }
                    else if (M.onDeviceCenter) {
                        target = mega.devices.ui.getCurrentDirPath(target);
                    }
                    else if (M.dyh) {
                        target = M.dyh('folder-id', target);
                    }
                    else if (M.getNodeRoot(target) === M.InboxID) {
                        isInboxRoot = true;
                        target = mega.devices.ui.getNodeURLPathFromOuterView(M.d[target]);
                    }
                    else if (M.isAlbumsPage(1)) {
                        target = `albums/${target}`;
                    }

                    Promise.resolve(target)
                        .then((target) => {
                            if (window.vw && isInboxRoot && target === mega.devices.rootId) {
                                target = originalTarget;
                            }
                            return M.openFolder(target);
                        })
                        .then(() => {
                            M.fmEventLog(500675);
                        })
                        .catch(tell);
                }
            },
            {
                buttonId: 'edit-file-item',
                text: l[865],
                icon: 'sprite-fm-mono icon-file-edit-thin-outline',
                onClick() {
                    const nodeHandle = mega.ui.contextMenu.selectedItems[0];
                    if (M.isInvalidUserStatus() || !nodeHandle) {
                        return;
                    }
                    mega.fileTextEditor.openTextHandle(nodeHandle);
                }
            },
            {
                buttonId: 'preview-item',
                text: l[1899],
                icon: 'sprite-fm-mono icon-search-light-outline',
                onClick() {
                    playPreviewItem(false, false);
                    M.fmEventLog(500676);
                }
            },
            {
                buttonId: 'play-item',
                text: l[16275],
                icon: 'sprite-fm-mono icon-play-thin-outline',
                onClick() {
                    playPreviewItem(false, true);
                }
            },
            {
                buttonId: 'download-item',
                submenu: {
                    children: [
                        {
                            buttonId: 'download-item',
                            text: l[58],
                            icon: 'sprite-fm-mono icon-arrow-down-circle-thin-outline',
                            onClick() {
                                let dlHandles = mega.ui.contextMenu.selectedItems;
                                if (
                                    mega.lite.inLiteMode &&
                                    mega.lite.containsFolderInSelection(dlHandles)
                                ) {
                                    return false;
                                }
                                if (M.isAlbumsPage(1)) {
                                    dlHandles = mega.gallery.getAlbumsHandles(dlHandles);
                                }

                                M.addDownload(dlHandles);

                                if (M.isAlbumsPage()) {
                                    eventlog(99954);
                                }
                                else {
                                    M.fmEventLog(500677);
                                }
                            }
                        },
                        {
                            buttonId: 'download-standart-item',
                            text: l[5928],
                            icon: 'sprite-fm-mono icon-file-download-thin-outline',
                            onClick() {
                                let dlHandles = mega.ui.contextMenu.selectedItems;
                                if (M.isAlbumsPage(1)) {
                                    dlHandles = mega.gallery.getAlbumsHandles(dlHandles);
                                }
                                M.addDownload(dlHandles);

                                if (folderlink) {
                                    eventlog(99768);
                                }
                            }
                        },
                        {
                            buttonId: 'zipdownload-item',
                            text: l[864],
                            icon: 'sprite-fm-mono icon-file-download-zip-thin-outline',
                            onClick() {
                                let dlHandles = mega.ui.contextMenu.selectedItems;
                                let zName;
                                let preview;
                                if (M.isAlbumsPage(1)) {
                                    zName = dlHandles.length > 1 ?
                                        'Album-archive-1' : mega.ui.contextMenu.firstAlbum.label;
                                    preview = false;
                                    dlHandles = mega.gallery.getAlbumsHandles(dlHandles);
                                }
                                if (folderlink) {
                                    eventlog(99769);
                                }
                                M.addDownload(dlHandles, true, preview, zName);
                            }
                        },
                    ],
                    dropdownText: l[58],
                    dropdownIcon: 'sprite-fm-mono icon-arrow-down-circle-thin-outline',
                    onClick() {
                        let dlHandles = mega.ui.contextMenu.selectedItems;
                        if (M.isAlbumsPage(1)) {
                            dlHandles = mega.gallery.getAlbumsHandles(dlHandles);
                        }
                        M.addDownload(dlHandles);

                        if (folderlink) {
                            eventlog(99768);
                        }
                    },
                },
            },
        ]));
        const openItem = (node) => {
            const target = node.su && (!node.p || !M.d[node.p])
                ? 'shares'
                : node.h === M.BackupsId ? node.h : node.p;

            if (mega.gallery.sections[M.currentdirid]) {
                M.fmTabState.gallery.prev = M.currentdirid;
            }
            M.openFolder(target).then(() => {
                selectionManager.add_to_selection(node.h, true);
            });
        };
        const doImport = () => {
            if (M.isInvalidUserStatus()) {
                return;
            }
            eventlog(pfcol ? 99832 : 99767);
            ASSERT(folderlink, 'Import needs to be used in folder links.');
            M.importFolderLinkNodes(mega.ui.contextMenu.selectedItems);
        };
        sections.addChild('openshowsavein', new MegaContextSection(menu, [
            {
                buttonId: 'open-in-location',
                text: l.folder_link_show_in_location,
                icon: 'sprite-fm-mono icon-file-search-01-thin-outline',
                onClick() {
                    openItem(mega.ui.contextMenu.firstNode);
                }
            },
            {
                buttonId: 'open-s4-item',
                text: l.open_s4_item,
                icon: 'sprite-fm-mono icon-file-search-01-thin-outline',
                onClick() {
                    openItem(mega.ui.contextMenu.firstNode);
                }
            },
            {
                buttonId: 'import-item',
                text: l.context_menu_import,
                icon: 'sprite-fm-mono icon-cloud-upload-thin-outline',
                onClick() {
                    doImport();
                }
            },
            {
                buttonId: 'import-item-nl',
                text: l.btn_imptomega,
                icon: 'sprite-fm-mono icon-mega-thin-outline',
                onClick() {
                    doImport();
                }
            },
        ]));
        const openShare = () => {
            mega.ui.mShareDialog.init(mega.ui.contextMenu.selectedItems[0]);
            eventlog(500029);
            M.fmEventLog(500681);
        };
        sections.addChild('share', new MegaContextSection(menu, [
            {
                buttonId: 'copy-link',
                text: l.copy_link,
                icon: 'sprite-fm-mono icon-link-thin-outline',
                onClick() {
                    const links = [];
                    for (const handle of mega.ui.contextMenu.selectedItems) {
                        const node = M.getNodeByHandle(handle);
                        if (node && node.ph) {
                            let key = node.t ? u_sharekeys[handle] && u_sharekeys[handle][0] : node.k;
                            if (key) {
                                key = `#${a32_to_base64(key)}`;
                            }
                            links.push(
                                `${getBaseUrl()}${node.t ? '/folder/' : '/file/'}${htmlentities(node.ph)}${key || ''}`
                            );
                        }
                        else if (M.isAlbumsPage(1)) {
                            const album = mega.gallery.albums.store[handle];
                            if (album && album.p) {
                                const { p: { ph }, k } = album;
                                const key = a32_to_base64(decrypt_key(u_k_aes, base64_to_a32(k)));
                                links.push(`${getBaseUrl()}/collection/${ph}#${key}`);
                            }
                        }
                    }
                    copyToClipboard(links.join('\n'), mega.icu.format(l.toast_copy_link, links.length));
                }
            },
            {
                buttonId: 'verify-credential',
                text: l.verify_credentials,
                icon: 'sprite-fm-mono icon-key-02-thin-outline',
                onClick() {
                    const su = mega.ui.contextMenu.selectedItems
                        .map(h => M.getNodeByHandle(h).su).filter(Boolean);
                    if (!su.length) {
                        return;
                    }
                    return fingerprintDialog(su[0]);
                }
            },
            {
                buttonId: 'share',
                submenu: {
                    children: [
                        {
                            buttonId: 'getlink-item',
                            text: l[5622],
                            icon: 'sprite-fm-mono icon-link-thin-outline',
                            onClick() {
                                if (mega.ui.contextMenu.firstAlbum) {
                                    return mega.gallery.albums.addShare(mega.ui.contextMenu.selectedItems);
                                }

                                M.getLinkAction();

                                eventlog(500028);
                                M.fmEventLog(500679);
                            }
                        },
                        {
                            buttonId: 'managelink-item',
                            text: l[6909],
                            icon: 'sprite-fm-mono icon-link-thin-outline',
                            onClick(ev) {
                                if (mega.ui.contextMenu.firstAlbum) {
                                    if (M.isInvalidUserStatus()) {
                                        return;
                                    }
                                    return mega.gallery.albums.openDialog(
                                        'AlbumShareDialog', mega.ui.contextMenu.selectedItems
                                    );
                                }
                                if (
                                    ev.originalEvent.shiftKey && (ev.originalEvent.ctrlKey || ev.originalEvent.metaKey)
                                ) {
                                    $.isCtrlShift = true;
                                }

                                M.getLinkAction();

                                eventlog(500030);
                                M.fmEventLog(500679);
                            }
                        },
                        {
                            buttonId: 'embedcode-item',
                            text: l[17407],
                            icon: 'sprite-fm-mono icon-code-closed-thin-outline',
                            onClick() {
                                M.getLinkAction(mega.ui.contextMenu.selectedItems, true);
                                M.fmEventLog(500679);
                            }
                        },
                        {
                            buttonId: 'remove-album-link-item',
                            text: l[6821],
                            icon: 'sprite-fm-mono icon-link-off-02-thin-outline',
                            onClick() {
                                if (M.isInvalidUserStatus()) {
                                    return;
                                }

                                const albumIds = [];
                                for (const handle of mega.ui.contextMenu.selectedItems) {
                                    if (mega.gallery.albums.store[handle].p) {
                                        albumIds.push(handle);
                                    }
                                }

                                if (albumIds.length) {
                                    mega.gallery.albums.openDialog('RemoveShareDialog', albumIds);
                                }
                            }
                        },
                        {
                            buttonId: 'managepuburl-item',
                            text: l.s4_access_dig_header,
                            icon: 'sprite-fm-mono icon-globe-gear-thin-outline',
                            onClick() {
                                return s4.ui.showDialog(s4.objects.dialogs.access, mega.ui.contextMenu.firstNode);
                            }
                        },
                        {
                            buttonId: 'sh4r1ng-item',
                            text: l[5631],
                            icon: 'sprite-fm-mono icon-folder-users-thin-outline',
                            onClick() {
                                openShare();
                            }
                        },
                        {
                            buttonId: 'manage-share',
                            text: l.manage_share,
                            icon: 'sprite-fm-mono icon-folder-users-thin-outline',
                            onClick() {
                                openShare();
                            }
                        },
                        {
                            buttonId: 'share-bucket',
                            text: l.s4_share_bucket,
                            icon: 'sprite-fm-mono icon-bucket-share-thin-outline',
                            onClick() {
                                openShare();
                            }
                        },
                        {
                            buttonId: 'manage-share-bucket',
                            text: l.manage_share,
                            icon: 'sprite-fm-mono icon-bucket-share-thin-outline',
                            onClick() {
                                openShare();
                            }
                        },
                        {
                            buttonId: 'send-to-contact-item',
                            text: l[17764],
                            icon: 'sprite-fm-mono icon-send-to-chat-thin-outline',
                            onClick() {
                                openCopyDialog('conversations');
                                M.fmEventLog(500678);
                            }
                        },
                        {
                            buttonId: 'file-request-create',
                            text: l.file_request_dropdown_create,
                            icon: 'sprite-fm-mono icon-folder-arrow-02-thin-outline',
                            onClick() {
                                if (M.isInvalidUserStatus()) {
                                    return;
                                }

                                if (mega.ui.contextMenu.selectedItems[0] === 'file-requests') {
                                    openNewFileRequestDialog()
                                        .then(handle => handle && mega.fileRequest.dialogs.createDialog.init(handle))
                                        .catch(dump);
                                    return;
                                }

                                mega.fileRequest.dialogs.createDialog.init(
                                    mega.ui.contextMenu.selectedItems[0]
                                );
                            }
                        },
                        {
                            buttonId: 'file-request-manage',
                            text: l.file_request_dropdown_manage,
                            icon: 'sprite-fm-mono icon-folder-arrow-02-thin-outline',
                            onClick() {
                                if (M.isInvalidUserStatus()) {
                                    return;
                                }

                                mega.fileRequest.dialogs.manageDialog.init({
                                    h: mega.ui.contextMenu.selectedItems[0]
                                });
                            }
                        },
                    ],
                    dropdownText: l.mega_share_ctx,
                    dropdownIcon: 'sprite-fm-mono icon-share-thin-outline',
                }
            },
            {
                buttonId: 'transferit-item',
                text: l.transfer_it_ctx,
                icon: 'sprite-fm-mono icon-transfer-it',
                rightBadge: {
                    text: l[24648],
                    badgeClass: 'transferit small',
                },
                onClick() {
                    if (mega.xferit) {
                        M.openTransferItOverlay(mega.ui.contextMenu.selectedItems).catch(tell);
                    }
                },
            },
        ]));
        sections.addChild('slideshow', new MegaContextSection(menu, [
            {
                buttonId: 'play-slideshow',
                text: l.album_play_slideshow,
                icon: 'sprite-fm-mono icon-play-square-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }

                    closeDialog();
                    mega.gallery.playSlideshow(
                        mega.gallery.getAlbumIdFromPath(),
                        true,
                        false
                    );
                }
            },
        ]));
        sections.addChild('inforename', new MegaContextSection(menu, [
            {
                buttonId: 'properties-item',
                text: l[6859],
                icon: 'sprite-fm-mono icon-info-thin-outline',
                onClick() {
                    mega.ui.mInfoPanel.show(mega.ui.contextMenu.selectedItems);

                    M.fmEventLog(500683);
                }
            },
            {
                buttonId: 'rename-item',
                text: l[61],
                icon: 'sprite-fm-mono icon-edit-03-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    if (mega.ui.contextMenu.firstAlbum) {
                        return mega.gallery.albums.openDialog('AlbumNameDialog', mega.ui.contextMenu.firstAlbum.id);
                    }
                    renameDialog();
                    M.fmEventLog(500689);
                }
            },
        ]));
        sections.addChild('thumbnail', new MegaContextSection(menu, [
            {
                buttonId: 'set-thumbnail',
                text: l.set_thumb_ctx,
                icon: 'sprite-fm-mono icon-photo-stack-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    const { albums } = mega.gallery;

                    if (albums.grid.timeline.selCount === 1) {
                        albums.updateAlbumCover(
                            albums.store[mega.gallery.getAlbumIdFromPath()],
                            Object.keys(albums.grid.timeline.selections)[0]
                        );
                    }
                }
            },
        ]));
        sections.addChild('manipulate', new MegaContextSection(menu, [
            {
                buttonId: 'add-to-album',
                text: l.add_to_album,
                icon: 'sprite-fm-mono icon-rectangle-stack-plus-thin-outline',
                onClick() {
                    mega.gallery.albums.addToAlbum(mega.ui.contextMenu.selectedItems);
                    M.fmEventLog(500690);
                }
            },
            {
                buttonId: 'album-add-items',
                text: l.add_album_items,
                icon: 'sprite-fm-mono icon-plus-light-solid',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    mega.gallery.albums.openDialog('AlbumItemsDialog', mega.ui.contextMenu.selectedItems[0]);
                }
            },
            {
                buttonId: 'syncmegasync-item',
                text: l[17621],
                icon: 'sprite-fm-mono icon-sync-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }

                    megasync.isInstalled((err, is) => {
                        if ((!err || is) && megasync.currUser === u_handle) {
                            megasync.syncFolder(mega.ui.contextMenu.selectedItems[0]);
                        }
                    });
                }
            },
            {
                buttonId: 'move-item',
                text: l[62],
                icon: 'sprite-fm-mono icon-move-thin-outline',
                onClick(ev) {
                    openMoveDialog(ev.originalEvent);
                    M.fmEventLog(500691);
                }
            },
            {
                buttonId: 'copy-item',
                text: l[63],
                icon: 'sprite-fm-mono icon-copy-thin-outline',
                onClick(ev) {
                    openCopyDialog(ev.originalEvent);
                    M.fmEventLog(500692);
                }
            },
            {
                buttonId: 'revert-item',
                text: l[5726],
                icon: 'sprite-fm-mono icon-clock-rotate-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    mLoadingSpinner.show('restore-nodes');
                    M.revertRubbishNodes(mega.ui.contextMenu.selectedItems)
                        .catch(ex => {
                            if (ex !== EBLOCKED) {
                                tell(ex);
                            }
                        })
                        .finally(() => mLoadingSpinner.hide('restore-nodes'));
                }
            },
            {
                buttonId: 'device-rename-item',
                text: l[61],
                icon: 'sprite-fm-mono icon-edit-03-thin-outline',
                onClick() {
                    if (M.onDeviceCenter) {
                        mega.devices.ui.renameDevice();
                    }
                }
            },
        ]));

        sections.addChild('label', new MegaLabelSection({ parentNode: menu }));
        const doFavourite = (add) => {
            if (M.isInvalidUserStatus()) {
                return;
            }

            M.favourite(mega.ui.contextMenu.selectedItems, add ? 1 : 0);

            M.fmEventLog(500686);
        };
        sections.addChild('tag', new MegaContextSection(menu, [
            {
                buttonId: 'add-star-item',
                text: l[5871],
                icon: 'sprite-fm-mono icon-heart-thin-outline',
                onClick() {
                    doFavourite(true);
                }
            },
            {
                buttonId: 'remove-star-item',
                text: l[5872],
                icon: 'sprite-fm-mono icon-heart-thin-solid',
                onClick() {
                    doFavourite();
                }
            },
        ]));
        sections.addChild('dispute', new MegaContextSection(menu, [
            {
                buttonId: 'dispute-item',
                text: l[20185],
                icon: 'sprite-fm-mono icon-message-alert',
                onClick() {
                    localStorage.removeItem('takedownDisputeNodeURL');
                    for (const handle of mega.ui.contextMenu.selectedItems) {
                        const node = M.getNodeByHandle(handle);
                        if (node.t & M.IS_TAKENDOWN || M.getNodeShare(node).down === 1) {
                            const disputeURL = mega.getPublicNodeExportLink(node);
                            if (disputeURL) {
                                localStorage.setItem('takedownDisputeNodeURL', disputeURL);
                            }
                            break;
                        }
                    }
                    mega.redirect('mega.io', 'dispute', false, false, false);
                }
            },
        ]));
        const proOnlyBadge = {
            text: l[8695],
            badgeClass: 'brand'
        };
        const doSensitive = (hide) => {
            if (M.isInvalidUserStatus()) {
                return;
            }

            mega.sensitives.toggleStatus(mega.ui.contextMenu.selectedItems, hide);
            M.fmEventLog(500688);
        };
        sections.addChild('manage', new MegaContextSection(menu, [
            {
                buttonId: 'settings-item',
                text: l[823],
                icon: 'sprite-fm-mono icon-settings-thin-outline',
                onClick() {
                    return s4.ui.showDialog(s4.buckets.dialogs.settings, mega.ui.contextMenu.firstNode);
                }
            },
            {
                buttonId: 'manage',
                submenu: {
                    children: [
                        {
                            buttonId: 'add-sensitive-item',
                            text: l.sen_hide,
                            icon: 'sprite-fm-mono icon-eye-hidden1',
                            rightBadge: proOnlyBadge,
                            onClick() {
                                doSensitive(true);
                            }
                        },
                        {
                            buttonId: 'remove-sensitive-item',
                            text: l.sen_unhide,
                            icon: 'sprite-fm-mono icon-eye-reveal1',
                            onClick() {
                                doSensitive(false);
                            }
                        },
                        {
                            buttonId: 'rewind-item',
                            text: l.rewind_action_label,
                            icon: 'sprite-fm-mono icon-clock-rotate-thin-outline',
                            rightBadge: {
                                text: l.rewind_beta_tag,
                                badgeClass: 'warning',
                            },
                            onClick() {
                                mega.rewind._startOnEvent(500469, true);
                            }
                        },
                        {
                            buttonId: 'properties-versions',
                            text: l.versions_ctx,
                            icon: 'sprite-fm-mono icon-clock-rotate-thin-outline',
                            onClick() {
                                fileversioning.fileVersioningDialog();
                                M.fmEventLog(500684);
                            }
                        }
                    ],
                    dropdownText: l.manage_ctx,
                    dropdownIcon: 'sprite-fm-mono icon-folder-gear-thin-outline'
                }
            },
            {
                buttonId: 's4-accsetting-item',
                text: l[823],
                icon: 'sprite-fm-mono icon-settings-thin-outline',
                onClick() {
                    loadSubPage('fm/account/s4');
                }
            },
        ]));
        sections.addChild('devices', new MegaContextSection(menu, [
            {
                buttonId: 'pausesync-item',
                text: l.dc_pause,
                icon: 'sprite-fm-mono icon-pause-circle-thin-outline',
                onClick() {
                    mega.devices.ui.desktopApp.common.togglePause();
                }
            },
            {
                buttonId: 'resumesync-item',
                text: l.dc_run,
                icon: 'sprite-fm-mono icon-play-circle-thin-outline',
                onClick() {
                    mega.devices.ui.desktopApp.common.togglePause();
                }
            },
            {
                buttonId: 'stopbackup-item',
                text: l.stop_backup_button,
                icon: 'sprite-fm-mono icon-x-circle-thin-outline',
                onClick() {
                    if (M.onDeviceCenter) {
                        mega.devices.ui.desktopApp.common.remove();
                    }
                }
            },
            {
                buttonId: 'stopsync-item',
                text: l.stop_syncing_button,
                icon: 'sprite-fm-mono icon-x-circle-thin-outline',
                onClick() {
                    if (M.onDeviceCenter) {
                        mega.devices.ui.desktopApp.common.remove();
                    }
                }
            },
        ]));
        const trashIcon = 'sprite-fm-mono icon-trash-thin-outline';
        sections.addChild('delete', new MegaContextSection(menu, [
            {
                buttonId: 'remove-item',
                text: l.move_to_rubbish_bin,
                icon: trashIcon,
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return false;
                    }
                    closeDialog();
                    fmremove(mega.ui.contextMenu.selectedItems);
                    M.fmEventLog(500694);
                }
            },
            {
                buttonId: 'delete-album',
                text: l.delete_album_ctx,
                icon: trashIcon,
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    mega.gallery.albums.openDialog('RemoveAlbumDialog', mega.ui.contextMenu.selectedItems);
                }
            },
            {
                buttonId: 'leaveshare-item',
                text: l[5866],
                icon: 'sprite-fm-mono icon-log-out-02-thin-outline',
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return;
                    }
                    const errHandler = ex => {
                        if (ex === EMASTERONLY) {
                            msgDialog(
                                'warningb',
                                '',
                                l.err_bus_sub_leave_share_dlg_title,
                                l.err_bus_sub_leave_share_dlg_text
                            );
                        }
                    };

                    for (const handle of mega.ui.contextMenu.selectedItems) {
                        M.leaveShare(handle).catch(errHandler);
                    }
                }
            },
            {
                buttonId: 'delete-permanent',
                text: l.delete_permanently,
                icon: trashIcon,
                onClick() {
                    if (M.isInvalidUserStatus()) {
                        return false;
                    }
                    closeDialog();
                    fmremove();
                }
            },
        ]));
        // @todo The contextmenu handler that would show these items doesn't seem to bind to any element.
        sections.addChild('rewind1', new MegaContextSection(menu, [
            {
                buttonId: 'open-item-rewind',
                text: l[865],
                icon: 'sprite-fm-mono icon-opened-folder',
                onClick() {
                    if (!mega.rewindUi || !mega.rewindUi.sidebar) {
                        return;
                    }
                    mega.rewindUi.sidebar.contextOpenItem();
                }
            }
        ]));
        sections.addChild('rewind2', new MegaContextSection(menu, [
            {
                buttonId: 'properties-item-rewind',
                text: l[6859],
                icon: 'sprite-fm-mono icon-info-thin-outline',
                onClick() {
                    if (!mega.rewindUi || !mega.rewindUi.sidebar) {
                        return;
                    }
                    mega.rewindUi.sidebar.contextInfoItem();
                }
            }
        ]));

        const manipulations = {
            '.import-item': (items) => {
                if (!u_type) {
                    array.remove(items, '.import-item');
                    items.push('.import-item-nl');
                }
            },
            '.play-item': (items, { node }) => {
                sections.getChild('primary').getChild('play-item').text = is_audio(node) ? l[17828] : l[16275];
            },
            '.remove-item': (items, { stats }) => {
                if (stats.allAreRubbish) {
                    array.remove(items, '.remove-item');
                    items.push('.delete-permanent');
                }
            },
            '.add-sensitive-item': (items, { selectedItems }) => {
                const sen = mega.sensitives.getSensitivityStatus(selectedItems);
                if (sen === 1) {
                    sections.getChild('manage').getChild('manage').getChild('add-sensitive-item').rightBadge =
                        window.u_attr && (u_attr.p || u_attr.b) ? false : proOnlyBadge;
                }
                else if (sen === 2) {
                    array.remove(items, '.add-sensitive-item');
                    items.push('.remove-sensitive-item');
                }
            },
            '.download-standart-item': (items, { selectedItems }) => {
                if (
                    mega.lite.inLiteMode &&
                    mega.lite.containsFolderInSelection(selectedItems)
                ) {
                    // If MEGA Lite mode and the selection contains a folder,
                    // hide the regular download option (only zip allowed),
                    // otherwise this throws an error about downloading an empty folder then downloads as a zip anyway.
                    array.remove(items, '.download-standart-item');
                }
            },
            '.getlink-item': (items, { selectedItems, stats }) => {
                const component = sections.getChild('share').getChild('share');
                const { numOfExistingLinks } = stats;
                if (M.isAlbumsPage(1) && numOfExistingLinks) {
                    items.push('.remove-album-link-item');
                    component.getChild('remove-album-link-item').text = numOfExistingLinks > 1 ? l[8735] : l[6821];
                }
                if (numOfExistingLinks !== selectedItems.length) {
                    component.getChild('getlink-item').text = mega.icu.format(l.share_link, selectedItems.length);
                }
                else if (numOfExistingLinks) {
                    array.remove(items, '.getlink-item');
                    items.push('.managelink-item');
                    component.getChild('managelink-item').text = numOfExistingLinks > 1 ? l[17520] : l[6909];
                    items.push('.copy-link');
                    sections.getChild('share').getChild('copy-link').text = numOfExistingLinks > 1 ?
                        l.copy_links : l.copy_link;
                }
                else {
                    component.getChild('getlink-item').text = mega.icu.format(l.share_link, selectedItems.length);
                }
            },
            '.sh4r1ng-item': (items, { node }) => {
                const isS4Bucket = node.s4 && 'kernel' in s4 && s4.kernel.getS4NodeType(node) === 'bucket';
                const hasShares = M.getNodeShareUsers(node, 'EXP').length || M.ps[node];
                let removed = false;
                if (isS4Bucket) {
                    array.remove(items, '.sh4r1ng-item');
                    removed = true;
                    items.push(hasShares ? '.manage-share-bucket' : '.share-bucket');
                }
                else if (hasShares) {
                    array.remove(items, '.sh4r1ng-item');
                    removed = true;
                    items.push('.manage-share');
                }

                if (!removed) {
                    sections.getChild('share').getChild('share').getChild('sh4r1ng-item').text =
                        M.currentrootid === M.InboxID || M.getNodeRoot(node.h) === M.InboxID ?
                            l.read_only_share : l[5631];
                }
            },
            '.add-star-item': (items, { stats }) => {
                if (stats.allAreFavourite) {
                    array.remove(items, '.add-star-item');
                    items.push('.remove-star-item');
                }
            },
            '.colour-label-items': (items, { selectedItems }) => {
                sections.getChild('label').selected =
                    new Set(selectedItems.map(h => M.d[h] ? String(M.d[h].lbl) : false));
            },
            '.togglepausesync-item': (items, { selectedItems }) => {
                array.remove(items, '.togglepausesync-item');
                if (M.onDeviceCenter) {
                    const { device } = mega.devices.ui.getCurrentDirData();
                    const folder = device.folders[selectedItems[0]];
                    if (folder) {
                        items.push(folder.status.pausedSyncs ? '.resumesync-item' : '.pausesync-item');
                    }
                }
            },
            '.delete-album': (items, { selectedItems }) => {
                sections.getChild('delete').getChild('delete-album').text =
                    selectedItems.length > 1 ? l.delete_albums_ctx : l.delete_album_ctx;
            },
            '.clearprevious-versions': (items) => {
                array.remove(items, '.clearprevious-versions');
                items.push('.properties-versions');
            },
            '.open-cloud-item': (items) => {
                array.remove(items, '.open-cloud-item');
                items.push('.open-in-location');
            },
            '.properties-item': (items, { selectedItems: sel }) => {
                if (pfcol && sel.length === 1 && M.d[sel[0]].t === 2) {
                    array.remove(items, '.properties-item');
                }
            }
        };
        const manipulateItems = (items) => {
            const { firstNode: node, selectedItems } = mega.ui.contextMenu;
            const stats = {
                allAreRubbish: true,
                numOfExistingLinks: 0,
                allAreFavourite: true,
            };
            for (const handle of selectedItems) {
                if (M.isAlbumsPage(1)) {
                    const album = mega.gallery.albums.store[handle];
                    if (album && album.p) {
                        stats.numOfExistingLinks++;
                    }
                }
                if (M.getNodeRoot(handle) !== M.RubbishID) {
                    stats.allAreRubbish = false;
                }
                if (M.getNodeShare(handle)) {
                    stats.numOfExistingLinks++;
                }
                if (!M.isFavourite(handle)) {
                    stats.allAreFavourite = false;
                }
            }
            for (let i = items.length; i--;) {
                let key = items[i];
                const parts = key.split(':');
                if (parts.length > 1) {
                    key = parts[0];
                    items[i] = key;
                }
                const idx = key.indexOf('.', 1);
                if (idx > 0) {
                    items[i] = key.substring(0, idx);
                }
                if (typeof manipulations[key] === 'function') {
                    manipulations[key](items, { selectedItems, node, stats });
                }
            }
            return array.unique(items.map(s => s.replace('.', '')));
        };

        const prepareOldMenu = () => {
            // Nothing shown by the new menu. Use the old menu as a fallback e.g: transfers.
            const menu = document.querySelector('.dropdown.body.files-menu');
            const sections = menu.querySelectorAll('.dropdown-section');
            for (const section of sections) {
                let allHidden = true;
                for (const child of section.children) {
                    if (child.classList.contains('dropdown-item') && !child.classList.contains('hidden')) {
                        allHidden = false;
                        break;
                    }
                }
                if (allHidden) {
                    section.classList.add('hidden');
                }
                else {
                    section.classList.remove('hidden');
                }
            }
            return menu;
        };
        return {
            selectedItems: [],
            get firstNode() {
                return M.d[this.selectedItems[0]];
            },
            get firstAlbum() {
                if (!mega.gallery || !mega.gallery.albums) {
                    return false;
                }
                return mega.gallery.albums.store[this.selectedItems[0]];
            },
            get contextSource() {
                const node = document.querySelector('.ctx-source');
                if (node) {
                    return node;
                }
                return false;
            },
            init() {
                if (this.ready) {
                    return;
                }
                this.domNode = document.querySelector('.fm-context-menu');
                if (this.domNode) {
                    this.domNode.appendChild(menu);
                    mBroadcaster.addListener('contextmenuclose', () => this.hide());
                    this.ready = true;
                }
            },
            show(itemOptions) {
                this.init();
                if (!this.ready) {
                    return false;
                }
                if (!itemOptions.length) {
                    return prepareOldMenu();
                }
                if ($.selected.length) {
                    this.selectedItems = [...$.selected];
                }
                else if (
                    window.selectionManager &&
                    SelectionManager2Base.SUB_CLASSES.AlbumsSelectionManager &&
                    selectionManager instanceof SelectionManager2Base.SUB_CLASSES.AlbumsSelectionManager
                ) {
                    this.selectedItems = Object.keys(selectionManager.timeline.mComponent.selections);
                }
                else {
                    this.selectedItems = [String(M.currentdirid || '').split('/').pop()];
                }
                itemOptions = manipulateItems(itemOptions);
                if (!itemOptions.length) {
                    return false;
                }
                let lastSection;
                sections.each(section => {
                    section.removeClass('last');
                    if (section.show(itemOptions) && !lastSection) {
                        lastSection = section;
                    }
                });
                if (lastSection) {
                    lastSection.addClass('last');
                    return this.domNode;
                }
                return prepareOldMenu();
            },
            hide() {
                if (!this.ready) {
                    return;
                }
                sections.each(section => {
                    section.hide();
                    section.removeClass('last');
                });
                this.domNode.classList.add('hidden');
                const topArrow = this.domNode.querySelector('.context-top-arrow');
                if (topArrow) {
                    topArrow.remove();
                    this.domNode.querySelector('.context-bottom-arrow').remove();
                }
                this.domNode.classList.remove('mega-height');
                this.domNode.style.height = 'auto';
                this.selectedItems = [];
                const ctxSources = document.querySelectorAll('.ctx-source');
                for (const source of ctxSources) {
                    source.classList.remove('ctx-source', 'active');
                }

                if (_holdSubmenu) {
                    _holdSubmenu = null;
                }
            },
            addOption(options) {
                this.init();
                if (
                    !this.ready ||
                    !options.sectionId ||
                    !sections.getChild(options.sectionId) ||
                    !options.buttonId ||
                    sections.getChild(options.buttonId)
                ) {
                    return false;
                }
                this.hide();
                const section = sections.getChild(options.sectionId);
                if (options.submenu) {
                    section.createSubmenu(options);
                }
                else {
                    section.createButton(options);
                }
            },
        };
    });
})(window.mega);
