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
            else if (mega.megadrop.pufs[fid] && mega.megadrop.pufs[fid].s !== 1) {
                classes += ' puf-folder';
                iconClass = 'icon-folder-upload';
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

/**
 * Build an array of context-menu items to show for the selected node
 * @returns {MegaPromise}
 */
MegaData.prototype.menuItems = function menuItems() {
    "use strict";

    var rrnodes = [];
    var promise = new MegaPromise();
    var nodes = ($.selected || []).concat();

    for (var i = nodes.length; i--;) {
        var n = M.d[nodes[i]];

        if (n) {
            nodes.splice(i, 1);

            if (n.rr && M.getNodeRoot(n.h) === M.RubbishID) {
                rrnodes.push(n.rr);
            }
            // else we can delete .rr and api_setattr
        }
    }
    nodes = nodes.concat(rrnodes);

    var checkMegaSync = function _checkMegaSync(preparedItems) {
        $('.dropdown-item.download-item')
            .addClass('contains-submenu sprite-fm-mono-after icon-arrow-right-after');
        $('.dropdown-item.download-item').removeClass('msync-found');

        if (window.useMegaSync === 2 || window.useMegaSync === 3) {
            $('.dropdown-item.download-item')
                .removeClass('contains-submenu sprite-fm-mono-after icon-arrow-right-after');
            $('.dropdown-item.download-item').addClass('msync-found');
            if (window.useMegaSync === 2 && $.selected.length === 1 && M.d[$.selected[0]].t === 1) {
                var addItemAndResolvePromise = function _addItemAndResolvePromise(error, response) {
                    if (!error && response === 0) {
                        preparedItems['.syncmegasync-item'] = 1;
                    }
                    promise.resolve(preparedItems);
                };
                megasync.syncPossible($.selected[0], addItemAndResolvePromise);
            }
            else {
                promise.resolve(preparedItems);
            }
        }
        else {
            promise.resolve(preparedItems);
        }
    }

    if (nodes.length) {
        dbfetch.geta(nodes)
            .always(function () {
                var preparedItems = M.menuItemsSync();
                checkMegaSync(preparedItems);
            });
    }
    else {
        checkMegaSync(M.menuItemsSync());
    }

    return promise;
};

MegaData.prototype.getSelectedSourceRoot = function(isSearch) {

    'use strict';

    let sourceRoot = isSearch || M.currentdirid === 'recents' ? M.getNodeRoot($.selected[0]) : M.currentrootid;

    if (sourceRoot === 'public-links' || sourceRoot === 'out-shares') {
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
            let nRoot = isSearch ? (n.u === u_handle && M.getNodeRoot($.selected[i])) : sourceRoot;

            if (!n || n.t && nRoot !== M.RootID || nRoot === M.RubbishID) {
                return false;
            }
        }
        return true;
    }
    return false;
};

/**
 * Build an array of context-menu items to show for the selected node
 * @returns {Object}
 */
MegaData.prototype.menuItemsSync = function menuItemsSync() {
    "use strict";

    var n;
    var items = Object.create(null);
    var selNode = M.d[$.selected[0]] || false;
    const isSearch = page.startsWith('fm/search');
    const sourceRoot = M.getSelectedSourceRoot(isSearch);

    if (selNode && selNode.su && !M.d[selNode.p]) {
        items['.leaveshare-item'] = 1;
    }
    else if (M.getNodeRights($.selected[0]) > 1) {
        items['.move-item'] = 1;
        items['.remove-item'] = 1;
    }

    if (selNode && $.selected.length === 1) {
        if (selNode.t) {
            if (M.currentdirid !== selNode.h) {
                items['.open-item'] = 1;
            }

            if (sourceRoot === M.RootID && !folderlink) {
                items['.sh4r1ng-item'] = 1;

                if (M.getNodeShareUsers(selNode, 'EXP').length || M.ps[selNode]) {
                    items['.removeshare-item'] = 1;
                }
            }

            if ((sourceRoot === M.RootID || sourceRoot === M.InboxID)
                && u_type === 3
                && !M.getShareNodesSync(selNode.h).length
                && !folderlink) {

                // Check if the folder is taken down or not
                var shareNode = M.getNodeShare(selNode.h);
                if (shareNode === false
                    || shareNode === null
                    || shareNode.down === undefined
                    || shareNode.down !== 1) {

                    // Create or Remove upload page context menu action
                    if (mega.megadrop.pufs[selNode.h]
                        && mega.megadrop.pufs[selNode.h].s !== 1
                        && mega.megadrop.pufs[selNode.h].p) {
                        items['.removewidget-item'] = 1;
                        items['.managewidget-item'] = 1;
                    }
                    else {
                        items['.createwidget-item'] = 1;
                    }
                }
            }

            // If the selected folder contains any versioning show clear version
            if (selNode.tvf && M.getNodeRights(selNode.h) > 1) {
                items['.clearprevious-versions'] = 1;
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

        if (M.currentCustomView || M.currentdirid.startsWith('search/')) {
            items['.open-cloud-item'] = 1;
        }

        if (M.getNodeRights(selNode.h) > 1) {
            items['.rename-item'] = 1;
            items['.add-star-item'] = 1;
            items['.colour-label-items'] = 1;

            if (M.isFavourite(selNode.h)) {
                $('.add-star-item').safeHTML('<i class="sprite-fm-mono icon-favourite-removed"></i>@@', l[5872]);
            }
            else {
                $('.add-star-item').safeHTML('<i class="sprite-fm-mono icon-favourite"></i>@@', l[5871]);
            }

            M.colourLabelcmUpdate(selNode.h);

            if (items['.edit-file-item']) {
                $('.dropdown-item.edit-file-item span').text(l[865]);
            }
        }
        else if (items['.edit-file-item']) {
            $('.dropdown-item.edit-file-item span').text(l[16797]);
        }
    }

    // Allow to mark as Favourite/Labeled from multi-selection
    if ($.selected.length > 1) {
        items['.add-star-item'] = 1;
        items['.colour-label-items'] = 1;
        let allAreFavourite = true;

        for (let i = 0; i < $.selected.length; i++) {
            if (!M.isFavourite($.selected[i])) {
                allAreFavourite = false;
                break;
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
    }

    if (M.currentCustomView.type === 'gallery') {

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
    }

    if (selNode.t && !folderlink && M.currentrootid !== M.RubbishID &&
        M.currentrootid !== 'out-shares' && M.currentrootid !== 'shares' &&
        M.currentrootid !== 'public-links' && M.currentdirid !== 'recents' &&
        $.selected.length === 1 &&
        (M.currentCustomView.type !== 'gallery' || selNode.h !== M.currentCustomView.nodeID)) {
        items['.open-gallery'] = 1;
    }

    if ((sourceRoot === M.RootID) && !folderlink) {
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
            delete items['.open-gallery'];
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
        delete items['.colour-label-items'];
        delete items['.properties-versions'];
        delete items['.clearprevious-versions'];

        for (var j = $.selected.length; j--;) {
            n = M.getNodeByHandle($.selected[j]);

            if (M.d[n.rr] && M.getNodeRoot(n.h) === M.RubbishID
                && M.getNodeRoot(n.rr) !== M.RubbishID && M.getNodeRights(n.rr) > 1) {
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

            // If there is any folder selected, do not show clear version option
            if (selected.t) {
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

    return items;
};

/**
 * Show a context menu for the selected node.
 * @param {Event} e The event being dispatched
 * @param {Number} ll The type of context menu.
 */
MegaData.prototype.contextMenuUI = function contextMenuUI(e, ll) {
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

        $('.jspContainer','#bodyel').rebind('mousewheel.context', function() {
            $(this).off('mousewheel.context');
            $.hideContextMenu();
        });

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

            if (nodeRights && (M.currentrootid !== M.RubbishID)) {
                if (M.currentrootid === 'contacts') {
                    $(menuCMI).filter('.addcontact-item').removeClass('hidden');
                    ignoreGrideExtras = true;
                }
                else {
                    $(menuCMI).filter('.fileupload-item,.newfolder-item').removeClass('hidden');

                    if (nodeRights > 1) {
                        $(menuCMI).filter('.newfile-item').removeClass('hidden');
                    }

                    if (is_chrome_firefox & 2 || 'webkitdirectory' in document.createElement('input')) {
                        $(menuCMI).filter('.folderupload-item').removeClass('hidden');
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
            .done(function(items) {

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
            });
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

            // Contacts left panel click
            if (id.indexOf('contact_') !== -1) {
                id = id.replace('contact_', '');
            }

            // File manager left panel click
            else if (id.indexOf('treea_') !== -1) {
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
            var $contactBlock = $('#' + id).length ? $('#' + id) : $('#contact_' + id);
            var username = M.getNameByHandle(id) || '';

            flt = '.remove-contact, .share-folder-item, .set-nickname';

            // Add .send-files-item to show Send files item
            if (!window.megaChatIsDisabled) {
                flt += ',.startchat-item, .send-files-item';
                if (megaChat && megaChat.hasSupportForCalls) {
                    flt += ',startaudiovideo-item';
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

            // Set onlinestatus
            $contactDetails.removeClass('offline online busy away');
            if ($contactBlock.hasClass('busy')) {
                $contactDetails.addClass('busy');
            }
            if ($contactBlock.hasClass('away')) {
                $contactDetails.addClass('away');
            }
            if ($contactBlock.hasClass('online')) {
                $contactDetails.addClass('online');
            }
            // If selected contact is offline make sure that audio and video calls are forbiden (disabled)
            else if ($contactBlock.hasClass('offline') || $.selected.length > 1) {
                $contactDetails.addClass('offline');
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
        else if (currNodeClass
            && (currNodeClass.indexOf('data-block-view') > -1
            || currNodeClass.indexOf('folder') > -1
            || currNodeClass.indexOf('fm-tree-folder') > -1)
            || String(id).length === 8) {

            asyncShow = true;
            M.menuItems()
                .done(function(items) {
                    var $menuCMI = $(menuCMI);

                    for (var item in items) {
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
                });
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

    // If all the selected nodes have existing public links, set text to 'Manage links' or 'Manage link'
    if (numOfSelectedNodes === numOfExistingPublicLinks) {
        getLinkText = numOfSelectedNodes > 1 ? l[17520] : l[6909];
    }
    else {
        // Otherwise change text to 'Get links' or 'Get link' if there are selected nodes without links
        getLinkText = (numOfSelectedNodes > 1) ? l[8734] : l[59];
    }

    // If there are multiple nodes with existing links selected, set text to 'Remove links', otherwise 'Remove link'
    var removeLinkText = (numOfExistingPublicLinks > 1) ? l[8735] : l[6821];

    // Set the text for the 'Get/Update link/s' and 'Remove link/s' context menu items
    var $contextMenu = $('.dropdown.body');
    $contextMenu.find('.getlink-item span').text(getLinkText);
    $contextMenu.find('.removelink-item span').text(removeLinkText);
};

/**
 * Sets the text in the context menu for the sharing option.
 * If the folder is shared or has pending shares then the text will be set to 'Manage share',
 * else the text will be set to 'Share folder'.
 */
MegaData.prototype.setContextMenuShareText = function() {
    'use strict';

    const selectedNode = M.d[$.selected[0]] || false;

    // If the node has shares or pending shares, set to 'Manage share', else, 'Share folder'
    const getLinkText = selectedNode && M.getNodeShareUsers(selectedNode, 'EXP').length || M.ps[selectedNode]
        ? l.manage_share
        : l[5631];

    $('.sh4r1ng-item span', '.dropdown.body').text(getLinkText);
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

    $('.sort-arrow', $sortMenuItems).removeClass('icon-up icon-down');

    $selectedItem = $sortMenuItems
        .filter('*[data-by=' + sorting.n + ']')
        .addClass('active');
    $('.sort-arrow', $selectedItem).addClass(dirClass);

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
