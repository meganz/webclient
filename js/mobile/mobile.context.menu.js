class MegaMobileContextMenu extends MegaComponentGroup {

    constructor() {

        super();

        this.sheet = mega.ui.sheet;
        this.hide = this.sheet.hide;

        this.domNode = document.createElement('div');
        this.domNode.className = 'context-menu-container px-6';

        const menuNode = document.createElement('menu');
        menuNode.className = 'context-menu-items items';

        this.domNode.append(menuNode);

        const keys = Object.keys(MegaMobileContextMenu.menuItems);
        const subMenuIcon = lang === 'ar' ? 'sprite-fm-mono icon-arrow-left' : 'sprite-fm-mono icon-arrow-right';

        // build all context menu items
        for (let i = keys.length; i--;) {
            const key = keys[i];
            const item = MegaMobileContextMenu.menuItems[key];

            const li = document.createElement('li');
            li.className = `context-menu-item hidden ${key.replace('.', '')}`;

            menuNode.insertBefore(li, menuNode.firstChild);

            const options = {
                parentNode: li,
                type: 'fullwidth',
                iconSize: '24',
                icon: item.icon,
                text: item.text,
                componentClassname: `text-icon ${item.classNames}`,
                rightIcon: item.subMenu ? subMenuIcon : '',
                rightIconSize: item.subMenu ? '24' : ''
            };

            const tappableListItem = new MegaButton(options);

            this.addChild(key, tappableListItem);

            tappableListItem.on('tap', (megaDataEvent, touchEvent) => {
                this.sheet.hide();
                item.onClick(this.handle, touchEvent);

                return false;
            });
        }
    }

    async show(handle) {

        $.selected = [handle];

        this.handle = handle;

        const node = M.getNodeByHandle(this.handle);
        const nodeShare = M.getNodeShare(node);

        let items = await M.menuItems().catch(dump);

        const keys = Object.keys(MegaMobileContextMenu.menuItems);

        // add open in app menu
        items['.open-app'] = 1;
        if (items['.download-standart-item']) {
            delete items['.download-standart-item'];
            items['.download-item'] = 1;
        }

        if (nodeShare.down) {
            delete items['.open-app'];
        }

        // check support of download
        if (node) {

            if (node.link) {
                items = Object.create(null);
                items['.open-app'] = 1;
                items['.download-item'] = 1;
            }

            const support = await MegaMobileViewOverlay.checkSupport(node);

            if (!support) {
                delete items['.download-item'];
            }
        }

        if (pfcol) {
            delete items['.getlink-item'];
        }

        // Hide context menu items not needed for undecrypted nodes
        if (missingkeys[this.handle]) {
            delete items['.add-star-item'];
            delete items['.download-item'];
            delete items['.rename-item'];
            delete items['.copy-item'];
            delete items['.move-item'];
            delete items['.getlink-item'];
            delete items['.embedcode-item'];
            delete items['.colour-label-items'];
            delete items['.send-to-contact-item'];
        }
        else if (nodeShare.down) {
            delete items['.copy-item'];
            delete items['.move-item'];
            delete items['.send-to-contact-item'];
        }

        if (is_image3(node) && M.v.filter(is_image3).length > 1) {
            items['.play-slideshow'] = 1;
        }

        // Phase 2
        // if (items['.sh4r1ng-item']) {
        //     // show Manage share or share folder text depending on the status
        //     onIdle(() => M.setContextMenuShareText());
        // }

        if (items['.getlink-item']) {
            // Show the Manage link text if it already has a public link
            onIdle(() => M.setContextMenuGetLinkText());
        }

        // download text
        if (items['.download-item']) {
            mega.ui.contextMenu.getChild('.download-item').text = node.t === 1 ? l[864] : l[58];
        }

        // Set sensitives
        if (items['.add-sensitive-item']) {
            const toHide = items['.add-sensitive-item'] === 1;
            const {domNode} = mega.ui.contextMenu.getChild('.add-sensitive-item');

            mega.sensitives.applyMenuItemStyle(domNode, toHide);
        }

        // This seem text editor context menu
        if (mega.ui.viewerOverlay.mode === 'text') {

            // and contents are changed, need to reset context menu items
            if (mega.ui.viewerOverlay.confirmDiscard) {
                items = {
                    '.open-app': 1,
                    '.save-text': 1,
                    '.download-item': 1,
                };
            }

            // if this is public link, remove save text feature
            if (pfid || dlid || M.currentrootid === M.RubbishID) {
                delete items['.save-text'];
            }
            else {
                items['.save-as-text'] = 1;
            }
        }

        for (let i = keys.length; i--;) {
            const key = keys[i];
            const item = this.domNode.querySelector(key);

            // if the context menu has the key then remove hidden class to show the item
            item.classList[items[key] ? 'remove' : 'add']('hidden');

            // Special feature for label menu in context, showing what current node's label
            if (key === '.colour-label-items') {

                const lblBtn = item.componentSelector('button');

                if (lblBtn) {

                    const lblClass = M.getLabelClassFromId(node.lbl);

                    lblBtn.rightIcon = `mobile colour-label ${lblClass}`;
                    lblBtn.rightIconSize = 16;
                }
            }
        }

        M.safeShowDialog('mobile-context-menu', () => {

            this.sheet.clear();
            this.sheet.addContent(this.domNode);
            this.sheet.showClose = true;

            // duplicate the file/folder node to show it within the context menu dialog
            let itemNode = document.getElementById(this.handle);
            if (!itemNode && mega.ui.viewerOverlay.visible) {
                itemNode = mega.ui.viewerOverlay.nodeComponent.domNode;
            }
            const itemImage = itemNode.querySelector('.fm-item-img');

            const itemInfo = document.createElement('div');
            itemInfo.className = 'fm-item-info';
            itemInfo.append(itemNode.querySelector('.fm-item-name').cloneNode(true));

            if (M.currentdirid !== 'shares' && M.currentdirid !== 'out-shares' && M.currentdirid !== 'public-links') {
                if (node.t === 1) {
                    // folder
                    itemInfo.append(itemNode.querySelector('.num-files').cloneNode(true));
                }
                else if (node.t === 0) {
                    // file
                    itemInfo.append(itemNode.querySelector('.file-size').cloneNode(true));
                }
                else {
                    // File link
                    const numDetails = document.createElement('span');
                    numDetails.className = 'mobile file-size';
                    numDetails.textContent = `${bytesToSize(node.s)}, ${time2date(node.mtime)}`;
                    itemInfo.appendChild(numDetails);
                }
            }
            else {
                // different subtext for the context menu title node in the shared items root page.
                const sharedNode = itemNode.querySelector('.shared-owner');
                let sharedOwner = '';

                if (sharedNode) {
                    // incoming and outgoing shares
                    sharedOwner = sharedNode.cloneNode(true);
                }
                else {
                    // public links
                    sharedOwner = document.createElement('div');
                    sharedOwner.textContent = node.t === 1 ? l.folder_shared_by_me : l.file_shared_by_me;
                    sharedOwner.classList = 'shared-owner';
                }

                itemInfo.append(sharedOwner);
            }

            // title node
            this.sheet.clearTitle();
            this.sheet.titleNode.classList.add('context-menu');
            this.sheet.titleNode.append(itemImage.cloneNode(true), itemInfo);
            const thumbTag = this.sheet.titleNode.querySelector('img'); // remove thumbnails if it has
            if (thumbTag) {
                thumbTag.remove();
            }
            const sourceRoot = M.getNodeRoot(this.handle);
            const rubbishBinElm = this.domNode.querySelector('.context-menu-item.remove-item button');

            if (rubbishBinElm) {
                rubbishBinElm.component.text = sourceRoot === M.RubbishID ?
                    l.delete_permanently : l.move_to_rubbish_bin;
            }

            mega.ui.sheet.name = 'mobile-context-menu';
            mega.ui.sheet.safeShow = true;

            this.sheet.show();
        });
    }
}

mBroadcaster.once('boot_done', () => {
    'use strict';

    MegaMobileContextMenu.menuItems = {
        '.dispute-item': {
            text: l[20185],
            icon: 'sprite-fm-mono icon-alert-triangle',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {

                // Find the first takendown node in the list. This is the item we will use to prefill with.
                localStorage.removeItem('takedownDisputeNodeURL');

                var node = M.getNodeByHandle(nodeHandle);

                if (node.t & M.IS_TAKENDOWN || M.getNodeShare(node).down === 1) {

                    var disputeURL = mega.getPublicNodeExportLink(node);

                    if (disputeURL) {
                        localStorage.setItem('takedownDisputeNodeURL', disputeURL);
                    }
                }
                mega.redirect('mega.io', 'dispute', false, false, false);
            }
        },
        '.save-text': {
            text: l[776],
            icon: 'sprite-mobile-fm-mono icon-file-plus-02-thin-outline',
            subMenu: false,
            classNames: '',
            onClick() {

                document.activeElement.blur();

                if (!validateUserAction()) {
                    return false;
                }

                const vOverlay = mega.ui.viewerOverlay;
                const fileHandle = vOverlay.nodeComponent.handle;

                mega.textEditorUI.save(fileHandle, vOverlay.versionHandle, mega.textEditorUI.editor.getValue())
                    .then(fh => {

                        const handles = mega.textEditorUI.getVersionedHandle(fh);

                        vOverlay.versionHandle = handles[1];
                        vOverlay.setNode(handles[0]);

                        delete vOverlay.confirmDiscard;

                        vOverlay.bottomBar.actions[0].disabled = true;
                    })
                    .catch(tell)
                    .finally(() => {
                        loadingDialog.hide('common');
                    });
            }
        },
        '.save-as-text': {
            text: l[22664],
            icon: 'sprite-mobile-fm-mono icon-files-plus-thin-outline',
            subMenu: false,
            classNames: '',
            onClick() {

                if (!validateUserAction() || mega.ui.viewerOverlay.mode !== 'text') {
                    return false;
                }

                mega.textEditorUI.saveAs();
            }
        },
        '.download-item': {
            text: l[58],
            icon: 'sprite-mobile-fm-mono icon-download-thin',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                const _download = () => {
                    eventlog(99915);
                    mobile.downloadOverlay.startDownload(nodeHandle);
                }

                if (mega.ui.viewerOverlay.confirmDiscard) {
                    return mobile.messageOverlay.show(
                        l[22750],
                        l[22753],
                        'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning',
                        [l[78]],
                        false,
                        true
                    ).then(_download).catch(nop);
                }

                _download();

                M.fmEventLog(500695);
            }
        },
        // Phase 2
        // '.sh4r1ng-item': {
        //     text: l[60],
        //     icon: 'sprite-fm-mono icon-settings-thin-outline',
        //     subMenu: false,
        //     classNames: '',
        //     callback: function() {
        //         // TODO: Update the functionality once the designs are ready
        //         // mega.ui.mShareDialog.init();
        //     }
        // },
        '.removeshare-item': {
            text: l.remove_share,
            icon: 'sprite-mobile-fm-mono icon-folder-minus-02-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function() {
                if (!validateUserAction()) {
                    return false;
                }

                mega.ui.sheet.show({
                    name: 'remove-share-warning',
                    type: 'modal',
                    showClose: true,
                    icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning-icon',
                    title: l.remove_share_title,
                    contents: [l.remove_share_content],
                    actions: [{
                        type: 'normal',
                        text: l.remove_share,
                        onClick: () => {
                            mega.ui.sheet.hide();
                            loadingDialog.show();
                            new mega.Share().removeSharesFromSelected().always(() => loadingDialog.hide());
                        }
                    }]
                });
            }
        },
        '.getlink-item': {
            text: l[5622],
            icon: 'sprite-mobile-fm-mono icon-link-thin-solid',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                mobile.linkManagement.checkCopyRightAndGetLink(nodeHandle);

                M.fmEventLog(500696);
            }
        },
        '.removelink-item': {
            text: l[6821],
            icon: 'sprite-fm-mono icon-link-off-02-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: async function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                eventlog(99850);

                if (mega.config.get('nowarnpl')) {
                    loadingDialog.show();
                    await mobile.linkManagement.manageLink(true, nodeHandle);
                    loadingDialog.hide();
                }
                else {
                    // Display a sheet
                    mega.ui.sheet.show({
                        name: 'remove-link',
                        type: 'modal',
                        showClose: true,
                        icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning-icon',
                        title: l.mobile_remove_node_link_sheet_title,
                        contents: [l.mobile_remove_node_link_sheet_msg],
                        actions: [
                            {
                                type: 'normal',
                                className: 'secondary',
                                text: l.mobile_dont_remove_link_button,
                                onClick: () => {
                                    mega.ui.sheet.hide();
                                }
                            },
                            {
                                type: 'normal',
                                text: l.mobile_remove_link_button,
                                onClick: async() => {
                                    mega.ui.sheet.hide();
                                    loadingDialog.show();
                                    await mobile.linkManagement.manageLink(true, nodeHandle);
                                    loadingDialog.hide();
                                }
                            }
                        ]
                    });
                }

                M.fmEventLog(500697);
            }
        },
        '.file-request-create': {
            text: l.file_request_dropdown_create,
            icon: 'sprite-mobile-fm-mono icon-folder-request-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {

                if (!validateUserAction()) {
                    return false;
                }

                eventlog(99833);

                mobile.fileRequestManagement.showOverlay(nodeHandle);

                return false;
            }
        },
        '.file-request-manage': {
            text: l.file_request_dropdown_manage,
            icon: 'sprite-mobile-fm-mono icon-folder-request-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {

                if (!validateUserAction()) {
                    return false;
                }

                mobile.fileRequestManagement.showOverlay(nodeHandle);

                return false;
            }
        },
        '.file-request-copy-link': {
            text: l.file_request_dropdown_copy,
            icon: 'sprite-mobile-fm-mono icon-url-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                const puPagePublicHandle = mega.fileRequest.storage.getPuHandleByNodeHandle(nodeHandle);

                if (puPagePublicHandle) {
                    const frUrl = mega.fileRequest.generator.generateUrl(puPagePublicHandle.p);

                    copyToClipboard(frUrl, l.file_request_link_copied);
                }

                return null;
            }
        },
        '.file-request-remove': {
            text: l.file_request_dropdown_remove,
            icon: 'sprite-mobile-fm-mono icon-folder-request-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {

                if (!validateUserAction()) {
                    return false;
                }

                if (!nodeHandle) {
                    return false;
                }

                mobile.fileRequestManagement.removeFileRequest(nodeHandle);

                return false;
            }
        },
        '.open-app': {
            text: l.open_in_app,
            icon: 'sprite-mobile-fm-mono icon-mega-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                eventlog(99914);

                goToMobileApp(MegaMobileViewOverlay.getAppLink(nodeHandle));

                M.fmEventLog(500698);
            }
        },
        '.play-slideshow': {
            text: l.album_play_slideshow,
            icon: 'sprite-fm-mono icon-play-square-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: () => {
                $('.media-viewer-container footer .v-btn.slideshow').trigger('click');
            }
        },
        '.move-item': {
            text: l.move_to,
            icon: 'sprite-mobile-fm-mono icon-move-thin-solid',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                mobile.nodeSelector.registerPreviousViewNode();
                mega.ui.viewerOverlay.hide();
                mobile.nodeSelector.show('move', nodeHandle);

                M.fmEventLog(500699);
            }
        },
        '.copy-item': {
            text: l.copy_to,
            icon: 'sprite-mobile-fm-mono icon-square-copy',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                mobile.nodeSelector.registerPreviousViewNode();
                mega.ui.viewerOverlay.hide();
                mobile.nodeSelector.show('copy', nodeHandle);

                M.fmEventLog(500700);
            }
        },
        '.rename-item': {
            text: l[61],
            icon: 'sprite-mobile-fm-mono icon-edit-03-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                // Show the Rename sheet and close the context menu
                if (!mobile.renameNode) {
                    mobile.renameNode = new MobileNodeNameControl({type: 'rename'});
                }
                mobile.renameNode.show(nodeHandle);

                M.fmEventLog(500701);
            }
        },
        '.add-sensitive-item': {
            text: l.sen_hide,
            icon: 'sprite-fm-mono icon-eye-hidden',
            subMenu: false,
            classNames: '',
            onClick: (handle, event) => {
                if (M.isInvalidUserStatus()) {
                    return;
                }

                if (event && event.target.classList.contains('icon-help-circle-thin-outline')) {
                    mega.sensitives.showOnboardingDialog(l.ok_button);
                }
                else {
                    mega.sensitives.toggleStatus($.selected, !M.getNodeByHandle(handle).sen);
                }

                M.fmEventLog(500702);
            }
        },
        '.add-star-item': {
            text: l[5871],
            icon: 'sprite-mobile-fm-mono icon-heart-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                M.favourite($.selected, M.isFavourite(nodeHandle) ^ 1);

                M.fmEventLog(500703);
            }
        },
        '.colour-label-items': {
            text: l[17398],
            icon: 'sprite-mobile-fm-mono icon-label-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function() {
                if (!validateUserAction()) {
                    return false;
                }

                const n = M.d[$.selected];
                const {sheet} = mega.ui;
                const labels = [
                    {parentNode: sheet.contentNode, label: l[16223], value: 1, checked: (n.lbl | 0) === 1},
                    {parentNode: sheet.contentNode, label: l[16224], value: 2, checked: (n.lbl | 0) === 2},
                    {parentNode: sheet.contentNode, label: l[16225], value: 3, checked: (n.lbl | 0) === 3},
                    {parentNode: sheet.contentNode, label: l[16226], value: 4, checked: (n.lbl | 0) === 4},
                    {parentNode: sheet.contentNode, label: l[16227], value: 5, checked: (n.lbl | 0) === 5},
                    {parentNode: sheet.contentNode, label: l[16228], value: 6, checked: (n.lbl | 0) === 6},
                    {parentNode: sheet.contentNode, label: l[16229], value: 7, checked: (n.lbl | 0) === 7}
                ];

                const _setLabel = val => {
                    if (!validateUserAction()) {
                        return false;
                    }

                    M.labeling(n.h, val);
                    sheet.hide();
                };

                const labelGroup = new MegaMobileRadioGroup({
                    name: 'labels',
                    radios: labels,
                    align: 'right',
                    onChange: function() {
                        _setLabel(this.value);
                    }
                });

                sheet.show({
                    name: 'label-selector',
                    showClose: true,
                    title: l[17398],
                    contents: [
                        mCreateElement('div', { class: 'px-6' }, labelGroup.map(c => c.domNode))
                    ],
                    type: 'normal',
                    actions: n.lbl && [{
                        type: 'normal',
                        text: l.remove_label,
                        className: 'secondary',
                        onClick: () => _setLabel()
                    }]
                });

                M.fmEventLog(500704);
            }
        },
        '.properties-item': {
            text: l[6859],
            icon: 'sprite-mobile-fm-mono icon-info-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: (nodeHandle) => {
                mega.ui.viewerOverlay.show(nodeHandle, true);

                M.fmEventLog(500705);
            }
        },
        '.revert-item': {
            text: l[5726],
            icon: 'sprite-mobile-fm-mono icon-rotate-cw-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: async(nodeHandle) => {
                if (!validateUserAction()) {
                    return false;
                }

                const node = M.getNodeByHandle(nodeHandle);
                const restored = await mobile.rubbishBin.restore(nodeHandle).catch(dump);
                const target_keys = restored && typeof restored === 'object' && Object.keys(restored);
                const target = target_keys && target_keys.length ? target_keys[0] : false;

                if (!mobile.cloud.nodeInView(nodeHandle) || target && sharer(target)) {
                    const msg = mega.icu.format(
                        l[`mobile_${node.t ? 'folder' : 'file'}_restored_from_bin`], 1
                    );

                    const nodeParent = node.rr || node.p;

                    // toast message
                    mega.ui.toast.show(
                        msg, 4, l[16797], {
                            actionButtonCallback: () => {
                                M.openFolder(nodeParent)
                                    .finally(() => {
                                        $.selected = [nodeHandle];
                                    });
                                return false;
                            }});
                }
            }
        },
        '.leaveshare-item': {
            text: l[5866],
            icon: 'sprite-mobile-fm-mono icon-log-out-02-thin-solid',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                M.leaveShare(nodeHandle)
                    .catch(ex => {
                        if (ex === EMASTERONLY) {
                            mega.ui.sheet.show({
                                name: 'leave-share-warning',
                                type: 'modal',
                                showClose: true,
                                icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning-icon',
                                title: l.err_bus_sub_leave_share_dlg_title,
                                contents: [parseHTML(l.cannot_leave_share_content)],
                                actions: [{
                                    type: 'normal',
                                    text: l.ok_button,
                                    onClick: () => {
                                        mega.ui.sheet.hide();
                                    }
                                }]
                            });
                        }
                    });
            }
        },
        '.remove-item': {
            text: l.move_to_rubbish_bin,
            icon: 'sprite-mobile-fm-mono icon-trash-thin-outline',
            subMenu: false,
            classNames: '',
            onClick: function(nodeHandle) {
                if (!validateUserAction()) {
                    return false;
                }

                const delog = M.currentrootid !== M.RubbishID;
                fmremove([nodeHandle])
                    .then(() => {
                        if (delog) {
                            eventlog(99638);
                        }
                        M.fmEventLog(500706);
                    })
                    .catch(tell);
            }
        }
    };
});

mBroadcaster.once('fm:initialized', () => {
    'use strict';

    mega.ui.contextMenu = new MegaMobileContextMenu();
});
