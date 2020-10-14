/**
 * Render cloud listing layout.
 * @param {Boolean} aUpdate  Whether we're updating the list
 */
MegaData.prototype.renderMain = function(aUpdate) {
    "use strict";
    var container;
    var numRenderedNodes = -1;

    if (d) {
        console.time('renderMain');
    }

    if (!aUpdate) {
        if (this.megaRender) {
            this.megaRender.destroy();
        }
        this.megaRender = new MegaRender(this.viewmode);
    }

    if (this.previousdirid === "recents" && this.recentsRender) {
        this.recentsRender.cleanup();
    }

    // cleanupLayout will render an "empty grid" layout if there
    // are no nodes in the current list (Ie, M.v), if so no need
    // to call renderLayout therefore.
    if (this.megaRender.cleanupLayout(aUpdate, this.v, this.fsViewSel)) {

        if (this.currentdirid === 'opc') {
            this.drawSentContactRequests(this.v, 'clearGrid');
            container = '.grid-scrolling-table.opc';
        }
        else if (this.currentdirid === 'ipc') {
            this.drawReceivedContactRequests(this.v, 'clearGrid');
            container = '.grid-scrolling-table.ipc';
        }
        else {
            numRenderedNodes = this.megaRender.renderLayout(aUpdate, this.v);
            container = this.megaRender.container;
        }
    }

    // No need to bind mouse events etc (gridUI/iconUI/selecddUI)
    // if there weren't new rendered nodes (Ie, they were cached)
    if (numRenderedNodes) {
        if (!aUpdate) {
            M.addContactUI();
            if (this.viewmode) {
                fa_duplicates = Object.create(null);
                fa_reqcnt = 0;
            }
            if ($.rmItemsInView) {
                $.rmInitJSP = this.fsViewSel;
            }
        }
        this.rmSetupUI(aUpdate, aUpdate ? !!$.dbOpenHandle : false);
    }

    this.initShortcutsAndSelection(container, aUpdate);

    if (!container || typeof container === 'string') {
        this.megaRender.destroy();
        delete this.megaRender;
    }

    if (d) {
        console.timeEnd('renderMain');
    }
};


/**
 * Helper for M.renderMain
 * @param {Boolean} u Whether we're just updating the list
 */
MegaData.prototype.rmSetupUI = function(u, refresh) {
    'use strict';

    if (this.viewmode === 1) {
        M.addIconUI(u, refresh);
    }
    else {
        M.addGridUIDelayed(refresh);
    }
    if (!u) {
        fm_thumbnails();
    }
    Soon(fmtopUI);

    if (this.onRenderFinished) {
        onIdle(this.onRenderFinished);
        delete this.onRenderFinished;
    }

    var cmIconHandler = function _cmIconHandler(listView, elm, ev) {
        var target = listView ? $(this).closest('tr') : $(this).parents('.data-block-view');

        if (!target.hasClass('ui-selected')) {
            target.parent().find(elm).removeClass('ui-selected');
            selectionManager.clear_selection();
        }
        target.addClass('ui-selected');

        selectionManager.add_to_selection(target.attr('id'));

        ev.preventDefault();
        ev.stopPropagation(); // do not treat it as a regular click on the file
        ev.currentTarget = target;

        M.searchPath();

        if (!$(this).hasClass('active')) {
            M.contextMenuUI(ev, 1);
            $(this).addClass('active');
        }
        else {
            $.hideContextMenu();
            $(this).removeClass('active');
        }

        return false;
    };

    $('.grid-scrolling-table .grid-url-arrow').rebind('click', function(ev) {
        return cmIconHandler.call(this, true, 'tr', ev);
    });
    $('.data-block-view .file-settings-icon').rebind('click', function(ev) {
        return cmIconHandler.call(this, false, 'a', ev);
    });

    if (!u) {

        if (this.currentrootid === 'shares') {

            var prepareShareMenuHandler = function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget = $('#treea_' + M.currentdirid);
                e.calculatePosition = true;
                $.selected = [M.currentdirid];
            };

            $('.shared-details-info-block .grid-url-arrow').rebind('click.sharesui', function(e) {
                prepareShareMenuHandler(e);
                if (!$(this).hasClass('active')) {
                    M.contextMenuUI(e, 1);
                    $(this).addClass('active');
                }
                else {
                    $.hideContextMenu();
                    $(this).removeClass('active');
                }
            });

            $('.shared-details-info-block .fm-share-download').rebind('click', function(e) {
                prepareShareMenuHandler(e);
                var $this = $(this);
                e.clientX = $this.offset().left;
                e.clientY = $this.offset().top + $this.height()

                if (!$(this).hasClass('active')) {
                    megasync.isInstalled(function (err, is) {
                        if (!err || is) {
                            M.addDownload($.selected);
                        }
                        else {
                            M.contextMenuUI(e, 3);
                        }
                        $(this).addClass('active');
                    });
                }
                else {
                    $.hideContextMenu();
                    $(this).removeClass('active');
                }
            });

            $('.shared-details-info-block .fm-share-copy').rebind('click', function () {
                if (!$.selected || !$.selected.length) {
                    var $selectedFromTree = $('#treesub_shares' + ' .nw-fm-tree-item.selected');
                    if ($selectedFromTree && $selectedFromTree.length) {
                        var tempTree = [];
                        for (var i = 0; i < $selectedFromTree.length; i++) {
                            var selectedElement = $selectedFromTree[i].id;
                            tempTree.push(selectedElement.replace('treea_', ''));
                        }
                        $.selected = tempTree;
                    }
                }
                openCopyDialog();
            });

            // From inside a shared directory e.g. #fm/INlx1Kba and the user clicks the 'Leave share' button
            $('.shared-details-info-block .fm-leave-share').rebind('click', function(e) {
                loadingDialog.show();

                // Get the share ID from the hash in the URL
                var shareId = getSitePath().replace('/fm/', '');

                // Remove user from the share
                M.leaveShare(shareId);
            });
        }
    }
};

/**
 * Render Share Dialog contents
 * @param {String} h Node handle
 */
MegaData.prototype.renderShare = function(h) {
    var html = '';
    if (this.d[h].shares) {
        for (var u in this.d[h].shares) {
            if (this.u[u]) {
                var rt = '';
                var sr = {r0: '', r1: '', r2: ''};
                if (this.d[h].shares[u].r == 0) {
                    rt = l[55];
                    sr.r0 = ' active';
                }
                else if (this.d[h].shares[u].r == 1) {
                    rt = l[56];
                    sr.r1 = ' active';
                }
                else if (this.d[h].shares[u].r == 2) {
                    rt = l[57];
                    sr.r2 = ' active';
                }

                html += '<div class="add-contact-item" id="' + u + '"><div class="add-contact-pad">'
                    + useravatar.contact(u) + 'span class="add-contact-username">' + htmlentities(this.u[u].m)
                    + '</span><div class="fm-share-dropdown">' + rt
                    + '</div><div class="fm-share-permissions-block hidden"><div class="fm-share-permissions'
                    + sr.r0 + '" id="rights_0">' + l[55] + '</div><div class="fm-share-permissions' + sr.r1
                    + '" id="rights_1">' + l[56] + '</div><div class="fm-share-permissions' + sr.r2
                    + '" id="rights_2">' + l[57] + '</div><div class="fm-share-permissions" id="rights_3">' + l[83]
                    + '</div></div></div></div>';
            }
        }
        $('.share-dialog .fm-shared-to').html(html);
        $('.share-dialog .fm-share-empty').addClass('hidden');
        $('.share-dialog .fm-shared-to').removeClass('hidden');
    }
    else {
        $('.share-dialog .fm-share-empty').removeClass('hidden');
        $('.share-dialog .fm-shared-to').addClass('hidden');
    }
};

MegaData.prototype.renderTree = function() {
    'use strict';

    var build = tryCatch(function(h) {
        M.buildtree({h: h}, M.buildtree.FORCE_REBUILD);
    });

    build('shares');
    build('out-shares');
    build('public-links');
    build(M.RootID);
    build(M.RubbishID);
    build(M.InboxID);

    M.contacts();
    M.addTreeUIDelayed();

    // TODO: refactor this back to no-promises
    return MegaPromise.resolve();
};


MegaData.prototype.pathLength = function() {
    "use strict";

    var filterLength = 0;
    var length = 0;
    var $filter = $('.fm-right-header .filter-block.body:visible');

    if ($filter.length > 0) {
        filterLength = $filter.outerWidth(true);
    }

    length = $('.fm-right-header .fm-breadcrumbs-block:visible').outerWidth(true)
        + filterLength
        + $('.fm-right-header .fm-header-buttons:visible').outerWidth(true);
    return length;
};

MegaData.prototype.renderPath = function(fileHandle) {
    var name, hasnext = '', typeclass,
        html = '<div class="clear"></div>',
        a2 = this.getPath(this.currentdirid),
        contactBreadcrumb = '<a class="fm-breadcrumbs contacts has-next-button" id="path_contacts">'
            + '<span class="right-arrow-bg">'
            + '<span>' + l[950] + ' </span>'
            + '</span>'
            + '</a>';

    if (a2.length > 2 && a2[a2.length - 2].length === 11) {
        delete a2[a2.length - 2];
    }

    for (var i in a2) {
        name = '';
        if (a2[i] === this.RootID) {
            if (folderlink && this.d[this.RootID]) {
                name = this.d[this.RootID].name;
                typeclass = 'folder';
            }
            else {
                typeclass = 'cloud-drive';
                name = l[164];
            }
        }
        else if (a2[i] === 'contacts') {
            typeclass = 'contacts';
            name = l[165];
        }
        else if (a2[i] === 'opc') {
            typeclass = 'sent-requests';
            name = l[5862];
        }
        else if (a2[i] === 'ipc') {
            typeclass = 'received-requests';
            name = l[5863];
        }
        else if (a2[i] === 'shares') {
            typeclass = 'shared-with-me';
            name = l[5542];
        }
        else if (a2[i] === 'out-shares') {
            typeclass = 'out-shares';
            name = l[5543];
        }
        else if (a2[i] === 'public-links') {
            typeclass = 'pub-links';
            name = l[16516];
        }
        else if (a2[i] === this.RubbishID) {
            typeclass = 'rubbish-bin';
            name = l[167];
        }
        else if (a2[i] === 'messages' || a2[i] === this.InboxID) {
            typeclass = 'messages';
            name = l[166];
        }
        else {
            var n = this.d[a2[i]];
            if (n && n.name) {
                name = n.name;
            }
            if (a2[i].length === 11) {
                typeclass = 'contact';
            }
            else {
                typeclass = 'folder';
            }
        }
        html = '<a class="fm-breadcrumbs ' + typeclass + ' ' + hasnext
            + ' ui-droppable" id="path_' + htmlentities(a2[i]) + '">'
            + '<span class="right-arrow-bg ui-draggable simpletip" data-simpletip="' + htmlentities(name) + '">'
            + '<span>' + htmlentities(name) + '</span>'
            + '</span>'
            + '</a>' + html;
        hasnext = 'has-next-button';
    }

    if (this.currentdirid && this.currentdirid.substr(0, 5) === 'chat/') {
        var contactName = $('a.fm-tree-folder.contact.lightactive span.contact-name').text();
        $('.fm-right-header .fm-breadcrumbs-block').safeHTML(
            '<a class="fm-breadcrumbs contacts has-next-button" id="path_contacts">'
            + '<span class="right-arrow-bg">'
            + '<span>Contacts</span>'
            + '</span></a>'
            + '<a class="fm-breadcrumbs chat" id="path_'
            + htmlentities(this.currentdirid.replace("chat/", "")) + '">'
            + '<span class="right-arrow-bg">'
            + '<span>' + htmlentities(contactName) + '</span>'
            + '</span>'
            + '</a>');
        $('.search-files-result').addClass('hidden');
    }
    else if (this.currentdirid && this.currentdirid.substr(0, 7) === 'search/') {
        $('.fm-right-header .fm-breadcrumbs-block').safeHTML(
            '<a class="fm-breadcrumbs search ui-droppable" id="'
            + htmlentities(a2[i]) + '">'
            + '<span class="right-arrow-bg ui-draggable">'
            + '<span>' + htmlentities(this.currentdirid.replace('search/', ''))
            + '</span>'
            + '</span>'
            + '</a>');
        $('.search-files-result .search-number').text(this.v.length);
        $('.search-files-result').removeClass('hidden');
        $('.search-files-result').addClass('last-button');
    }
    else if (this.currentdirid && this.currentdirid === 'opc') {
        if (d) console.debug('Render Path OPC');
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(contactBreadcrumb + html);
    }
    else if (this.currentdirid && this.currentdirid === 'ipc') {
        if (d) console.debug('Render Path IPC');
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(contactBreadcrumb + html);
    }
    else {
        $('.search-files-result').addClass('hidden');
            $('.fm-right-header .fm-breadcrumbs-block').safeHTML(html);
    }

    // Resizing breadcrumbs items
    function breadcrumbsResize() {
        var $fmHeader = $('.fm-right-header:visible');
        var headerWidth = $fmHeader.outerWidth();

        var $el = $fmHeader.find('.fm-breadcrumbs-block:visible .right-arrow-bg');
        var i = 0;
        var j = 0;
        $el.removeClass('short-foldername ultra-short-foldername');

        $fmHeader.removeClass('long-path overflowed-path');
        if (M.pathLength() > headerWidth) {
            $fmHeader.addClass('long-path');
        }

        while (M.pathLength() > headerWidth) {
            if (i < $el.length - 1) {
                $($el[i]).addClass('short-foldername');
                i++;
            }
            else if (j < $el.length - 1) {
                $($el[j]).addClass('ultra-short-foldername');
                j++;
            }
            else if (!$($el[j]).hasClass('short-foldername')) {
                $($el[j]).addClass('short-foldername');
            }
            else {
                $($el[j]).addClass('ultra-short-foldername');
                $fmHeader.addClass('overflowed-path');
                break;
            }
        }
    }

    M.onFileManagerReady(breadcrumbsResize);
    $(window).rebind('resize.fmbreadcrumbs', SoonFc(breadcrumbsResize, 202));

    if (folderlink) {
        $('.fm-breadcrumbs:first').removeClass('folder').addClass('folder-link');
        $('.fm-breadcrumbs:first span').empty();
    }

    var $block = $('.fm-right-header .fm-breadcrumbs-block');
    if ($('.fm-breadcrumbs', $block).length > 1) {
        $('.fm-breadcrumbs', $block).removeClass('deactivated');
    }
    else if (folderlink) {
        $('.folder-link .right-arrow-bg', $block)
            .safeHTML('<span>@@</span>', M.getNameByHandle(M.RootID));
    }
    else {
        $('.fm-breadcrumbs', $block).addClass('deactivated');
    }

    $('a', $block).rebind('click', function() {
        var crumbId = $(this).attr('id');

        // When NOT deactivated
        if (!$(this).hasClass('deactivated')) {
            if (crumbId === 'path_opc' || crumbId === 'path_ipc') {
                return false;
            }
            else if ((crumbId === 'chatcrumb') || (M.currentdirid && M.currentdirid.substr(0, 7) === 'search/')) {
                return false;
            }
            // Remove focus from 'view ipc/opc' buttons
            $('.fm-received-requests').removeClass('active');
            $('.fm-contact-requests').removeClass('active');
            var replaceStr = '';
            if ((M.currentdirid.startsWith('out-shares/') && !$(this).is('#path_out-shares')) ||
                (M.currentdirid.startsWith('public-links/') && !$(this).is('#path_public-links'))) {
                replaceStr = M.currentrootid + '/';
            }
            M.openFolder($(this).attr('id').replace('path_', replaceStr));
        }
    });

    if (!is_mobile) {
        if (fileHandle) {
            fileversioning.fileVersioningDialog(fileHandle);
        }
    }
};

MegaData.prototype.searchPath = function() {
    "use strict";

    // Resizing breadcrumbs items
    function pathResize() {
        var $searchWrap = $('.search-bottom-wrapper:visible');
        var $searchPath;
        var wrapWidth;

        if (!$searchWrap || !$searchWrap.length) {
            $(window).unbind('resize.searchpath');
            return false;
        }

        var $el = $searchWrap.find('.search-path-txt');
        var i = 0;
        var j = 0;
        $el.removeClass('short-foldername ultra-short-foldername');

        $searchPath = $searchWrap.find('.search-bottom-menu');
        wrapWidth = $searchWrap.outerWidth();

        $searchWrap.removeClass('long-path overflowed-path');
        if ($searchPath.outerWidth() > wrapWidth) {
            $searchWrap.addClass('long-path');
        }

        while ($($searchPath).outerWidth() > wrapWidth) {
            if (i < $el.length - 1) {
                $($el[i]).addClass('short-foldername');
                i++;
            }
            else if (j < $el.length - 1) {
                $($el[j]).addClass('ultra-short-foldername');
                j++;
            }
            else if (!$($el[j]).hasClass('short-foldername')) {
                $($el[j]).addClass('short-foldername');
            }
            else {
                $($el[j]).addClass('ultra-short-foldername');
                $searchWrap.addClass('overflowed-path');
                break;
            }
        }
    }

    if (M.currentdirid && M.currentdirid.substr(0, 7) === 'search/') {
        var sel;

        if (M.viewmode) {
            sel = $('.fm-blocks-view .ui-selected');
        }
        else {
            sel = $('.grid-table .ui-selected');
        }

        if (sel.length === 1) {
            var html = '';
            var path = M.getPath($(sel[0]).attr('id'));
            path.reverse();

            for (var i = 0; i < path.length; i++) {
                var c, name, id = false, iconimg = '';
                var n = M.d[path[i]];

                if (path[i].length === 11 && M.u[path[i]]) {
                    id = path[i];
                    c = 'contacts-item';
                    name = M.u[path[i]].m;
                }
                else if (path[i] === M.RootID && !folderlink) {
                    id = M.RootID;
                    c = 'cloud-drive';
                    name = l[164];
                }
                else if (path[i] === M.RubbishID) {
                    id = M.RubbishID;
                    c = 'recycle-item';
                    name = l[168];
                }
                else if (path[i] === M.InboxID) {
                    id = M.InboxID;
                    c = 'inbox-item';
                    name = l[166];
                }
                else if (n) {
                    id = n.h;
                    c = '';
                    name = n.name;
                    if (n.t) {
                        c = 'folder';
                    }
                    else {
                        iconimg = '<span class="search-path-icon-span ' + fileIcon(n) + '"></span>';
                    }
                }
                if (id) {
                    html += '<div class="search-path-item ' + c + '" >'
                        + '<div class="search-tip simpletip" data-simpletip="' + htmlentities(name) + '">'
                        + '<div class="search-path-icon ' + c + '" id="spathicon_' + htmlentities(id)
                        + '">' + iconimg + '</div>'
                        + '<div class="search-path-txt" id="spathname_' + htmlentities(id) + '" '
                        + '>' + htmlentities(name) + '</div>'
                        + '</div>'
                        + (i < path.length - 1 ? '<div class="search-path-arrow"></div>' : '')
                        + '</div>';
                }
            }
            html += '<div class="clear"></div>';

            $('.search-bottom-menu').safeHTML(html);
            $('.fm-blocks-view,.files-grid-view').addClass('search');
            pathResize();
            $(window).rebind('resize.searchpath', SoonFc(pathResize, 202));

            $('.search-path-icon,.search-path-txt').rebind('click', function() {
                var id = $(this).attr('id');

                if (id) {
                    var n = M.d[id.replace('spathicon_', '').replace('spathname_', '')];

                    if (n) {
                        id = n.h;
                        $.selected = [];

                        if (!n.t) {
                            $.selected.push(id);
                            id = n.p;
                        }
                        M.openFolder(id)
                            .always(function() {
                                if ($.selected.length) {
                                    reselect(1);
                                }
                            });
                    }
                }
            });

            return;
        }
    }

    $('.fm-blocks-view, .files-grid-view').removeClass('search');
};

MegaData.prototype.hideEmptyGrids = function hideEmptyGrids() {
    'use strict';

    $('.fm-empty-trashbin,.fm-empty-contacts,.fm-empty-search')
        .add('.fm-empty-cloud,.fm-invalid-folder,.fm-empty-filter').addClass('hidden');
    $('.fm-empty-folder,.fm-empty-incoming,.fm-empty-folder-link')
        .add('.fm-empty-outgoing,.fm-empty-public-link').addClass('hidden');
    $('.fm-empty-pad.fm-empty-sharef').remove();
};

/**
 * A function, which would be called on every DOM update (or scroll). This func would implement
 * throttling, so that we won't update the UI components too often.
 *
 */
MegaData.prototype.rmSetupUIDelayed = function() {
    delay('rmSetupUI', function() {
        M.rmSetupUI(false, true);
    }, 75);
};


MegaData.prototype.megaListRenderNode = function(aHandle) {
    'use strict';
    var megaRender = M.megaRender;
    if (!megaRender) {
        if (d) {
            console.warn('Ignoring invalid MegaRender state..', aHandle);
        }
        return false;
    }
    if (!M.d[aHandle]) {
        if (d) {
            console.warn("megaListRenderNode was called with aHandle '%s' which was not found in M.d", aHandle);
        }
        return false;
    }
    megaRender.numInsertedDOMNodes++;

    var node = megaRender.getDOMNode(aHandle);
    if (!node) {
        if (d) {
            console.warn('getDOMNode failed..', aHandle);
        }
        return false;
    }
    var fnameWidth = $('td[megatype="fname"]', node).outerWidth();

    if (!node.__hasMegaColumnsWidth ||
        fnameWidth !== M.columnsWidth.cloud.fname.curr ||
        fnameWidth !== M.columnsWidth.cloud.fname.currpx) {
        node.__hasMegaColumnsWidth = true;
        megaRender.setDOMColumnsWidth(node);
    }

    var selList = selectionManager && selectionManager.selected_list ? selectionManager.selected_list : $.selected;

    if (selList && selList.length) {
        if (selList.indexOf(aHandle) > -1) {
            node.classList.add('ui-selected');
        }
        else {
            node.classList.remove('ui-selected');
        }
        node.classList.remove('ui-selectee');
    }
    else if (selList && selList.length === 0) {
        node.classList.remove('ui-selected');
    }

    if (M.d[aHandle]) {
        M.d[aHandle].seen = true;
    }

    return node;
};

/**
 * Render a simplified "chat is loading" state UI for when the chat is still not ready but an /fm/chat(?/...) url was
 * accessed.
 */
MegaData.prototype.renderChatIsLoading = function() {
    M.onSectionUIOpen('conversations');

    M.hideEmptyGrids();

    $('.fm-files-view-icon').addClass('hidden');
    $('.fm-blocks-view').addClass('hidden');
    $('.files-grid-view').addClass('hidden');
    $('.fm-right-account-block').addClass('hidden');
    $('.contacts-details-block').addClass('hidden');

    $('.shared-grid-view,.shared-blocks-view').addClass('hidden');

    $('.fm-right-files-block, .fm-left-panel, .fm-transfers-block').addClass('hidden');

    $('.section.conversations').removeClass('hidden');
    $('.section.conversations .fm-chat-is-loading').removeClass('hidden');
};

