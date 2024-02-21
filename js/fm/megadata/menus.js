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
        if (rootTree) {
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
            var fid = escapeHTML(folders[i].h);

            cs = '';
            sm = '';
            if (this.tree[fid]) {
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

MegaData.prototype.getSelectedSourceRoot = function(isSearch) {
    'use strict';

    let sourceRoot = isSearch || M.currentdirid === 'recents'
        || M.currentdirid === 'public-links' || M.currentdirid === 'out-shares'
        ? M.getNodeRoot($.selected[0]) : M.currentrootid;

    if (sourceRoot === 'file-requests') {
        sourceRoot = M.RootID;
    }

    return sourceRoot;
};

MegaData.prototype.checkSendToChat = function(isSearch, sourceRoot) {
    'use strict';

    // view send to chat if all selected items are files
    if (!folderlink && window.megaChatIsReady && $.selected.length) {

        for (let i = $.selected.length; i--;) {

            let n = M.d[$.selected[i]];
            const nRoot = isSearch ? n && n.u === u_handle && M.getNodeRoot($.selected[i]) : sourceRoot;

            if (!n || n.t && (nRoot !== M.RootID && nRoot !== M.InboxID && nRoot !== 's4'
                && !M.isDynPage(nRoot)) || nRoot === M.RubbishID) {

                return false;
            }
        }
        return true;
    }
    return false;
};


/**
 * Build an array of context-menu items to show for the selected node
 * @returns {Promise}
 */
// @todo make eslint happy..
// eslint-disable-next-line complexity,sonarjs/cognitive-complexity
MegaData.prototype.menuItems = async function menuItems() {
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

    let n;
    const items = Object.create(null);
    const isSearch = page.startsWith('fm/search');
    const selNode = M.getNodeByHandle($.selected[0]);
    const sourceRoot = M.getSelectedSourceRoot(isSearch);
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

                        items[`.file-request-manage${fileRequestPageClass}`] = 1;
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
            if (mega.rewind && sourceRoot === M.RootID && !!mega.rewind.contextMenu) {
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

                    if (mediaType === 1 && sourceRoot !== M.RubbishID && sourceRoot !== "shares") {
                        items['.embedcode-item'] = 1;
                    }
                }
                else if (is_text(selNode)) {
                    items['.edit-file-item'] = 1;
                }
            }
        }

        if (M.currentCustomView || M.currentdirid && M.currentdirid.startsWith('search/')) {
            items['.open-cloud-item'] = 1;
            if (folderlink) {
                items['.open-in-location'] = 1;
            }
            else {
                items['.open-cloud-item'] = 1;
            }
        }

        if (M.getNodeRights(selNode.h) > 1) {
            items['.rename-item'] = 1;
            items['.colour-label-items'] = 1;

            if (!isInShare) {
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

            M.colourLabelcmUpdate(selNode.h);

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
        items['.colour-label-items'] = 1;
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

        if (allAreFavourite) {
            $('.add-star-item').safeHTML('<i class="sprite-fm-mono icon-favourite-removed"></i>@@', l[5872]);
        }
        else {
            $('.add-star-item').safeHTML('<i class="sprite-fm-mono icon-favourite"></i>@@', l[5871]);
        }

        M.colourLabelcmUpdate($.selected);
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

    if (folderlink) {
        delete items['.copy-item'];
        delete items['.add-star-item'];
        delete items['.embedcode-item'];
        delete items['.colour-label-items'];
        delete items['.properties-versions'];
        delete items['.clearprevious-versions'];

        items['.import-item'] = 1;
        items['.getlink-item'] = 1;

        if (selNode.vhl || !selNode.t && self.d && localStorage.compli) {
            items['.vhl-item'] = 1;
        }
    }

    if (M.isGalleryPage()) {

        items['.open-cloud-item'] = 1;

        delete items['.move-item'];
        delete items['.copy-item'];
        delete items['.rename-item'];
        delete items['.remove-item'];
        if (M.currentdirid !== 'favourites') {
            delete items['.add-star-item'];
        }
        delete items['.colour-label-items'];
        delete items['.embedcode-item'];
        delete items['.properties-versions'];
        delete items['.clearprevious-versions'];
        delete items['.open-in-location'];
    }

    if ((sourceRoot === M.RootID
         || sourceRoot === 's4' || M.isDynPage(M.currentrootid)) && !folderlink) {

        items['.move-item'] = 1;
        items['.getlink-item'] = 1;

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
            delete items['.add-star-item'];
            delete items['.colour-label-items'];
            delete items['.download-item'];
            delete items['.play-item'];
            delete items['.preview-item'];
            delete items['.edit-file-item'];
            delete items['.open-item'];
            items['.dispute-item'] = 1;
        }
    }
    else if (sourceRoot === M.RubbishID && !folderlink) {
        items['.move-item'] = 1;

        delete items['.move-item'];
        delete items['.copy-item'];
        delete items['.rename-item'];
        delete items['.add-star-item'];
        delete items['.download-item'];
        delete items['.zipdownload-item'];
        delete items['.colour-label-items'];
        delete items['.properties-versions'];
        delete items['.clearprevious-versions'];

        for (var j = $.selected.length; j--;) {
            n = M.getNodeByHandle($.selected[j]);

            if (n.rr && M.getNodeRoot(n.h) === M.RubbishID) {
                items['.revert-item'] = 1;
            }
            else if (items['.revert-item']) {
                delete items['.revert-item'];
                break;
            }
        }
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
    const $didi = $('.dropdown-item.download-item');
    $didi.addClass('contains-submenu sprite-fm-mono-after icon-arrow-right-after').removeClass('msync-found');

    if (useMegaSync === 2 || useMegaSync === 3) {
        $didi.removeClass('contains-submenu sprite-fm-mono-after icon-arrow-right-after').addClass('msync-found');

        if (useMegaSync === 2 && $.selected.length === 1 && selNode.t) {
            const {error, response} = await megasync.syncPossibleA(selNode.h).catch(dump) || false;
            if (!error && response === 0) {
                items['.syncmegasync-item'] = 1;
            }
        }
    }

    if (M.currentdirid === 'file-requests') {
        delete items['.move-item'];
        delete items['.copy-item'];
        delete items['.open-cloud-item'];
        delete items['.open-in-location'];
        delete items['.getlink-item'];
        delete items['.embedcode-item'];
        delete items['.removelink-item'];
        delete items['.sh4r1ng-item'];
        delete items['.send-to-contact-item'];
    }

    // If in MEGA Lite mode, temporarily hide any Download, Copy and Manage Share options while in the Shared area
    if (mega.lite.inLiteMode && (M.currentrootid === 'shares' || M.currentrootid === 'out-shares')) {
        delete items['.download-item'];
        delete items['.copy-item'];
        delete items['.sh4r1ng-item'];
        delete items['.remove-item'];
    }

    if (restrictedFolders || $.selected.length === 1
        && sourceRoot === M.InboxID) {

        delete items['.open-cloud-item'];
        delete items['.open-in-location'];
        delete items['.move-item'];
        delete items['.rename-item'];
        delete items['.add-star-item'];
        delete items['.colour-label-items'];
        delete items['.embedcode-item'];
        delete items['.remove-item'];

        let cl = new mega.Share.ExportLink();

        if (folderlink || cl.isTakenDown($.selected)) {
            return items;
        }

        cl = new mega.Share();

        if (cl.hasExportLink($.selected)) {
            items['.removelink-item'] = 1;
        }

        if (M.currentrootid === M.InboxID && $.selected.length === 1
            && ((selNode.devid || selNode.drvid) && selNode.td > 0
            || M.d[selNode.p].devid || M.d[selNode.p].drvid || selNode.h === M.BackupsId)) {

            items['.view-in-bc-item'] = 1;
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
        const s4Type = s4.kernel.getS4NodeType(selNode);

        delete items['.open-cloud-item'];

        if (M.currentCustomView.type !== 's4' || M.currentdirid.startsWith('search/')) {
            items['.open-s4-item'] = 1;
        }

        // Temporary block most of actions over the containers
        if (s4Type === 'container') {
            delete items['.move-item'];
            delete items['.rename-item'];
            delete items['.add-star-item'];
            delete items['.colour-label-items'];
            delete items['.embedcode-item'];
            delete items['.properties-versions'];
            delete items['.clearprevious-versions'];
            delete items['.remove-item'];
        }
        else if (s4Type === 'bucket') {
            delete items['.properties-item'];
            items['.settings-item'] = 1;
        }
        else if (s4Type === 'object') {
            items['.managepuburl-item'] = 1;
        }
    }

    return items;
};

/**
 * Show a context menu for the selected node.
 * @param {Event} e The event being dispatched
 * @param {Number} ll The type of context menu.
 * @param {String} items Requested items classes, i.e '.properties-item, ...'
 * @returns {void}
 */
// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
MegaData.prototype.contextMenuUI = function contextMenuUI(e, ll, items) {
    "use strict";

    var flt;
    var asyncShow = false;
    var m = $('.dropdown.body.files-menu');
    var $contactDetails = m.find('.dropdown-contact-details');

    // Selection of first child level ONLY of .dropdown-item in .dropdown.body
    var menuCMI = '.dropdown.body.files-menu .dropdown-section > .dropdown-item';

    // is contextmenu disabled
    if (localStorage.contextmenu) {
        console.warn('context menus are disabled.');
        return true;
    }

    // function to recuring repositioning for sub menus.
    var findNewPosition = function() {
        M.adjustContextMenuPosition(e, m);
        m.find('.contains-submenu.opened').removeClass('opened');
        m.find('.submenu.active').removeClass('active');
    };

    var showContextMenu = function() {
        // This part of code is also executed when ll == 'undefined'
        var v = m.children('.dropdown-section');

        // Count all items inside section, and hide dividers if necessary
        v.each(function() {
            var $this = $(this);
            var a = $this.find('a.dropdown-item');
            var x = a.filter(function() {
                return $(this).hasClass('hidden');
            });
            if (x.length === a.length || a.length === 0) {
                $this.addClass('hidden');
            }
            else {
                $this.removeClass('hidden');
            }
        });

        M.adjustContextMenuPosition(e, m);

        M.disableCircularTargets('#fi_');

        m.removeClass('hidden');

        // Hide last divider
        v.find('hr').removeClass('hidden');
        m.find('.dropdown-section:visible:last hr').addClass('hidden');

        $(window).rebind('resize.ccmui', SoonFc(findNewPosition));

        // disable scrolling
        var $psContainer = $(e.currentTarget).closest('.ps');
        if ($psContainer.length) {
            Ps.disable($psContainer[0]);
            $.disabledContianer = $psContainer;
        }

        mBroadcaster.sendMessage('showcontextmenu');
    };

    $.hideContextMenu(e);
    $contactDetails.addClass('hidden');

    /**
     * Adding context menu for share folder while you're on it
     * @param {Object} n node
     * @returns {void}
     */
    var shareContextMenu = function(n) {
        // Hide shares context menu for root id, out shares and S4
        const hideFrom = !['s4', 'out-shares', 'shares', 'file-requests'].includes(M.currentrootid)
            && M.RootID !== M.currentdirid;

        if (hideFrom) {
            $.selected = [n.h];

            $(menuCMI).filter('.cd-send-to-contact-item').removeClass('hidden');
            $(menuCMI).filter('.cd-getlink-item').removeClass('hidden');
            $(menuCMI).filter('.cd-sh4r1ng-item').removeClass('hidden');

            onIdle(() => M.setContextMenuShareText());
            onIdle(() => M.setContextMenuGetLinkText());
        }

        var cl = new mega.Share();
        var hasExportLink = cl.hasExportLink(n.h);

        if (hideFrom && hasExportLink) {
            $(menuCMI).filter('.cd-removelink-item').removeClass('hidden');
        }

        if (hideFrom && M.getNodeShareUsers(n.h, 'EXP').length || M.ps[n.h]) {
            $(menuCMI).filter('.cd-removeshare-item').removeClass('hidden');
        }
    };

    // Used when right click is occured outside item, on empty canvas
    if (ll === 2) {
        // to init megaSync, as the user may click of file/folder upload
        // the below event handler will setup the communication with MEGASYNC
        var fupload = document.getElementById('fileselect1');
        var mEvent = new MouseEvent('mouseover', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        fupload.dispatchEvent(mEvent);

        $(menuCMI).filter('.dropdown-item').addClass('hidden');
        var itemsViewed = false;
        var ignoreGrideExtras = false;

        if (M.currentdirid !== 'shares' && M.currentdirid !== 'out-shares') {
            // Enable upload item menu for clould-drive, don't show it for rubbish and rest of crew

            const nodeRights = M.getNodeRights(M.currentCustomView.nodeID || M.currentdirid);
            const h = M.currentdirid.split('/').pop();
            const n = M.getNodeByHandle(h);
            const nodeRoot = M.getNodeRoot(h);

            if (nodeRights && M.currentrootid !== M.RubbishID && M.currentrootid !== M.InboxID
                && nodeRoot !== M.InboxID) {

                if (M.currentrootid === 'contacts') {
                    $(menuCMI).filter('.addcontact-item').removeClass('hidden');
                    ignoreGrideExtras = true;
                }
                else if (n.s4 && 'kernel' in s4 && s4.kernel.getS4NodeType(n) === 'container') {
                    $(menuCMI).filter('.new-bucket-item').removeClass('hidden');
                }
                else {
                    $(menuCMI).filter('.fileupload-item,.newfolder-item').removeClass('hidden');

                    if (nodeRights > 0) {
                        $(menuCMI).filter('.newfile-item').removeClass('hidden');
                    }

                    if ($.hasWebKitDirectorySupport === undefined) {
                        $.hasWebKitDirectorySupport = 'webkitdirectory' in document.createElement('input');
                    }

                    if ($.hasWebKitDirectorySupport) {
                        $(menuCMI).filter('.folderupload-item').removeClass('hidden');
                    }

                    if (nodeRoot !== 's4' && mega.rewind && !!mega.rewind.contextMenu) {
                        $(menuCMI).filter('.rewind-item').removeClass('hidden');
                    }
                    // Flag added for share folder while on it at context menu
                    if (mega.flags.ab_ctxmenu_shares) {
                        shareContextMenu(n);
                    }

                }
                itemsViewed = true;
            }
        }

        if (M.currentrootid === M.RubbishID && M.v.length) {
            $('.files-menu.context .dropdown-item.clearbin-item').removeClass('hidden');
            itemsViewed = true;
        }

        if (!ignoreGrideExtras && M.viewmode) {
            itemsViewed = true;
            $('.files-menu.context .dropdown-item.sort-grid-item-main').removeClass('hidden');
            if (M.currentdirid === 'shares') {
                $('.files-menu.context .dropdown-item.sort-grid-item').addClass('hidden');
                $('.files-menu.context .dropdown-item.sort-grid-item.s-inshare').removeClass('hidden');
            }
            else if (M.currentdirid === 'out-shares') {
                $('.files-menu.context .dropdown-item.sort-grid-item').addClass('hidden');
                $('.files-menu.context .dropdown-item.sort-grid-item.s-outshare').removeClass('hidden');
            }
            else {
                $('.files-menu.context .dropdown-item.sort-grid-item').addClass('hidden');
                $('.files-menu.context .dropdown-item.sort-grid-item.s-fm').removeClass('hidden');
                if (folderlink) {
                    $('.files-menu.context .dropdown-item.sort-grid-item.s-fm.sort-label').addClass('hidden');
                    $('.files-menu.context .dropdown-item.sort-grid-item.s-fm.sort-fav').addClass('hidden');
                }

                if (M.currentrootid === M.RubbishID) {
                    $('.files-menu.context .dropdown-item.sort-grid-item.s-fm.sort-fav').addClass('hidden');
                }
            }
        }
        if (!itemsViewed) {
            return false;
        }
    }
    else if (ll === 3) {// we want just the download menu
        $(menuCMI).addClass('hidden');
        m = $('.dropdown.body.download');
        menuCMI = '.dropdown.body.download .dropdown-item';
        $(menuCMI).removeClass('hidden');
    }
    else if (ll === 4 || ll === 5) {// contactUI
        $(menuCMI).addClass('hidden');

        asyncShow = true;
        M.menuItems()
            .then((items) => {

                delete items['.download-item'];
                delete items['.zipdownload-item'];
                delete items['.copy-item'];
                delete items['.open-item'];

                if (ll === 5) {
                    delete items['.properties-item'];
                }

                for (var item in items) {
                    $(menuCMI).filter(item).removeClass('hidden');
                }

                // Hide Info item if properties dialog is opened
                if ($.dialog === 'properties') {
                    delete items['.properties-item'];
                }

                onIdle(showContextMenu);
            })
            .catch(dump);
    }
    else if (ll === 7) { // Columns selection menu
        if (M && M.columnsWidth && M.columnsWidth.cloud) {
            // Please be aware that have to hide all hyperlink dropdown items that are options in context menu,
            // not including any ones under submenu with the span tag.
            // Then filter them with the classname of visible-col-select
            // and display correct ones based on the visible columns list.
            var $currMenuItems = $('.files-menu.context a.dropdown-item')
                .addClass('hidden').filter('.visible-col-select');
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

        $(menuCMI).addClass('hidden');

        asyncShow = true;
        M.menuItems()
            .then(() => {
                onIdle(showContextMenu);
                $(menuCMI).filter(items).removeClass('hidden');
            })
            .catch(dump);
    }
    else if (ll) {// Click on item

        // Hide all menu-items
        $(menuCMI).addClass('hidden');

        var id;
        var currNodeClass;
        var $currentTarget = $(e.currentTarget);

        // This event is context on selection bar
        if ($currentTarget.hasClass('js-statusbarbtn')) {
            id = $.selected[0];
            currNodeClass = $.gridLastSelected ? $.gridLastSelected.className : false;
        }
        // This event is context on node itself
        else {
            id = $currentTarget.attr('id');
            currNodeClass = $currentTarget.attr('class');
        }

        if (id) {

            // File manager left panel click
            if (id.includes('treea_')) {
                id = id.replace(/treea_+|(os_|pl_)/g, '');
            }

            // File manager breadcrumb path click
            else if (id.startsWith('pathbc-')) {
                id = id.replace('pathbc-', '');
            }
        }

        /*if (id && !M.d[id]) {

         // exist in node list
         id = undefined;
         }*/

        // In case that id belongs to contact, 11 char length
        if (id && (id.length === 11)) {
            var $contactDetails = m.find('.dropdown-contact-details');
            var username = M.getNameByHandle(id) || '';

            flt = '.remove-contact, .share-folder-item, .set-nickname';

            // Add .send-files-item to show Send files item
            if (!window.megaChatIsDisabled) {
                flt += ',.startchat-item, .send-files-item';
                if (megaChat && megaChat.hasSupportForCalls) {
                    flt += ',.startaudiovideo-item';
                }
            }
            var $menuCmi = $(menuCMI);
            $menuCmi.filter(flt).removeClass('hidden');

            // Enable All buttons
            $menuCmi.filter('.startaudiovideo-item, .send-files-item')
                .removeClass('disabled disabled-submenu');

            // disable remove for business accounts + business users
            if (u_attr && u_attr.b && M.u[id] && M.u[id].b) {
                $menuCmi.filter('.remove-contact').addClass('disabled');
            }

            // Show Detail block
            $contactDetails.removeClass('hidden');

            if (M.viewmode) {
                $contactDetails.find('.view-profile-item').removeClass('hidden');
                $contactDetails.find('.dropdown-avatar').addClass('hidden');
                $contactDetails.find('.dropdown-user-name').addClass('hidden');
            }
            else {
                $contactDetails.find('.view-profile-item').addClass('hidden');

                // Set contact avatar
                $contactDetails.find('.dropdown-avatar').removeClass('hidden')
                    .find('.avatar').safeHTML(useravatar.contact(id, 'context-avatar'));

                // Set username
                $contactDetails.find('.dropdown-user-name').removeClass('hidden')
                    .find('.name span').text(username);
            }

            // Set contact fingerprint
            showAuthenticityCredentials(id, $contactDetails);

            // Open contact details page
            $contactDetails.rebind('click.opencontact', function() {
                loadSubPage('fm/chat/contacts/' + id);
            });

            var verificationState = u_authring.Ed25519[id] || {};
            var isVerified = (verificationState.method
                >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON);

            // Show the user is verified
            if (isVerified) {
                $contactDetails.addClass('verified');
                $contactDetails.find('.dropdown-verify').removeClass('active');
            }
            else {
                $contactDetails.removeClass('verified');
                $contactDetails.find('.dropdown-verify').addClass('active')
                    .rebind('click.verify', function(e) {
                        e.stopPropagation();
                        $.hideContextMenu(e);
                        fingerprintDialog(id);
                    });
            }
        }
        else if (currNodeClass && (currNodeClass.indexOf('cloud-drive') > -1
            || currNodeClass.indexOf('folder-link') > -1)) {
            flt = '.properties-item';

            if (folderlink) {
                flt += ',.import-item';
            }
            else {
                flt += ',.findupes-item';

                if (mega.rewind && !!mega.rewind.contextMenu) {
                    flt += ',.rewind-item';
                }
            }
            if (M.v.length && folderlink) {
                flt += ',.zipdownload-item,.download-item';
            }
            $.selected = [M.RootID];
            $(menuCMI).filter(flt).removeClass('hidden');
        }
        else if (currNodeClass && $(e.currentTarget).hasClass('inbox')) {
            $.selected = [M.InboxID];
            $(menuCMI).filter('.properties-item').removeClass('hidden');
        }
        else if (currNodeClass && currNodeClass.indexOf('rubbish-bin') > -1) {
            $.selected = [M.RubbishID];
            $(menuCMI).filter('.properties-item').removeClass('hidden');
            if (currNodeClass.indexOf('filled') > -1) {
                $(menuCMI).filter('.clearbin-item').removeClass('hidden');
            }
        }
        else if (currNodeClass && currNodeClass.indexOf('contacts-item') > -1) {
            $(menuCMI).filter('.addcontact-item').removeClass('hidden');
        }
        else if (currNodeClass && currNodeClass.indexOf('messages-item') > -1) {
            e.preventDefault();
            return false;
        }
        else if (pfcol) {
            const $menuCMI = $(menuCMI);
            const albums = mega.gallery.albums;
            const selections = Object.keys(albums.grid.timeline.selections);
            const oneImageSelected = selections.length === 1 && !!mega.gallery.isImage(M.d[selections[0]]);
            const hasImageSelected = selections.some((h) => !!mega.gallery.isImage(M.d[h]));
            const slideshowItem = $menuCMI.filter('.play-slideshow');
            const previewItem = $menuCMI.filter('.preview-item');
            const playItem = $menuCMI.filter('.play-item');
            const importItem = $menuCMI.filter('.import-item');
            const onlyPlayableVideosSelected = selections.every((h) => {
                const vid = mega.gallery.isVideo(M.d[h]);
                return !!(vid && vid.isPreviewable && MediaAttribute.getMediaType(M.d[h]));
            });
            const allowSlideshow = oneImageSelected
                && mega.gallery.nodesAllowSlideshow(mega.gallery.albums.store[M.d[pfid].id].nodes);

            slideshowItem.toggleClass('hidden', !allowSlideshow);
            previewItem.toggleClass('hidden', !hasImageSelected);
            $menuCMI.filter('.properties-item').removeClass('hidden');
            importItem.removeClass('hidden');

            $.selected = selections;

            $('span', playItem).text(l.album_play_video);
            $('span', importItem).text(u_type ? l.context_menu_import : l.btn_imptomega);

            playItem.toggleClass('hidden', !onlyPlayableVideosSelected);
        }
        else if (currNodeClass
            && (currNodeClass.includes('data-block-view') || currNodeClass.includes('folder'))
            || String(id).length === 8) {

            asyncShow = true;
            const updateUIPerItems = ($menuCMI, items) => {
                if (items['.getlink-item']) {
                    onIdle(() => M.setContextMenuGetLinkText());
                }
                if (items['.sh4r1ng-item']) {
                    onIdle(() => M.setContextMenuShareText());
                }

                if (items['.play-item']) {
                    var $playItem = $menuCMI.filter('.play-item');

                    if (is_audio(M.d[id])) {
                        $('i', $playItem).removeClass('icon-video-call-filled').addClass('icon-play-small');
                        $('span', $playItem).text(l[17828]);
                    }
                    else {
                        $('i', $playItem).removeClass('icon-play-small').addClass('icon-video-call-filled');
                        $('span', $playItem).text(l[16275]);
                    }
                }

                if (items['.remove-item']) {
                    $('span', $menuCMI.filter('.remove-item')).text(M.getSelectedRemoveLabel($.selected));
                }

                if (items['.import-item']) {
                    const $importItem = $menuCMI.filter('.import-item');

                    if (u_type) {
                        $('i', $importItem)
                            .removeClass('icon-mega-thin-outline')
                            .addClass('icon-upload-to-cloud-drive');

                        $('span', $importItem).text(l.context_menu_import);
                    }
                    else {
                        $('i', $importItem)
                            .removeClass('icon-upload-to-cloud-drive')
                            .addClass('icon-mega-thin-outline');

                        $('span', $importItem).text(l.btn_imptomega);
                    }
                }

                if (items['.open-item']) {
                    const $openItem = $menuCMI.filter('.open-item');
                    const n = M.getNodeByHandle(id);

                    if (n.s4 && 'kernel' in s4 && s4.kernel.getS4NodeType(n) === 'bucket') {
                        $('i', $openItem).removeClass('icon-folder-open').addClass('icon-bucket');
                    }
                    else {
                        $('i', $openItem).removeClass('icon-bucket').addClass('icon-folder-open');
                    }
                }

                // We know the rewind-item is already active and passed the check
                // We need to check the 2nd time if the source of event is on right location
                if (items['.rewind-item']) {
                    const fromCloudDriveTree = $currentTarget.closest('.js-myfile-tree-panel').length;
                    if (!fromCloudDriveTree && M.currentrootid !== M.RootID) {
                        $menuCMI.filter('.rewind-item').addClass('hidden');
                    }
                }
            };

            M.menuItems()
                .then((items) => {
                    const $menuCMI = $(menuCMI);

                    for (const item in items) {
                        $menuCMI.filter(item).removeClass('hidden');
                    }

                    // Hide context menu items not needed for undecrypted nodes
                    if (missingkeys[id]) {
                        $menuCMI.filter('.add-star-item').addClass('hidden');
                        $menuCMI.filter('.download-item').addClass('hidden');
                        $menuCMI.filter('.rename-item').addClass('hidden');
                        $menuCMI.filter('.copy-item').addClass('hidden');
                        $menuCMI.filter('.move-item').addClass('hidden');
                        $menuCMI.filter('.getlink-item').addClass('hidden');
                        $menuCMI.filter('.embedcode-item').addClass('hidden');
                        $menuCMI.filter('.colour-label-items').addClass('hidden');
                        $menuCMI.filter('.send-to-contact-item').addClass('hidden');
                    }
                    else if (M.getNodeShare(id).down === 1) {
                        $menuCMI.filter('.copy-item').addClass('hidden');
                        $menuCMI.filter('.move-item').addClass('hidden');
                        $menuCMI.filter('.send-to-contact-item').addClass('hidden');
                    }
                    else {
                        updateUIPerItems($menuCMI, items);
                    }

                    if (M.d[id].su) {
                        const ed = authring.getContactAuthenticated(M.d[id].su, 'Ed25519');

                        if (!(ed && ed.method >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON) &&
                            M.currentdirid !== `chat/contacts/${M.d[id].su}`) {
                            $menuCMI.filter('.verify-credential').removeClass('hidden');
                        }
                    }

                    // Hide Info item if properties dialog is opened
                    if ($.dialog === 'properties') {
                        $menuCMI.filter('.properties-item').addClass('hidden');
                    }

                    // Hide items for selection Bar Options button
                    if (!$currentTarget.attr('id')) {
                        $menuCMI.filter('.download-item, .sh4r1ng-item, .send-to-contact-item,' +
                            '.getlink-item, .remove-item').addClass('hidden');
                    }

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
        getLinkIcon = 'sprite-mobile-fm-mono icon-settings-thin-outline';
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
 * @param {jQuery.Event} e jQuery event
 * @param {Object} m Context menu jQuery object
 */
MegaData.prototype.adjustContextMenuPosition = function(e, m) {
    "use strict";

    // mouse cursor, returns the coordinates within the application's client area
    // at which the event occurred (as opposed to the coordinates within the page)
    var mX = e.clientX;
    var mY = e.clientY;

    var mPos;// menu position
    if (e.type === 'click' && !e.calculatePosition) {// Clicked on file-settings-icon
        var ico = { 'x': e.delegateTarget.clientWidth, 'y': e.delegateTarget.clientHeight };
        var icoPos = getHtmlElemPos(e.delegateTarget);// Get position of clicked file-settings-icon
        mPos = M.reCalcMenuPosition(m, icoPos.x, icoPos.y, ico);
    }
    else {// right click
        mPos = M.reCalcMenuPosition(m, mX, mY);
    }

    m.css({ 'top': mPos.y, 'left': mPos.x });// set menu position

    return true;
};

/**
 * Calculates coordinates where context menu will be shown
 * @param {Object} m jQuery object of context menu or child class
 * @param {Number} x Coordinate x of cursor or clicked element
 * @param {Number} y Coordinate y of cursor or clicked element
 * @param {Object} ico JSON {x, y} width and height of element clicked on
 * @returns {Object} Coordinates {x, y} where context menu will be drawn
 */
MegaData.prototype.reCalcMenuPosition = function(m, x, y, ico) {
    "use strict";

    var TOP_MARGIN = 12;
    var SIDE_MARGIN = 12;

    let hiddenUpdate;

    // make it as visitble hidden for temporary to get context size to avoid 'display: none!important' return size 0 bug
    // Somehow 'display: none' with '!important' causing jQuery offsetWidth and offsetHeight malfunction.
    if (m.hasClass('hidden')) {
        m.removeClass('hidden').addClass('v-hidden');
        hiddenUpdate = true;
    }

    var cmW = m.outerWidth();// dimensions without margins calculated
    var cmH = m.outerHeight();// dimensions without margins calculated

    if (hiddenUpdate) {
        m.removeClass('v-hidden').addClass('hidden');
    }

    var wH = window.innerHeight;
    var wW = window.innerWidth;
    var maxX = wW - SIDE_MARGIN;// max horizontal coordinate, right side of window
    var maxY = wH - TOP_MARGIN;// max vertical coordinate, bottom side of window

    // min horizontal coordinate, left side of right panel
    var minX = SIDE_MARGIN + $('nav.nw-fm-left-icons-panel').outerWidth();
    var minY = TOP_MARGIN;// min vertical coordinate, top side of window
    var wMax = x + cmW;// coordinate of context menu right edge
    var hMax = y + cmH;// coordinate of context menu bottom edge

    var top = 'auto';
    var left = '100%';
    var right = 'auto';

    var overlapParentMenu = function(n) {
        var tre = wW - wMax;// to right edge
        var tle = x - minX - SIDE_MARGIN;// to left edge

        if (tre >= tle) {
            n.addClass('overlap-right');
            n.css({'top': top, 'left': (maxX - x - nmW) + 'px'});
        }
        else {
            n.addClass('overlap-left');
            n.css({'top': top, 'right': (wMax - nmW - minX) + 'px'});
        }
    };

    /**
     * Calculates top position of submenu
     * Submenu is relatively positioned to the first sibling element
     * @param {Object} n jQuery object, submenu of hovered element
     * @returns {String} top Top coordinate in pixels for submenu
     */
    var horPos = function(n) {
        var top;
        var nTop = parseInt(n.css('padding-top'));
        var tB = parseInt(n.css('border-top-width'));
        var pPos = m.position();
        var b = y + nmH - (nTop - tB);// bottom of submenu
        var mP = m.closest('.dropdown.body.submenu');
        var pT = 0;
        var bT = 0;
        var pE = { top: 0 };

        if (mP.length) {
            pE = mP.offset();
            pT = parseInt(mP.css('padding-top'));
            bT = parseInt(mP.css('border-top-width'));
        }

        var difference = 0;

        if (b > maxY) {
            difference = b - maxY;
        }
        top = pPos.top - tB - difference + 'px';

        return top;
    };

    var handleSmall = function(dPos) {
        m.find('> .dropdown-section').wrapAll('<div id="cm_scroll" class="context-scrolling-block"></div>');
        m.append('<span class="context-top-arrow"></span><span class="context-bottom-arrow"></span>');
        m.addClass('mega-height');
        cmH = wH - TOP_MARGIN * 2;
        m.css({ 'height': wH - TOP_MARGIN * 2 + 'px' });
        m.on('mousemove', M.scrollMegaSubMenu);
        dPos.y = wH - cmH;
    };

    var removeMegaHeight = function() {
        if (m.hasClass('mega-height')) {
            // Cleanup for scrollable context menu upon resizing window.
            var cnt = $('#cm_scroll').contents();
            $('#cm_scroll').replaceWith(cnt);// Remove .context-scrollable-block
            m.removeClass('mega-height');
            m.find('> .context-top-arrow').remove();
            m.find('> .context-bottom-arrow').remove();
            m.css({ 'height': 'auto' });// In case that window is enlarged
        }
    };

    var dPos;// new context menu position
    var rtl = $('body').hasClass('rtl');

    if (typeof ico === 'object') {// draw context menu relative to file-settings-icon
        dPos = { 'x': x , 'y': y + ico.y + 4 };// position for right-bot

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
        var n = m.next('.dropdown.body.submenu');
        var nmW = n.outerWidth();// margin not calculated
        var nmH = n.outerHeight();// margins not calculated
        if (nmH >= (maxY - TOP_MARGIN)) {// Handle huge menu
            nmH = maxY - TOP_MARGIN;
            var tmp = document.getElementById('csb_' + String(m.attr('id')).replace('fi_', ''));
            if (tmp) {
                $(tmp).addClass('context-scrolling-block');
                tmp.addEventListener('mousemove', M.scrollMegaSubMenu.bind(this));

                // add scrollable context menu.
                n.addClass('mega-height');
                n.css({'height': nmH + 'px'});
            }
        }

        top = horPos(n);

        if (rtl) {
            if (m.parent().parent('.right-position').length === 0) {
                if (minX <= (x - nmW)) {
                    left = '100%';
                    right = 'auto';
                }
                else if (maxX >= (wMax + nmW)) {
                    n.addClass('right-position');
                }
                else {
                    overlapParentMenu(n);

                    return true;
                }
            }
            else {
                if (maxX >= (wMax + nmW)) {
                    n.addClass('right-position');
                }
                else if (minX <= (x - nmW)) {
                    left = '100%';
                    right = 'auto';
                }
                else {
                    overlapParentMenu(n);

                    return true;
                }
            }
        }
        else {
            if (m.parent().parent('.left-position').length === 0) {
                if (maxX >= (wMax + nmW)) {
                    left = 'auto';
                    right = '100%';
                }
                else if (minX <= (x - nmW)) {
                    n.addClass('left-position');
                }
                else {
                    overlapParentMenu(n);

                    return true;
                }
            }
            else {
                if (minX <= (x - nmW)) {
                    n.addClass('left-position');
                }
                else if (maxX >= (wMax + nmW)) {
                    left = 'auto';
                    right = '100%';
                }
                else {
                    overlapParentMenu(n);

                    return true;
                }
            }
        }

        return {'top': top, 'left': left, 'right': right};
    }
    else {// right click

        if (rtl) {
            dPos = { 'x': x - 10 - m.outerWidth(), 'y': y + 10 };
        }
        else {
            dPos = { 'x': x + 10, 'y': y + 10 };
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

    return { 'x': dPos.x, 'y': dPos.y };
};

// Scroll menus which height is bigger then window.height
MegaData.prototype.scrollMegaSubMenu = function(e) {
    "use strict";

    var c = $(e.target).closest('.dropdown.body.mega-height');
    var pNode = c.children(':first')[0];

    if (typeof pNode === 'undefined') {
        pNode = c[0];
    }

    if (typeof pNode !== 'undefined') {
        var ey = e.pageY;
        var h = pNode.offsetHeight;
        var dy = h * 0.1;// 10% dead zone at the begining and at the bottom
        var pos = getHtmlElemPos(pNode, true);
        var py = (ey - pos.y - dy) / (h - dy * 2);

        if (py > 1) {
            py = 1;
            c.children('.context-bottom-arrow').addClass('disabled');
        }
        else if (py < 0) {
            py = 0;
            c.children('.context-top-arrow').addClass('disabled');
        }
        else {
            c.children('.context-bottom-arrow,.context-top-arrow').removeClass('disabled');
        }
        pNode.scrollTop = py * (pNode.scrollHeight - h);
    }
};

MegaData.prototype.labelSortMenuUI = function(event, rightClick) {
    "use strict";

    var $menu = $('.colour-sorting-menu');
    var $menuItems = $('.colour-sorting-menu .dropdown-colour-item');
    var x = 0;
    var y = 0;
    var $sortMenuItems = $('.dropdown-item', $menu).removeClass('active');
    var $selectedItem;
    var type = this.currentLabelType;
    var sorting = M.sortmode || {n: 'name', d: 1};

    var dirClass = sorting.d > 0 ? 'icon-up' : 'icon-down';

    // Close label filtering sorting menu on second Name column click
    if ($menu.is(':visible') && !rightClick) {
        $menu.addClass('hidden');
        return false;
    }

    $('.colour-sorting-menu .dropdown-colour-item').removeClass('active');
    if (M.filterLabel[type]) {
        for (var key in M.filterLabel[type]) {
            if (key) {
                $menuItems.filter('[data-label-id=' + key + ']').addClass('active');
            }
        }
    }

    $selectedItem = $sortMenuItems
        .filter('*[data-by=' + sorting.n + ']')
        .addClass('active');

    var tmpFn = function() {
        x = event.clientX;
        y = event.clientY;

        $menu.css('left', x + 'px');
        $menu.css('top', y + 'px');
    };

    if (rightClick) {// FM right mouse click on node
        M.adjustContextMenuPosition(event, $menu);
    }
    else {
        tmpFn();
    }

    delay('render:search_breadcrumbs', () => M.renderSearchBreadcrumbs());
    $.hideTopMenu();
    $.hideContextMenu();
    $menu.removeClass('hidden');

    $('.colour-sorting-menu').off('click', '.dropdown-item');
    $('.colour-sorting-menu').on('click', '.dropdown-item', function() {
        // dont to any if it is static
        if ($(this).hasClass('static')){
            return false;
        }

        if (d){
            console.log('fm sorting start');
        }

        var data = $(this).data();
        var dir = 1;

        if ($(this).hasClass('active')) {// Change sort direction
            dir = sorting.d * -1;
        }

        $('.colour-sorting-menu').addClass('hidden');

        var lbl = function(el) {
            return el.lbl;
        };
        if (data.by === 'label' && !M.v.some(lbl)) {
            return false;
        }

        M.doSort(data.by, dir);
        M.renderMain();

        return false;
    });

    return false;
};

MegaData.prototype.resetLabelSortMenuUI = function() {
    "use strict";

    $('.colour-sorting-menu .dropdown-item').removeClass('active asc desc');
    return false;
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
