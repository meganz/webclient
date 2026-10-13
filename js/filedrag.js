(function(scope) {
    'use strict';

    const optionReference = {
        touchedElement: 0,
        fileRequestEnabled: false,
        addOverlay: addOverlay,
        removeOverlay: removeOverlay
    };

    /**
     * Returns the current chat room that can accept an upload.
     *
     * @returns {Object|false} The current room, or false
     */
    function chatRoom() {
        return M.chat && window.megaChatIsReady && megaChat.getCurrentRoom() || false;
    }

    /**
     * Returns the fallback destination name
     *
     * @returns {String} The destination name, unescaped
     */
    function fallbackName() {
        return folderlink && M.getNameByHandle(M.RootID) || l[164];
    }

    function pathInfo() {
        if (optionReference.fileRequestEnabled) {
            return 'nop';
        }
        const room = chatRoom();

        if (room) {
            return megaChat.html(room.getRoomTitle());
        }
        if (M.isGalleryPage()) {
            return escapeHTML(l.photos_timeline);
        }
        if (M.albums) {
            const target = mega.gallery.albums.getUploadTarget();
            if (target) {
                return escapeHTML(`${l.albums} > ${mega.gallery.albums.store[target].label}`);
            }
            return escapeHTML(l.albums);
        }
        if (isRestrictedSection()) {
            return escapeHTML(fallbackName());
        }
        const name = (handle) => {
            switch (handle) {
                case mega.devices.rootId:
                    return l.device_centre;
                case 'shares':
                    return l[5542];
                case 'out-shares':
                    return l[5543];
                case 's4':
                    return '';
                default:
                    if (M.dcd[handle]) {
                        return M.dcd[handle].name || l[7381];
                    }
                    return M.getNameByHandle(handle) || fallbackName();
            }
        };
        const id = M.currentCustomView ? M.currentCustomView.nodeID
            : String(M.currentdirid).split('/').pop();
        const path = [];
        let data = M.getPath(id);
        if (M.onDeviceCenter) {
            data = mega.devices.ui.getFolderChildrenPath(data);
        }
        for (let i = data.length; i--;) {
            const crumb = name(data[i]);
            if (crumb) {
                path.push(escapeHTML(crumb));
            }
        }
        if (path.length > 4) {
            path.splice(1, path.length - 3, '...');
        }
        return path.join(' > ') || escapeHTML(fallbackName());
    }
    const blockSelector = [
        '.files-grid-view',
        '.fm-blocks-view',
        '.meetings-call',
        '.messages-block',
        '.gallery-view',
        '#albums-view',
        '.device-centre-grid-view',
        '.fm-recents:not(.emptied) .fm-recents.scroll',
        '.s4-grid-view',
        '.empty-state:not(.meetings-alert)',
        '.file-request-upload-page .content-upload-block',
        '.fm-empty-section',
        '.contacts-list',
        '.shared-grid-view',
        '.shared-blocks-view',
        '.out-shared-grid-view',
        '.conversations-empty',
    ].join(',');

    function addOverlay() {
        if (is_mobile && optionReference.fileRequestEnabled) {
            return;
        }
        const $overlay = $('.drag-n-drop.overlay');
        const isDialogOpen = document.body.classList.contains('overlayed')
            || document.documentElement.classList.contains('overlayed');
        const $block = isDialogOpen ? $() : $(blockSelector)
            .filter((i, el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
        const setOverlaySize = () => {
            if ($block.length) {
                const { height, left, width, top } = $block[0].getBoundingClientRect();
                if (optionReference.fileRequestEnabled) {
                    $overlay[0].style.setProperty('--fdbleft', `${left}px`);
                    $overlay[0].style.setProperty('--fdbtop', `${top}px`);
                    $overlay.addClass('fr-offset').width(width).height(height);
                    return;
                }

                // Limit the height to the visible part of the block
                const onScreen = Math.min(top + height, document.documentElement.clientHeight)
                    - Math.max(top, 0);

                $overlay.removeClass('chat-offset fr-offset');
                if (M.chat && $block.parent('.with-pane').length) {
                    $overlay.addClass('chat-offset');
                    $overlay.height(onScreen - 32);
                }
                else if (
                    M.currentCustomView && M.currentCustomView.type === 's4' ||
                    M.onDeviceCenter && mega.devices.ui.isCustomRender()
                ) {
                    $overlay.height(onScreen - 32);
                }
                else {
                    $overlay.height(onScreen - 20);
                }
                $overlay.toggleClass('flyout-offset', !!(mega.ui && mega.ui.flyout && mega.ui.flyout.name));
                const maxWidth = $overlay[0].getBoundingClientRect().right - left - 16;

                if (width > 0 && maxWidth > 0) {
                    $overlay.width(Math.min(width - 32, maxWidth));
                }
            }
            else {
                const { width, height } = document.body.getBoundingClientRect();
                $overlay.width(width - 32);
                $overlay.height(height - 32);
                $overlay.removeClass('flyout-offset chat-offset fr-offset');
            }
        };
        $overlay.removeClass('hidden');
        requestAnimationFrame(() => setOverlaySize());
        $(window).rebind('resize.filedrag', setOverlaySize);
        let hasItems = M.v && M.v.length;
        if (M.albums) {
            const { albums, albumIsRenderable } = mega.gallery;
            const album = albums.store[mega.gallery.getAlbumIdFromPath()];
            hasItems = album
                ? !album.filterFn && album.nodes && album.nodes.length
                : Object.values(albums.store).some(albumIsRenderable);
        }
        if (optionReference.fileRequestEnabled) {
            hasItems = mega.fileRequestUpload.uploadPage.queue.total;
        }
        $overlay.toggleClass('transparent-overlay', !!(hasItems || M.chat));
        $('.crumb', $overlay).safeHTML(pathInfo());
    }

    function removeOverlay() {
        optionReference.touchedElement = 0;

        clearDropTarget();
        $(window).off('resize.filedrag');
        $('.drag-n-drop.overlay').addClass('hidden');
    }

    // Left panel targets
    const dropTargetSel =
        '.fm-tree-panel .nw-fm-tree-item,' +
        '.js-myfile-tree-panel > .menu-item.cloud-drive,' +
        '.js-s4-tree-panel > .menu-item.s4';
    let dropTarget = null;
    let expandTimer = null;

    function canUploadTo(h) {
        if (h === M.RootID) {
            return true;
        }
        const n = M.getNodeByHandle(h);
        if (!n || !n.t || (M.getNodeRights(h) | 0) < 1) {
            return false;
        }
        const root = M.getNodeRoot(h);
        return root !== M.RubbishID && root !== M.InboxID;
    }


    function dialogTab(h) {
        const root = M.getNodeRoot(h);

        return root === 's4' ? 's4' : root === 'shares' ? 'shared-with-me' : 'cloud-drive';
    }

    /**
     * Finds the drop target under the pointer
     *
     * @param {Element} el The element under the pointer
     * @returns {Object|null} Drop target with the node to highlight and destination details
     */
    function findDropTarget(el) {
        if (!self.fminitialized || folderlink || optionReference.fileRequestEnabled) {
            return null;
        }
        const node = el && el.closest && el.closest(dropTargetSel);
        if (!node || node.closest('.mega-dialog') || node.closest('.mega-sheet')) {
            return null;
        }
        if (node.classList.contains('nw-fm-tree-item')) {
            if (!String(node.id).startsWith('treea_')) {
                return null;
            }
            const h = node.id.replace('treea_', '').replace(/^(os_|pl_)/, '');
            const knownHandle = M.getTreeRowHandle(node, h);

            return canUploadTo(knownHandle) ? {node, h, tab: dialogTab(knownHandle), dir: h} : null;
        }

        if (node.getAttribute('name') === 'cloud-drive') {
            return canUploadTo(M.RootID) ? {node, h: M.RootID, tab: 'cloud-drive', dir: M.RootID} : null;
        }

        const cn = M.tree.s4 ? s4.utils.getContainersList() : [];
        const h = cn.length === 1 && canUploadTo(cn[0].h) && cn[0].h;

        return {node, h, tab: 's4', dir: h || undefined};
    }

    /**
     * Returns key for the drop target
     *
     * @param {Object|null} target The drop target
     * @returns {String|Element|null} Target key
     */
    function targetKey(target) {
        if (!target) {
            return null;
        }
        return target.node.classList.contains('nw-fm-tree-item') ? target.h : target.node;
    }

    /**
     * Expand collapsed items in the left panel
     *
     * @param {Object} target The drop target being hovered
     * @returns {void}
     */
    function expandTarget(target) {
        const {node, h} = target;

        if (node.classList.contains('nw-fm-tree-item')) {
            M.onTreeUIExpand(h, 1);
            return;
        }

        M.expandTreeSection(node);
    }

    /**
     * Updates the current drop target and its hover state
     *
     * @param {Object|null} target The drop target with node and handle
     * @returns {void}
     */
    function setDropTarget(target) {
        const node = target && target.node || null;
        const prevNode = dropTarget && dropTarget.node || null;
        const key = targetKey(target);
        const prevKey = targetKey(dropTarget);

        dropTarget = target;

        if (prevNode !== node) {
            if (prevNode) {
                prevNode.classList.remove('ui-droppable-hover', 'pointer-auto');
            }
            if (node) {
                node.classList.add('ui-droppable-hover', 'pointer-auto');
            }
            // Hide overlay if l-pane target is selected
            $('.drag-n-drop.overlay').toggleClass('hidden', !!node);
        }

        // Reset the expand timer only when the drop target changes
        if (prevKey !== key) {
            clearTimeout(expandTimer);
            expandTimer = null;

            if (key) {
                expandTimer = setTimeout(() => expandTarget(target), 890);
            }
        }
    }

    /**
     * Returns the current drop target or a Cloud Drive fallback for restricted sections.
     *
     * @param {Event} e The drop or file-input event
     * @returns {Object|false} The drop target or false if no fallback applies
     */
    function dropDestination(e) {
        if (dropTarget) {
            return dropTarget;
        }
        if (e.type === 'drop' && isRestrictedSection()) {
            return {h: M.RootID, tab: 'cloud-drive', dir: M.RootID};
        }
        return false;
    }

    function clearDropTarget() {
        clearTimeout(expandTimer);
        expandTimer = null;

        if (dropTarget) {
            dropTarget.node.classList.remove('ui-droppable-hover', 'pointer-auto');
            dropTarget = null;
        }
    }

    function addUpload(files, emptyFolders) {
        const dropTo = $.onDroppedTreeFolder;
        const dropDialog = $.onDroppedTarget;
        delete $.onDroppedTreeFolder;
        delete $.onDroppedTarget;

        if (dropDialog) {
            if (dropTo && Object(window.fmconfig).ulddd) {
                M.addUpload(files, false, emptyFolders, dropTo);
                return start_upload();
            }
            return self.fminitialized && openCopyUploadDialog(files, emptyFolders, dropDialog);
        }

        const straight = $.doStraightUpload || Object(window.fmconfig).ulddd
            || M.currentrootid === M.RubbishID || files.length === 0;

        delete $.doStraightUpload;
        console.assert(M.isFileDragPage(page) || window.fminitialized, 'check this...');

        if (M.InboxID && M.currentrootid && (M.currentrootid === M.InboxID
            || M.getNodeRoot(M.currentdirid.split('/').pop()) === M.InboxID)) {

            msgDialog('error', l[882], l.upload_to_restricted_folder, l.upload_to_backup_info);
            return false;
        }

        // Check for any files the gallery is interested in
        if (M.currentCustomView
            && files.some(f => M.isGalleryImage({name: f.name, s: f.size}) || MediaInfoLib.isFileSupported(f))) {

            if (M.currentCustomView.type === 'gallery') {
                $.mediaUpload = true;
            }
            else if (M.currentCustomView.type === 'albums') {
                $.albumUpload = mega.gallery.albums.getUploadTarget();
            }
        }

        if (M.isFileDragPage(page) || straight) {
            let target;
            if ($.albumUpload || M.isAlbumsPage()) {
                // Albums are not a valid upload target
                target = M.lastSeenCloudFolder || M.RootID;

                if ($.albumUpload) {
                    mega.gallery.albums.handleUploadToAlbum();
                }
            }
            M.addUpload(files, false, emptyFolders, target);
            delete $.albumUpload;
            delete $.mediaUpload;

            start_upload();
        }
        else if (self.fminitialized) {
            openCopyUploadDialog(files, emptyFolders);
        }
        else {
            console.error(`don't know where to upload...`);
        }
    }

    function start_upload() {
        if (u_type !== false) { // existing user (incl ephemeral/e++) send to fm if not initialised
            if (!self.fminitialized) {
                loadSubPage('fm');
            }
            return;
        }
        if (u_wasloggedin()) {
            msgDialog('confirmation', l[1193], l[2001], l[2002], function(e) {
                if (e) {
                    start_anoupload();
                }
                else {
                    mega.ui.login.openDialog();
                    $.awaitingLoginToUpload = true;

                    mBroadcaster.once('fm:initialized', function() {
                        ulQueue.resume();
                        uldl_hold = false;

                        if (ul_queue.length > 0) {
                            M.showTransferToast('u', ul_queue.length);
                        }
                    });
                }
            });
        }
        else {
            start_anoupload();
        }
    }

    function start_anoupload() {
        u_storage = init_storage(localStorage);
        loadingDialog.show();
        u_checklogin({
            checkloginresult: function(u_ctx, r) {
                u_type = r;
                u_checked = true;
                loadingDialog.hide();
                loadSubPage('fm');
            }
        }, true);
    }

    function FileDragEnter(e) {
        if (d) {
            console.log('DragEnter', optionReference.touchedElement);
        }
        e.preventDefault();
        if ($.dialog === 'avatar' || mega.tpw && mega.tpw.isDialog) {
            return;
        }
        e.stopPropagation();
        if (!isFileDragAllowed()) {
            return;
        }
        if (d > 1) {
            console.info('----- ENTER event :' + e.target.className);
        }
        if (!optionReference.touchedElement) {
            optionReference.touchedElement = 1;
            addOverlay();
        }

    }

    /**
     * Handles file drag-over events.
     */
    function FileDragHover(e) {
        if (d) {
            console.log('DragOver');
        }

        // Prevent the browser from opening the dropped file
        e.preventDefault();
        e.stopPropagation();

        if (!optionReference.touchedElement) {
            // Reject the drop and show the system's "not allowed" cursor
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'none';
            }
            return;
        }

        setDropTarget(findDropTarget(e.target));

        if (e.dataTransfer) {
            // dropEffect is reset on each dragover
            e.dataTransfer.dropEffect = 'copy';
        }
    }
    var useMegaSync = -1;
    var usageMegaSync = 0;


    function FileSelectHandlerMegaSyncClick(e) {

        if (M.isInvalidUserStatus()) {
            e.preventDefault();
            return false;
        }

        if (page === "chat" || page.indexOf('/chat/') > -1) {
            return true;
        }
        if (window.useMegaSync === 2) {
            e.preventDefault();
            e.stopPropagation();

            if (M.InboxID && M.currentrootid && (M.currentrootid === M.InboxID
                || M.getNodeRoot(M.currentdirid.split('/').pop()) === M.InboxID)) {

                msgDialog('error', l[882], l.upload_to_restricted_folder, l.upload_to_backup_info);
                return false;
            }

            var target;
            if ($.onDroppedTreeFolder) {
                target = $.onDroppedTreeFolder;
                delete $.onDroppedTreeFolder;
            }
            else if (M.currentCustomView) {
                target = M.currentCustomView.nodeID;
            }
            else if (String(M.currentdirid).length !== 8) {
                target = M.lastSeenCloudFolder || M.RootID;
            }
            else {
                target = M.currentdirid;
            }

            var uploadCmdIsFine = function _uploadCmdIsFine(error, response) {
                if (error) {
                    window.useMegaSync = 3;
                }
            };

            //var elem = $('#' + e.toElement.id)[0];
            var elem = e.target;
            if (elem.hasAttribute('webkitdirectory') || elem.hasAttribute('mozdirectory')
                || elem.hasAttribute('msdirectory') || elem.hasAttribute('odirectory')
                || elem.hasAttribute('directory')) {
                megasync.uploadFolder(target, uploadCmdIsFine);
            }
            else {
                megasync.uploadFile(target, uploadCmdIsFine);
            }
            return false;
        }
        else {
            return true;
        }
    }

    function eventInView(e) {
        return e.clientX > 0 && e.clientY > 0 && e.clientX < window.innerWidth && e.clientY < window.innerHeight;
    }

    function FileDragLeave(e) {
        if (d) {
            console.log('DragLeave', optionReference.touchedElement);
        }
        e.preventDefault();
        if ($.dialog === 'avatar' || mega.tpw && mega.tpw.isDialog) {
            return;
        }
        e.stopPropagation();

        if (d > 1) {
            console.warn('----- LEAVE event :' + e.target.className + '   ' + e.type);
        }
        if (
            !optionReference.touchedElement ||
            document.body.contains(e.relatedTarget || e.target) && eventInView(e)
        ) {
            return;
        }
        removeOverlay();
    }

    // on Drop event or Click to file select event
    function FileSelectHandler(e) {

        if (e.preventDefault) {
            e.preventDefault();
        }

        // Clear drag element
        optionReference.touchedElement = 0;

        const dropTo = dropDestination(e);

        removeOverlay();

        if (M.isInvalidUserStatus()) {
            return false;
        }

        if ($.dialog === 'avatar' || mega.tpw && mega.tpw.isDialog) {
            return;
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (e.type === 'drop' && !isFileDragAllowed()) {
            return;
        }

        useMegaSync = -1;

        const elem = e.target;
        const isFolderUpload = elem.hasAttribute('webkitdirectory') || elem.hasAttribute('mozdirectory')
            || elem.hasAttribute('msdirectory') || elem.hasAttribute('odirectory') || elem.hasAttribute('directory')
            || e.type === 'drop' && typeof M.checkFolderDrop === 'function' && M.checkFolderDrop(e);

        // Log that User selected a folder (or file) for upload from the file explorer
        eventlog(isFolderUpload ? 500010 : 500012);

        var currentDir = dropTo && dropTo.h || (M.currentCustomView ? M.currentCustomView.nodeID : M.currentdirid);

        if ($.awaitingLoginToUpload) {
            mega.ui.login.openDialog();
            return false;
        }

        let noUploadTarget = currentDir && currentDir !== 'dashboard' && (M.getNodeRights(currentDir) | 0) < 1;
        if (dropTo) {
            noUploadTarget = false;
        }
        else if (String(M.currentdirid).includes('albums')) {
            noUploadTarget = !mega.gallery.albums.getUploadTarget();
        }
        else if (M.currentCustomView && M.currentCustomView.type === 'gallery') {
            noUploadTarget = false;
        }

        if (
            (folderlink || noUploadTarget) &&
            String(currentDir).indexOf("chat/") === -1
        ) {
            msgDialog('warningb', l[1676], l[1023]);
            return true;
        }

        if (!dropTo && M.InboxID && M.currentrootid && (M.currentrootid === M.InboxID
            || M.getNodeRoot(M.currentdirid.split('/').pop()) === M.InboxID)) {

            msgDialog('error', l[882], l.upload_to_restricted_folder, l.upload_to_backup_info);
            return false;
        }

        if (M.isFileDragPage(page) && !is_mobile) {
            console.assert(typeof fm_addhtml === 'function');
            if (typeof fm_addhtml === 'function') {
                fm_addhtml();
            }
        }

        var dataTransfer = Object(e.dataTransfer);
        var files = e.target.files || dataTransfer.files;
        if (!files || !files.length) {
            return false;
        }

        if (localStorage.testWebGL) {
            return WebGLMEGAContext.test(...files);
        }
        else if (sessionStorage.testWebGL) {
            return WebGLMEGAContext.test2([...files]);
        }

        if (localStorage.testDCRaw) {
            (function _rawNext(files) {
                var file = files.pop();
                if (!file) {
                    return console.info('No more files.');
                }
                var id = Math.random() * 9999 | 0;
                var img = is_image(file.name);
                var raw = typeof img === 'string' && img;

                if (!img || !raw) {
                    console.warn('This is not a RAW image...', file.name, [file], img);
                    return _rawNext(files);
                }

                createthumbnail(file, false, id, null, null, {raw: raw})
                    .then((res) => {
                        console.info('testDCRaw result', res);
                        onIdle(_rawNext.bind(null, files));
                        M.saveAs(res.preview, `${file.name}.png`);
                    })
                    .dump(id);

            })(toArray.apply(null, files));
            return;
        }
        if (localStorage.testMediaInfo) {
            return MediaInfoLib.test(files);
        }
        if (localStorage.testGetID3CoverArt) {
            return getID3CoverArt(files[0]).then(function(ab) {
                console.info('getID3CovertArt result', mObjectURL([ab], 'image/jpeg'));
            }).catch(console.debug.bind(console));
        }
        if (localStorage.testStreamerThumbnail) {
            return M.require('videostream').tryCatch(function() {
                Streamer.getThumbnail(files[0])
                    .then(function(ab) {
                        console.info('Streamer.getThumbnail result', mObjectURL([ab], 'image/jpeg'));
                    })
                    .catch(console.debug.bind(console));
            });
        }

        if (window.d && (e.ctrlKey || e.metaKey) && /^mega-dbexport/.test(files[0].name)) {
            return MegaDexie.import(files[0]).dump();
        }

        if ((e.ctrlKey || e.metaKey) && MediaInfoLib.isFileSupported(files[0])) {
            window.d = 2;
            document.body.textContent = 'Local videostream.js Test...';
            const video = mCreateElement('video', {width: 1280, height: 720, controls: true}, 'body');
            return M.require('videostream').then(() => Streamer(files[0], video)).catch(dump);
        }

        const now = Math.floor(Date.now() / 1000);
        const filter = (f) => {
            if (f.name !== '.') {
                if (self.eventlog && Math.floor(f.lastModified / 1000) === now) {
                    // file modification time uses current time for uploading?
                    eventlog(99659, true);
                }
                return true;
            }
        };
        if (dropTo) {
            $.onDroppedTreeFolder = dropTo.h;
            $.onDroppedTarget = {tab: dropTo.tab, dir: dropTo.dir};
        }

        factory.require('file-list').getFileList(e, filter)
            .then((files) => {

                const trigger = e && e.dataTransfer ? 'd' : 'p';

                for (let i = 0; i < files.length; i++) {
                    files[i].pitagTrigger = trigger;
                }

                if (!e.dataTransfer) {
                    $.doStraightUpload = String(M.currentdirid) !== 'recents';
                }
                addUpload(files, files.empty);
            })
            .catch(tell)
            .finally(() => {
                delete $.onDroppedTreeFolder;
                delete $.onDroppedTarget;

                if (self.InitFileDrag) {
                    const $fileAndFolderUploadWrap = $('.fm-right-header');
                    const html = `
                        <input type="file" class="hidden" id="fileselect1" title="${l[99]}" multiple="" />
                        <input type="file" class="hidden" id="fileselect2" webkitdirectory="" title="${l[98]}"
                         multiple="" />
                        `;

                    $('input', $fileAndFolderUploadWrap).remove();
                    $fileAndFolderUploadWrap.safeAppend(html);

                    InitFileDrag();
                }
            });

        return true;
    }

    function onDragStartHandler(e) {
        if ((e.target && e.target.toString && e.target.toString() === '[object Text]')
            || page.indexOf('/fm/') === -1) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    }

    /**
     * Returns whether the current section has no upload target of its own
     *
     * @return {Boolean} Whether the current section is restricted
     */
    function isRestrictedSection() {
        if (M.currentrootid === M.RubbishID) {
            return true;
        }
        if (chatRoom() || M.isGalleryPage() || M.isAlbumsPage()) {
            // These sections have their own upload target
            return false;
        }

        const id = M.currentCustomView ? M.currentCustomView.nodeID : M.currentdirid;

        // Real folders handle their own write errors
        if (M.getNodeByHandle(id)) {
            return false;
        }

        // Sections such as Dashboard, Favs, Shares and S4 container pages
        return (M.getNodeRights(id) | 0) < 1;
    }

    /**
     * Check current page is allowed on drag and drop to upload file
     *
     * @return {Boolean} Is allowed or not
     */
    function isFileDragAllowed() {
        if (M.isFileDragPage(page)) {
            return true;
        }
        if (String(page).startsWith('pro') || page === 'support') {
            return false;
        }
        if (M.currentCustomView && M.currentCustomView.type === 'pwm'
            || M.currentdirid === 'pwm') {
            return false;
        }
        return !(is_fm() && // if page is fm,
            (window.slideshowid || !$('.feedback-dialog').hasClass('hidden') || // preview and feedback dialog show
                !$('.mega-dialog.duplicate-conflict', 'body').hasClass('hidden') // conflict dialog show
            ));
    }

    // initialize
    scope.InitFileDrag = function() {
        var i = 5;
        while (i--) {
            var o = document.getElementById(i ? 'fileselect' + i : 'start-upload');
            if (o) {
                o.addEventListener("change", FileSelectHandler, false);
                if (!is_mobile && i) {
                    o.addEventListener("click", FileSelectHandlerMegaSyncClick, true);
                }
            }
        }

        // dran&drop overlay click handler, to allow closing if stuck
        $('.drag-n-drop.overlay')
            .rebind('click.dnd', function dragDropLayoutClickHndler() {
                removeOverlay();
            });

        var fnHandler = FileSelectHandler;
        var fnEnter = FileDragEnter;
        var fnHover = FileDragHover;
        var fnLeave = FileDragLeave;

        optionReference.touchedElement = 0;

        // FileRequest upload
        const fileSelect = document.getElementById('fileselect5');
        if (fileSelect) {
            optionReference.fileRequestEnabled = true;
            fnHandler = mega.fileRequestUpload.getAndSetUploadHandler(optionReference);
            fnEnter = mega.fileRequestUpload.checkUploadDragHandler(fnEnter);
            fnHover = mega.fileRequestUpload.checkUploadDragHandler(fnHover);
            fnLeave = mega.fileRequestUpload.checkUploadDragHandler(fnLeave);
        }

        document.getElementsByTagName("body")[0].addEventListener("dragenter", fnEnter, false);
        document.getElementsByTagName("body")[0].addEventListener("dragover", fnHover, false);
        document.getElementsByTagName("body")[0].addEventListener("dragleave", fnLeave, false);
        document.getElementsByTagName("body")[0].addEventListener("drop", fnHandler, false);
        document.getElementsByTagName("body")[0].addEventListener("dragstart", onDragStartHandler, false);

        if (is_mobile &&
            (ua.details.engine === 'Gecko' && parseInt(ua.details.version) < 83
            || is_ios && is_ios < 13)) {
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1456557
            $('input[multiple]').removeAttr('multiple');
        }
    };

})(this);

// Selenium helper to fake a drop event
function fakeDropEvent(target) {
    // hash: "MTIzNAAAAAAAAAAAAAAAAAOLqRY"
    var file = new File(['1234'], 'test\u202Efdp.exe', {
        type: "application/octet-stream",
        lastModified: 1485195382
    });

    var ev = document.createEvent("HTMLEvents");
    ev.initEvent("drop", true, true);
    ev.dataTransfer = {
        files: [file]
    };

    target = target || document.getElementById("startholder");
    target.dispatchEvent(ev);
}

function ulDummyFiles(count, len) {
    'use strict';

    var ul = [];
    var ts = 1e8;
    for (var n = M.v.length; n--;) {
        ts = Math.max(ts, M.v[n].mtime | 0);
    }

    len = len || 512;
    for (var i = count || 6e3; i--;) {
        var now = Date.now();
        var rnd = Math.random();
        var nam = (rnd * now).toString(36);
        var buf = mega.getRandomValues(len + rnd * len);

        ul.push(new File([buf], nam, {type: 'application/octet-stream', lastModified: ++ts * 1e3}));
    }

    M.addUpload(ul, true);
}

async function ulDummyImages(count, type) {
    'use strict';

    const ul = [];
    const ext = (type = type || 'image/jpeg').split('/').pop();

    eventlog = dump;
    for (let i = count || 210; i--;) {
        const rnd = Math.random();
        const wdh = 320 + rnd * 2345 | 0;
        const buf = await webgl.createImage(i % 2 ? rnd * Date.now() : null, wdh, wdh / 1.777 | 0, type)
            .catch((ex) => {
                console.error(i, wdh, ex.message || ex, ex.data, [ex]);
            });

        if (buf) {
            ul.push(new File([buf], `${makeUUID().slice(-17)}.${ext}`, {type, lastModified: 9e11}));
        }

        if (!(i % 48)) {
            M.addUpload([...ul], true);
            ul.length = 0;
        }
    }
}
