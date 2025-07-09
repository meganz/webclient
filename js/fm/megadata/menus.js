/*
 * buildSubMenu - context menu related
 * Create sub-menu for context menu parent directory
 *
 * @param {string} id - parent folder handle
 */
MegaData.prototype.buildSubMenu = function(id) {
    'use strict'; /* jshint -W074 */

    var csb;
    var cs = '';
    var sm = '';
    var tree = Object(this.tree[id]);
    var folders = obj_values(tree);
    var rootID = escapeHTML(this.RootID);
    var rootTree = this.tree[rootID] || false;
    var rootTreeLen = $.len(rootTree);
    var arrow = '<span class="context-top-arrow"></span><span class="context-bottom-arrow"></span>';

    csb = document.getElementById('sm_move');
    if (!csb || parseInt(csb.dataset.folders) !== rootTreeLen) {
        if (rootTree && Object.values(rootTree).some(mega.sensitives.shouldShowInTree)) {
            cs = ' contains-submenu sprite-fm-mono-after icon-arrow-right-after';
            sm = '<span class="dropdown body submenu" id="sm_' + rootID + '">'
                + '<span id="csb_' + rootID + '"></span>' + arrow + '</span>';
        }

        if (csb) {
            csb.parentNode.removeChild(csb);
        }

        $('.dropdown-item.move-item').after(
            '<span class="dropdown body submenu" id="sm_move">' +
            '  <span id="csb_move">' +
            '    <span class="dropdown-item cloud-item' + cs + '" id="fi_' + rootID + '">' +
            '      <i class="sprite-fm-mono icon-cloud"></i>' +
            '      <span>' + escapeHTML(l[164]) + '</span>' +
            '    </span>' + sm +
            '    <hr />' +
            '    <span class="dropdown-item advanced-item">' +
            '      <i class="sprite-fm-mono icon-target"></i>' +
            '      <span>' + escapeHTML(l[9108]) + '</span>' +
            '    </span>' + arrow +
            '  </span>' +
            '</span>'
        );

        if ((csb = document.getElementById('sm_move'))) {
            csb.dataset.folders = rootTreeLen;
            M.initContextUI(); // rebind just recreated dropdown-item's
        }
    }

    csb = document.getElementById('csb_' + id);
    if (csb && csb.querySelectorAll('.dropdown-item').length !== folders.length) {
        var $csb = $(csb).empty();

        folders.sort(M.getSortByNameFn2(1));
        for (var i = 0; i < folders.length; i++) {
            if (folders[i].t & M.IS_S4CRT || !mega.sensitives.shouldShowInTree(folders[i])) {
                continue;
            }

            var fid = escapeHTML(folders[i].h);

            cs = '';
            sm = '';
            if (this.tree[fid] && Object.values(this.tree[fid]).some(mega.sensitives.shouldShowInTree)) {
                cs = ' contains-submenu sprite-fm-mono-after icon-arrow-right-after';
                sm = '<span class="dropdown body submenu" id="sm_' + fid + '">'
                    + '<span id="csb_' + fid + '"></span>' + arrow + '</span>';
            }

            var classes = 'folder-item';
            var iconClass = 'icon-folder';
            if (folders[i].t & M.IS_SHARED) {
                classes += ' shared-folder-item';
                iconClass = 'icon-folder-outgoing-share';
            }
            else if (mega.fileRequest.publicFolderExists(fid)) {
                classes += ' file-request-folder';
                iconClass = 'icon-folder-mega-drop';
            }

            var nodeName = missingkeys[fid] ? l[8686] : folders[i].name;

            $csb.append(
                '<span class="dropdown-item ' + classes + cs + '" id="fi_' + fid + '">' +
                '  <i class="sprite-fm-mono ' + iconClass + '"></i>' +
                '  <span>' + escapeHTML(nodeName) + '</span>' +
                '</span>' + sm
            );
        }
    }

    M.disableCircularTargets('#fi_');
};

MegaData.prototype.getNodeSourceRoot = function(h, isSearch, isTree) {
    'use strict';

    let sourceRoot = isTree || isSearch || M.currentdirid === 'recents'
        || M.currentdirid === 'public-links' || M.currentdirid === 'out-shares'
        || M.onDeviceCenter
            && mega.devices.ui.getRenderSection() === 'cloud-drive'
        ? M.getNodeRoot(h) : M.currentrootid;

    if (sourceRoot === 'file-requests') {
        sourceRoot = M.RootID;
    }

    return sourceRoot;
};
MegaData.prototype.getSelectedSourceRoot = function(isSearch, isTree) {
    'use strict';

    return this.getNodeSourceRoot($.selected[0], isSearch, isTree);
};

MegaData.prototype.checkSendToChat = function(isSearch, sourceRoot) {
    'use strict';

    // view send to chat if all selected items are files
    if (!folderlink && window.megaChatIsReady && $.selected.length) {

        for (let i = $.selected.length; i--;) {

            let n = M.d[$.selected[i]];
            const nRoot = isSearch ? n && n.u === u_handle && M.getNodeRoot($.selected[i]) : sourceRoot;

            if (!n || n.h === M.RootID || n.t && (nRoot !== M.RootID && nRoot !== M.InboxID &&
                nRoot !== 's4' && nRoot !== mega.devices.rootId && !M.isDynPage(nRoot) && nRoot !== 'out-shares') ||
                nRoot === M.RubbishID) {

                return false;
            }
        }
        return true;
    }
    return false;
};


/**
 * Build an array of context-menu items to show for the selected node
 * @param {Event} evt Event to pass
 * @param {Boolean} isTree Whether this is a context menu invoked in a tree or not
 * @returns {Promise}
 */
// @todo make eslint happy..
// eslint-disable-next-line complexity,sonarjs/cognitive-complexity
MegaData.prototype.menuItems = async function menuItems(evt, isTree) {
    "use strict";

    console.assert($.selected);
    if (!$.selected) {
        $.selected = [];
    }

    const restore = new Set();
    const nodes = [...$.selected];

    for (let i = nodes.length; i--;) {
        const h = nodes[i] || !1;
        const n = M.getNodeByHandle(h);

        if (n || h.length !== 8) {
            nodes.splice(i, 1);

            if (n.rr && M.getNodeRoot(n.h) === M.RubbishID) {
                restore.add(n.rr);
            }
            // else we can delete .rr and api_setattr
        }
    }
    nodes.push(...restore);

    if (nodes.length) {
        await dbfetch.geta(nodes).catch(dump);
    }

    const isHeaderContext = evt && evt.currentTarget.classList &&
        evt.currentTarget.classList.contains('fm-header-context');

    if (M.onDeviceCenter) {
        const { ui } = mega.devices;
        const section = ui.getRenderSection();
        if (section !== 'cloud-drive'
            || ui.isFullSyncRelated($.selected[0])
            || ui.isBackupRelated($.selected)
        ) {
            return ui.getContextMenuItems($.selected, isHeaderContext);
        }
    }

    let n;
    const items = Object.create(null);
    const isSearch = page.startsWith('fm/search');
    const selNode = M.getNodeByHandle($.selected[0]);
    const sourceRoot = M.getSelectedSourceRoot(isSearch, isTree);
    let restrictedFolders = false;
    const isInShare = M.currentrootid === 'shares';

    if (selNode && selNode.su && !M.d[selNode.p]) {
        items['.leaveshare-item'] = 1;
    }
    else if (M.getNodeRights($.selected[0]) > 1) {
        items['.move-item'] = 1;
        items['.remove-item'] = 1;
    }

    if (selNode && $.selected.length === 1) {
        if (selNode.t) {
            if (M.currentdirid !== selNode.h && !is_mobile) {
                items['.open-item'] = 1;
            }

            if ((sourceRoot === M.RootID || sourceRoot === 's4'
                || M.isDynPage(M.currentrootid)) && !folderlink) {

                let exp = false;
                const shares = this.getNodeShareUsers(selNode);

                for (let i = shares.length; i--;) {
                    if (shares[i] === 'EXP') {
                        shares.splice(i, 1);
                        exp = selNode.shares.EXP;
                    }
                }

                items['.sh4r1ng-item'] = 1;
                items['.transferit-item'] = 1;
                if (sourceRoot !== 's4' && sourceRoot !== M.RootID && isHeaderContext) {
                    delete items['.sh4r1ng-item'];
                    delete items['.transferit-item'];
                }

                if (shares.length || M.ps[selNode.h]) {
                    items['.removeshare-item'] = 1;
                }
                else if (!exp && !shared.is(selNode.h)) {

                    if (mega.fileRequest.publicFolderExists(selNode.h)) {
                        let fileRequestPageClass = '';

                        if (!is_mobile) {
                            fileRequestPageClass =
                                M.currentrootid === 'file-requests'
                                    ? '.file-request-page'
                                    : ':not(.file-request-page)';
                        }

                        if (!isHeaderContext) {
                            items[`.file-request-manage${fileRequestPageClass}`] = 1;
                        }
                        items[`.file-request-copy-link${fileRequestPageClass}`] = 1;
                        items[`.file-request-remove${fileRequestPageClass}`] = 1;
                    }
                    else {
                        items[`.file-request-create`] = 1;
                    }
                }
            }

            // If the selected folder contains any versioning show clear version
            if (selNode.tvf && M.getNodeRights(selNode.h) > 1) {
                items['.clearprevious-versions'] = 1;
            }

            // This is just to make sure the source root is on the cloud drive
            if (mega.rewind && sourceRoot === M.RootID
                && !M.onDeviceCenter
                && !folderlink
            ) {
                items['.rewind-item'] = 1;
            }
        }
        else {
            if ((selNode.tvf > 0) && !folderlink) {
                items['.properties-versions'] = 1;
                if (M.getNodeRights(selNode.h) > 1) {
                    items['.clearprevious-versions'] = 1;
                }
            }

            if (is_image2(selNode)) {
                items['.preview-item'] = 1;
            }
            else {
                var mediaType = is_video(selNode);

                if (mediaType) {
                    items['.play-item'] = 1;

                    if (sourceRoot !== M.RubbishID && sourceRoot !== "shares") {
                        items['.embedcode-item'] = 1;
                    }
                }
                else if (is_text(selNode)) {
                    items['.edit-file-item'] = 1;
                }
            }
        }

        if (M.currentCustomView && M.currentCustomView.type !== mega.devices.rootId || M.search) {
            items['.open-cloud-item'] = 1;
            if (folderlink) {
                items['.open-in-location'] = 1;
            }
            else {
                items['.open-cloud-item'] = 1;
            }
        }
        else if (M.onDeviceCenter) {
            if (sharer(selNode.h)) {
                items['.open-in-location'] = 1;
            }
            else {
                items['.open-cloud-item'] = 1;
            }
        }

        // If Full Access node rights
        if (M.getNodeRights(selNode.h) > 1) {
            items['.rename-item'] = 1;
            items['.colour-label-items'] = 1;

            const isInshareRelated = isInShare
                || M.onDeviceCenter && sharer(selNode.h);

            if (!isInshareRelated) {
                items['.add-star-item'] = 1;

                if (M.isFavourite(selNode.h)) {

                    if (is_mobile) {

                        const fav = mega.ui.contextMenu.getChild('.add-star-item');
                        fav.text = l[5872];
                        fav.icon = 'sprite-mobile-fm-mono icon-heart-broken-thin-outline';
                    }
                    else {
                        $('.add-star-item').safeHTML('<i class="sprite-fm-mono icon-favourite-removed"></i>@@',
                                                     l[5872]);
                    }
                }
                else if (is_mobile) {

                    const fav = mega.ui.contextMenu.getChild('.add-star-item');
                    fav.text = l[5871];
                    fav.icon = 'sprite-mobile-fm-mono icon-heart-thin-outline';
                }
                else {
                    $('.add-star-item').safeHTML('<i class="sprite-fm-mono icon-favourite"></i>@@', l[5871]);
                }
            }

            if (items['.edit-file-item']) {
                $('.dropdown-item.edit-file-item span').text(l[865]);
            }
        }
        else if (items['.edit-file-item']) {
            $('.dropdown-item.edit-file-item span').text(l[16797]);
        }

        if (selNode.vhl) {
            items['.vhl-item'] = 1;
        }
    }

    // Allow to mark as Favourite/Labeled from multi-selection
    if ($.selected.length > 1) {

        let allNodesFullAccess = true;

        // Check all selected nodes
        for (let i = 0; i < $.selected.length; i++) {

            const selectedHandle = $.selected[i];

            // If not Full Access node rights, disable
            if (M.getNodeRights(selectedHandle) < 2) {
                allNodesFullAccess = false;
                break;
            }
        }

        // If all nodes have Full Access node rights, show colour label option
        if (allNodesFullAccess) {
            items['.colour-label-items'] = 1;
        }

        let allAreFavourite = !isInShare;

        if (!isInShare) {
            items['.add-star-item'] = 1;
        }

        for (let i = 0; i < $.selected.length; i++) {

            if (allAreFavourite && !M.isFavourite($.selected[i])) {
                allAreFavourite = false;
            }

            if (!restrictedFolders
                && (sourceRoot === M.InboxID || M.getNodeRoot($.selected[i]) === M.InboxID)) {

                restrictedFolders = true;
            }
        }
    }

    const sen = mega.sensitives.getSensitivityStatus($.selected, evt);
    if (sen) {
        items['.add-sensitive-item'] = sen;
    }

    if (M.checkSendToChat(isSearch, sourceRoot)) {
        items['.send-to-contact-item'] = 1;
    }

    if (selNode) {
        items['.download-item'] = 1;
        items['.zipdownload-item'] = 1;
        items['.copy-item'] = 1;
        items['.properties-item'] = 1;
    }
    items['.refresh-item'] = 1;

    if (mega.gallery.canShowAddToAlbum() && $.selected.every(h => M.isGalleryNode(M.getNodeByHandle(h)))) {
        items['.add-to-album'] = 1;
    }

    if (folderlink) {
        delete items['.copy-item'];
        delete items['.add-star-item'];
        delete items['.embedcode-item'];
        delete items['.colour-label-items'];
        delete items['.properties-versions'];
        delete items['.clearprevious-versions'];
        delete items['.add-to-album'];

        items['.import-item'] = 1;
        items['.getlink-item'] = 1;

        if (selNode.vhl || !selNode.t && self.d && localStorage.compli) {
            items['.vhl-item'] = 1;
        }
    }

    if (M.isGalleryPage()) {
        if ($.selected.length === 1 && !M.isMediaDiscoveryPage()) {
            items['.open-cloud-item'] = 1;
        }

        items['.getlink-item'] = 1;
        delete items['.move-item'];
        delete items['.copy-item'];
        delete items['.rename-item'];
        delete items['.togglepausesync-item'];
        delete items['.colour-label-items'];
        delete items['.properties-versions'];
        delete items['.clearprevious-versions'];
        delete items['.open-in-location'];
    }

    const handleRubbishNodes = () => {
        delete items['.move-item'];
        delete items['.copy-item'];
        delete items['.rename-item'];
        delete items['.add-star-item'];
        delete items['.download-item'];
        delete items['.zipdownload-item'];
        delete items['.colour-label-items'];
        delete items['.embedcode-item'];
        delete items['.properties-versions'];
        delete items['.clearprevious-versions'];
        delete items['.getlink-item'];
        delete items['.transferit-item'];

        let allReveratable = true;
        for (var j = $.selected.length; j--;) {
            n = M.getNodeByHandle($.selected[j]);

            if (!n.rr || M.getNodeRoot(n.h) !== M.RubbishID) {
                allReveratable = false;
            }
        }
        if (allReveratable) {
            items['.revert-item'] = 1;
        }
        else {
            delete items['.revert-item'];
        }
    };
    if ((sourceRoot === M.RootID || sourceRoot === 'out-shares'
         || sourceRoot === 's4' || M.isDynPage(M.currentrootid)) && !folderlink) {

        items['.move-item'] = 1;
        items['.getlink-item'] = 1;
        items['.transferit-item'] = 1;

        var cl = new mega.Share();
        var hasExportLink = cl.hasExportLink($.selected);

        if (hasExportLink) {
            items['.removelink-item'] = true;
        }

        cl = new mega.Share.ExportLink();
        var isTakenDown = cl.isTakenDown($.selected);

        // If any of selected items is taken down remove actions from context menu
        if (isTakenDown) {
            delete items['.getlink-item'];
            delete items['.embedcode-item'];
            delete items['.removelink-item'];
            delete items['.sh4r1ng-item'];
            delete items['.transferit-item'];
            delete items['.add-star-item'];
            delete items['.colour-label-items'];
            delete items['.download-item'];
            delete items['.play-item'];
            delete items['.preview-item'];
            delete items['.edit-file-item'];
            delete items['.add-sensitive-item'];

            if ($.selected.length > 1 || selNode.t !== 1) {
                delete items['.open-item'];
            }

            items['.dispute-item'] = 1;
        }
    }
    else if (sourceRoot === M.RubbishID && !folderlink) {
        handleRubbishNodes();
    }

    if (isSearch && $.selected.some(h => M.getNodeRoot(h) === M.RubbishID)) {
        handleRubbishNodes();
    }

    // For multiple selections, should check all have the right permission.
    if ($.selected.length > 1) {

        let removeItemFlag = true;
        let clearVersioned = false;
        let favouriteFlag = true;
        let labelFlag = true;

        for (var g = 0; g < $.selected.length; g++) {

            // If any of node has read only rights or less, stop loop
            if (folderlink || M.getNodeRights($.selected[g]) <= 1) {

                removeItemFlag = false;
                clearVersioned = false;
                favouriteFlag = false;
                labelFlag = false;

                break;
            }

            const selected = M.getNodeByHandle($.selected[g]);

            // Do not show clear version option if there is any folder selected
            // Or multi-select files including a versioned file and in rubbish bin
            if (selected.t || M.currentrootid === M.RubbishID) {
                clearVersioned = false;
                break;
            }
            else if (selected.tvf) {
                clearVersioned = true;
            }
        }

        if (!removeItemFlag) {
            delete items['.remove-item'];
            delete items['.togglepausesync-item'];
            delete items['.move-item'];
        }

        if (!favouriteFlag) {
            delete items['.add-star-item'];
        }

        if (!labelFlag) {
            delete items['.colour-label-items'];
        }

        // if there is no folder selected, selected file nodes are versioned, user has right to clear it.
        if (clearVersioned) {
            items['.clearprevious-versions'] = 1;
        }
    }

    const {useMegaSync} = window;

    if (useMegaSync === 2 || useMegaSync === 3) {
        delete items['.download-standart-item'];
        delete items['.zipdownload-item'];
        items['.download-item'] = 1;

        if (useMegaSync === 2 && $.selected.length === 1 && selNode.t) {
            const {error, response} = await megasync.syncPossibleA(selNode.h).catch(dump) || false;
            if (!error && response === 0) {
                items['.syncmegasync-item'] = 1;
            }
        }
    }
    else if (items['.download-item']) {
        delete items['.download-item'];
        items['.download-standart-item'] = 1;
    }

    if (M.currentdirid === 'file-requests' && !isTree) {
        delete items['.move-item'];
        delete items['.copy-item'];
        delete items['.open-in-location'];
        delete items['.getlink-item'];
        delete items['.embedcode-item'];
        delete items['.removelink-item'];
        delete items['.sh4r1ng-item'];
        delete items['.transferit-item'];
        delete items['.send-to-contact-item'];
    }

    // If in MEGA Lite mode, temporarily hide any Download, Copy and Manage Share options while in the Shared area
    if (mega.lite.inLiteMode && (M.currentrootid === 'shares' || M.currentrootid === 'out-shares')) {
        // delete items['.download-item'];
        delete items['.copy-item'];
        delete items['.sh4r1ng-item'];
        delete items['.remove-item'];
        delete items['.togglepausesync-item'];
    }

    if (restrictedFolders || $.selected.length === 1
        && sourceRoot === M.InboxID) {

        delete items['.transferit-item'];
        delete items['.open-cloud-item'];
        delete items['.open-in-location'];
        delete items['.move-item'];
        delete items['.rename-item'];
        delete items['.add-star-item'];
        delete items['.colour-label-items'];
        delete items['.embedcode-item'];

        if (!self.vw) {
            delete items['.remove-item'];
            delete items['.togglepausesync-item'];
        }

        let cl = new mega.Share.ExportLink();

        if (folderlink || cl.isTakenDown($.selected)) {
            return items;
        }

        cl = new mega.Share();

        if (cl.hasExportLink($.selected)) {
            items['.removelink-item'] = 1;
        }

        items['.getlink-item'] = 1;

        if ($.selected.length === 1 && selNode.t) {
            items['.sh4r1ng-item'] = 1;

            if (M.getNodeShareUsers(selNode, 'EXP').length || M.ps[selNode]) {
                items['.removeshare-item'] = 1;
            }
        }
    }

    // S4 Object Storage
    if ($.selected.length === 1 && sourceRoot === 's4') {
        const s4Type = 'kernel' in s4 && s4.kernel.getS4NodeType(selNode);

        delete items['.open-cloud-item'];

        if (M.currentCustomView.type !== 's4' || M.currentdirid.startsWith('search/')) {
            items['.open-s4-item'] = 1;
        }

        // Block most of actions over the containers/keys/groups/policies
        if (s4Type === 'container' || !s4Type) {
            for (const item in items) {
                delete items[item];
            }

            // Allow to remove multiple containers
            if (s4Type === 'container' && s4.utils.getContainersList().length > 1) {
                items['.remove-item'] = 1;
            }
        }
        else if (s4Type === 'bucket') {
            delete items['.properties-item'];
            items['.settings-item'] = 1;
        }
        else if (s4Type === 'object') {
            items['.managepuburl-item'] = 1;
        }
    }

    if (isHeaderContext) {
        delete items['.open-item'];
        if (sourceRoot === 'shares') {
            delete items['.download-item'];
            delete items['.download-standart-item'];
            delete items['.zipdownload-item'];
        }
        if (sourceRoot === 's4') {
            delete items['.settings-item'];
        }
        if (sourceRoot === 'out-shares' && selNode && this.getNodeShareUsers(selNode, 'EXP').length) {
            items['.removeshare-item'] = 1;
        }
        if (M.currentrootid === 'file-requests' && mega.fileRequest.publicFolderExists(selNode.h)) {
            delete items['.move-item'];
            delete items['.copy-item'];
            delete items['.getlink-item'];
            delete items['.embedcode-item'];
            delete items['.removelink-item'];
            delete items['.sh4r1ng-item'];
            delete items['.transferit-item'];
            delete items['.send-to-contact-item'];
        }
        if (M.onDeviceCenter && mega.ui.secondaryNav) {
            const node = mega.ui.secondaryNav.domNode.querySelector('.fm-share-folder');
            if (node && !node.classList.contains('hidden')) {
                delete items['.sh4r1ng-item'];
                delete items['.transferit-item'];
            }
        }
    }

    if (!mega.xferit) {
        delete items['.transferit-item'];
    }

    return items;
};

/**
 * Show a context menu for the selected node.
 * @param {Event} e The event being dispatched
 * @param {Number} ll The type of context menu.
 * @param {String} items Requested items classes, i.e '.properties-item, ...'
 * @returns {boolean|void} For callers to consider event propagation or not
 */
// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
MegaData.prototype.contextMenuUI = function contextMenuUI(e, ll, items) {
    "use strict";

    let asyncShow = false;
    let menuNode;

    // is contextmenu disabled
    if (localStorage.contextmenu) {
        console.warn('context menus are disabled.');
        return true;
    }

    // function to recuring repositioning for sub menus.
    const findNewPosition = () => {
        const res = M.adjustContextMenuPosition(e, menuNode);
        if (!res) {
            $.hideContextMenu();
            return;
        }
        const subMenus = menuNode.querySelectorAll('.context-submenu');
        for (const subMenu of subMenus) {
            subMenu.classList.add('hidden');
        }
    };
    let finalItems = [];

    const showContextMenu = () => {
        menuNode = menuNode || mega.ui.contextMenu.show(finalItems);
        // This part of code is also executed when ll == 'undefined'

        M.adjustContextMenuPosition(e, menuNode);

        M.disableCircularTargets('#fi_');

        menuNode.classList.remove('hidden');

        $(window).rebind('resize.ccmui', SoonFc(findNewPosition));

        // disable scrolling
        const $psContainer = $(e.currentTarget || e.target).closest('.ps');
        if ($psContainer.length) {
            Ps.disable($psContainer[0]);
            $.disabledContianer = $psContainer;
        }

        mBroadcaster.sendMessage('showcontextmenu');
    };

    $.hideContextMenu(e);

    // Used when right click is occurred outside item, on empty canvas
    if (ll === 2) {
        // to init megaSync, as the user may click of file/folder upload
        // the below event handler will setup the communication with MEGASYNC
        const fupload = document.getElementById('fileselect1');
        const mEvent = new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        fupload.dispatchEvent(mEvent);

        if (M.currentdirid !== 'shares' && M.currentdirid !== 'out-shares') {
            // Enable upload item menu for clould-drive, don't show it for rubbish and rest of crew

            const nodeRights = M.getNodeRights(M.currentCustomView.nodeID || M.currentdirid);
            const h = M.currentdirid.split('/').pop();
            const n = M.getNodeByHandle(h);
            const nodeRoot = M.getNodeRoot(h);

            if (nodeRights && M.currentrootid !== M.RubbishID && M.currentrootid !== M.InboxID
                && nodeRoot !== M.InboxID) {

                if (n.s4 && 'kernel' in s4 && s4.kernel.getS4NodeType(n) === 'container') {
                    finalItems.push('.new-bucket-item');
                }
                else {
                    finalItems.push('.fileupload-item', '.newfolder-item');

                    if (nodeRights > 0) {
                        finalItems.push('.newfile-item');
                    }

                    if ($.hasWebKitDirectorySupport === undefined) {
                        $.hasWebKitDirectorySupport = 'webkitdirectory' in document.createElement('input');
                    }

                    if ($.hasWebKitDirectorySupport) {
                        finalItems.push('.folderupload-item');
                    }

                    if (nodeRoot !== 's4' && mega.rewind && mega.rewind.permittedRoots[M.currentrootid]
                        && !M.onDeviceCenter
                    ) {
                        finalItems.push('.rewind-item');
                    }
                }
            }
        }

        if (M.currentdirid === 'out-shares') {
            finalItems.push('.new-share-item');
        }

        if (M.currentdirid === 'file-requests') {
            finalItems.push('.file-request-create');
        }

        if (M.currentdirid === 'public-links') {
            finalItems.push('.new-link-item');
        }

        if (M.currentrootid === M.RubbishID && M.v.length) {
            finalItems.push('.clearbin-item');
        }

        if (M.currentrootid === 'albums') {
            finalItems.push('.new-album-item');
        }

        if (M.currentCustomView && M.currentCustomView.type === 's4' && M.currentCustomView.subType === 'container') {
            finalItems.push('.s4-accsetting-item', '.new-bucket-item');
        }

        if (!finalItems.length) {
            return false;
        }
    }
    else if (ll === 3) {
        finalItems.push('.download-standart-item', '.zipdownload-item');
    }
    else if (ll === 7) { // Columns selection menu
        if (M && M.columnsWidth && M.columnsWidth.cloud) {
            // Please be aware that have to hide all hyperlink dropdown items that are options in context menu,
            // not including any ones under submenu with the span tag.
            // Then filter them with the classname of visible-col-select
            // and display correct ones based on the visible columns list.
            var $currMenuItems = $('.files-menu.context a.dropdown-item')
                .addClass('hidden').filter('.visible-col-select');
            finalItems.push('.sort-grid-item-main');
            for (var col in M.columnsWidth.cloud) {
                if (M.columnsWidth.cloud[col] && M.columnsWidth.cloud[col].disabled) {
                    continue;
                }
                else {
                    if (M.columnsWidth.cloud[col] && M.columnsWidth.cloud[col].viewed) {
                        $currMenuItems.filter('[megatype="' + col + '"]').attr('isviewed', 'y')
                            .removeClass('hidden').find('i').removeClass('icon-add').addClass('icon-check');
                    }
                    else {
                        $currMenuItems.filter('[megatype="' + col + '"]').removeAttr('isviewed')
                            .removeClass('hidden').find('i').removeClass('icon-check').addClass('icon-add');
                    }
                }
            }
        }
    }
    else if (ll === 8 && items) { // Passes requested items
        asyncShow = true;
        M.menuItems(e)
            .then(() => {
                finalItems = (Array.isArray(items) ?
                    items : typeof items === 'string' ? items.split(',') : Object.keys(items)).map(s => s.trim());
                onIdle(showContextMenu);
            })
            .catch(dump);
    }
    else if (ll) {// Click on item
        let id;
        let currNodeClass;
        const $currentTarget = $(e.currentTarget);
        let isTree = false;

        // This event is context on selection bar
        if ($currentTarget.hasClass('js-statusbarbtn')) {
            id = $.selected[0];
            currNodeClass = $.gridLastSelected ? $.gridLastSelected.classList : false;
        }
        // This event is context on node itself
        else {
            id = $currentTarget.attr('id');
            currNodeClass = $currentTarget.prop('classList');
        }

        if (id) {

            // File manager left panel click
            if (id.includes('treea_')) {
                id = id.replace(/treea_+|(os_|pl_)/g, '');
                eventlog(500036);
                isTree = true;
            }

            // File manager breadcrumb path click
            else if (id.startsWith('pathbc-')) {
                id = id.replace('pathbc-', '');
            }
            // File manager header context item click
            else if (id.startsWith('fmhead_')) {
                id = id.replace('fmhead_', '');
            }
        }

        // In case that id belongs to devices tree
        if (currNodeClass && currNodeClass.contains('device-item')) {
            finalItems = mega.devices.ui.contextMenu();
        }
        else if (currNodeClass && (currNodeClass.contains('cloud-drive') || currNodeClass.contains('folder-link'))) {
            finalItems.push('.properties-item');

            if (folderlink) {
                finalItems.push('.import-item');
                if (M.v.length) {
                    finalItems.push('.zipdownload-item', '.download-standart-item');
                    if (pfcol) {
                        finalItems.push('.play-slideshow');
                    }
                }
                if (!pfcol) {
                    finalItems.push('.getlink-item');
                }
            }
            else if (mega.rewind) {
                finalItems.push('.rewind-item');
            }
            $.selected = [M.RootID];
        }
        else if (currNodeClass && $(e.currentTarget).hasClass('inbox')) {
            $.selected = [M.InboxID];
            finalItems.push('.properties-item');
        }
        else if (currNodeClass && currNodeClass.contains('rubbish-bin')) {
            $.selected = [M.RubbishID];
            finalItems.push('.properties-item');
            if (currNodeClass.contains('filled')) {
                finalItems.push('.clearbin-item');
            }
        }
        else if (pfcol) {
            const albums = mega.gallery.albums;
            const selections = Object.keys(albums.grid.timeline.selections);
            const oneImageSelected = selections.length === 1 && !!M.isGalleryImage(M.d[selections[0]]);
            const hasImageSelected = selections.some((h) => !!M.isGalleryImage(M.d[h]));
            const onlyPlayableVideosSelected = selections.every((h) => !!is_video(M.d[h]));
            const allowSlideshow = oneImageSelected
                && mega.gallery.nodesAllowSlideshow(mega.gallery.albums.store[M.d[pfid].id].nodes);

            finalItems.push('.properties-item', '.import-item');
            if (allowSlideshow) {
                finalItems.push('.play-slideshow');
            }
            if (hasImageSelected) {
                finalItems.push('.preview-item');
            }
            if (onlyPlayableVideosSelected) {
                finalItems.push('.play-item');
            }

            $.selected = selections;
        }
        else if (currNodeClass
            && (currNodeClass.contains('data-block-view') || currNodeClass.contains('folder') ||
                currNodeClass.contains('mega-node')) || String(id).length === 8) {

            asyncShow = true;
            M.menuItems(e, isTree)
                .then((items) => {
                    // Hide context menu items not needed for undecrypted nodes
                    const takedownCount = $.selected.reduce((t, h) => {
                        return M.getNodeShare(h).down === 1 ? t + 1 : t;
                    }, 0);
                    if (missingkeys[id]) {
                        delete items['.add-star-item'];
                        delete items['.zipdownload-item'];
                        delete items['.download-item'];
                        delete items['.download-standart-item'];
                        delete items['.rename-item'];
                        delete items['.copy-item'];
                        delete items['.move-item'];
                        delete items['.getlink-item'];
                        delete items['.embedcode-item'];
                        delete items['.colour-label-items'];
                        delete items['.send-to-contact-item'];
                        delete items['.transferit-item'];
                        delete items['.add-sensitive-item'];
                        delete items['.sh4r1ng-item'];
                        delete items['.removeshare-item'];
                        delete items['.file-request-create'];
                        delete items['.file-request-manage'];
                        delete items['.file-request-copy-link'];
                        delete items['.file-request-remove'];
                        delete items['.import-item'];
                        delete items['.edit-file-item'];
                    }
                    else if (takedownCount) {
                        delete items['.zipdownload-item'];
                        delete items['.download-item'];
                        delete items['.download-standart-item'];
                        delete items['.properties-item'];
                        delete items['.rename-item'];
                        delete items['.rewind-item'];
                        delete items['.properties-versions'];
                        delete items['.clearprevious-versions'];
                        if (takedownCount === $.selected.length) {
                            delete items['.copy-item'];
                            delete items['.move-item'];
                            delete items['.send-to-contact-item'];
                        }
                        else {
                            items['.properties-item'] = 1;
                        }
                    }
                    else if (items['.rewind-item']) {
                        // We know the rewind-item is already active and passed the check
                        // We need to check the 2nd time if the source of event is on right location
                        const fromCloudDriveTree = $currentTarget.closest('.js-myfile-tree-panel').length;
                        if (!fromCloudDriveTree && M.currentrootid !== M.RootID) {
                            delete items['.rewind-item'];
                        }
                    }

                    if (M.getNodeByHandle(id).su) {
                        const ed = authring.getContactAuthenticated(M.d[id].su, 'Ed25519');

                        if (!(ed && ed.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) &&
                            M.currentdirid !== `chat/contacts/${M.d[id].su}`) {
                            items['.verify-credential'] = 1;
                        }
                    }

                    // Hide Info item if properties dialog is opened
                    if ($.dialog === 'properties') {
                        delete items['.properties-item'];
                    }

                    // Hide items for selection Bar Options button
                    if (!$currentTarget.attr('id')) {
                        const shownItems = mega.ui.secondaryNav && mega.ui.secondaryNav.selectionBarItems ?
                            mega.ui.secondaryNav.selectionBarItems.flat() :
                            ['.download-item', '.sh4r1ng-item', '.getlink-item', '.remove-item'];
                        if ($.menuForcedItems && $.menuForcedItems.length) {
                            const flat = $.menuForcedItems.flat();
                            for (const menuItem of flat) {
                                const idx = shownItems.indexOf(menuItem);
                                if (idx > -1) {
                                    shownItems.splice(idx, 1);
                                }
                            }
                        }
                        for (const item of shownItems) {
                            delete items[item];
                        }
                    }

                    finalItems = Object.keys(items);

                    onIdle(showContextMenu);
                })
                .catch(dump);
        }
        else {
            return false;
        }
    }

    if (!asyncShow) {
        showContextMenu();
    }

    e.preventDefault();
};

/**
 * Sets the text in the context menu for the Get link and Remove link items. If there are
 * more than one nodes selected then the text will be pluralised. If all the selected nodes
 * have public links already then the text will change to 'Update link/s'.
 */
MegaData.prototype.setContextMenuGetLinkText = function() {
    "use strict";

    var numOfExistingPublicLinks = 0;
    var numOfSelectedNodes = Object($.selected).length;
    var getLinkText = '';

    // Loop through all selected nodes
    for (var i = 0; i < numOfSelectedNodes; i++) {

        // Get the node handle of the current node
        var nodeHandle = $.selected[i];

        // If it has a public link, then increment the count
        if (M.getNodeShare(nodeHandle)) {
            numOfExistingPublicLinks++;
        }
    }

    // Toggle manage link class for a/b testing purposes
    const cdGetLinkToggle = (func) => {
        const el = document.querySelector('.dropdown.body .cd-getlink-item');

        if (el && !is_mobile) {
            el.classList[func]('manage-link');
        }
    };

    // If all the selected nodes have existing public links, set text to 'Manage links' or 'Manage link'
    if (numOfSelectedNodes === numOfExistingPublicLinks) {
        getLinkText = numOfSelectedNodes > 1 ? l[17520] : l[6909];
        cdGetLinkToggle('add');
    }
    else {
        // Otherwise change text to 'Share links' or 'Share link' if there are selected nodes without links
        getLinkText = mega.icu.format(l.share_link, numOfSelectedNodes);
        cdGetLinkToggle('remove');
    }

    // If there are multiple nodes with existing links selected, set text to 'Remove links', otherwise 'Remove link'
    const removeLinkText = numOfExistingPublicLinks > 1 ? l[8735] : l[6821];

    // Set the text for the 'Get/Update link/s' and 'Remove link/s' context menu items
    if (is_mobile) {

        mega.ui.contextMenu.getChild('.getlink-item').text = getLinkText;
        mega.ui.contextMenu.getChild('.removelink-item').text = removeLinkText;
    }
    else {
        document.querySelector('.dropdown.body .getlink-item span').textContent = getLinkText;
        document.querySelector('.dropdown.body .removelink-item span').textContent = removeLinkText;
        document.querySelector('.dropdown.body .cd-getlink-item span').textContent = getLinkText;
        document.querySelector('.dropdown.body .cd-removelink-item span').textContent = removeLinkText;
    }
};

/**
 * Sets the text in the context menu for the sharing option.
 * If the folder is shared or has pending shares then the text will be set to 'Manage share',
 * else the text will be set to 'Share folder'.
 */
MegaData.prototype.setContextMenuShareText = function() {
    'use strict';

    const n = M.d[$.selected[0]] || false;
    const isS4Bucket = n.s4 && 'kernel' in s4 && s4.kernel.getS4NodeType(n) === 'bucket';
    let getLinkText = M.currentrootid === M.InboxID
        || M.getNodeRoot($.selected[0]) === M.InboxID ? l.read_only_share : l[5631];
    let getLinkIcon = 'sprite-mobile-fm-mono icon-share-thin-outline';
    let manageIcon = 'icon-folder-outgoing-share';
    let removeIcon = 'icon-folder-remove-share';
    const cdShareItem = document.querySelector('.dropdown.body .cd-sh4r1ng-item');

    if (isS4Bucket) {
        getLinkText = l.s4_share_bucket;
        manageIcon = 'icon-bucket-outgoing-share';
        removeIcon = 'icon-bucket-remove-share';
    }

    // Toggle manage share class for a/b testing purposes
    const cdShareToggle = (func) => {
        if (cdShareItem && !is_mobile) {
            cdShareItem.classList[func]('manage-share');
        }
    };

    // If the node has shares or pending shares, set to 'Manage share', else, 'Share folder'
    if (n && M.getNodeShareUsers(n, 'EXP').length || M.ps[n]) {
        getLinkText = l.manage_share;
        getLinkIcon = 'sprite-fm-mono icon-settings-thin-outline';
        cdShareToggle('add');
    }
    else {
        cdShareToggle('remove');
    }

    if (is_mobile) {

        const shareBtn = mega.ui.contextMenu.getChild('.sh4r1ng-item');
        shareBtn.text = getLinkText;
        shareBtn.icon = getLinkIcon;
    }
    else {

        const shareItem = document.querySelector('.dropdown.body .sh4r1ng-item');
        const removeItem = document.querySelector('.dropdown.body .removeshare-item');
        const cdRemoveItem = document.querySelector('.dropdown.body .cd-removeshare-item');

        cdShareItem.querySelector('span').textContent = getLinkText;
        cdShareItem.querySelector('i').className = `sprite-fm-mono ${manageIcon}`;
        shareItem.querySelector('span').textContent = getLinkText;
        shareItem.querySelector('i').className = `sprite-fm-mono ${manageIcon}`;
        removeItem.querySelector('i').className = `sprite-fm-mono ${removeIcon}`;
        cdRemoveItem.querySelector('i').className = `sprite-fm-mono ${removeIcon}`;
    }
};

/**
 * Position the context menuNode based on the event
 *
 * @param {Event} ev event
 * @param {Element} menuNode Context menu DOM node
 * @returns {boolean} True
 */
MegaData.prototype.adjustContextMenuPosition = function(ev, menuNode) {
    "use strict";

    // mouse cursor, returns the coordinates within the application's client area
    // at which the event occurred (as opposed to the coordinates within the page)
    const { clientX, clientY } = ev instanceof MegaDataEvent ? ev.originalEvent : ev;

    // If a DOM element loses its children while ctx menu is opened from the ... menu,
    // We need to search for the new `delegateTarget` to calculate offsets
    // Currently only necessary for DC. Subject to change.
    const getLostDelegate = (ev) => {
        let { currentTarget, delegateTarget } = ev;
        if (currentTarget instanceof MegaComponent) {
            currentTarget = currentTarget.domNode;
        }
        const { id } = currentTarget;
        if (id) {
            const selector =
                `.${[...(delegateTarget || currentTarget).classList]
                    .filter(c => c !== 'active' && c !== 'ctx-source')
                    .join('.')}`;
            const del = document.getElementById(id);
            if (del) {
                const sameSel = del.querySelector(selector);
                if (sameSel) {
                    return sameSel;
                }
                return del;
            }
            return false;
        }
    };

    let mPos;
    if (ev.type === 'click' && !ev.calculatePosition) {
        // left click
        let delegate = ev.delegateTarget || ev.currentTarget;
        if (delegate instanceof MegaComponent) {
            delegate = delegate.domNode;
        }
        const ico = { x: delegate.clientWidth, y: delegate.clientHeight };
        if (!ico.x && !ico.y && !document.contains(delegate)) {
            delegate = getLostDelegate(ev);
            if (delegate) {
                ico.x = delegate.clientWidth;
                ico.y = delegate.clientHeight;
            }
            else {
                return false;
            }
        }
        delegate.classList.add('ctx-source', 'active');
        const icoPos = getHtmlElemPos(delegate);
        mPos = M.reCalcMenuPosition(menuNode, icoPos.x, icoPos.y, ico);
    }
    else {
        // right click
        mPos = M.reCalcMenuPosition(menuNode, clientX, clientY);
    }

    // set menu position
    menuNode.style.top = `${mPos.y}px`;
    menuNode.style.left = `${mPos.x}px`;

    return true;
};

/** * Finalise submenu calculations for context menu positioning
 * @param {Element} menuNode The parent menu node, which hover to show submenu
 * @param {Element} subMenuNode The submenu node to position
 * @param {Object} options The options object containing positioning data
 * @param {Number} options.maxX The maximum X coordinate for the submenu, usually right edge of window
 * @param {Number} options.maxY The maximum Y coordinate for the submenu, usually bottom edge of window
 * @param {Number} options.wMax coordinate of context menu right edge
 * @param {Number} options.nmW The width of the submenu
 * @param {Number} options.nmH The height of the submenu
 * @param {Number} options.minX The minimum X coordinate for the submenu
 * @param {Number} options.x The X coordinate of the parent menu
 * @param {Number} options.y The Y coordinate of the parent menu
 * @param {Number} options.wW The width of the window
 * @param {Number} options.SIDE_MARGIN The side margin for the submenu
 * @returns {Object|boolean} Returns an object with the final position or true if the submenu overlaps the parent menu
 */
MegaData.prototype.finaliseSubmenuCalcs = function(menuNode, subMenuNode, options) {
    'use strict';

    let left = '100%';
    let right = 'auto';
    const { maxX, maxY, wMax, nmW, nmH, minX, x, y, wW, SIDE_MARGIN } = options;

    const style = window.getComputedStyle(subMenuNode);
    const nTop = parseInt(style.getPropertyValue('padding-top'), 10);
    const tB = parseInt(style.getPropertyValue('border-top-width'), 10);
    const pScrollTop = (subMenuNode.closest('#cm_scroll') || {}).scrollTop || 0;
    const b = y - pScrollTop + nmH - nTop - tB; // bottom of submenu

    let difference = 0;

    if (b > maxY) {
        difference += b - maxY + pScrollTop - 12;
    }
    else {
        difference += pScrollTop;
    }
    const top = `${menuNode.offsetTop - tB - nTop - difference}px`;

    const overlapParentMenu = (nextNode) => {
        const tre = wW - wMax; // to right edge
        const tle = x - minX - SIDE_MARGIN; // to left edge

        nextNode.style.top = top;
        if (tre >= tle) {
            nextNode.classList.add('overlap-right');
            nextNode.style.left = `${maxX - x - nmW}px`;
        }
        else {
            nextNode.classList.add('overlap-left');
            nextNode.style.right = `${wMax - nmW - minX}px`;
        }
    };

    const rtl = document.body.classList.contains('rtl');

    const showLeft = minX <= x - nmW;
    const showRight = maxX >= wMax + nmW;
    if (rtl) {
        if (menuNode.closest('.right-position')) {
            if (showRight) {
                subMenuNode.classList.add('right-position');
            }
            else if (showLeft) {
                left = '100%';
                right = 'auto';
            }
            else {
                overlapParentMenu(subMenuNode);
                return true;
            }
            return { top, left, right };
        }
        if (showLeft) {
            left = '100%';
            right = 'auto';
        }
        else if (showRight) {
            subMenuNode.classList.add('right-position');
        }
        else {
            overlapParentMenu(subMenuNode);
            return true;
        }
        return { top, left, right };
    }
    if (menuNode.closest('.left-position')) {
        if (showLeft) {
            subMenuNode.classList.add('left-position');
        }
        else if (showRight) {
            left = 'auto';
            right = '100%';
        }
        else {
            overlapParentMenu(subMenuNode);
            return true;
        }
        return { top, left, right };
    }
    if (showRight) {
        left = 'auto';
        right = '100%';
    }
    else if (showLeft) {
        subMenuNode.classList.add('left-position');
    }
    else {
        overlapParentMenu(subMenuNode);
        return true;
    }
    return { top, left, right };
};

/**
 * Calculates coordinates where context menu will be shown
 * @param {Element} menuNode DOM element of context menu or child class
 * @param {Number} x Coordinate x of cursor or clicked element
 * @param {Number} y Coordinate y of cursor or clicked element
 * @param {Object} ico JSON {x, y} width and height of element clicked on
 * @returns {Object} Coordinates {x, y} where context menu will be drawn
 */
MegaData.prototype.reCalcMenuPosition = function(menuNode, x, y, ico) {
    "use strict";

    const TOP_MARGIN = 12;
    const SIDE_MARGIN = 12;

    let hiddenUpdate;

    // make it as visitble hidden for temporary to get context size to avoid 'display: none!important' return size 0 bug
    // Somehow 'display: none' with '!important' causing jQuery offsetWidth and offsetHeight malfunction.
    if (menuNode.classList.contains('hidden')) {
        menuNode.classList.add('v-hidden');
        menuNode.classList.remove('hidden');
        hiddenUpdate = true;
    }

    // dimensions without margins calculated
    let { width: cmW, height: cmH } = menuNode.getBoundingClientRect();

    if (hiddenUpdate) {
        menuNode.classList.add('hidden');
        menuNode.classList.remove('v-hidden');
    }

    const wH = window.innerHeight;
    const wW = window.innerWidth;
    const maxX = wW - SIDE_MARGIN; // max horizontal coordinate, right side of window
    const maxY = wH - TOP_MARGIN; // max vertical coordinate, bottom side of window

    // min horizontal coordinate, left side of right panel
    const minX = SIDE_MARGIN;
    const wMax = x + cmW; // coordinate of context menu right edge
    const hMax = y + cmH; // coordinate of context menu bottom edge

    let nmH;
    let nmW;

    const handleSmall = (dPos) => {
        let dropSections = menuNode.querySelectorAll('.dropdown-section');
        if (dropSections.length) {
            const wrap = mCreateElement('div', { class: 'context-scrolling-block', id: 'cm_scroll'});
            dropSections[0].parentNode.prepend(wrap);
            wrap.append(...dropSections);
        }
        else {
            dropSections = menuNode.querySelector('.fm-context-body');
            dropSections.classList.add('context-scrolling-block');
            dropSections.id = 'cm_scroll';
        }
        if (!menuNode.classList.contains('mega-height')) {
            mCreateElement('span', { class: 'context-top-arrow' }, menuNode);
            mCreateElement('span', { class: 'context-bottom-arrow' }, menuNode);
        }
        menuNode.classList.add('mega-height');
        cmH = wH - TOP_MARGIN * 2;
        menuNode.style.height = `${wH - TOP_MARGIN * 2}px`;
        menuNode.addEventListener('mousemove', M.scrollMegaSubMenu);
        dPos.y = wH - cmH;
    };

    const removeMegaHeight = () => {
        if (menuNode.classList.contains('mega-height')) {
            // Cleanup for scrollable context menu upon resizing window.
            const scroll = document.getElementById('cm_scroll');
            if (scroll.classList.contains('fm-context-body')) {
                scroll.classList.remove('context-scrolling-block');
                scroll.id = '';
            }
            else {
                const parent = scroll.parentNode;
                while (scroll.firstChild) {
                    parent.insertBefore(scroll.firstChild, scroll);
                }
                parent.removeChild(scroll);
            }
            menuNode.classList.remove('mega-height');
            menuNode.querySelector('.context-top-arrow').remove();
            menuNode.querySelector('.context-bottom-arrow').remove();
            menuNode.style.height = 'auto'; // In case that window is enlarged
        }
    };

    let dPos; // new context menu position
    const rtl = document.body.classList.contains('rtl');

    if (typeof ico === 'object') {// draw context menu relative to file-settings-icon
        dPos = { x , y: y + ico.y + 4 }; // position for right-bot

        // draw to the left
        if (wMax > maxX) {
            dPos.x = x - cmW + ico.x;// additional pixels to align with -icon
        }

        if (cmH + 24 >= wH) {// Handle small windows height
            handleSmall(dPos);
        }
        else {
            removeMegaHeight();
            if (hMax > maxY - TOP_MARGIN) {
                dPos.y = y - cmH - 4;
                if (dPos.y < TOP_MARGIN) {
                    dPos.y = TOP_MARGIN;
                }
            }
        }
    }
    else if (ico === 'submenu') {// submenues
        const next = (elem, selector) => {
            const nextElem = elem.nextElementSibling;
            if (!selector) {
                return nextElem;
            }
            if (nextElem && nextElem.matches(selector)) {
                return nextElem;
            }
            return null;
        };
        const nextNode = next(menuNode, '.dropdown.body.submenu') || next(menuNode, '.context-submenu');
        // margin not calculated
        ({ width: nmW, height: nmH } = nextNode.getBoundingClientRect());
        if (nmH >= (maxY - TOP_MARGIN)) {// Handle huge menu
            nmH = maxY - TOP_MARGIN;
            const tmp = document.getElementById(`csb_${String(menuNode.id).replace('fi_', '')}`);
            if (tmp) {
                tmp.classList.add('context-scrolling-block');
                tmp.addEventListener('mousemove', M.scrollMegaSubMenu.bind(this));

                // add scrollable context menu.
                nextNode.classList.add('mega-height');
                nextNode.style.height = `${nmH}px`;
            }
        }

        return this.finaliseSubmenuCalcs(
            menuNode,
            nextNode,
            {
                maxX,
                maxY,
                wMax,
                nmH,
                nmW,
                minX,
                x,
                y,
                wW,
                SIDE_MARGIN
            }
        );
    }
    else {// right click

        if (rtl) {
            dPos = { x: x - 10 - cmW, y: y + 10 };
            if (dPos.x < minX) {
                // Flip to other side
                dPos.x = minX;
            }
        }
        else {
            dPos = { x: x + 10, y: y + 10 };
        }

        if (cmH + 24 >= wH) {// Handle small windows height
            handleSmall(dPos);
        }
        else {
            removeMegaHeight();
            if (hMax > maxY) {
                dPos.y = wH - cmH - TOP_MARGIN;// align with bottom
            }
        }

        if (x < minX) {
            dPos.x = minX;// left side alignment
        }
        if (wMax > maxX) {
            dPos.x = maxX - cmW;// align with right side
        }
    }

    return { x: dPos.x, y: dPos.y };
};

// Scroll menus which height is bigger then window.height
MegaData.prototype.scrollMegaSubMenu = function(ev) {
    "use strict";

    const { target, pageY: ey, clientX, clientY } = ev;
    if (
        document.elementsFromPoint(clientX, clientY).some(elm =>
            elm.classList.contains('submenu-button') || elm.classList.contains('context-submenu'))
    ) {
        return;
    }
    const heightNode = target.closest('.mega-height');
    let pNode = heightNode ? heightNode.firstChild : false;

    if (!pNode) {
        pNode = heightNode;
    }

    if (pNode) {
        const h = pNode.offsetHeight;
        const dy = h * 0.1; // 10% dead zone at the begining and at the bottom
        const pos = getHtmlElemPos(pNode, true);
        let py = (ey - pos.y - dy) / (h - dy * 2);

        const topArr = heightNode.querySelector('.context-top-arrow');
        const bottomArr = heightNode.querySelector('.context-bottom-arrow');
        if (py > 1) {
            py = 1;
            bottomArr.classList.add('disabled');
        }
        else if (py < 0) {
            py = 0;
            topArr.classList.add('disabled');
        }
        else {
            topArr.classList.remove('disabled');
            bottomArr.classList.remove('disabled');
        }
        pNode.scrollTop = py * (pNode.scrollHeight - h);
    }
};

MegaData.prototype.getSelectedRemoveLabel = (handlesArr) => {
    'use strict';

    let allAreRubbish = true;
    let allAreNotRubbish = true;

    for (let i = 0; i < handlesArr.length; i++) {
        if (M.getNodeRoot(handlesArr[i]) === M.RubbishID) {
            allAreNotRubbish = false;
        }
        else {
            allAreRubbish = false;
        }

        if (!allAreRubbish && !allAreNotRubbish) {
            break;
        }
    }

    if (allAreRubbish) {
        return l.delete_permanently;
    }

    if (allAreNotRubbish) {
        return l.move_to_rubbish_bin;
    }

    return l[83];
};
