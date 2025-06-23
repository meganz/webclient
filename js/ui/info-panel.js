/** @property mega.ui.mInfoPanel */
lazy(mega.ui, 'mInfoPanel', () => {
    'use strict';

    let activeStats;
    function resetStats() {
        activeStats = Object.create(null);
        activeStats.folderCount = 0;
        activeStats.fileCount = 0;
        activeStats.imageCount = 0;
        activeStats.videoCount = 0;
        activeStats.deviceCount = 0;
        activeStats.basicFolderCount = 0;
        activeStats.basicFileCount = 0;
        activeStats.outShareCount = 0;
        activeStats.inShareCount = 0;
        activeStats.takedownCount = 0;
        activeStats.bytes = 0;
        activeStats.subDirs = 0;
        activeStats.subFiles = 0;
        activeStats.deviceFolders = Object.create(null);
        activeStats.devices = Object.create(null);
        activeStats.versionsCount = 0;
        activeStats.versionsCurrBytes = 0;
        activeStats.versionsPrevBytes = 0;
        activeStats.sharesCount = 0;
        activeStats.heartbeat = 0;
    }

    function mimeCountStats(node) {
        if (M.dcd[node.h]) {
            activeStats.deviceCount++;
        }
        else if (typeof node.r === 'number') {
            activeStats.inShareCount++;
        }
        else if (node.t & M.IS_SHARED || M.ps[node.h] || M.getNodeShareUsers(node, 'EXP').length) {
            activeStats.outShareCount++;
        }
        else if (node.t) {
            activeStats.basicFolderCount++;
        }
        else if (is_video(node)) {
            activeStats.videoCount++;
        }
        else if (is_image3(node)) {
            activeStats.imageCount++;
        }
        else {
            activeStats.basicFileCount++;
        }
        if (activeStats.sameMime === undefined) {
            activeStats.sameMime = fileIcon(node);
        }
        else if (activeStats.sameMime && activeStats.sameMime !== fileIcon(node)) {
            activeStats.sameMime = false;
        }
    }

    function deviceCentreStats(node) {
        const dcResolver = (node, { device }) => {
            activeStats.devices[node.h] = device || false;
            const folder = device ? device.folders[node.h] : false;
            activeStats.deviceFolders[node.h] = folder;
            activeStats.heartbeat = (folder && folder.hb || node.hb || {}).ts;
        };
        if (M.onDeviceCenter) {
            dcResolver(node, mega.devices.ui.getCurrentDirData());
        }
        else if (M.getNodeRoot(node.h) === M.InboxID) {
            return mega.devices.ui.getOuterViewData(node.h).then((data) => dcResolver(node, data));
        }
        else {
            activeStats.deviceFolders[node.h] = false;
        }
    }

    function versionStats(selectedNodeHandles, node) {
        if (node.tvf && !mega.inLiteMode) {
            activeStats.versionsCount += node.tvf;
            activeStats.versionsCurrBytes += node.t ? node.tb : node.s;
            activeStats.versionsPrevBytes += node.tvb || 0;
            if (selectedNodeHandles.length === 1) {
                activeStats.bytes += node.tvb || 0;
            }
        }
    }

    /**
     * Get all the node data (so we only look it up once)
     * @param {Array} selectedNodeHandles Array of node handles
     * @returns {Promise<Object>} Returns an array of nodes and array of the original node handles
     */
    async function getAllNodeData(selectedNodeHandles) {
        resetStats();
        const nodes = [];
        const promises = [];
        const handles = [];
        for (let i = selectedNodeHandles.length; i--;) {
            const nodeHandle = selectedNodeHandles[i];
            const node = M.getNodeByHandle(nodeHandle);
            if (node && !(node.h in M.u)) {
                nodes.unshift(node);
                handles.unshift(nodeHandle);
                mimeCountStats(node);
                if (node.t) {
                    activeStats.folderCount++;
                    activeStats.bytes += node.tb;
                }
                else if (node.h in M.dcd) {
                    activeStats.bytes += node.tb;
                }
                else {
                    activeStats.fileCount++;
                    activeStats.bytes += node.s;
                }
                const share = M.getNodeShare(node);
                if (node.t & M.IS_TAKENDOWN || share && share.down === 1) {
                    activeStats.takedownCount++;
                }
                if (node.t || M.dcd[node.h] || node.isDeviceFolder) {
                    activeStats.subDirs += node.td;
                    activeStats.subFiles += node.tf;
                }

                const promise = deviceCentreStats(node);
                if (promise) {
                    promises.push(promise);
                }
                versionStats(selectedNodeHandles, node);
                if (sharer(node)) {
                    activeStats.sharesCount++;
                }
            }
        }
        await Promise.allSettled(promises);
        return { nodes, handles };
    }

    /**
     * For multiple selected nodes, find an icon we can use (especially if all the same type we can use that icon)
     * @param {Array} selectedHandles An array of selected nodes
     * @returns {Object} Returns the class name of the icon e.g. folder/file/inbound-share and optional count for stacks
     */
    function getIconForMultipleNodes(selectedHandles) {

        const totalNodeCount = selectedHandles.length;
        const { deviceCount, basicFolderCount, outShareCount, inShareCount } = activeStats;
        const isFolders = inShareCount + outShareCount + basicFolderCount;

        // If all selected nodes are devices, show the generic device icon
        if (deviceCount === totalNodeCount) {
            return { icon: 'pc' };
        }

        // If all selected nodes are incoming shares, show the incoming share icon
        if (inShareCount === totalNodeCount) {
            return { icon: 'folder-incoming' };
        }

        // If all selected nodes are incoming shares, show the incoming share icon
        if (outShareCount === totalNodeCount) {
            return { icon: 'folder-outgoing' };
        }

        // If all selected nodes are folders, show the folder icon
        if (basicFolderCount === totalNodeCount || isFolders === totalNodeCount) {
            return { icon: 'folder', count: Math.min(totalNodeCount, 2) };
        }

        if (activeStats.sameMime) {
            return { icon: activeStats.sameMime, count: Math.min(totalNodeCount, 3) };
        }
        // Otherwise the default is file for any mix of folders/files or just files
        return { icon: 'generic', count: Math.min(totalNodeCount, 3) };
    }

    /**
     * Scroll to selected element within the current view
     * @param {String} nodeHandle selected node handle
     * @returns {undefined}
     */
    function scrollToNode(nodeHandle) {

        if (!nodeHandle) {
            return;
        }

        var grid = $($.selectddUIgrid);

        if (grid.length && grid.hasClass('ps')) {

            if (M.megaRender && M.megaRender.megaList) {
                delay('infoPanelScroll', () => M.megaRender && M.megaRender.megaList &&
                    M.megaRender.megaList.scrollToItem(nodeHandle), 500);
            }
            else {
                const el = $(`#${nodeHandle}`, $(`${$.selectddUIgrid}:visible`));
                delay('infoPanelScroll', scrollToElement.bind(this, el.closest('.ps'), el), 500);
            }
        }
    }

    function hideTagDescriptionFeature(node) {

        // Hide for S4 nodes
        const isS4 = 'kernel' in s4 && s4.kernel.getS4NodeType(node.h);
        return M.RootID === node.h && !folderlink || isS4 || M.dcd[node.h];
    }

    /**
     * Adding class to media viewer or meeting call is active
     * @returns {undefined}
     */
    function checkCurrentView() {
        document.body.classList.add('info-panel-visible');
        const media = document.querySelector('.media-viewer-container');
        let shouldStretch = false;
        if (media && !media.classList.contains('hidden')) {
            shouldStretch = true;
        }
        if (document.body.classList.contains('in-call')) {
            shouldStretch = true;
        }
        if (shouldStretch) {
            mega.ui.flyout.flyoutMenu.parentNode.classList.add('info-panel-stretch');
        }
        else {
            mega.ui.flyout.flyoutMenu.parentNode.classList.remove('info-panel-stretch');
        }
        if (mega.rewindUi && mega.rewindUi.sidebar.active) {
            mega.rewindUi.sidebar.forceClose();
        }
    }

    class MegaInfoBlock extends MegaComponent {
        constructor(options) {
            super({ ...options, id: undefined });
            if (!options.id || !Object.values(MegaInfoBlock.TYPES).includes(options.id)) {
                if (d) {
                    console.error('MegaInfoBlock invalid type specified', options, options.id);
                }
                return;
            }
            this.addClass('info-panel-block');
            Object.defineProperty(this, 'type', {
                value: options.id,
                writable: false,
            });

            const label = document.createElement('div');
            label.className = 'info-label hidden';
            this.domNode.appendChild(label);

            this.update(options);
        }

        get node() {
            return M.getNodeByHandle(this.handles[0]);
        }

        update(options) {
            this.handles = options.handles;
            const TYPES = MegaInfoBlock.TYPES;
            this.updateLabel();
            this.updateCommon();
            switch (this.type) {
                case TYPES.TAKEDOWN: {
                    this.showTakedown();
                    break;
                }
                case TYPES.PERMISSION: {
                    this.showPermissions();
                    break;
                }
                case TYPES.SHARE_OWNER: {
                    this.users = { userHandles: [this.node.su], useName: true, size: 16 };
                    break;
                }
                case TYPES.SHARE_USERS: {
                    this.users = { userHandles: M.getNodeShareUsers(this.node, 'EXP') };
                    break;
                }
                case TYPES.STATUS: {
                    this.showStatus();
                    break;
                }
                case TYPES.DURATION: {
                    this.showDuration();
                    break;
                }
                case TYPES.TIME_HEARTBEAT: {
                    this.text = time2date(activeStats.heartbeat);
                    break;
                }
                case TYPES.VERSION_COUNT: {
                    this.showVersionCount();
                    break;
                }
                case TYPES.VERSION_CUR_SIZE: {
                    this.text = bytesToSize(activeStats.versionsCurrBytes);
                    break;
                }
                case TYPES.VERSION_PRE_SIZE: {
                    this.text = bytesToSize(activeStats.versionsPrevBytes);
                    break;
                }
            }
        }

        updateCommon() {
            const TYPES = MegaInfoBlock.TYPES;
            switch (this.type) {
                case TYPES.MIME: {
                    this.showMime();
                    break;
                }
                case TYPES.THUMBNAIL: {
                    this.showImage();
                    break;
                }
                case TYPES.NAME: {
                    this.showName();
                    break;
                }
                case TYPES.NODE_TYPE: {
                    this.showType();
                    break;
                }
                case TYPES.PATH: {
                    this.showPath();
                    break;
                }
                case TYPES.BYTE_SIZE: {
                    this.text = bytesToSize(activeStats.bytes);
                    break;
                }
                case TYPES.NODE_SIZE: {
                    this.text = fm_contains(activeStats.subFiles, activeStats.subDirs, false);
                    break;
                }
                case TYPES.TIME_ADDED: {
                    this.text = time2date(this.node.ts);
                    break;
                }
            }
        }

        updateLabel() {
            this.label =
                this.type !== MegaInfoBlock.TYPES.MIME &&
                this.type !== MegaInfoBlock.TYPES.THUMBNAIL &&
                this.type !== MegaInfoBlock.TYPES.TAKEDOWN
                    ? this.type : false;
        }

        set label(label) {
            const labelNode = this.domNode.querySelector('.info-label');
            if (label) {
                labelNode.textContent = label;
                labelNode.classList.remove('hidden');
            }
            else {
                labelNode.textContent = '';
                labelNode.classList.add('hidden');
            }
        }

        showImage() {
            this.showMime();
            getImage(this.node)
                .then(url => {
                    if (url) {
                        this.showMime(true);
                        this.image = url;
                    }
                })
                .catch(nop);
        }

        showName() {
            if (this.handles.length > 1) {
                const { folderCount, fileCount, imageCount, videoCount, deviceCount } = activeStats;
                if (deviceCount === this.handles.length) {
                    this.label = mega.icu.format(l.device_count, deviceCount);
                }
                else if (videoCount === this.handles.length) {
                    this.label = mega.icu.format(l.info_panel_video_count, videoCount);
                }
                else if (imageCount === this.handles.length) {
                    this.label = mega.icu.format(l.info_panel_image_count, imageCount);
                }
                else if (fileCount === this.handles.length) {
                    this.label = mega.icu.format(l.selected_items_count, fileCount);
                }
                else if (folderCount === this.handles.length) {
                    this.label = mega.icu.format(l.selected_folders_count, folderCount);
                }
                else {
                    this.label = fm_contains(fileCount, folderCount, false);
                }
                this.text = '';
                this.addClass('info-block-margin');
            }
            else {
                if (missingkeys[this.node.h]) {
                    this.text = l[8649];
                    showToast('clipboard', M.getUndecryptedLabel(this.node));
                    return;
                }
                this.removeClass('info-block-margin');
                this.text = (this.pathInfo(this.node.h) || this.node).name;
            }
            if (this.handles.length === activeStats.takedownCount) {
                const icon = document.createElement('i');
                icon.className = 'sprite-fm-mono icon-takedown';
                const text = this.domNode.querySelector('.info-text');
                if (text) {
                    text.prepend(icon);
                }
                this.addClass('taken-down');
            }
            else {
                const icon = this.domNode.querySelector('i.icon-takedown');
                if (icon) {
                    icon.remove();
                }
                this.removeClass('taken-down');
            }
        }

        showTakedown() {
            const takedownNode = this.getSubNode('info-takedown');
            if (activeStats.takedownCount === this.handles.length) {
                takedownNode.textContent = activeStats.takedownCount > 1 ?
                    l.items_subject_to_takedown : l.item_subject_to_takedown;
            }
            else {
                takedownNode.remove();
            }
        }

        showType() {
            const deviceFolder = activeStats.deviceFolders[this.node.h];
            if (this.node.t && !deviceFolder) {
                if (this.node.su) {
                    this.text = l.type_inshare;
                    return;
                }
                if (M.getNodeShareUsers(this.node, 'EXP').length) {
                    this.text = l.type_outshare;
                    return;
                }
                this.text = l[1049];
                return;
            }
            this.text = filetype(deviceFolder || this.node, 0);
        }

        showPermissions() {
            const r = M.getNodeRights(this.node.h);
            const iconClass = r === 1 ? 'icon-edit-02-thin-outline' :
                r === 2 ? 'icon-star-thin-outline' : 'icon-eye-reveal1';
            this.badge = `
                <div class="info-badge share-perms">
                    <i class="sprite-fm-mono ${iconClass}"></i>
                    <span>${escapeHTML(r === 1 ? l[56] : r === 2 ? l[57] : l[55])}</span>
                </div>
            `;
        }

        showStatus() {
            const device = M.dcd[this.node.h];
            let status;
            if (device) {
                ({ status } = device);
            }
            else {
                const folder = activeStats.deviceFolders[this.node.h];
                status = folder ? folder.status : false;
            }
            if (status) {
                const itemNode = this.getSubNode('info-badge');
                itemNode.textContent = '';
                const { isDevice } = status;
                const isBackup = !isDevice && M.getNodeRoot(this.node.h) === M.InboxID;
                const statusClass =
                    mega.devices.utils.StatusUI.statusClass(status, !isDevice && !isBackup, isBackup, isDevice);
                itemNode.classList.add(statusClass, 'dc-badge-status');
                mega.devices.utils.StatusUI.get(status)({
                    status,
                    itemNode,
                    iClass: 'dc-status',
                    isDevice: !!device,
                    skipBannerManagement: true,
                });
            }
            else {
                this.badge = false;
            }
        }

        showDuration() {
            const attr = MediaAttribute(this.node);
            if (attr && attr.data) {
                this.text = secondsToTimeShort(attr.data.playtime || 0);
            }
        }

        pathInfo(handle, root, device) {
            let name = M.getNameByHandle(handle);
            let prefix = folderlink ? '/folder/' : '/fm/';
            switch (handle) {
                case mega.devices.rootId: {
                    name = l.device_centre;
                    break;
                }
                case 'shares': {
                    name = l[5542];
                    break;
                }
                default: {
                    if (!name) {
                        name = M.getNodeByHandle(handle).name || l[7381];
                    }
                    if (root) {
                        prefix = `${prefix}${root}/`;
                    }
                    if (device && handle !== device.h) {
                        prefix = `${prefix}${device.h}/`;
                    }
                    if (handle.length === 11) {
                        prefix = '/fm/chat/contacts/';
                    }
                }
            }
            return { name, prefix };
        }

        showPath() {
            const pathNode = this.getSubNode('info-path');
            if (missingkeys[this.node.h]) {
                return;
            }
            let pathItems = M.getPath(this.node.h);
            let root = '';
            let device = false;
            const nr = M.getNodeRoot(this.node.h);
            if (M.onDeviceCenter) {
                pathItems = mega.devices.ui.getFullPath(this.node.h);
                root = mega.devices.rootId;
                device = activeStats.devices[this.node.h];
            }
            else if (nr === M.InboxID) {
                const path = [mega.devices.rootId];
                device = activeStats.devices[this.node.h];
                if (device) {
                    const originalPath = pathItems;
                    const index = originalPath[originalPath.length - 1] === M.InboxID ? 3 : 1;
                    path.unshift(...originalPath.slice(0, -index), device.h);
                }
                root = mega.devices.rootId;
                pathItems = path;
            }
            else if (nr === 's4') {
                pathItems.pop();
            }
            pathItems.shift();
            if (
                nr === 'shares' ||
                M.currentrootid === 'shares' ||
                page.startsWith('fm/search') && M.getNodeSourceRoot(this.node.h, true) === 'shares'
            ) {
                // Remove user from shares paths.
                pathItems.splice(-2, 1);
            }

            if (!pathItems.length) {
                pathNode.remove();
                this.hide();
                return;
            }
            this.show();
            pathNode.textContent = '';
            for (let i = pathItems.length; i--;) {
                const pathItemHandle = pathItems[i];
                const { prefix, name } = this.pathInfo(pathItemHandle, root, device);
                if (name) {
                    MegaLink.factory({
                        parentNode: pathNode,
                        text: name,
                        href: `${prefix}${pathItemHandle}`,
                        type: 'text',
                    });
                    if (i > 0) {
                        const split = document.createElement('i');
                        split.className = 'sprite-fm-mono icon-chevron-right-thin-outline';
                        pathNode.appendChild(split);
                    }
                }
            }
        }

        set text(text) {
            const textNode = this.getSubNode('info-text');
            if (text) {
                textNode.textContent = text;
            }
            else {
                textNode.remove();
            }
        }

        set badge(badgeHtml) {
            const badgeNode = this.getSubNode('info-badge');
            if (badgeHtml) {
                badgeNode.textContent = '';
                badgeNode.appendChild(parseHTML(badgeHtml));
            }
            else {
                badgeNode.remove();
            }
        }

        set users({ userHandles, useName, size }) {
            const usersNode = this.getSubNode('info-users');
            if (userHandles.length) {
                usersNode.classList.add('mega-node', 'user');
                usersNode.classList.remove('overlap');
                usersNode.textContent = '';
                const MAX_AVATARS = 12;
                for (let i = 0; i < userHandles.length; i++) {
                    if (i < MAX_AVATARS) {
                        MegaAvatarComponent.factory({
                            parentNode: usersNode,
                            userHandle: userHandles[i],
                            size: size || 24,
                            simpletip: true,
                        });
                    }
                    else {
                        const wrap = document.createElement('div');
                        wrap.className = `avatar size-${size || 24}`;
                        usersNode.appendChild(wrap);
                        wrap.classList.add('users-count');
                        usersNode.classList.add('overlap');
                        wrap.appendChild(parseHTML(
                            `<div class="color-blank"><span>+${userHandles.length - i}</span></div>`
                        ));
                        useName = false;
                        break;
                    }
                }
                if (useName) {
                    const nameNode = document.createElement('span');
                    nameNode.className = 'info-user-name';
                    nameNode.textContent = M.getNameByHandle(userHandles[0]);
                    usersNode.appendChild(nameNode);
                }
            }
            else {
                usersNode.remove();
            }
        }

        showMime(hide) {
            let mime = '';
            let count = 1;
            if (!hide && this.handles.length === 1) {

                if (activeStats.takedownCount === 1) {
                    mime = 'item-type-icon-90 icon-takedown-90';
                }
                else if (activeStats.deviceFolders[this.node.h]) {
                    const folder = activeStats.deviceFolders[this.node.h];
                    const icon = fileIcon(folder);
                    mime = M.dcd[folder.h] ? `sprite-fm-theme icon-${icon}-filled` :
                        `item-type-icon-90 icon-${icon}-90`;
                }
                else if (this.node.icon) {
                    mime = `sprite-fm-theme icon-${this.node.icon}-filled`;
                }
                else {
                    mime = `item-type-icon-90 icon-${fileIcon(this.node)}-90`;
                }
            }
            else if (!hide) {
                const data = getIconForMultipleNodes(this.handles);
                count = data.count;
                const icon = data.icon;
                mime = this.node.h in M.dcd ?
                    `sprite-fm-theme icon-${icon}-filled` : `item-type-icon-90 icon-${icon}-90`;
            }

            const mimeNode = this.getSubNode('info-mime');
            if (mime) {
                mimeNode.textContent = '';
                const icon = document.createElement('i');
                icon.className = mime;
                if (count > 1) {
                    let stackClass = 'double';
                    const double = document.createElement('i');
                    double.className = mime;
                    icon.appendChild(double);
                    if (count > 2) {
                        stackClass = 'triple';
                        const triple = document.createElement('i');
                        triple.className = `${mime} middle`;
                        double.classList.add('front');
                        icon.appendChild(triple);
                    }
                    icon.classList.add(stackClass);
                }
                mimeNode.appendChild(icon);
            }
            else {
                mimeNode.remove();
            }
        }

        set image(image) {
            const imageNode = this.getSubNode('info-image', 'img');
            if (image) {
                imageNode.src = image;
            }
            else {
                imageNode.remove();
            }
        }

        showVersionCount() {
            const versionLinkNode = this.getSubNode('info-versions');
            versionLinkNode.textContent = '';
            if (this.node.t) {
                // @todo context revamp adds support for multiple nodes on fileversioning.
                versionLinkNode.textContent = mega.icu.format(l.version_count, activeStats.versionsCount);
                return;
            }
            MegaButton.factory({
                parentNode: versionLinkNode,
                text: mega.icu.format(l.version_count, activeStats.versionsCount),
                type: 'text',
                onClick: () => {
                    if (M.currentrootid !== M.RubbishID) {
                        // If the slideshow is currently showing,
                        // hide it otherwise the file versioning dialog won't appear
                        if (slideshowid) {
                            slideshow(this.node.h, 1);
                            checkCurrentView();
                        }
                        fileversioning.fileVersioningDialog(this.node.h);
                    }
                }
            });
        }
    }

    MegaInfoBlock.TYPES = freeze({
        MIME: 'mime',
        THUMBNAIL: 'thumbnail',
        NAME: l.info_panel_name,
        TAKEDOWN: 'takedown',
        NODE_TYPE: l[93],
        PERMISSION: l[5906],
        SHARE_OWNER: l[5905],
        SHARE_USERS: l[1036],
        STATUS: l[89],
        DURATION: l.duration,
        PATH: l.file_location_label,
        BYTE_SIZE: l.info_panel_total_size,
        NODE_SIZE: l.info_panel_contains,
        TIME_ADDED: l.info_panel_date_added,
        TIME_HEARTBEAT: l.last_updated_label,
        VERSION_COUNT: l.info_panel_versions,
        VERSION_CUR_SIZE: l.info_panel_current_version,
        VERSION_PRE_SIZE: l.info_panel_previous_version,
        DESCRIPTION: l.info_panel_description,
        TAGS: l.info_panel_tags,
    });

    function isReadOnly(node) {
        return node && M.getNodeRights(node.h) < 2 || M.currentrootid === M.RubbishID ||
            folderlink || M.getNodeRoot(node.h) === M.InboxID || node.ch ||
            !u_handle || M.getNodeRoot(node.h) === M.RubbishID;
    }

    async function busUI() {
        await M.require('businessAcc_js', 'businessAccUI_js');
        return new BusinessAccountUI();
    }

    const isLetterOrNumber = new RegExp('^[\\d\\p{L}\\p{M}]+$', 'u');
    const isExpired = () => {
        return u_attr &&
            (
                u_attr.pf && u_attr.pf.s === pro.ACCOUNT_STATUS_EXPIRED ||
                u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED
            );
    };

    class MegaInfoInputBlock extends MegaComponent {
        constructor(options) {
            super({ ...options, id: undefined });
            if (
                !options.id ||
                options.id !== MegaInfoBlock.TYPES.DESCRIPTION && options.id !== MegaInfoBlock.TYPES.TAGS
            ) {
                if (d) {
                    console.error('MegaInfoInputBlock invalid type specified', options, options.id);
                }
                return;
            }
            this.addClass('info-panel-block');
            Object.defineProperty(this, 'type', {
                value: options.id,
                writable: false,
            });

            const label = document.createElement('div');
            label.className = 'info-label';
            this.domNode.appendChild(label);

            let subtext = '';
            if (this.type === MegaInfoBlock.TYPES.DESCRIPTION) {
                const maxLength = 300;
                this.input = new MegaTextArea({
                    parentNode: this.domNode,
                    placeholder: l.info_panel_description_add,
                    maxLength,
                });
                subtext = l.info_panel_text_count.replace('%1', 0).replace('%2', maxLength);
            }
            else {
                this.input = new MegaInputComponent({
                    parentNode: this.domNode,
                    placeholder: l.info_panel_tags_placeholder,
                    wrapperClasses: 'tags-input',
                });
                this.dropdown = document.createElement('div');
                this.dropdown.className = 'info-tags-dropdown';
                this.Ps = new PerfectScrollbar(this.dropdown);
                this.tagHolder = document.createElement('div');
                this.tagHolder.className = 'info-tags-holder';
                this.domNode.appendChild(this.tagHolder);
            }
            this.subtext = document.createElement('div');
            this.subtext.className = 'info-input-subtext';
            this.subtext.textContent = subtext;
            this.domNode.appendChild(this.subtext);

            this.input.on('input.infoPane', () => {
                if (this.type === MegaInfoBlock.TYPES.DESCRIPTION) {
                    this.handleDescriptionChange();
                    mega.ui.flyout.updateScroll(mega.ui.mInfoPanel.flyoutName);
                }
                else if (this.type === MegaInfoBlock.TYPES.TAGS) {
                    this.handleTagsChange();
                }
            });
            this.input.on('keydown.infoPane', (ev) => {
                if (this.type === MegaInfoBlock.TYPES.DESCRIPTION) {
                    this.handleDescriptionKeydown(ev);
                }
                else if (this.type === MegaInfoBlock.TYPES.TAGS) {
                    this.handleTagsKeydown(ev);
                }
            });
            this.input.on('focusin.infoPane', (ev) => {
                this.input.addClass('active');
                if (this.type === MegaInfoBlock.TYPES.DESCRIPTION) {
                    this.handleDescriptionFocus();
                }
                else if (this.type === MegaInfoBlock.TYPES.TAGS) {
                    this.handleTagsFocus(ev);
                }
            });
            this.input.on('focusout.infoPane', (ev) => {
                this.input.removeClass('active');
                if (this.type === MegaInfoBlock.TYPES.DESCRIPTION) {
                    this.updateDescription();
                }
                else if (this.type === MegaInfoBlock.TYPES.TAGS) {
                    this.handleTagsBlur(ev);
                }
            });

            this.update(options);
        }

        update(options) {
            this.handles = options.handles;
            this.node = M.getNodeByHandle(options.handles[0]);
            const labelNode = this.domNode.querySelector('.info-label');
            labelNode.textContent = this.type;

            if (this.type === MegaInfoBlock.TYPES.DESCRIPTION) {
                this.updateTypeDescription(options);
            }
            else if (this.type === MegaInfoBlock.TYPES.TAGS) {
                this.updateTypeTags(options);
            }
            if (options.optional) {
                const optional = document.createElement('span');
                optional.className = 'label-tag-optional';
                optional.textContent = l[7347];
                labelNode.appendChild(optional);
            }
        }

        updateTypeDescription(options) {
            const root = M.getNodeRoot(this.node.h);
            const val = this.node.des || '';
            this.input.value = val;
            if (
                root === M.InboxID ||
                root === M.RubbishID ||
                M.getNodeRights(this.node.h) < 2 ||
                M.currentrootid === M.RubbishID ||
                folderlink ||
                this.node.ch
            ) {
                this.input.disabled = true;
                this.input.placeholder = l.info_panel_description_empty;
                this.subtext.textContent = l[55];
                this.subtext.classList.add('read-only');
                delete options.optional;
            }
            else {
                this.input.disabled = false;
                this.input.placeholder = l.info_panel_description_add;
                this.subtext.textContent =
                    l.info_panel_text_count.replace('%1', val.length).replace('%2', this.input.maxLength);
                this.subtext.classList.remove('read-only');
            }
            if (isExpired()) {
                delete options.optional;
                this.input.disabled = true;
                this.input.placeholder = l.info_panel_description_empty;
            }
        }

        updateTypeTags(options) {
            this.tagHolder.textContent = '';
            if (this.tagsPromise) {
                return;
            }
            const expiredAcc = isExpired();
            this.readOnly = expiredAcc || this.handles.some(h => isReadOnly(M.getNodeByHandle(h)));
            if (!this.readOnly && !mega.ui.mInfoPanel.tagsDB.t) {
                this.tagsPromise = mega.ui.mInfoPanel.tagsDB.init().always(() => {
                    delete this.tagsPromise;
                    this.update(options);
                });
                return;
            }
            this.tags = [];
            if (this.handles.length > 1) {
                for (let i = this.handles.length; i--;) {
                    const node = M.getNodeByHandle(this.handles[i]);
                    const { tags } = node;
                    if (!tags || tags.length === 0) {
                        this.tags = [];
                        break;
                    }
                    this.tags = this.tags.length ? this.tags.filter(a => tags.includes(a)) : tags;
                    if (this.tags.length === 0) {
                        break;
                    }
                }
            }
            else if (this.node.tags && this.node.tags.length) {
                this.tags.push(...this.node.tags);
            }

            let subtext = '';
            if (this.readOnly) {
                if (expiredAcc) {
                    this.input.show();
                    this.input.disabled = true;
                }
                else {
                    this.input.hide();
                    this.input.disabled = false;
                }
                if (!this.tags.length) {
                    subtext = l.info_panel_tags_empty;
                }
                delete options.optional;
            }
            else {
                this.input.show();
            }
            if (subtext) {
                this.subtext.textContent = subtext;
                this.subtext.classList.add('read-only');
                this.subtext.classList.remove('hidden');
            }
            else {
                this.subtext.textContent = '';
                this.subtext.classList.add('hidden');
                this.subtext.classList.remove('read-only');
            }
            this.off('click.infoPaneExp');
            if (expiredAcc) {
                this.on('click.infoPaneExp', () => {
                    busUI().then(ui => {
                        const isMaster = u_attr.b && u_attr.b.m || u_attr.pf;
                        return ui.showExpiredDialog(isMaster);
                    });
                });
            }
            this.prepareTags();
        }

        prepareTags() {
            if (!this.tags.length) {
                return;
            }
            for (let i = this.tags.length; i--;) {
                const tag = this.tags[i];
                const tagNode = document.createElement('div');
                tagNode.className = 'info-tag';
                tagNode.appendChild(parseHTML(`<span>#${escapeHTML(tag)}</span`));
                if (!this.readOnly) {
                    const icon = document.createElement('i');
                    icon.className = 'sprite-fm-mono icon-dialog-close';
                    tagNode.appendChild(icon);
                    icon.addEventListener('click', () => {
                        this.removeTag(tag);
                    });
                }
                this.tagHolder.appendChild(tagNode);
            }
        }

        handleDescriptionChange() {
            let value = this.input.value || '';
            if (value.trim() === '' && this.input.value !== '') {
                this.input.value = '';
                value = '';
            }
            this.subtext.textContent =
                l.info_panel_text_count.replace('%1', value.length).replace('%2', this.input.maxLength);
        }

        handleDescriptionKeydown(ev) {
            ev.stopPropagation();
            ev = ev.originalEvent;
            const key = ev.keyCode || ev.which;
            if (key === 13 && !ev.shiftKey && !ev.ctrlKey && !ev.altKey) {
                this.updateDescription();
            }
        }

        handleDescriptionFocus() {
            this.input.spellcheck = true;
            eventlog(mega.flags.ab_ndes ? 500250 : 500251);
        }

        updateDescription() {
            this.input.spellcheck = false;
            const value = (this.input.value || '').trim();
            if (value !== this.input.value) {
                return;
            }
            const prev = this.node.des || '';
            if (value !== prev && value.length <= 300 && document.hasFocus()) {
                M.setNodeDescription(this.node.h, value)
                    .then(() => {
                        if (prev === '') {
                            showToast('info', l.info_panel_description_added);
                            eventlog(mega.flags.ab_ndes ? 500252 : 500253);
                        }
                        else {
                            showToast('info', l.info_panel_description_updated);
                        }
                    })
                    .catch(dump);
            }
        }

        handleTagsChange(isFocus) {
            if (!this.dropdownTopButton) {
                this.dropdownTopButton = new MegaButton({
                    parentNode: this.dropdown,
                    componentClassname: 'info-tags-dropdown-button add-button',
                    type: 'text',
                    text: '#',
                    onClick: (ev) => {
                        const { value } = this.input;
                        let tag = value.toLowerCase().replace(/^#*/, '');
                        if (this.validateTag(tag)) {
                            this.updateTags(tag);
                            eventlog(500307);
                        }
                        else {
                            // Invalid input data so try the last known good value if one exists
                            const curr = ev.currentTarget.domNode.querySelector('b');
                            if (curr && curr.textContent) {
                                tag = curr.textContent.toLowerCase().replace(/^#*/, '');
                                if (this.validateTag(tag)) {
                                    this.updateTags(tag);
                                    eventlog(500307);
                                }
                            }
                        }
                    }
                });
                this.dropdownText = document.createElement('div');
                this.dropdownText.className = 'info-tag-prompt hidden';
                this.dropdownText.textContent = l.info_panel_tags_help;
                this.dropdown.appendChild(this.dropdownText);
                this.dropdownDivider = document.createElement('hr');
                this.dropdownDivider.className = 'hidden';
                this.dropdown.appendChild(this.dropdownDivider);
            }
            const { value } = this.input;
            const lower = value.toLowerCase();
            if (lower !== value) {
                this.input.value = lower;
                return;
            }
            if (value === '' && document.activeElement && this.domNode.contains(document.activeElement)) {
                this.input.value = '#';
                return;
            }
            const hashless = value.replace(/^#*/, '');
            if (!isFocus && !this.validateTag(value)) {
                if (value !== hashless) {
                    this.input.value = hashless;
                }
                return;
            }
            if (isFocus && !this.validateTag(hashless)) {
                return;
            }
            const suggests = this.dropdown.componentSelectorAll('.suggest-button');
            for (const btn of suggests) {
                btn.destroy();
            }
            this.dropdownDivider.classList.add('hidden');
            if (hashless) {
                this.dropdownTopButton.show();
                const text = this.dropdownTopButton.domNode.querySelector('.primary-text');
                text.textContent = '';
                const existingTags = new Set(mega.ui.mInfoPanel.tagsDB.t.keys());
                for (const tag of this.tags) {
                    if (existingTags.has(tag)) {
                        existingTags.delete(tag);
                    }
                }
                const arr = Array.from(existingTags);
                arr.sort((a, b) =>  M.compareStrings(a, b, -1));
                for (const tag of arr) {
                    if (tag.includes(hashless)) {
                        this.dropdownDivider.classList.remove('hidden');
                        MegaButton.factory({
                            parentNode: this.dropdown,
                            componentClassname: 'info-tags-dropdown-button suggest-button',
                            type: 'text',
                            text: `#${tag}`,
                            onClick: () => {
                                if (this.validateTag(tag)) {
                                    this.updateTags(tag);
                                }
                            }
                        });
                    }
                }
                text.appendChild(
                    parseHTML(l.info_panel_tags_create_btn.replace('%s', escapeHTML(hashless)))
                );
                this.dropdownText.classList.add('hidden');
            }
            else {
                this.dropdownTopButton.hide();
                this.dropdownText.classList.remove('hidden');
            }
            mega.ui.menu.calcPosition();
            this.Ps.update();
        }

        handleTagsFocus(event) {
            if (this.readOnly) {
                return;
            }
            if (this.input.value === '') {
                this.error = false;
                this.input.value = '#';
            }
            this.handleTagsChange(true);
            eventlog(500306);
            mega.ui.menu.show({
                name: 'info-tags-menu',
                classList: ['info-tags-menu'],
                event,
                eventTarget: event.currentTarget,
                contents: [this.dropdown],
            });
            this.tagMenuShown = true;
        }

        handleTagsBlur(ev) {
            if (mega.ui.menu.domNode.contains(ev.originalEvent.relatedTarget)) {
                return;
            }
            if (this.input.value === '#') {
                this.input.value = '';
            }
            mega.ui.menu.hide();
            this.tagMenuShown = false;
        }

        handleTagsKeydown(ev) {
            ev.stopPropagation();
            ev = ev.originalEvent;
            const key = ev.keyCode || ev.which;
            if (key === 13 && !ev.shiftKey && !ev.ctrlKey && !ev.altKey) {
                const { value } = this.input;
                const tag = value.toLowerCase().replace(/^#*/, '');
                if (this.validateTag(tag)) {
                    this.updateTags(tag);
                }
                this.input.blur();
                return;
            }
            if (!this.tagMenuShown) {
                this.handleTagsFocus(mega.ui.menu.event);
            }
        }

        validateTag(tag) {
            if (tag === '#') {
                return true;
            }
            const cleanTag = tag.replace(/^#*/, '');
            if (cleanTag && cleanTag !== '') {
                // Check the validity of the tag string
                // \p{L} - any kind of letter from any language
                // \p{M} - a character intended to be combined with another character
                // \d - digits
                if (!isLetterOrNumber.test(cleanTag)) {
                    // Invalid character for tags error message is shown
                    eventlog(500309);
                    this.error = l.info_panel_tags_error_invalid_char;
                }
                else if (cleanTag.length > 32) {
                    // Invalid character for tags error message is shown
                    eventlog(500308);
                    this.error = l.info_panel_tags_error_maxchar;
                }
                else if (this.handles.every(h => {
                    const node = M.getNodeByHandle(h);
                    if (!node.tags) {
                        return false;
                    }
                    return node.tags.length === 10;
                })) {
                    // Too many tags
                    eventlog(500310);
                    this.error = l.info_panel_tags_error_max_tag;
                }
                else if (this.tags.length && this.tags.includes(tag)) {
                    this.error = l.info_panel_tags_error_exist;
                }
                else {
                    this.error = '';
                    return true;
                }
            }
            return false;
        }

        updateTags(tag) {
            if (tag && !this.readOnly) {
                if (this.tags.includes(tag)) {
                    this.input.value = '';
                    return;
                }
                this.input.disabled = true;
                M.setNodeTag(this.handles.map(h => {
                    const n = M.getNodeByHandle(h);
                    if (n && (!n.tags || n.tags.length < 10)) {
                        return n;
                    }
                    return false;
                }).filter(Boolean), tag).then(() => {
                    this.input.disabled = false;
                    this.input.value = '';
                }).catch(tell);
                mega.ui.mInfoPanel.tagsDB.set(tag, this.handles);
            }
        }

        removeTag(tag) {
            const doRemove = () => {
                mega.ui.mInfoPanel.tagsDB.set(tag, this.handles, true);
                this.input.value = '';
                return M.setNodeTag(this.handles.map(h => M.getNodeByHandle(h)), tag, true).catch(tell);
            };
            if (!is_mobile && u_attr && (u_attr.b || u_attr.pf)) {
                busUI().then(ui => {
                    if (isExpired()) {
                        let msg = '';

                        // If Business master account or Pro Flexi
                        if (u_attr.b && u_attr.b.m) {
                            msg = l[24431];
                        }
                        else if (u_attr.pf) {
                            msg = l.pro_flexi_expired_banner;
                        }
                        else {
                            // Otherwise Business sub-user
                            msg = l[20462];
                        }

                        $('.fm-notification-block.expired-business', 'body').safeHTML(`<span>${msg}</span>`)
                            .addClass('visible');
                        clickURLs();

                        const isMaster = u_attr.b && u_attr.b.m || u_attr.pf;
                        return ui.showExpiredDialog(isMaster);
                    }
                    doRemove();
                });
            }
            else {
                doRemove();
            }
        }

        set error(message) {
            let errorNode = this.domNode.querySelector('.error-text');
            if (!errorNode) {
                errorNode = document.createElement('div');
                errorNode.className = 'error-wrap';
                const icon = document.createElement('i');
                icon.className = 'sprite-fm-mono icon-alert-triangle-thin-outline';
                errorNode.appendChild(icon);
                this.input.domNode.after(errorNode);
                const errorText = document.createElement('div');
                errorText.className = 'error-text';
                errorNode.appendChild(errorText);
                errorNode = errorText;
            }
            if (message) {
                errorNode.textContent = message;
                errorNode.parentNode.classList.remove('hidden');
                this.input.error = ' ';
                mega.ui.menu.hide();
                this.tagMenuShown = false;
            }
            else {
                errorNode.parentNode.classList.add('hidden');
                this.input.error = '';
            }
        }
    }

    function hasThumbnail(node) {
        const nodeIcon = fileIcon(node);
        return ['image', 'video', 'raw', 'photoshop', 'vector'].includes(nodeIcon) &&
            (is_image3(node) || nodeIcon === 'video' && M.isGalleryVideo(node));
    }

    function singleSelectBlocks(blockSet, node, isTakenDown) {
        const TYPES = MegaInfoBlock.TYPES;
        if (!isTakenDown && hasThumbnail(node)) {
            blockSet.add(TYPES.THUMBNAIL);
        }
        else {
            blockSet.add(TYPES.MIME);
        }

        const deviceFolder = activeStats.deviceFolders[node.h] || M.dcd[node.h];
        if (deviceFolder) {
            blockSet.add(TYPES.STATUS);
        }
        else {
            blockSet.add(TYPES.NODE_TYPE);
        }
        if (node.su) {
            blockSet.add(TYPES.PERMISSION);
            blockSet.add(TYPES.SHARE_OWNER);
        }
        else if (M.getNodeShareUsers(node, 'EXP').length) {
            blockSet.add(TYPES.SHARE_USERS);
        }
        if (node.h !== M.RootID && node.h !== M.RubbishID) {
            blockSet.add(TYPES.PATH);
        }
        if (node.ts) {
            blockSet.add(TYPES.TIME_ADDED);
        }
        if (node.tvf && !mega.inLiteMode) {
            blockSet.add(TYPES.VERSION_COUNT);
            blockSet.add(TYPES.VERSION_CUR_SIZE);
            blockSet.add(TYPES.VERSION_PRE_SIZE);
        }
        if (node.t === 1 || deviceFolder) {
            blockSet.add(TYPES.NODE_SIZE);
        }
        if (M.isGalleryVideo(node)) {
            blockSet.add(TYPES.DURATION);
        }
        if (activeStats.heartbeat) {
            blockSet.add(TYPES.TIME_HEARTBEAT);
        }
    }

    function finaliseBlocks(blockSet, handles, nodes, node) {
        const TYPES = MegaInfoBlock.TYPES;
        const blocks = [];
        for (const value of Object.values(TYPES)) {
            if (blockSet.has(value)) {
                blocks.push({
                    handles,
                    itemComp: 'infoBlock',
                    id: value,
                });
            }
        }
        if (!hideTagDescriptionFeature(node)) {
            if (nodes.length === 1) {
                blocks[mega.flags.ab_ndes ? 'unshift' : 'push']({
                    handles,
                    itemComp: 'infoInputBlock',
                    optional: true,
                    id: TYPES.DESCRIPTION,
                });
            }
            if (M.currentrootid !== 'shares' && activeStats.sharesCount === 0) {
                blocks.push({
                    handles,
                    itemComp: 'infoInputBlock',
                    optional: true,
                    id: TYPES.TAGS,
                });
            }
        }
        return blocks;
    }

    // Public API
    return freeze({
        flyoutName: 'info',

        show(handles) {
            if (delay.has('infoPanel')) {
                delay.cancel('infoPanel');
            }
            if (delay.has('infoPanelsc')) {
                delay.cancel('infoPanelsc');
            }
            handles = handles || [];
            const toResize = !mega.ui.flyout.name;
            mega.ui.flyout.showInfoFlyout(handles);
            if (toResize) {
                $.tresizer();
            }
            scrollToNode(handles[0]);
        },

        hide() {
            if (this.isOpen()) {
                mega.ui.flyout.hide();
            }
            activeStats = Object.create(null);
        },

        /**
         * Re-render the contents of the Info panel if they selected a new node/s while the panel is already open
         * @param {Array} selectedNodes An array of the handles that are selected in the UI (e.g. call with $.selected)
         * @returns {void} void
         */
        reRenderIfVisible(selectedNodes) {
            // If it's already visible, render the selected node information (no need for resizes etc)
            if (this.isOpen()) {
                this.show(selectedNodes);
            }
        },

        eventuallyUpdateSelected() {
            delay('infoPanel', () => {
                if (!this.isOpen()) {
                    return;
                }
                const id = String(M.currentdirid || '').split('/').pop();
                this.show($.selected.length ? $.selected : id ? [id] : []);
            });
        },

        smartEventuallyUpdate() {
            delay('infoPanelsc', () => {
                if (!this.isOpen()) {
                    return;
                }
                if (!M.chat && $.selected && $.selected.length) {
                    return this.show($.selected);
                }

                const exist = mega.ui.flyout.flyoutMenu.domNode.componentSelector('.info-panel-block');
                const toShow = [];
                if (exist && exist.handles) {
                    for (const handle of exist.handles) {
                        const node = M.getNodeByHandle(handle);
                        if (node.t) {
                            toShow.push(handle);
                        }
                        else {
                            let newHandle = node.h;
                            while (M.d[newHandle] && M.d[M.d[newHandle].p]) {
                                if (M.d[M.d[newHandle].p].t !== 0) {
                                    break;
                                }

                                newHandle = M.d[newHandle].p;
                            }
                            toShow.push(newHandle);
                        }
                    }
                }
                return this.show(toShow);
            });
        },

        /**
         * Check info panel if it's currently visible
         * @returns {Boolean} is panel open
         */
        isOpen() {
            return mega.ui.flyoutInit && mega.ui.flyout.name === this.flyoutName;
        },

        tagsDB: {
            t: false,
            /**
             * Update Tags DB
             * @param {MegaNode} oldattr Old node attribute
             * @param {MegaNode} node Updated
             * @returns {undefined}
             */
            update(oldattr, node) {
                const diff = array.diff(oldattr.tags || [], node.tags || []);
                if (diff.added.length) {
                    this.set(diff.added[0], [node.h]);
                }
                if (diff.removed.length) {
                    this.set(diff.removed[0], [node.h], true);
                }
            },
            /**
             * Add / Remove tag from the memory
             * @param {String} tag tag text
             * @param {Array} handles array of node handles
             * @param {Boolean} isRemove is delete process
             * @returns {undefined}
             */
            set(tag, handles, isRemove) {
                if (isRemove) {
                    const tagSet = this.t.get(tag);
                    if (handles && tagSet) {
                        for (let i = 0; i < handles.length; i++) {
                            tagSet.delete(handles[i]);
                            if (tagSet.size === 0) {
                                this.t.delete(tag);
                            }
                        }
                    }
                }
                else {
                    for (let i = 0; i < handles.length; i++) {
                        this.t.set(tag, handles[i]);
                    }
                }
            },
            async init() {
                if (!this.t) {
                    this.t = new MapSet();
                    return fmdb.get('f')
                        .then(nodes => {
                            for (let i = nodes.length; i--;) {
                                const n = nodes[i];
                                if (n.tags) {
                                    for (let j = n.tags.length; j--;) {
                                        this.t.set(n.tags[j], n.h);
                                    }
                                }
                            }

                        });
                }
            }
        },

        async getBlocks(handles) {
            const res = await getAllNodeData(handles).catch(ex => {
                activeStats = Object.create(null);
                throw ex;
            });
            const { nodes } = res;
            if (!nodes.length) {
                return false;
            }
            const blockSet = new Set();
            const TYPES = MegaInfoBlock.TYPES;
            const node = nodes[0];
            const isTakenDown = nodes.length === activeStats.takedownCount;
            blockSet.add(TYPES.NAME);
            blockSet.add(TYPES.BYTE_SIZE);
            if (nodes.length === 1) {
                singleSelectBlocks(blockSet, node, isTakenDown);
            }
            else {
                if (activeStats.folderCount === 1) {
                    blockSet.add(TYPES.NODE_SIZE);
                }
                blockSet.add(TYPES.MIME);
            }
            if (isTakenDown) {
                blockSet.add(TYPES.TAKEDOWN);
            }
            return finaliseBlocks(blockSet, res.handles, nodes, node);
        },

        renderCb() {
            activeStats = Object.create(null);
            checkCurrentView();
        },

        cleanup() {
            document.body.classList.remove('info-panel-visible');
            mega.ui.flyout.flyoutMenu.domNode.parentNode.classList.remove('info-panel-stretch');
        },

        MegaInfoBlock,
        MegaInfoInputBlock,
    });
});
