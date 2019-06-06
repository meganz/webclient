function FileManager() {
    "use strict";

    this.logger = new MegaLogger('FileManager');
}
FileManager.prototype.constructor = FileManager;

/**
 * Initialize the rendering of the cloud/file-manager
 * @details Former renderfm()
 * @returns {MegaPromise}
 */
FileManager.prototype.initFileManager = function() {
    "use strict";

    var promise = new MegaPromise();
    var tpromise;

    if (d) {
        console.time('renderfm');
    }

    if (!is_mobile) {
        this.initFileManagerUI();
    }
    this.sortByName();

    if (is_mobile) {
        tpromise = MegaPromise.resolve();
    }
    else {
        tpromise = this.renderTree();
        tpromise.always(function() {
            M.renderPath();
        });
    }

    tpromise
        .always(function() {
            var $treesub = $('#treesub_' + M.RootID);
            if (!$treesub.hasClass('opened')) {
                $('.fm-tree-header.cloud-drive-item').addClass('opened');
                $treesub.addClass('opened');
            }

            M.openFolder($.autoSelectNode && M.getNodeByHandle($.autoSelectNode).p || M.currentdirid, true)
                .always(function() {
                    if (megaChatIsReady) {
                        megaChat.renderMyStatus();
                    }

                    if (d) {
                        console.timeEnd('renderfm');
                    }

                    promise.resolve.apply(promise, arguments);
                });
        });
    return promise;
};

/**
 * Invoke callback once the fm has been initialized
 * @param {Boolean} [ifMaster] Invoke callback if running under a master tab
 * @param {Function} callback The function to invoke
 */
FileManager.prototype.onFileManagerReady = function(ifMaster, callback) {
    'use strict';

    if (typeof ifMaster === 'function') {
        callback = ifMaster;
        ifMaster = false;
    }

    callback = (function(callback) {
        return function() {
            if (!ifMaster || mBroadcaster.crossTab.master) {
                onIdle(callback);
            }
        };
    })(callback);

    if (fminitialized) {
        onIdle(callback);
    }
    else {
        mBroadcaster.once('fm:initialized', callback);
    }
};

/**
 * Initialize the cloud/file-manager UI components
 * @details Former initUI()
 */
FileManager.prototype.initFileManagerUI = function() {
    "use strict";

    if (d) {
        console.time('initUI');
    }
    $('.not-logged .fm-not-logged-button.create-account').rebind('click', function() {
        loadSubPage('register');
    });

    $('.fm-main').removeClass('l-pane-collapsed');
    $('.default-white-button.l-pane-visibility').removeClass('active');

    $('.fm-dialog-overlay').rebind('click.fm', function(ev) {
        if ($.dialog === 'pro-login-dialog' || localStorage.awaitingConfirmationAccount) {
            return false;
        }
        showWarningTokenInputLose().done(function() {
            closeDialog(ev);
        });
        $.hideContextMenu();

        // For ephemeral session redirect to 'fm' page
        // if user clicks overlay instead Yes/No or close icon 'x'
        // One situation when this is used, is when ephemeral user
        //  trying to access settings directly via url
        if (u_type === 0 && !folderlink) {
            loadSubPage('fm');
        }
    });

    if (folderlink) {
        $('.nw-fm-left-icons-panel .logo').removeClass('hidden');
        $('.fm-main').addClass('active-folder-link');
        $('.activity-status-block').hide();

        var $prodNav = $('.fm-products-nav').text('');
        if (!u_type) {
            $prodNav.safeHTML(translate(pages['pagesmenu']));
            onIdle(clickURLs);
        }

        $('.default-white-button.l-pane-visibility').rebind('click.leftpane', function() {
            var $this = $(this);
            var $breadcrumbs = $('.fm-right-header .fm-breadcrumbs-block');

            if ($this.hasClass('active')) {
                if (M.currentdirid === M.RootID) {
                    $breadcrumbs.addClass('deactivated');
                }
                $this.removeClass('active');
                $('.fm-main').removeClass('l-pane-collapsed');
            }
            else {
                $this.addClass('active');
                $('.fm-main').addClass('l-pane-collapsed');

                M.onFileManagerReady(function() {
                    if (M.currentdirid === M.RootID) {
                        $breadcrumbs.removeClass('deactivated')
                            .find('.folder-link .right-arrow-bg')
                            .safeHTML('<span>' + M.getNameByHandle(M.RootID) + '</span>');
                    }
                });
            }

            // reposition click hint, if opened
            if (mega.cttHintTimer) {
                M.showClickHint(true);
            }
            $(window).trigger('resize');
        });

        if (!M.tree[M.RootID]) {
            $('.default-white-button.l-pane-visibility').trigger('click');
        }
    }
    else {
        $('.nw-fm-left-icons-panel .logo').addClass('hidden');
        $('.fm-tree-header.cloud-drive-item').text(l[164]);
        $('.fm-tree-header').not('.cloud-drive-item').show();
        $('.fm-main').removeClass('active-folder-link');
        $('.fm-products-nav').text('');
    }

    $.doDD = function(e, ui, a, type) {

        function nRevert(r) {
            try {
                $(ui.draggable).draggable("option", "revert", false);
                if (r) {
                    $(ui.draggable).remove();
                }
            }
            catch (e) {
            }
        }

        var c = $(ui.draggable).attr('class');
        var t, ids, dd;


        if (c && c.indexOf('nw-fm-tree-item') > -1) {
            // tree dragged:
            var id = $(ui.draggable).attr('id');
            if (id.indexOf('treea_') > -1) {
                ids = [id.replace('treea_', '')];
            }
            else if (id.indexOf('contact_') > -1) {
                ids = [id.replace('contact_', '')];
            }
        }
        else {
            if ($.dragSelected && $.dragSelected.length > 0) {
                ids = $.dragSelected;
            }
            else if ($.selected && $.selected.length > 0) {
                // grid dragged:
                ids = $.selected;
            }
        }

        // Workaround a problem where we get over[1] -> over[2] -> out[1]
        if (a === 'out' && $.currentOver !== $(e.target).attr('id')) {
            a = 'noop';
        }

        if (type == 1) {
            // tree dropped:
            var c = $(e.target).attr('class');
            if (c && c.indexOf('nw-fm-left-icon') > -1) {
                dd = 'nw-fm-left-icon';
                if (a === 'drop') {
                    if (c.indexOf('cloud') > -1) {
                        t = M.RootID;
                    }
                    else if (c.indexOf('rubbish-bin') > -1) {
                        t = M.RubbishID;
                    }
                    else if (c.indexOf('transfers') > -1) {
                        dd = 'download';
                    }
                }
            }
            else if (c && c.indexOf('nw-fm-tree-item') > -1 && !$(e.target).visible(!0)) {
                dd = 'download';
            }
            else if (
                $(e.target).is('ul.conversations-pane > li') ||
                $(e.target).closest('ul.conversations-pane > li').length > 0 ||
                $(e.target).is('.messages-block')
            ) {
                if (M.isFile(ids)) {
                    dd = 'chat-attach';
                }
                else {
                    dd = 'noop';
                }
            }
            else {
                var t = $(e.target).attr('id');
                if (t && t.indexOf('treea_') > -1) {
                    t = t.replace('treea_', '');
                }
                else if (t && t.indexOf('path_') > -1) {
                    t = t.replace('path_', '');
                }
                else if (t && t.indexOf('contact2_') > -1) {
                    t = t.replace('contact2_', '');
                }
                else if (t && t.indexOf('contact_') > -1) {
                    t = t.replace('contact_', '');
                }
                else if (M.currentdirid !== 'shares' || !M.d[t] || M.getNodeRoot(t) !== 'shares') {
                    t = undefined;
                }
            }
        }
        else {
            // grid dropped:
            var c = $(e.target).attr('class');
            if (c && c.indexOf('folder') > -1) {
                t = $(e.target).attr('id');
            }
        }

        var setDDType = function() {
            if (ids && ids.length && t) {
                dd = ddtype(ids, t, e.altKey);
                if (dd === 'move' && e.altKey) {
                    dd = 'copy';
                }
            }
        };

        if (a !== 'noop') {
            if ($.liTimerK) {
                clearTimeout($.liTimerK);
            }
            $('body').removeClassWith('dndc-');
            $('.hide-settings-icon').removeClass('hide-settings-icon');
        }
        setDDType();

        if (a === 'drop' || a === 'out' || a === 'noop') {
            $(e.target).removeClass('dragover');
            // if (a !== 'noop') $('.dragger-block').addClass('drag');
        }
        else if (a === 'over') {
            var id = $(e.target).attr('id');
            if (!id) {
                $(e.target).uniqueId();
                id = $(e.target).attr('id');
            }

            $.currentOver = id;
            setTimeout(function() {
                if ($.currentOver === id) {
                    var h;
                    if (id.indexOf('treea_') > -1) {
                        h = id.replace('treea_', '');
                    }
                    else {
                        var c = $(id).attr('class');
                        if (c && c.indexOf('cloud-drive-item') > -1) {
                            h = M.RootID;
                        }
                        else if (c && c.indexOf('recycle-item') > -1) {
                            h = M.RubbishID;
                        }
                        else if (c && c.indexOf('contacts-item') > -1) {
                            h = 'contacts';
                        }
                    }
                    if (h) {
                        M.onTreeUIExpand(h, 1);
                    }
                    else if ($(e.target).hasClass('nw-conversations-item')) {
                        $(e.target).click();
                    }
                    else if ($(e.target).is('ul.conversations-pane > li')) {
                        $(e.target).click();
                    }
                }
            }, 890);

            if (dd === 'move') {
                $.draggingClass = ('dndc-move');
            }
            else if (dd === 'copy') {
                $.draggingClass = ('dndc-copy');
            }
            else if (dd === 'download') {
                $.draggingClass = ('dndc-download');
            }
            else if (dd === 'nw-fm-left-icon') {
                var c = '' + $(e.target).attr('class');

                $.draggingClass = ('dndc-warning');
                if (c.indexOf('rubbish-bin') > -1) {
                    $.draggingClass = ('dndc-to-rubbish');
                }
                else if (c.indexOf('conversations') > -1) {
                    $.draggingClass = ('dndc-to-conversations');
                }
                else if (c.indexOf('shared-with-me') > -1) {
                    $.draggingClass = ('dndc-to-shared');
                }
                else if (c.indexOf('transfers') > -1) {
                    $.draggingClass = ('dndc-download');
                }
                else if (c.indexOf('cloud-drive') > -1) {
                    $.draggingClass = ('dndc-move');
                }
                else {
                    c = null;
                }

                if (c) {
                    if ($.liTooltipTimer) {
                        clearTimeout($.liTooltipTimer);
                    }
                    $.liTimerK = setTimeout(function() {
                        $(e.target).click()
                    }, 920);
                }
            }
            else if (dd === 'chat-attach') {
                $.draggingClass = ('dndc-to-conversations');
            }
            else {
                $.draggingClass = M.d[t] ? 'dndc-warning' : 'dndc-move';
            }

            $('body').addClass($.draggingClass);

            $(e.target).addClass('dragover');
            $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
            if ($(e.target).hasClass('folder')) {
                $(e.target).addClass('ui-selected').find('.file-settings-icon, .grid-url-arrow').addClass('hide-settings-icon');
            }
        }
        // if (d) console.log('!a:'+a, dd, $(e.target).attr('id'), (M.d[$(e.target).attr('id').split('_').pop()]||{}).name, $(e.target).attr('class'), $(ui.draggable.context).attr('class'));


        var onMouseDrop = function() {
            if (dd === 'nw-fm-left-icon') {
                // do nothing
            }
            else if ($(e.target).hasClass('nw-conversations-item') || dd === 'chat-attach') {
                nRevert();

                // drop over a chat window
                var currentRoom = megaChat.getCurrentRoom();
                assert(currentRoom, 'Current room missing - this drop action should be impossible.');
                currentRoom.attachNodes(ids);
            }
            else if (dd === 'move') {
                nRevert();
                $.moveids = ids;
                $.movet = t;
                var $ddelm = $(ui.draggable);
                setTimeout(function() {
                    if ($.movet === M.RubbishID) {
                        fmremove($.moveids);
                        if (selectionManager) {
                            selectionManager.clear_selection();
                        }
                    }
                    else {
                        M.moveNodes($.moveids, $.movet)
                            .done(function(moves) {
                                if (moves) {
                                    $ddelm.remove();
                                }
                            });
                        if (selectionManager) {
                            selectionManager.clear_selection();
                            selectionManager.set_currently_selected($.movet);
                        }
                    }
                }, 50);
            }
            else if ((dd === 'copy') || (dd === 'copydel')) {
                nRevert();
                $.copyids = ids;
                $.copyt = t;
                setTimeout(function() {
                    M.copyNodes($.copyids, $.copyt, (dd === 'copydel'), new MegaPromise())
                        .done(function() {

                            // Update files count...
                            if (M.currentdirid === 'shares' && !M.viewmode) {
                                M.openFolder('shares', 1);
                            }
                        })
                        .fail(function(error) {
                            if (error === EOVERQUOTA) {
                                return msgDialog('warninga', l[135], l[8435]);
                            }
                            // Tell the user there was an error unless he cancelled the file-conflict dialog
                            if (error !== EINCOMPLETE) {
                                msgDialog('warninga', l[135], l[47], api_strerror(error));
                            }
                        });
                }, 50);
            }
            else if (dd === 'download') {
                nRevert();
                var as_zip = e.altKey;
                M.addDownload(ids, as_zip);
            }
            $('.dragger-block').hide();
        };

        if (a === 'drop' && dd !== undefined) {
            dbfetch.get(t).always(function() {
                setDDType();
                if (dd) {
                    onMouseDrop();
                }
            });
        }
    };
    InitFileDrag();
    M.createFolderUI();
    M.treeSearchUI();
    M.treeFilterUI();
    M.treeSortUI();
    M.initTreePanelSorting();
    M.initContextUI();
    initShareDialog();
    M.addTransferPanelUI();
    M.initUIKeyEvents();
    onIdle(topmenuUI);

    $('.fm-files-view-icon').rebind('click', function() {
        $.hideContextMenu();

        var viewValue = $(this).hasClass('listing-view') ? 0 : 1;

        if (fmconfig.uiviewmode | 0) {
            mega.config.set('viewmode', viewValue);
        }
        else {
            fmviewmode(M.currentdirid, viewValue);
        }

        if (folderlink && M.currentdirid.substr(0, 6) === 'search') {
            M.viewmode = viewValue;
            M.renderMain();
        }
        else {
            M.openFolder(M.currentdirid, true).then(reselect.bind(null, 1));
        }

        return false;
    });

    $.hideContextMenu = function(event) {

        var a, b, currentNodeClass;

        if (event && event.target) {
            currentNodeClass = $(event.target).attr('class');
            if (!currentNodeClass) {
                currentNodeClass = $(event.target).parent();
                if (currentNodeClass) {
                    currentNodeClass = $(currentNodeClass).attr('class');
                }
            }
            if (currentNodeClass && currentNodeClass.indexOf('dropdown') > -1
                && (currentNodeClass.indexOf('download-item') > -1
                || currentNodeClass.indexOf('move-item') > -1)
                && currentNodeClass.indexOf('active') > -1) {
                return false;
            }
        }

        $('.grid-url-arrow').removeClass('active');
        $('.nw-sorting-menu').addClass('hidden');
        $('.colour-sorting-menu').addClass('hidden');
        $('.fm-start-chat-dropdown').addClass('hidden').removeClass('active');
        $('.start-chat-button').removeClass('active');
        $('.nw-tree-panel-arrows').removeClass('active');
        $('.dropdown-item.dropdown').removeClass('active');
        $('.fm-tree-header').removeClass('dragover');
        $('.nw-fm-tree-item').removeClass('dragover');
        $('.nw-fm-tree-item.hovered').removeClass('hovered');
        $('.data-block-view .file-settings-icon').removeClass('active');

        // Set to default
        a = $('.dropdown.body.files-menu,.dropdown.body.download');
        a.addClass('hidden');
        b = a.find('.dropdown.body.submenu');
        b.attr('style', '');
        b.removeClass('active left-position overlap-right overlap-left mega-height');
        a.find('.disabled,.context-scrolling-block').removeClass('disabled context-scrolling-block');
        a.find('.dropdown-item.contains-submenu.opened').removeClass('opened');

        // Cleanup for scrollable context menu
        var cnt = $('#cm_scroll').contents();
        $('#cm_scroll').replaceWith(cnt);// Remove .context-scrollable-block
        a.removeClass('mega-height');
        a.find('> .context-top-arrow').remove();
        a.find('> .context-bottom-arrow').remove();
        a.css({ 'height': 'auto' });// In case that window is enlarged

        // Remove all sub-menues from context-menu move-item
        $('#csb_' + M.RootID).empty();

        $(window).off('resize.ccmui');
    };

    $('#fmholder').rebind('click.contextmenu', function(e) {
        $.hideContextMenu(e);
        if ($.hideTopMenu) {
            $.hideTopMenu(e);
        }
        var $target = $(e.target);
        var exclude = '.upgradelink, .campaign-logo, .resellerbuy, .linkified, a.red';

        if (!$target.is('.account-history-dropdown-button')) {
            $('.account-history-dropdown').addClass('hidden');
        }
        if ($target.attr('data-reactid') || $target.is('.chatlink')) {
            // chat can handle its own links..no need to return false on every "click" and "element" :O
            return;
        }
        if ($target.attr('type') !== 'file'
            && !$target.is(exclude)
            && !$target.parent().is(exclude)) {
            return false;
        }
    });

    $('.fm-back-button').rebind('click', function() {

        if (!M.currentdirid) {
            return;
        }

        if (M.currentdirid === 'notifications'
            || M.currentdirid.substr(0, 7) === 'search/'
            || M.currentdirid.substr(0, 5) === 'chat/') {
            window.history.back();
        }
        else {
            var n = M.d[M.currentdirid];
            if ((n && n.p && M.d[n.p]) || (n && n.p === 'contacts')) {
                M.openFolder(n.p);
            }
        }
    });

    if (page !== "chat") {
        $('.fm-right-header.fm').removeClass('hidden');
    }

    if (folderlink) {
        $('.fm-tree-header.cloud-drive-item span').text('');
    }
    else {
        folderlink = 0;
    }

    if ((typeof dl_import !== 'undefined') && dl_import) {
        importFile();
    }

    $('.dropdown.body.context').rebind('contextmenu.dropdown', function(e) {
        if (!localStorage.contextmenu) {
            e.preventDefault();
        }
    });

    $('.nw-fm-left-icon').rebind('contextmenu', function(ev) {
        M.contextMenuUI(ev, 1);
        return false;
    });

    // stop sort and filter dialog clicking close itself
    $('.nw-sorting-menu').on('click', function(e) {
        e.stopPropagation();
    });

    var fmTabState;
    var isMegaSyncTransfer = true;
    $('.nw-fm-left-icon').rebind('click', function(e) {
        treesearch = false;
        var mySelf = $(this);
        var clickedClass = mySelf.attr('class');

        if (!clickedClass) {
            return;
        }
        if (!fmTabState || fmTabState['cloud-drive'].root !== M.RootID) {
            fmTabState = {
                'cloud-drive':     {root: M.RootID,    prev: null},
                'folder-link':     {root: M.RootID,    prev: null},
                'shared-with-me':  {root: 'shares',    prev: null},
                'conversations':   {root: 'chat',      prev: null},
                'contacts':        {root: 'contacts',  prev: null},
                'transfers':       {root: 'transfers', prev: null},
                'account':         {root: 'account',   prev: null},
                'dashboard':       {root: 'dashboard', prev: null},
                'recents':         {root: 'recents',   prev: null},
                'inbox':           {root: M.InboxID,   prev: null},
                'rubbish-bin':     {root: M.RubbishID, prev: null},
                'user-management':      {root: 'user-management', prev: null}
            };
        }
        if ((ul_queue && ul_queue.length) || (dl_queue && dl_queue.length)) {
            isMegaSyncTransfer = false;
        }
        if (clickedClass.indexOf('transfers') > -1) {
            if (isMegaSyncTransfer) {
                // if we need to check megaSync - true defualt
                megasync.isInstalled(function (err, is) {
                    if (!err || is) {
                        if (megasync.currUser === u_handle) {
                            megasync.transferManager();
                            return;
                        }
                        else {
                            isMegaSyncTransfer = false;
                        }
                    }
                    else {
                        isMegaSyncTransfer = false;
                    }
                    mySelf.click();

                });
                return false;
            }
            else {
                // reset - to ckeck again next time
                isMegaSyncTransfer = true;
                if (!mega.tpw.isWidgetVisibile()) {
                    mega.tpw.showWidget();
                    if (mega.tpw.isWidgetVisibile()) {
                        // do if there's no transfers, we will allow going to transfers page
                        return false;
                    }

                }
                else {
                    mega.tpw.hideWidget();
                }
            }

        }

        var activeClass = ('' + $('.nw-fm-left-icon.active:visible')
            .attr('class')).split(" ").filter(function(c) {
            return !!fmTabState[c];
        })[0];

        if (mySelf.hasClass('contacts') && !mySelf.find('.contacts-indicator').is('.hidden')) {
             M.openFolder('ipc');
             return false;
        }

        var activeTab = fmTabState[activeClass];

        if (activeTab) {
            if (activeTab.root === M.currentrootid || activeTab.root === 'chat' ||
                (activeTab.root === 'shares' && M.currentCustomView)) {
                activeTab.prev = M.currentdirid;
                M.lastActiveTab = activeClass;
            }
            else if (d) {
                console.warn('Root mismatch', M.currentrootid, M.currentdirid, activeTab);
            }
        }

        if (mySelf.hasClass('account') || mySelf.hasClass('dashboard')) {
            if (u_type === 0) {
                if ($(this).hasClass('account')) {
                    ephemeralDialog(l[7687]);
                }
                else {
                    // Show message 'This page is for registered users only'
                    ephemeralDialog(l[17146]);
                }
            }
            else if ($(this).hasClass('dashboard')) {
                loadSubPage('fm/dashboard');
            }
            else {
                loadSubPage('fm/account');
                if ($('.fm-account-main').data('jsp')) {
                    $('.fm-account-main').data('jsp').scrollToY(0, false);
                }
            }
            return false;
        }
        // else if (mySelf.hasClass('recents')) {
        //     loadSubPage('fm/recents');
        // }

        for (var tab in fmTabState) {
            if (~clickedClass.indexOf(tab)) {
                tab = fmTabState[tab];

                var targetFolder = null;

                // Clicked on the currently active tab, should open the root (e.g. go back)
                if (~clickedClass.indexOf(activeClass)) {
                    targetFolder = tab.root;

                    // special case handling for the chat, re-render current conversation
                    if (tab.root === 'chat' && String(M.currentdirid).substr(0, 5) === 'chat/') {
                        targetFolder = M.currentdirid;
                    }
                }
                else if (tab.prev && (M.d[tab.prev] || M.isCustomView(tab.prev))) {
                    targetFolder = tab.prev;
                }
                else {
                    targetFolder = tab.root
                }

                M.openFolder(targetFolder, true);

                break;
            }
        }
    });

    if (dlMethod.warn && !localStorage.browserDialog && !$.browserDialog) {
        setTimeout(browserDialog, 2000);
    }

    // chat can handle the left-panel resizing on its own
    var lPane = $('.fm-left-panel').filter(":not(.chat-left-panel)");
    $.leftPaneResizable = new FMResizablePane(lPane, {
        'direction': 'e',
        'minWidth': 200,
        'maxWidth': 400,
        'persistanceKey': 'leftPaneWidth',
        'handle': '.left-pane-drag-handle'
    });

    if (fmconfig.leftPaneWidth) {
        lPane.width(Math.min(
            $.leftPaneResizable.options.maxWidth,
            Math.max($.leftPaneResizable.options.minWidth, fmconfig.leftPaneWidth)
        ));
    }

    $($.leftPaneResizable).on('resize', function() {
        var w = lPane.width();
        if (w >= $.leftPaneResizable.options.maxWidth) {
            $('.left-pane-drag-handle').css('cursor', 'w-resize')
        }
        else if (w <= $.leftPaneResizable.options.minWidth) {
            $('.left-pane-drag-handle').css('cursor', 'e-resize')
        }
        else {
            $('.left-pane-drag-handle').css('cursor', 'we-resize')
        }

        if ($('.account.left-pane.header').width() < $.leftPaneResizable.options.updateWidth + 10) {
            $(this.element).addClass('small-left-panel');
        }
        else {
            $(this.element).removeClass('small-left-panel');
        }

        $(window).trigger('resize');
    });

    $(window).rebind('resize.fmrh hashchange.fmrh', fm_resize_handler);
    if (d) {
        console.timeEnd('initUI');
    }
};

/**
 * A FileManager related method for (re)initializing the shortcuts and selection managers.
 *
 * @param container
 * @param aUpdate
 */
FileManager.prototype.initShortcutsAndSelection = function (container, aUpdate) {
    if (!window.fmShortcuts) {
        window.fmShortcuts = new FMShortcuts();
    }


    if (!aUpdate) {
        if (window.selectionManager) {
            window.selectionManager.destroy();
            Object.freeze(window.selectionManager);
        }

        /**
         * (Re)Init the selectionManager, because the .selectable() is reinitialized and we need to
         * reattach to its events.
         *
         * @type {SelectionManager}
         */
        window.selectionManager = new SelectionManager(
            $(container),
            $.selected && $.selected.length > 0
        );

        // restore selection if needed
        if ($.selected) {
            $.selected.forEach(function(h) {
                selectionManager.add_to_selection(h);
            });
        }
    }
};


/**
 * Update FileManager on new nodes availability
 * @details Former rendernew()
 * @returns {MegaPromise}
 */
FileManager.prototype.updFileManagerUI = function() {
    "use strict";

    var treebuild = Object.create(null);
    var UImain = false;
    var UItree = false;
    var newcontact = false;
    var newpath = false;
    var newshare = false;
    var selnode;

    if (d) {
        console.time('rendernew');
    }

    for (var i = newnodes.length; i--;) {
        var newNode = newnodes[i];

        if (newNode.h.length === 11) {
            newcontact = true;
        }
        if (newNode.su) {
            newshare = true;
        }
        if (newNode.p && newNode.t) {
            treebuild[newNode.p] = 1;
        }
        if (newNode.p === this.currentdirid || newNode.h === this.currentdirid ||
            newNode.p === this.currentCustomView.nodeID || newNode.h === this.currentCustomView.nodeID) {
            UImain = true;

            if ($.onRenderNewSelectNode === newNode.h) {
                delete $.onRenderNewSelectNode;
                selnode = newNode.h;
            }
        }
        if (!newpath && document.getElementById('path_' + newNode.h)) {
            newpath = true;
        }
    }

    var masterPromise = new MegaPromise();
    var treePromises = [];

    for (var h in treebuild) {
        var tb = this.d[h];
        if (tb) {
            // If this is out-shares or public-links page, build both cloud-drive tree and it's own
            if (M.currentCustomView) {
                this.buildtree(tb, this.buildtree.FORCE_REBUILD, 'cloud-drive');
                this.buildtree({h: M.currentCustomView.type}, this.buildtree.FORCE_REBUILD);
            }
            else {
                this.buildtree(tb, this.buildtree.FORCE_REBUILD);
            }
            UItree = true;
        }
    }

    if (d) {
        console.log('rendernew, dir=%s, root=%s, mode=%d', this.currentdirid, this.currentrootid, this.viewmode);
        console.log('rendernew.stat', newcontact, newshare, UImain, newpath);
        console.log('rendernew.tree', treePromises.length, Object.keys(treebuild));
    }

    MegaPromise.allDone(treePromises)
        .always(function() {
            var renderPromise = MegaPromise.resolve();
            if (UImain) {
                if (UItree || M.v.length) {
                    M.filterByParent(M.currentCustomView.nodeID || M.currentdirid);
                    M.sort();
                    M.renderMain(true);
                }
                else {
                    renderPromise = M.openFolder(M.currentdirid, true);
                }
            }

            if (M.currentdirid === "recents" && M.recentsRender) {
                M.recentsRender.updateState();
            }

            if (UItree) {
                if (M.currentrootid === 'shares') {
                    renderPromise = M.renderTree();
                }
                else {
                    M.addTreeUI();
                }

                if (M.currentdirid === 'shares' && !M.viewmode) {
                    renderPromise.pipe(function() {
                        return M.openFolder('shares', 1);
                    });
                }

                renderPromise.always(function() {
                    M.onTreeUIOpen(M.currentdirid);
                });
            }

            renderPromise.always(function() {
                if (newcontact) {
                    M.avatars();
                    M.contacts();
                    M.addTreeUI();

                    if (megaChatIsReady) {
                        //megaChat.renderContactTree();
                        megaChat.renderMyStatus();
                    }
                }
                if (newshare) {
                    M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
                }
                if (newpath) {
                    M.renderPath();
                }
                if (selnode) {
                    Soon(function() {
                        $.selected = [selnode];
                        reselect(1);
                    });
                }
                if (UImain) {
                    mBroadcaster.sendMessage('mediainfo:collect');
                    $.tresizer();
                }

                if (u_type === 0) {
                    // Show "ephemeral session warning"
                    topmenuUI();
                }

                delay('dashboard:upd', function() {
                    if (M.currentdirid === 'dashboard') {
                        dashboardUI();
                    }
                }, 2000);

                if (d) {
                    console.timeEnd('rendernew');
                }

                masterPromise.resolve();
            });
        });

    newnodes = [];
    return masterPromise;
};

/**
 * Initialize context-menu related user interface
 */
FileManager.prototype.initContextUI = function() {
    "use strict";

    var c = '.dropdown.body.context .dropdown-item';

    $('.dropdown-section').off('mouseover', '.dropdown-item');
    $('.dropdown-section').on('mouseover', '.dropdown-item', function() {
        var $this = $(this),
            pos = $this.offset(),
            menuPos,
            currentId;

        if ($this.hasClass('disabled') && $this.parents('#sm_move').length === 0) {
            return false;
        }

        // Hide opened submenus
        if (!$this.parent().parent().hasClass('submenu')) {
            $('.dropdown-item').removeClass('opened');
            $('.dropdown.body.submenu').removeClass('active');
        }
        else {
            $this.parent().find('.dropdown-item').removeClass('opened');
            $this.parent().find('.submenu').removeClass('active');
        }

        currentId = $this.attr('id');
        if (currentId || $this.hasClass('move-item')) {
            M.buildSubMenu(String(currentId).replace('fi_', ''));
        }

        // Show necessary submenu
        if (!$this.hasClass('opened') && $this.hasClass('contains-submenu')) {
            menuPos = M.reCalcMenuPosition($this, pos.left, pos.top, 'submenu');

            $this.next('.submenu')
                .css({'top': menuPos.top})
                .addClass('active');

            $this.addClass('opened');
        }
    });

    var safeMoveNodes = function() {
        if (!$(this).hasClass('disabled')) {
            $.hideContextMenu();
            M.safeMoveNodes(String($(this).attr('id')).replace('fi_', ''));
        }
        return false;
    };

    var showExpiredBusiness = function() {
        M.require('businessAcc_js', 'businessAccUI_js').done(function() {
            var business_ui = new BusinessAccountUI();
            business_ui.showExpiredDialog(u_attr.b.m);
        });
    };
    M.showExpiredBusiness = showExpiredBusiness;

    $(c + '.cloud-item').rebind('click', safeMoveNodes);

    $('.dropdown.body.files-menu').off('click', '.folder-item');
    $('.dropdown.body.files-menu').on('click', '.folder-item', safeMoveNodes);
    safeMoveNodes = undefined;

    $(c + '.download-item').rebind('click', function(event) {
        var c = $(event.target).attr('class');
        if (c && (c.indexOf('contains-submenu') > -1 || c.indexOf('msync-found') > -1)) {
            M.addDownload($.selected);
        }
    });

    $(c + '.download-standart-item').rebind('click', function() {
        M.addDownload($.selected);
    });

    $(c + '.zipdownload-item').rebind('click', function() {
        M.addDownload($.selected, true);
    });


    $(c + '.syncmegasync-item').rebind('click', function () {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }

        megasync.isInstalled(function (err, is) {
            if (!err || is) {
                if (megasync.currUser === u_handle) {
                    // i know the selection is 1 item [otherwise option in menu wont be visible]
                    megasync.syncFolder($.selected[0]);
                }
            }
                // no need to do anything, something wierd happened, next time
                // the option wont be visible.
        });
        $.hideContextMenu();
    });

    $(c + '.getlink-item, ' + c + '.embedcode-item').rebind('click', this.getLinkAction);

    $(c + '.removelink-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }

        if (u_type === 0) {
            ephemeralDialog(l[1005]);
        }
        else {
            var media = false;
            var handles = Array.isArray($.selected) && $.selected.concat();
            var removeLink = function() {
                var exportLink = new mega.Share.ExportLink({'updateUI': true, 'nodesToProcess': handles});
                exportLink.removeExportLink();
            };

            for (var i = handles.length; i--;) {
                if (is_video(M.d[handles[i]])) {
                    media = true;
                    break;
                }
            }

            if (media) {
                msgDialog('confirmation', l[882], l[17824], 0, function(e) {
                    if (e) {
                        removeLink();
                    }
                });
            }
            else {
                removeLink();
            }
        }
    });

    $(c + '.dispute-item').rebind('click', function() {
        loadSubPage('dispute');
    });

    $(c + '.rename-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        renameDialog();
    });

    $(c + '.sh4r1ng-item').rebind('click', M.openSharingDialog.bind(M));

    // Move Dialog
    $(c + '.advanced-item, ' + c + '.move-item').rebind('click', openMoveDialog);

    $(c + '.copy-item').rebind('click', openCopyDialog);

    $(c + '.revert-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        loadingDialog.pshow();
        M.revertRubbishNodes($.selected).always(loadingDialog.phide.bind(loadingDialog));
    });

    $(c + '.import-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        ASSERT(folderlink, 'Import needs to be used in folder links.');

        M.importFolderLinkNodes($.selected);
    });

    $(c + '.newfolder-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        createFolderDialog();
    });

    $(c + '.fileupload-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        $('#fileselect3').click();
    });

    $(c + '.folderupload-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        $('#fileselect4').click();
    });

    $(c + '.remove-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        closeDialog();
        fmremove();
    });

    $(c + '.addcontact-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        contactAddDialog();
    });

    $(c + '.startchat-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        var $this = $(this);
        var user_handle = $.selected;

        if (user_handle.length === 1) {
            if (!$this.is('.disabled') && user_handle[0]) {
                loadSubPage('fm/chat/p/' + user_handle[0]);
            }
        }
        else {
            megaChat.createAndShowGroupRoomFor(user_handle, "", true, false);
        }
    });

    $(c + '.startaudio-item,' + c + '.startaudiovideo-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            megaChat.createAndShowPrivateRoomFor(user_handle)
                .then(function(room) {
                    room.setActive();
                    room.startAudioCall();
                });
        }
    });

    $(c + '.startvideo-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            megaChat.createAndShowPrivateRoomFor(user_handle)
                .then(function(room) {
                    room.setActive();
                    room.startVideoCall();
                });
        }
    });

    $(c + '.view-profile-item').rebind('click', function() {
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            loadSubPage('fm/' + user_handle);
        }
    });

    $(c + '.send-files-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            megaChat.openChatAndSendFilesDialog(user_handle);
        }
    });

    $(c + '.share-folder-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            openCopyShareDialog(user_handle);
        }
    });


    $(c + '.removeshare-item').rebind('click', function() {
        // check if this is a business expired account
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        fmremove();
    });

    $(c + '.remove-contact').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        var user_handle = $.selected && $.selected[0];

        user_handle =user_handle .replace('contact_', '');
        fmremove(user_handle);
    });

    $(c + '.properties-item').rebind('click', function() {
        propertiesDialog();
    });

    $(c + '.properties-versions').rebind('click', function() {
        fileversioning.fileVersioningDialog();
    });

    $(c + '.clearprevious-versions').rebind('click', function() {
        if ($.selected && $.selected[0]) {
            var fh = $.selected[0];
            msgDialog('remove', l[1003], l[17154], l[1007], function(e) {
                if (e) {
                    fileversioning.clearPreviousVersions(fh);
                }
            });
        }

    });

    $(c + '.findupes-item').rebind('click', M.findDupes);

    $(c + '.permissions-item').rebind('click', function() {
        if (d) {
            console.log('permissions');
        }
    });

    $(c + '.add-star-item').rebind('click', function() {
        var newFavState = Number(!M.isFavourite($.selected));

        M.favourite($.selected, newFavState);

        if (M.viewmode) {
            $('.fm-blocks-view .data-block-view').removeClass('ui-selected');
        }
        else {
            $('.grid-table.fm tr').removeClass('ui-selected');
        }
    });

    $(c + '.send-to-contact-item').rebind('click', function () {
        openCopyDialog('conversations');
    });

    $('.submenu.labels .dropdown-colour-item').rebind('click', function() {
        var labelId = parseInt(this.dataset.labelId);

        if (labelId && (M.getNodeRights($.selected[0]) > 1)) {
            M.labeling($.selected, labelId);
        }

        M.labelDomUpdate();
    });

    $('.colour-sorting-menu .filter-by .dropdown-colour-item').rebind('click', function(e) {
        if (d){
            console.log('label color selected');
        }
        var labelId = parseInt(this.dataset.labelId);
        var parent = $(this).parents('.labels');

        if (labelId && !parent.hasClass("disabled")) {
            // init M.filterLabel[type] if not exist.
            if (!M.currentLabelFilter) {
                M.filterLabel[M.currentLabelType] = Object.create(null);
            }

            M.applyLabelFilter(e);
        }
    });

    $('.filter-block .close').rebind('click', function() {
        delete M.filterLabel[M.currentLabelType];
        $('.colour-sorting-menu .dropdown-colour-item').removeClass('active');
        $(this).parent().addClass('hidden')// Hide 'Filter:' DOM elements
            .find('.colour-label-ind').remove();// Remove all colors from it

        $.hideContextMenu();
        M.openFolder(M.currentdirid, true);
    });

    $('.filter-block.rubbish .filter-block.close').rebind('click', function() {
        delete M.filterLabel[M.currentLabelType];
        $('.colour-sorting-menu .dropdown-colour-item').removeClass('active');
        $('.filter-block.rubbish.body')
        .addClass('hidden')// Hide 'Filter:' DOM elements
        .find('.colour-label-ind').remove();// Remove all colors from it

        $.hideContextMenu();
        M.openFolder(M.currentdirid, true);
    });

    $('.submenu.labels .dropdown-colour-item').rebind('mouseover.clrSort', function() {
        var labelTxt = this.dataset.labelTxt;
        if ($(this).hasClass('active')) {
            switch (labelTxt) {
                case "Red":
                    labelTxt = l[19569];
                    break;
                case "Orange":
                    labelTxt = l[19573];
                    break;
                case "Yellow":
                    labelTxt = l[19577];
                    break;
                case "Green":
                    labelTxt = l[19581];
                    break;
                case "Blue":
                    labelTxt = l[19585];
                    break;
                case "Purple":
                    labelTxt = l[19589];
                    break;
                case "Grey":
                    labelTxt = l[19593];
                    break;
            }
        }
        else {
            switch (labelTxt) {
                case "Red":
                    labelTxt = l[19568];
                    break;
                case "Orange":
                    labelTxt = l[19572];
                    break;
                case "Yellow":
                    labelTxt = l[19576];
                    break;
                case "Green":
                    labelTxt = l[19580];
                    break;
                case "Blue":
                    labelTxt = l[19584];
                    break;
                case "Purple":
                    labelTxt = l[19588];
                    break;
                case "Grey":
                    labelTxt = l[19592];
                    break;
            }
        }
        $('.labels .dropdown-color-info').safeHTML(labelTxt).addClass('active');
    });

    $('.colour-sorting-menu .labels .dropdown-colour-item').rebind('mouseover.clrSort', function(e) {
        if (!$(this).parents('.labels').hasClass('disabled')){
            M.updateLabelInfo(e);
        }
    });

    $('.labels .dropdown-colour-item').rebind('mouseout', function() {
        $('.labels .dropdown-color-info').removeClass('active');
    });

    $(c + '.open-item').rebind('click', function() {
        var target = $.selected[0];
        if (M.currentrootid === 'out-shares' || M.currentrootid === 'public-links') {
            target = M.currentrootid + '/' + target;
        }
        M.openFolder(target);
    });

    $(c + '.preview-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        closeDialog();
        slideshow($.selected[0]);
    });

    $(c + '.play-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        var n = $.selected[0];

        closeDialog();

        $.autoplay = n;
        slideshow(n);
    });

    $(c + '.clearbin-item').rebind('click', function() {
        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            showExpiredBusiness();
            return;
        }
        doClearbin(false);
    });

    $(c + '.move-up').rebind('click', function() {
        $('.transfer-table tr.ui-selected')
            .attrs('id')
            .map(function(id) {
                fm_tfsmove(id, -1);
            });
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
        delay('fm_tfsupdate', fm_tfsupdate);
    });

    $(c + '.move-down').rebind('click', function() {
        $('.transfer-table tr.ui-selected')
            .attrs('id')
            .reverse()
            .map(function(id) {
                fm_tfsmove(id, 1);
            });
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
        delay('fm_tfsupdate', fm_tfsupdate);
    });

    $(c + '.transfer-play, ' + c + '.transfer-pause').rebind('click', function() {
        var $trs = $('.transfer-table tr.ui-selected');

        if ($trs.filter('.transfer-upload').length) {
            if (ulmanager.ulOverStorageQuota) {
                ulmanager.ulShowOverStorageQuotaDialog();
                return;
            }
        }

        if (dlmanager.isOverQuota) {
            dlmanager.showOverQuotaDialog();
            return;
        }

        var ids = $trs.attrs('id');

        if ($(this).hasClass('transfer-play')) {
            ids.map(fm_tfsresume);

        }
        else {
            ids.map(fm_tfspause);
        }

        $trs.removeClass('ui-selected');
    });

    $(c + '.canceltransfer-item,' + c + '.transfer-clear').rebind('click', function() {
        var $trs = $('.transfer-table tr.ui-selected');
        var toabort = $trs.attrs('id');
        $trs.remove();
        dlmanager.abort(toabort);
        ulmanager.abort(toabort);
        $.clearTransferPanel();
        fm_tfsupdate();
        mega.tpw.removeRow(toabort);

        onIdle(function() {
            // XXX: better way to stretch the scrollbar?
            $(window).trigger('resize');
        });
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
    });

    if (localStorage.folderLinkImport) {
        onIdle(M.importFolderLinkNodes.bind(M, false));
    }
};

FileManager.prototype.createFolderUI = function() {
    "use strict";

    var doCreateFolder = function() {
        var $inputWrapper = $('.create-new-folder.popup .fm-dialog-body');
        var $input = $inputWrapper.find('input');
        var name = $input.val();

        if (name === '' || !M.isSafeName(name)) {
            $inputWrapper.addClass('error');
            $input.addClass('error');

            setTimeout(function () {
                $inputWrapper.removeClass('error');
                $input.removeClass('error');
                $input.trigger("focus");
            }, 2000);
        }
        else {
            if (duplicated(1, name)) {// Check if folder name already exists
                $inputWrapper.addClass('duplicate');
                $input.addClass('error');

                setTimeout(function () {
                    $inputWrapper.removeClass('duplicate');
                    $input.removeClass('error');
                    $input.trigger("focus");
                }, 2000);

                return;
            }
            loadingDialog.pshow();
            var currentdirid = M.currentCustomView.nodeID || M.currentdirid;

            M.createFolder(currentdirid, name, new MegaPromise())
                .done(function(h) {
                    if (d) {
                        console.log('Created new folder %s->%s.', currentdirid, h);
                    }
                    loadingDialog.phide();
                })
                .fail(function(error) {
                    loadingDialog.phide();
                    msgDialog('warninga', l[135], l[47], api_strerror(error));
                });
        }

        return false;
    };

    $('.fm-new-folder').rebind('click', function(e) {

        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            M.showExpiredBusiness();
            return;
        }

        var c = $('.fm-new-folder').attr('class'),
            c2 = $(e.target).attr('class'),
            c3 = $(e.target).parent().attr('class'),
            b1 = $('.fm-new-folder');

        $('.create-new-folder').removeClass('filled-input');
        var d1 = $('.create-new-folder');
        if ((!c2 || c2.indexOf('fm-new-folder') === -1) && (!c3 || c3.indexOf('fm-new-folder') === -1)) {
            return false;
        }
        if (c.indexOf('active') === -1) {
            b1.addClass('active');
            d1.removeClass('hidden');
            topPopupAlign(this, '.dropdown.create-new-folder');
            $('.create-new-folder input').trigger("focus");
        }
        else {
            b1.removeClass('active filled-input');
            d1.addClass('hidden');
            $('.fm-new-folder input').val('');
        }
        $.hideContextMenu();
    });

    $('.create-folder-button').rebind('click', doCreateFolder);

    $('.create-folder-button-cancel').rebind('click', function() {
        $('.fm-new-folder').removeClass('active');
        $('.create-new-folder').addClass('hidden');
        $('.create-new-folder').removeClass('filled-input');
        $('.create-new-folder input').val('');
    });

    $('.create-folder-size-icon.full-size').rebind('click', function() {

        var v = $('.create-new-folder input').val();

        if (v !== l[157] && v !== '') {
            $('.create-folder-dialog input').val(v);
        }

        $('.create-new-folder input').trigger("focus");
        $('.create-new-folder').removeClass('filled-input');
        $('.create-new-folder').addClass('hidden');
        $('.fm-new-folder').removeClass('active');
        createFolderDialog(0);
        $('.create-new-folder input').val('');
    });

    $('.create-folder-size-icon.short-size').rebind('click', function() {

        var v = $('.create-folder-dialog input').val();

        if (v !== l[157] && v !== '') {
            $('.create-new-folder input').val(v);
            $('.create-new-folder').addClass('filled-input');
        }

        $('.fm-new-folder').addClass('active');
        $('.create-new-folder').removeClass('hidden');
        topPopupAlign('.link-button.fm-new-folder', '.create-folder-dialog');

        createFolderDialog(1);
        $('.create-folder-dialog input').val('');
        $('.create-new-folder input').trigger("focus");
    });

    $('.create-new-folder input').rebind('keyup.create-new-f', function(e) {
        $('.create-new-folder').addClass('filled-input');
        if ($(this).val() === '') {
            $('.create-new-folder').removeClass('filled-input');
        }
        if (e.which == 13) {
            doCreateFolder();
        }
    });

    $('.create-new-folder input').rebind('focus.create-new-f', function() {
        if ($(this).val() === l[157]) {
            $(this).val('');
        }
        $('.create-new-folder').addClass('focused');
    });

    $('.create-new-folder input').rebind('blur.create-new-f', function() {
        $('.create-new-folder').removeClass('focused');
    });

    $('.fm-new-shared-folder').rebind('click', function() {
        if (u_type === 0) {
            ephemeralDialog(l[997]);
        }
        else {
            openNewSharedFolderDialog();
        }
    });

    $('.fm-new-link').rebind('click', function() {
        if (u_type === 0) {
            ephemeralDialog(l[1005]);
        }
        else {
            M.safeShowDialog('create-new-link', function () {
                M.initFileAndFolderSelectDialog('create-new-link');
            });
        }
    });
};

/**
 * Initialize file and folder select dialog from chat.
 * This will fill up $.selected with what user selected on the dialog.
 * @param {String} type Type of dialog for select default options, e.g. newLink for New public link
 */
FileManager.prototype.initFileAndFolderSelectDialog = function(type) {
    'use strict';

    // If chat is not ready.
    if (!megaChatIsReady) {
        if (megaChatIsDisabled) {
            console.error('Mega Chat is disabled, cannot proceed');
        }
        else {
            // Waiting for chat_initialized broadcaster.
            loadingDialog.show();
            mBroadcaster.once('chat_initialized', this.initFileAndFolderSelectDialog.bind(this, type));
        }
        return false;
    }

    loadingDialog.hide();

    // Using existing File selector dialog from chat.
    var dialogPlacer = document.createElement('div');
    var selected = [];
    var constructor;
    var options = {
        'create-new-link': {
            title: l[20667],
            classes: 'no-incoming', // Hide incoming share tab
            selectLabel: l[1523],
            folderSelectable: true, // Can select folder(s)
            onAttach: function() {
                closeDialog();
                $.selected = selected;
                M.getLinkAction();
            }
        }
    };

    var dialog = React.createElement(CloudBrowserModalDialogUI.CloudBrowserDialog, {
        title: options[type].title,
        folderSelectable: options[type].folderSelectable,
        selectLabel: options[type].selectLabel,
        className: options[type].classes,
        onClose: function() {
            document.body.removeChild(constructor.domNode);
            selected = [];
            closeDialog();
        },
        onSelected: function(node) {
            selected = node;
        },
        onAttachClicked: options[type].onAttach,
    });

    constructor = ReactDOM.render(dialog, dialogPlacer);
};

FileManager.prototype.initUIKeyEvents = function() {
    "use strict";

    $(window).rebind('keydown.uikeyevents', function(e) {
        if (e.keyCode == 9 && !$(e.target).is("input,textarea,select")) {
            return false;
        }
        if ($(e.target).filter("input,textarea,select").is(":focus")) {
            // when the user is typing in the "New folder dialog", if the current viewMode is grid/icons view, then
            // left/right navigation in the input field may cause the selection manager to trigger selection changes.
            // Note: I expected that the dialog would set $.dialog, but it doesn't.
            if (e.keyCode !== 27) {
                return true;
            }
        }

        var is_transfers_or_accounts = (
            M.currentdirid && (M.currentdirid.substr(0, 7) === 'account' || M.currentdirid === 'transfers')
        );

        // selection manager may not be available on empty folders.
        var is_selection_manager_available = !!selectionManager;

        var sl = false;
        var s = [];

        var selPanel = $('.fm-transfers-block tr.ui-selected');

        if (selectionManager && selectionManager.selected_list && selectionManager.selected_list.length > 0) {
            s = clone(selectionManager.selected_list);
        }
        else {
            var tempSel;

            if (M.viewmode) {
                tempSel = $('.data-block-view.ui-selected');
            }
            else {
                tempSel = $('.grid-table tr.ui-selected');
            }

            s = tempSel.attrs('id');
        }

        if (M.chat && !$.dialog) {
            return true;
        }

        if (!is_fm() && page !== 'login' && page.substr(0, 3) !== 'pro') {
            return true;
        }

        /**
         * Because of te .unbind, this can only be here... it would be better if its moved to iconUI(), but maybe some
         * other day :)
         */
        if (
            is_selection_manager_available &&
            !is_transfers_or_accounts &&
            !$.dialog &&
            !slideshowid &&
            M.viewmode == 1
        ) {
            if (e.keyCode == 37) {
                // left
                selectionManager.select_prev(e.shiftKey, true);
            }
            else if (e.keyCode == 39) {
                // right
                selectionManager.select_next(e.shiftKey, true);
            }

            // up & down
            else if (e.keyCode == 38 || e.keyCode == 40) {
                if (e.keyCode === 38) {
                    selectionManager.select_grid_up(e.shiftKey, true);
                }
                else {
                    selectionManager.select_grid_down(e.shiftKey, true);
                }

            }
        }

        if (
            is_selection_manager_available &&
            !is_transfers_or_accounts &&
            e.keyCode == 38 &&
            $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1 &&
            !$.dialog
        ) {
            // up in grid/table
            selectionManager.select_prev(e.shiftKey, true);
            quickFinder.disable_if_active();
        }
        else if (
            is_selection_manager_available &&
            !is_transfers_or_accounts &&
            e.keyCode == 40 &&
            $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1 &&
            !$.dialog
        ) {
            // down in grid/table
            selectionManager.select_next(e.shiftKey, true);
            quickFinder.disable_if_active();
        }
        else if (
            !is_transfers_or_accounts &&
            e.keyCode == 46 &&
            s.length > 0 &&
            !$.dialog &&
            M.getNodeRights(M.currentdirid) > 1
        ) {
            // delete
            fmremove(s);
        }
        else if ((e.keyCode === 46) && (selPanel.length > 0)
            && !$.dialog && M.getNodeRights(M.currentdirid) > 1) {
            msgDialog('confirmation', l[1003], l[17092].replace('%1', s.length), false, function(e) {

                // we should encapsule the click handler
                // to call a function rather than use this hacking
                if (e) {
                    $('.transfer-clear').trigger('click');
                }
            });
        }
        else if (
            !is_transfers_or_accounts &&
            e.keyCode == 13
            && s.length > 0
            && !$.dialog
            && !$.msgDialog
            && !$('.fm-new-folder').hasClass('active')
            && !$('.top-search-bl').hasClass('active')
        ) {
            $.selected = s;

            if ($.selected && $.selected.length > 0) {
                var n = M.d[$.selected[0]];
                if (n && n.t) {
                    M.openFolder(n.h);
                }
                else if ($.selected.length < 2 && (is_image2(n) || is_video(n))) {
                    slideshow($.selected[0]);
                }
                else {
                    M.addDownload($.selected);
                }
            }
        }
        else if ((e.keyCode === 13) && ($.dialog === 'share')) {
            addNewContact($('.add-user-popup-button'), false).done(function() {
                var share = new mega.Share();
                share.updateNodeShares();
                $('.token-input-token-mega').remove();
            });
        }
        else if ((e.keyCode === 13) && ($.dialog === 'add-contact-popup')) {
            addNewContact($('.add-user-popup-button'));
        }
        else if ((e.keyCode === 13) && ($.dialog === 'rename')) {
            $('.rename-dialog-button.rename').trigger('click');
        }

        // If the Esc key is pressed while the payment address dialog is visible, close it
        else if ((e.keyCode === 27) && !$('.payment-address-dialog').hasClass('hidden')) {
            addressDialog.closeDialog();
        }
        else if (e.keyCode === 27 && ($.copyDialog || $.moveDialog || $.selectFolderDialog || $.copyrightsDialog)) {
            closeDialog();
        }
        else if (e.keyCode == 27 && $.topMenu) {
            topMenu(1);
        }
        else if (e.keyCode == 27 && $.dialog) {
            closeDialog();
        }
        else if (e.keyCode == 27 && $('.default-select.active').length) {
            var $selectBlock = $('.default-select.active');
            $selectBlock.find('.default-select-dropdown').fadeOut(200);
            $selectBlock.removeClass('active');
        }
        else if (e.keyCode == 27 && $.msgDialog) {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
            }
        }
        else if ((e.keyCode == 13 && $.msgDialog == 'confirmation') && (e.keyCode == 13 && $.msgDialog == 'remove')) {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
            }
        }
        else if (
            !is_transfers_or_accounts &&
            (e.keyCode === 113 /* F2 */) &&
            (s.length > 0) &&
            !$.dialog && M.getNodeRights(M.d[s[0]] && M.d[s[0]].h) > 1
        ) {
            renameDialog();
        }
        else if (
            is_selection_manager_available &&
            e.keyCode == 65 &&
            e.ctrlKey &&
            !$.dialog
        ) {
            if (is_transfers_or_accounts || M.currentdirid === 'ipc' || M.currentdirid === 'opc') {
                return;
            }
            // ctrl+a/cmd+a - select all
            selectionManager.select_all();
        }
        else if (e.keyCode == 27) {
            if ($.hideTopMenu) {
                $.hideTopMenu();
            }
            if ($.hideContextMenu) {
                $.hideContextMenu();
            }
        }

        if (sl && $.selectddUIgrid.indexOf('.grid-scrolling-table') > -1) {
            // if something is selected, scroll to that item
            var jsp = $($.selectddUIgrid).data('jsp');
            if (jsp) {
                jsp.scrollToElement(sl);
            }
            else if (M.megaRender && M.megaRender.megaList && M.megaRender.megaList._wasRendered) {
                M.megaRender.megaList.scrollToItem(sl.data('id'));
            }
        }

        M.searchPath();
    });
};

FileManager.prototype.addTransferPanelUI = function() {
    "use strict";

    var transferPanelContextMenu = function(target) {
        var file;
        var tclear;

        $('.dropdown.body.files-menu .dropdown-item').hide();
        var menuitems = $('.dropdown.body.files-menu .dropdown-item');

        menuitems.filter('.transfer-pause,.transfer-play,.move-up,.move-down,.transfer-clear')
            .show();

        tclear = menuitems.filter('.transfer-clear').contents().last().get(0) || {};
        tclear.textContent = l[103];

        if (target === null && (target = $('.transfer-table tr.ui-selected')).length > 1) {
            var ids = target.attrs('id');
            var finished = 0;
            var paused = 0;
            var started = false;

            ids.forEach(function(id) {
                file = GlobalProgress[id];
                if (!file) {
                    finished++;
                }
                else {
                    if (file.paused) {
                        paused++;
                    }
                    if (file.started) {
                        started = true;
                    }
                }
            });

            if (finished === ids.length) {
                menuitems.hide()
                    .filter('.transfer-clear')
                    .show();
                tclear.textContent = l[7218];
            }
            else {
                if (started) {
                    menuitems.filter('.move-up,.move-down').hide();
                }
                if (paused === ids.length) {
                    menuitems.filter('.transfer-pause').hide();
                }

                var prev = target.first().prev();
                var next = target.last().next();

                if (prev.length === 0 || !prev.hasClass('transfer-queued')) {
                    menuitems.filter('.move-up').hide();
                }
                if (next.length === 0) {
                    menuitems.filter('.move-down').hide();
                }
            }
        }
        else if (!(file = GlobalProgress[$(target).attr('id')])) {
            /* no file, it is a finished operation */
            menuitems.hide()
                .filter('.transfer-clear')
                .show();
            tclear.textContent = l[7218];
        }
        else {
            if (file.started) {
                menuitems.filter('.move-up,.move-down').hide();
            }
            if (file.paused) {
                menuitems.filter('.transfer-pause').hide();
            }
            else {
                menuitems.filter('.transfer-play').hide();
            }

            if (!target.prev().length || !target.prev().hasClass('transfer-queued')) {
                menuitems.filter('.move-up').hide();
            }
            if (target.next().length === 0) {
                menuitems.filter('.move-down').hide();
            }
        }

        // XXX: Hide context-menu's menu-up/down items for now to check if that's the
        // origin of some problems, users can still use the new d&d logic to move transfers
        menuitems.filter('.move-up,.move-down').hide();

        var parent = menuitems.parent();
        parent
            .children('hr').addClass('hidden').end()
            .children('hr.pause').removeClass('hidden').end();

        if (parent.height() < 56) {
            parent.find('hr.pause').addClass('hidden');
        }
    };


    $.transferHeader = function(tfse) {
        tfse = tfse || M.getTransferElements();
        var domTableEmptyTxt = tfse.domTableEmptyTxt;
        var domTableHeader = tfse.domTableHeader;
        var domScrollingTable = tfse.domScrollingTable;
        var domTable = tfse.domTable;
        tfse = undefined;

        // Show/Hide header if there is no items in transfer list
        if (domTable.querySelector('tr')) {
            domTableEmptyTxt.classList.add('hidden');
            domScrollingTable.style.display = '';
            domTableHeader.style.display = '';
        }
        else {
            domTableEmptyTxt.classList.remove('hidden');
            domScrollingTable.style.display = 'none';
            domTableHeader.style.display = 'none';
        }

        $(domScrollingTable).rebind('click.tst contextmenu.tst', function(e) {
            if (!$(e.target).closest('.transfer-table').length) {
                $('.ui-selected', domTable).removeClass('ui-selected');
            }
        });

        var $tmp = $('.grid-url-arrow, .clear-transfer-icon', domTable);
        $tmp.rebind('click', function(e) {
            var target = $(this).closest('tr');
            e.preventDefault();
            e.stopPropagation(); // do not treat it as a regular click on the file
            $('tr', domTable).removeClass('ui-selected');

            if ($(this).hasClass('grid-url-arrow')) {
                target.addClass('ui-selected');
                e.currentTarget = target;
                transferPanelContextMenu(target);
                if (!$(this).hasClass('active')) {
                    M.contextMenuUI(e);
                    $(this).addClass('active');
                }
                else {
                    $.hideContextMenu();
                    $(this).removeClass('active');
                }
            }
            else {
                if (!target.hasClass('.transfer-completed')) {
                    var toabort = target.attr('id');
                    dlmanager.abort(toabort);
                    ulmanager.abort(toabort);
                }
                target.fadeOut(function() {
                    $(this).remove();
                    mega.tpw.removeRow(target.attr('id'));
                    $.clearTransferPanel();
                    fm_tfsupdate();
                    $.tresizer();
                });
            }

            return false;
        });

        $tmp = $('tr', domTable);
        $tmp.rebind('dblclick', function() {
            if ($(this).hasClass('transfer-completed')) {
                var id = String($(this).attr('id'));
                if (id[0] === 'd') {
                    id = id.split('_').pop();
                }
                else if (id[0] === 'u') {
                    id = String(ulmanager.ulIDToNode[id]);
                }
                var path = M.getPath(id);
                if (path.length > 1) {
                    M.openFolder(path[1], true)
                        .always(function() {
                            $.selected = [id];
                            reselect(1);
                        });
                }
            }
            return false;
        });

        $tmp.rebind('click contextmenu', function(e) {
            if (e.type === 'contextmenu') {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    $('.ui-selected', domTable).removeClass('ui-selected');
                }
                $(this).addClass('ui-selected dragover');
                transferPanelContextMenu(null);
                return !!M.contextMenuUI(e);
            }
            else {
                var domNode = domTable.querySelector('tr');
                if (e.shiftKey && domNode) {
                    var start = domNode;
                    var end = this;
                    if ($.TgridLastSelected && $($.TgridLastSelected).hasClass('ui-selected')) {
                        start = $.TgridLastSelected;
                    }
                    if ($(start).index() > $(end).index()) {
                        end = start;
                        start = this;
                    }
                    $('.ui-selected', domTable).removeClass('ui-selected');
                    $([start, end]).addClass('ui-selected');
                    $(start).nextUntil($(end)).each(function(i, e) {
                        $(e).addClass('ui-selected');
                    });
                }
                else if (!e.ctrlKey && !e.metaKey) {
                    $('.ui-selected', domTable).removeClass('ui-selected');
                    $(this).addClass('ui-selected');
                    $.TgridLastSelected = this;
                }
                else {
                    if ($(this).hasClass("ui-selected")) {
                        $(this).removeClass("ui-selected");
                    }
                    else {
                        $(this).addClass("ui-selected");
                        $.TgridLastSelected = this;
                    }
                }
            }

            return false;
        });
        $tmp = undefined;

        // initTransferScroll(domScrollingTable);
        delay('tfs-ps-update', function() {
            // XXX: This update will fire ps-y-reach-end, set a flag to ignore it...

            $.isTfsPsUpdate = true;
            Ps.update(domScrollingTable);

            onIdle(function() {
                $.isTfsPsUpdate = false;
            });
        });
    };

    $.transferClose = function() {
        $('.nw-fm-left-icon.transfers').removeClass('active');
        $('#fmholder').removeClass('transfer-panel-opened');
    };

    $.transferOpen = function(force) {
        if (force || !$('.nw-fm-left-icon.transfers').hasClass('active')) {
            $('.nw-fm-left-icon').removeClass('active');
            $('.nw-fm-left-icon.transfers').addClass('active');
            $('#fmholder').addClass('transfer-panel-opened');
            M.addNotificationsUI(1);
            var domScrollingTable = M.getTransferElements().domScrollingTable;
            if (!domScrollingTable.classList.contains('ps-container')) {
                Ps.initialize(domScrollingTable, {suppressScrollX: true});
            }
            fm_tfsupdate(); // this will call $.transferHeader();
        }
    };

    $.clearTransferPanel = function() {
        var obj = M.getTransferElements();
        if (!obj.domTable.querySelector('tr')) {
            $('.transfer-clear-all-icon').addClass('disabled');
            $('.transfer-pause-icon').addClass('disabled');
            $('.transfer-clear-completed').addClass('disabled');
            $('.transfer-table-header').hide();
            $('.transfer-panel-empty-txt').removeClass('hidden');
            $('.transfer-panel-title span').text('');
            $('.nw-fm-left-icon.transfers').removeClass('transfering').find('p').removeAttr('style');
            if (M.currentdirid === 'transfers') {
                fm_tfsupdate();
                $.tresizer();
            }
        }
    };

    $.removeTransferItems = function($trs) {
        var type = null;
        if (!$trs) {
            $trs = $('.transfer-table tr.transfer-completed');
            type = mega.tpw.DONE;
        }
        var $len = $trs.length;
        if ($len && $len < 100) {
            $trs.fadeOut(function() {
                $(this).remove();
                if (!--$len) {
                    $.clearTransferPanel();
                }
            });
        }
        else {
            $trs.remove();
            Soon($.clearTransferPanel);
        }
        mega.tpw.clearRows(type);
    };

    $('.transfer-clear-all-icon').rebind('click', function() {
        if (!$(this).hasClass('disabled')) {
            msgDialog('confirmation', 'clear all transfers', l[7225], '', function(e) {
                if (!e) {
                    return;
                }

                dlmanager.abort(null);
                ulmanager.abort(null);

                $.removeTransferItems($('.transfer-table tr'));

                later(function() {
                    if (uldl_hold) {
                        uldl_hold = false;
                        ulQueue.resume();
                        dlQueue.resume();
                        $('.transfer-pause-icon').removeClass('active').find('span').text(l[6993]);
                    }
                });
            });
        }
    });

    $('.transfer-clear-completed').rebind('click', function() {
        if (!$(this).hasClass('disabled')) {
            $.removeTransferItems();
        }
    });

    $('.transfer-pause-icon').rebind('click', function() {

        if (dlmanager.isOverQuota) {
            return dlmanager.showOverQuotaDialog();
        }

        if (ulmanager.ulOverStorageQuota) {
            ulmanager.ulShowOverStorageQuotaDialog();
            return false;
        }

        if (!$(this).hasClass('disabled')) {
            if ($(this).hasClass('active')) {
                // terms of service
                if (u_type || folderlink || Object(u_attr).terms) {
                    [dlQueue, ulQueue].forEach(function(queue) {
                        Object.keys(queue._qpaused).map(fm_tfsresume);
                    });
                    uldl_hold = false;
                    ulQueue.resume();
                    dlQueue.resume();

                    $(this).removeClass('active').find('span').text(l[6993]);
                    $('.transfer-table-wrapper tr').removeClass('transfer-paused');
                    $('.nw-fm-left-icon').removeClass('paused');
                }
                else {
                    alert(l[214]);
                    if (d) {
                        console.debug(l[214]);
                    }
                }
            }
            else {
                var $trs = $('.transfer-table tr:not(.transfer-completed)');

                $trs.attrs('id')
                    .concat(Object.keys(M.tfsdomqueue))
                    .map(fm_tfspause);

                dlQueue.pause();
                ulQueue.pause();
                uldl_hold = true;

                $(this).addClass('active').find('span').text(l[7101]);
                $trs.addClass('transfer-paused');
                $('.nw-fm-left-icon').addClass('paused');
            }
        }
    });
};

FileManager.prototype.sharesUI = function() {
    "use strict";

    $('.shares-tab-lnk').rebind('click', function() {
        var $this = $(this);
        var folder = escapeHTML($this.attr('data-folder'));

        M.openFolder(folder);
    });
};

FileManager.prototype.contactsUI = function() {
    "use strict";

    var $container = $('.contacts-view');
    var $contactBlocks = $container.find('.data-block-view, .contacts tr');
    var $buttons = $contactBlocks.find('.default-white-button');
    var $addContact = $contactBlocks.find('.add-new-contact');

    setContactLink();

    mega.achievem.enabled()
        .done(function () {
            $container.find('.contact-green-info').text(l[19107]);
            $('.fm-empty-contacts .fm-empty-description.small').text(l[19115]);
        })
        .fail(function () {
            $container.find('.contact-green-info').text(l[19106]);
            $('.fm-empty-contacts .fm-empty-description.small').text(l[19114]);
        });

    $('.contacts-tab-lnk').rebind('click', function() {
        var $this = $(this);
        var folder = escapeHTML($this.attr('data-folder'));

        if (folder === "ipc") {
            M.openFolder('ipc');
        }
        else if (folder === "opc") {
            M.openFolder('opc');
        }
        else {
            M.openFolder('contacts');
        }
    });

    $contactBlocks.rebind('mouseover.contacts', function() {
        var $this = $(this);
        var user_handle = $this.attr('id');

        if (megaChatIsDisabled) {
            $this.find('.contact-chat-buttons').addClass('hidden');
        }
        else {
            $this.find('.contact-chat-buttons').removeClass('hidden');
        }
    });
    $buttons.rebind('click.contacts', function() {

        if (u_attr && u_attr.b && u_attr.b.s === -1) {
            $.hideContextMenu();
            M.showExpiredBusiness();
            return;
        }

        var $this = $(this);
        var user_handle = $this.closest('.data-block-view, tr').attr('id');

        if ($this.hasClass('disabled') || !user_handle) {
            return;
        }

        if ($this.hasClass('start-conversation')) {
            loadSubPage("fm/chat/p/" + user_handle);
        }
        else if ($this.hasClass('start-audio-call')) {
            megaChat.createAndShowPrivateRoomFor(user_handle)
                .then(function(room) {
                    room.setActive();
                    room.startAudioCall();
                });
        }
        else if ($this.hasClass('start-video-call')) {
            megaChat.createAndShowPrivateRoomFor(user_handle)
                .then(function(room) {
                    room.setActive();
                    room.startVideoCall();
                });
        }
    });

    $('.fm-empty-contacts .fm-empty-button, .add-new-contact, .fm-add-user')
        .rebind('mousedown.addcontact1', function(e) {

            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                $.hideContextMenu();
                M.showExpiredBusiness();
                return;
            }

            var $this = $(this);

            $.hideContextMenu();
            contactAddDialog();
            e.stopPropagation();
    });

};

FileManager.prototype.addContactUI = function() {
    "use strict";

    var $container = $('.contact-top-details');

    $('.nw-contact-item').removeClass('selected');

    var n = this.u[this.currentdirid];
    if (n && n.u) {
        var u_h = this.currentdirid;
        var user = this.u[u_h];
        var avatar = $(useravatar.contact(u_h, 'medium-avatar'));

        var onlinestatus = this.onlineStatusClass(
            megaChatIsReady &&
            this.u[u_h] ? this.u[u_h].presence : "unavailable"
        );

        $container.find('.nw-contact-block-avatar').empty().append(avatar);
        $container.find('.onlinestatus').removeClass('away offline online busy').addClass(onlinestatus[1]);
        $container.find('.fm-chat-user-status').text(onlinestatus[0]);
        $container.find('.contact-details-user-name').text(this.getNameByHandle(user.u));
        $container.find('.contact-details-email').text(user.m);
        $('.contact-share-notification').text(l[20435].replace('%1', this.getNameByHandle(user.u)));

        // Display the current fingerpring
        showAuthenticityCredentials(user, $container);

        // Set authentication state of contact from authring.
        // To be called on settled authring promise.
        authring.onAuthringReady('contactUI').done(function _setVerifiedState() {

            var handle = user.u || user;
            var verificationState = u_authring.Ed25519[handle] || {};
            var isVerified = (verificationState.method
            >= authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON);

            // Show the user is verified
            if (isVerified) {
                $('.fm-verify').addClass('verified').find('span').text(l[6776]);
            }
            else {
                // Otherwise show the Verify... button.
                enableVerifyFingerprintsButton(handle);
            }
        });

        // Reset seen or verified fingerprints and re-enable the Verify button
        $('.fm-reset-stored-fingerprint').rebind('click', function() {
            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                $.hideContextMenu();
                M.showExpiredBusiness();
                return;
            }

            authring.resetFingerprintsForUser(user.u);
            enableVerifyFingerprintsButton(user.u);

            // Refetch the key
            showAuthenticityCredentials(user, $container);

            // Trigger manual UI updates
            M.u[user.u] && M.u[user.u].trackDataChange();
        });

        $('.fm-share-folders').rebind('click', function() {
            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                $.hideContextMenu();
                M.showExpiredBusiness();
                return;
            }
            openCopyShareDialog(M.currentdirid);
        });

        // Remove contact button on contacts page
        $('.fm-remove-contact').rebind('click', function() {

            if (u_attr && u_attr.b && u_attr.b.s === -1) {
                $.hideContextMenu();
                M.showExpiredBusiness();
                return;
            }

            fmremove([M.currentdirid]);
        });

        if (!megaChatIsDisabled) {

            // Bind the "Start conversation" button
            $('.fm-start-conversation').rebind('click.megaChat', function() {
                loadSubPage('fm/chat/p/' + u_h);
                return false;
            });
        }

        $('.nw-contact-item#contact_' + u_h).addClass('selected');
    }
};

FileManager.prototype.addNotificationsUI = function(close) {
    if (close) {
        $('.fm-main.notifications').addClass('hidden');
        $('.fm-main.default').removeClass('hidden');
        return false;
    }
    $('.fm-main.notifications').removeClass('hidden');
    $('.notifications .nw-fm-left-icon').removeClass('active');
    $('.fm-main.default').addClass('hidden');
    $.tresizer();
};

/**
 * Depending the viewmode this fires either addIconUI or addGridUI, plus addTreeUI
 * @param {Boolean} aNoTreeUpdate Omit the call to addTreeUI
 */
FileManager.prototype.addViewUI = function(aNoTreeUpdate, refresh) {
    if (this.viewmode) {
        this.addIconUI(undefined, refresh);
    }
    else {
        this.addGridUI(refresh);
    }

    if (!aNoTreeUpdate) {
        this.addTreeUI();
    }
};

FileManager.prototype.addIconUI = function(aQuiet, refresh) {
    "use strict";
    if (d) {
        console.time('iconUI');
    }

    $('.fm-files-view-icon.block-view').addClass('active');
    $('.fm-files-view-icon.listing-view').removeClass('active');
    $('.shared-grid-view').addClass('hidden');
    $('.out-shared-grid-view').addClass('hidden');
    $('.files-grid-view.fm').addClass('hidden');
    $('.fm-blocks-view.fm').addClass('hidden');
    $('.fm-blocks-view.contacts-view').addClass('hidden');
    $('.files-grid-view.contacts-view').addClass('hidden');
    $('.contacts-details-block').addClass('hidden');
    $('.files-grid-view.contact-details-view').addClass('hidden');
    $('.fm-blocks-view.contact-details-view').addClass('hidden');

    if (this.currentdirid === 'contacts') {
        $('.fm-blocks-view.contacts-view').removeClass('hidden');
        initContactsBlocksScrolling();
    }
    else if (this.currentdirid === 'shares') {
        $('.shared-blocks-view').removeClass('hidden');
        initShareBlocksScrolling();
    }
    else if (this.currentdirid === 'out-shares') {
        $('.out-shared-blocks-view').removeClass('hidden');
        initOutShareBlocksScrolling();
    }
    else if (String(this.currentdirid).length === 11 && this.currentrootid === 'contacts') {
        $('.contacts-details-block').removeClass('hidden');
        if (this.v.length > 0) {
            $('.fm-blocks-view.contact-details-view').removeClass('hidden');
            initFileblocksScrolling2();
        }
    }
    else if (this.currentdirid === this.InboxID || this.getNodeRoot(this.currentdirid) === this.InboxID) {
        //console.error("Inbox iconUI");
        if (this.v.length > 0) {
            $('.fm-blocks-view.fm').removeClass('hidden');
            initFileblocksScrolling();
        }
    }
    else {
        // ui update is handled in Business Account classes.
        if (this.currentdirid.substr(0, 15) !== 'user-management') {
            $('.fm-blocks-view.fm').removeClass('hidden');
            if (this.currentCustomView) {
                $('.fm-blocks-view.fm').addClass(this.currentCustomView.type + '-view');
            }
            else {
                $('.fm-blocks-view.fm').removeClass('out-shares-view public-links-view');
            }
            if (!aQuiet) {
                initFileblocksScrolling();
            }
        }
    }

    $('.fm-blocks-view, .fm-empty-cloud, .fm-empty-folder')
        .rebind('contextmenu.fm', function(e) {
            if (page === "fm/links") { // Remove context menu option from filtered view
                return false;
            }
            $(this).find('.data-block-view').removeClass('ui-selected');
            // is this required? don't we have a support for a multi-selection context menu?
            if (selectionManager) {
                selectionManager.clear_selection();
            }
            $.selected = [];
            $.hideTopMenu();
            return !!M.contextMenuUI(e, 2);
    });

    if (this.currentdirid === 'contacts') {
        $.selectddUIgrid = '.contacts-blocks-scrolling';
        $.selectddUIitem = 'a';
    }
    else if (this.currentdirid === 'shares') {
        $.selectddUIgrid = '.shared-blocks-scrolling';
        $.selectddUIitem = 'a';
    }
    else if (this.currentdirid === 'out-shares') {
        $.selectddUIgrid = '.out-shared-blocks-scrolling';
        $.selectddUIitem = 'a';
    }
    else if (String(this.currentdirid).length === 11 && this.currentrootid === 'contacts') {
        $.selectddUIgrid = '.contact-details-view .file-block-scrolling';
        $.selectddUIitem = 'a';
    }
    else {
        $.selectddUIgrid = '.file-block-scrolling';
        $.selectddUIitem = 'a';
    }
    this.addSelectDragDropUI(refresh);
    if (d) {
        console.timeEnd('iconUI');
    }
};

FileManager.prototype.addGridUI = function(refresh) {
    "use strict";

    if (this.chat) {
        return;
    }
    if (d) {
        console.time('gridUI');
    }

    // Change title for Public link page
    if (page === 'fm/public-links') {
        $('.fm .grid-table-header .ts').text(l[20694]);
        $('.fm .grid-table-header .mtime').text(l[20694]);
    }
    else {
        $('.fm .grid-table-header .ts').text(l[17445]);
        $('.fm .grid-table-header .mtime').text(l[94]);
    }

    // $.gridDragging=false;
    $.gridLastSelected = false;
    $('.fm-files-view-icon.listing-view').addClass('active');
    $('.fm-files-view-icon.block-view').removeClass('active');

    $.gridHeader = function() {
        var headerColumn = '';
        var $firstChildTd = $('.grid-table tr:first-child td:visible');
        if ($firstChildTd.length === 0) {
            // if the first <tr> does not contain any TDs, pick the next one
            // this can happen when MegaList's prepusher (empty <TR/> is first)
            $firstChildTd = $('.grid-table tr:nth-child(2) td:visible');
        }

        $firstChildTd.each(function(i, e) {
            headerColumn = $('.files-grid-view.fm .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };


    $.detailsGridHeader = function() {
        $('.contact-details-view .grid-table tr:first-child td').each(function(i, e) {
            var headerColumn = $('.contact-details-view .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.contactGridHeader = function() {
        $('.files-grid-view.contacts-view .grid-scrolling-table tr:first-child td').each(function(i, e) {
            var headerColumn = $('.files-grid-view.contacts-view .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.opcGridHeader = function() {
        $('.sent-requests-grid .grid-scrolling-table tr:first-child td').each(function(i, e) {
            var headerColumn = $('.sent-requests-grid .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.ipcGridHeader = function() {
        $('.contact-requests-grid .grid-scrolling-table tr:first-child td').each(function(i, e) {
            var headerColumn = $('.contact-requests-grid .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.sharedGridHeader = function() {
        $('.shared-grid-view .grid-scrolling-table tr:first-child td').each(function(i, e) {
            var headerColumn = $('.shared-grid-view .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $.outSharedGridHeader = function() {
        $('.out-shared-grid-view .grid-scrolling-table tr:first-child td').each(function(i, e) {
            var headerColumn = $('.out-shared-grid-view .grid-table-header th').get(i);
            $(headerColumn).width($(e).width());
        });
    };

    $('.fm-blocks-view.fm').addClass('hidden');
    $('.fm-chat-block').addClass('hidden');
    $('.shared-blocks-view').addClass('hidden');
    $('.shared-grid-view').addClass('hidden');
    $('.out-shared-blocks-view').addClass('hidden');
    $('.out-shared-grid-view').addClass('hidden');
    $('.files-grid-view.fm').addClass('hidden');
    $('.fm-blocks-view.contacts-view').addClass('hidden');
    $('.files-grid-view.contacts-view').addClass('hidden');
    $('.contacts-details-block').addClass('hidden');
    $('.files-grid-view.contact-details-view').addClass('hidden');
    $('.fm-blocks-view.contact-details-view').addClass('hidden');
    $('.files-grid-view.user-management-view').addClass('hidden');

    if (this.currentdirid === 'contacts') {
        $('.files-grid-view.contacts-view').removeClass('hidden');
        $.contactGridHeader();
        initContactsGridScrolling();
    }
    else if (this.currentdirid === 'opc') {
        $('.grid-table.sent-requests').removeClass('hidden');
        $.opcGridHeader();
        initOpcGridScrolling();
    }
    else if (this.currentdirid === 'ipc') {
        $('.grid-table.contact-requests').removeClass('hidden');
        $.ipcGridHeader();
        initIpcGridScrolling();
    }
    else if (this.currentdirid === 'shares') {
        $('.shared-grid-view').removeClass('hidden');
        $.sharedGridHeader();
        initGridScrolling();
    }
    else if (this.currentdirid === 'out-shares') {
        $('.out-shared-grid-view').removeClass('hidden');
        $.outSharedGridHeader();
        initGridScrolling();
    }
    else if (String(this.currentdirid).length === 11 && this.currentrootid === 'contacts') {// Cloud-drive/File manager
        $('.contacts-details-block').removeClass('hidden');
        if (this.v.length > 0) {
            $('.files-grid-view.contact-details-view').removeClass('hidden');
            $.detailsGridHeader();
            initGridScrolling();
        }
    }
    else if (this.currentdirid === 'user-management') {
        $('.files-grid-view.user-management-view').removeClass('hidden');
        initGridScrolling();
    }
    else {
        $('.files-grid-view.fm').removeClass('hidden');
        if (this.currentCustomView) {
            $('.files-grid-view.fm').addClass(this.currentCustomView.type + '-view');
        }
        else {
            $('.files-grid-view.fm').removeClass('out-shares-view public-links-view');
        }
        initGridScrolling();
        $.gridHeader();
    }

    // if (folderlink) {
    //    $('.grid-url-arrow').hide();
    //    $('.grid-url-header').text('');
    // }
    // else {
        $('.grid-url-arrow').show();
        $('.grid-url-header').text('');
    // }

    $('.fm .grid-table-header th:nth-child(5)').rebind('contextmenu.column_time', function(e) {
        // Disable this for Public link page
        if (M.currentdirid === 'public-links') {
            return false;
        }
        $('.fm-blocks-view .data-block-view').removeClass('ui-selected');
        if (selectionManager) {
            selectionManager.clear_selection();
        }
        $.selected = [];
        $.hideTopMenu();
        return !!M.contextMenuUI(e, 6);
    });

    $('.files-grid-view.fm .grid-scrolling-table,.files-grid-view.fm .file-block-scrolling,' +
        '.fm-empty-cloud,.fm-empty-folder,.fm.shared-folder-content,' +
        '.files-grid-view.contacts-view').rebind('contextmenu.fm', function(e) {
            if (page === "fm/links") { // Remove context menu option from filtered view
                return false;
            }
            $('.fm-blocks-view .data-block-view').removeClass('ui-selected');
            if (selectionManager) {
                selectionManager.clear_selection();
            }
            $.selected = [];
            $.hideTopMenu();
            return !!M.contextMenuUI(e, 2);
    });

    // enable add star on first column click (make favorite)
    $('.grid-table.shared-with-me tr td:first-child,.grid-table.fm tr td:first-child').rebind('click', function() {
        var id = [$(this).parent().attr('id')];
        var newFavState = Number(!M.isFavourite(id));

        // Handling favourites is allowed for full permissions shares only
        if (M.getNodeRights(id) > 1) {
            M.favourite(id, newFavState);
        }
    });

    $('.dropdown-item.do-sort').rebind('click', function() {
        M.setLastColumn($(this).data('by'));
        M.doSort($(this).data('by'), -1);
        M.renderMain();
    });

    $('.grid-table-header .arrow').rebind('click', function(e) {
        var cls = $(this).attr('class');
        var dir = 1;

        // Excludes colour sorting dialog for contacts
        if (cls.indexOf('name') !== -1 && $(this).parents('.files-grid-view.contacts-view').length === 0) {
            return M.labelSortMenuUI(e);
        }
        else {
            M.resetLabelSortMenuUI();

            if (cls && cls.indexOf('desc') > -1) {
                dir = -1;
            }
            for (var sortBy in M.sortRules) {
                if (cls.indexOf(sortBy) !== -1) {
                    M.doSort(sortBy, dir);
                    M.renderMain();
                    break;
                }
            }
        }
    });

    $('.grid-first-th').rebind('click', function() {
        var $el = $(this).children().first();
        var c = $el.attr('class');
        var d = 1;

        if (c && (c.indexOf('desc') > -1)) {
            d = -1;
            $el.removeClass('desc').addClass('asc');
        }
        else {
            $el.removeClass('asc').addClass('desc');
        }

        var fav = function(el) {
            return el.fav;
        };

        if (M.v.some(fav)) {
            for (var f in M.sortRules) {
                if (M.sortRules.hasOwnProperty(f)) {
                    if (c.indexOf(f) !== -1) {
                        M.doSort(f, d);
                        M.renderMain();
                        break;
                    }
                }
            }
        }
    });

    if (this.currentdirid === 'shares') {
        $.selectddUIgrid = '.shared-grid-view .grid-scrolling-table';
    }
    else if (this.currentdirid === 'out-shares') {
        $.selectddUIgrid = '.out-shared-grid-view .grid-scrolling-table';
    }
    else if (this.currentdirid === 'contacts') {
        $.selectddUIgrid = '.grid-scrolling-table.contacts';
    }
    else if (this.currentdirid === 'ipc') {
        $.selectddUIgrid = '.contact-requests-grid .grid-scrolling-table';
    }
    else if (this.currentdirid === 'opc') {
        $.selectddUIgrid = '.sent-requests-grid .grid-scrolling-table';
    }
    else if (String(this.currentdirid).length === 11 && this.currentrootid === 'contacts') {
        $.selectddUIgrid = '.files-grid-view.contact-details-view .grid-scrolling-table';
    }
    else {
        $.selectddUIgrid = '.files-grid-view.fm .grid-scrolling-table';
    }

    $.selectddUIitem = 'tr';
    this.addSelectDragDropUIDelayed(refresh);

    if (d) {
        console.timeEnd('gridUI');
    }
};

FileManager.prototype.addGridUIDelayed = function(refresh) {
    delay('GridUI', function() {
        M.addGridUI(refresh);
    }, 20);
};

FileManager.prototype.getDDhelper = function getDDhelper() {
    'use strict';

    var id = '#fmholder';
    if (page === 'start') {
        id = '#startholder';
    }
    $('.dragger-block').remove();
    $(id).append(
        '<div class="dragger-block drag" id="draghelper">' +
        '<div class="dragger-content"></div>' +
        '<div class="dragger-files-number">1</div>' +
        '</div>'
    );
    $('.dragger-block').show();
    $('.dragger-files-number').hide();
    return $('.dragger-block')[0];
};

FileManager.prototype.hideClickHint = function() {
    'use strict';

    if (mega.cttHintTimer) {
        clearTimeout(mega.cttHintTimer);
        delete mega.cttHintTimer;
    }

    // implicitly invoking this function will cause that the hint won't be seen anymore.
    onIdle(function() {
        mega.config.set('ctt', 1);
    });

    $('.show-hints').removeAttr('style');
    $('.dropdown.click-hint').addClass('hidden').removeAttr('style');
};

FileManager.prototype.showClickHint = function(force) {
    'use strict';

    this.hideClickHint();

    // if the click-tooltip was not seen already
    if (force || !mega.config.get('ctt')) {
        mega.cttHintTimer = setTimeout(function() {
            $('.show-hints').fadeIn(300, function() {
                $(this).removeClass('hidden');

                var $hint = $('.dropdown.click-hint');
                var $thumb = $('.hint-thumb', $hint);
                $hint.position({
                    of: this,
                    my: 'left top-5px',
                    at: 'left+27px top'
                });
                $hint.fadeIn(450, function() {
                    $(this).removeClass('hidden');
                    $('.close-button', $hint).rebind('click', M.hideClickHint.bind(M));
                });

                var imageSwapTimer = setInterval(function() {
                    if (!mega.cttHintTimer) {
                        return clearInterval(imageSwapTimer);
                    }
                    if ($thumb.hasClass('left-click')) {
                        $thumb.switchClass("left-click", "right-click", 1000, "easeInOutQuad");
                    }
                    else {
                        $thumb.switchClass("right-click", "left-click", 1000, "easeInOutQuad");
                    }
                }, 5e3);
            }).rebind('click', M.showClickHint.bind(M, true));
        }, force || 300);
    }

    return false;
};

FileManager.prototype.addSelectDragDropUI = function(refresh) {
    "use strict";

    if (this.currentdirid && this.currentdirid.substr(0, 7) === 'account') {
        return false;
    }


    if (d) {
        console.time('selectddUI');
    }

    var mainSel = $.selectddUIgrid + ' ' + $.selectddUIitem;
    var dropSel = $.selectddUIgrid + ' ' + $.selectddUIitem + '.folder';
    if (this.currentrootid === 'contacts') {
        dropSel = mainSel;
    }

    $(dropSel).droppable({
        tolerance: 'pointer',
        drop: function(e, ui) {
            $.doDD(e, ui, 'drop', 0);
        },
        over: function(e, ui) {
            $.doDD(e, ui, 'over', 0);
        },
        out: function(e, ui) {
            $.doDD(e, ui, 'out', 0);
        }
    });

    if ($.gridDragging) {
        $('body').addClass('dragging ' + ($.draggingClass || ''));
    }

    var $ddUIitem = $(mainSel);
    var $ddUIgrid = $($.selectddUIgrid);
    $ddUIitem.draggable({
        start: function(e, u) {
            // Make the content under contacts, opc, ipc be non draggable
            if (M.currentrootid === "contacts"
            || M.currentrootid === "opc"
            || M.currentrootid === "ipc") {
                return false;
            }
            if (d) {
                console.log('draggable.start');
            }
            $.hideContextMenu(e);
            $.gridDragging = true;
            $('body').addClass('dragging');
            if (!$(this).hasClass('ui-selected')) {
                selectionManager.clear_selection();
                selectionManager.set_currently_selected($(this).attr('id'));
            }
            var max = ($(window).height() - 96) / 24;
            var html = [];
            $.selected.forEach(function(id, i) {
                var n = M.d[id];
                if (n) {
                    if (max > i) {
                        html.push(
                            '<div class="transfer-filetype-icon ' + fileIcon(n) + '"></div>' +
                            '<div class="tranfer-filetype-txt dragger-entry">' +
                            str_mtrunc(htmlentities(n.name)) + '</div>'
                        );
                    }
                }
            });
            if ($.selected.length > max) {
                $('.dragger-files-number').text($.selected.length);
                $('.dragger-files-number').show();
            }
            $('#draghelper .dragger-content').html(html.join(""));
            $.draggerHeight = $('#draghelper .dragger-content').outerHeight();
            $.draggerWidth = $('#draghelper .dragger-content').outerWidth();
            $.draggerOrigin = M.currentdirid;
            $.dragSelected = clone($.selected);
        },
        drag: function(e, ui) {
            if (ui.position.top + $.draggerHeight - 28 > $(window).height()) {
                ui.position.top = $(window).height() - $.draggerHeight + 26;
            }
            if (ui.position.left + $.draggerWidth - 58 > $(window).width()) {
                ui.position.left = $(window).width() - $.draggerWidth + 56;
            }
        },
        refreshPositions: true,
        containment: 'document',
        scroll: false,
        distance: 10,
        revertDuration: 200,
        revert: true,
        cursorAt: {right: 90, bottom: 56},
        helper: function(e, ui) {
            $(this).draggable("option", "containment", [72, 42, $(window).width(), $(window).height()]);
            return M.getDDhelper();
        },
        stop: function(event) {
            if (d) {
                console.log('draggable.stop');
            }
            $.gridDragging = $.draggingClass = false;
            $('body').removeClass('dragging').removeClassWith("dndc-");
            var origin = $.draggerOrigin;
            setTimeout(function __onDragStop() {
                if (M.currentdirid === 'contacts') {
                    if (origin !== 'contacts') {
                        M.openFolder(origin, true);
                    }
                }
                else {
                    M.onTreeUIOpen(M.currentdirid, false, true);
                }
            }, 200);
            delete $.dragSelected;
        }
    });

    $('.ui-selectable-helper').remove();

    if (this.currentdirid && this.currentdirid.substr(0, 8) !== 'contacts') {
        $ddUIgrid.selectable({
            filter: $.selectddUIitem,
            start: function (e, u) {
                $.hideContextMenu(e);
                $.hideTopMenu();
            },
            stop: function (e, u) {
                M.searchPath();
            }
        });
    }

    $ddUIitem.rebind('contextmenu', function(e) {
        if (e.shiftKey) {
            selectionManager.shift_select_to($(this).attr('id'), false, true, true);
        }
        else if (e.ctrlKey !== false || e.metaKey !== false) {
            selectionManager.add_to_selection($(this).attr('id'));
        }
        else {
            if (selectionManager.selected_list.indexOf($(this).attr('id')) === -1) {
                selectionManager.clear_selection();
                selectionManager.set_currently_selected($(this).attr('id'));
            }
            else {
                selectionManager.add_to_selection($(this).attr('id'));
            }

            // Show sort menu for FM, block view only
            // if (fmconfig.viewmodes && fmconfig.viewmodes[M.currentdirid]) {
            //     return M.labelSortMenuUI(e, true);
            // }
        }

        M.searchPath();
        $.hideTopMenu();
        M.hideClickHint();

        return !!M.contextMenuUI(e, 1);
    });

    $ddUIitem.rebind('click', function(e) {
        if ($.gridDragging) {
            return false;
        }
        var s = e.shiftKey;
        if (e.shiftKey) {
            selectionManager.shift_select_to($(this).attr('id'), false, true, true);
        }
        else if (e.ctrlKey == false && e.metaKey == false)
        {
            $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
            $(this).addClass('ui-selected');
            $.gridLastSelected = this;
            selectionManager.clear_selection();
            selectionManager.add_to_selection($(this).attr('id'));
        }
        else
        {
            if ($(this).hasClass("ui-selected")) {
                $(this).removeClass("ui-selected");
                selectionManager.remove_from_selection($(this).attr('id'));
            }
            else
            {
                $(this).addClass("ui-selected");
                $.gridLastSelected = this;
                selectionManager.add_to_selection($(this).attr('id'));
            }
        }

        if (!mega.cttHintTimer) {
            M.showClickHint();
        }
        M.searchPath();
        $.hideContextMenu(e);
        if ($.hideTopMenu) {
            $.hideTopMenu();
        }
        return false;
    });

    $ddUIitem.rebind('dblclick', function(e) {
        var h = $(e.currentTarget).attr('id');
        var n = M.d[h] || {};
        if (n.t) {
            if (e.ctrlKey) {
                $.ofShowNoFolders = true;
            }
            $('.top-context-menu').hide();
            if (M.currentrootid === 'out-shares' || M.currentrootid === 'public-links') {
                h = M.currentrootid + '/' + h;
            }
            M.openFolder(h);
        }
        else if (is_image2(n) || is_video(n)) {
            if (is_video(n)) {
                $.autoplay = h;
            }
            slideshow(h);
        }
        else {
            M.addDownload([h]);
        }
        M.hideClickHint();
    });

    if ($.rmInitJSP) {
        var jsp = $($.rmInitJSP).data('jsp');
        if (jsp) {
            jsp.reinitialise();
        }
        if (d) {
            console.log('jsp:!u', !!jsp);
        }
        delete $.rmInitJSP;
    }
    if (!refresh) {
        $.tresizer();
    }

    if (d) {
        console.timeEnd('selectddUI');
    }

    $ddUIitem = $ddUIgrid = undefined;
};

FileManager.prototype.addSelectDragDropUIDelayed = function(refresh) {
    delay('selectddUI', function() {
        M.addSelectDragDropUI(refresh);
    });
};

FileManager.prototype.addTreeUI = function() {
    "use strict";

    if (d) {
        console.time('treeUI');
    }
    var $treePanel = $('.fm-tree-panel');
    var $treeItem = $('.nw-fm-tree-item:visible', $treePanel);

    $treeItem.draggable(
        {
            revert: true,
            containment: 'document',
            revertDuration: 200,
            distance: 10,
            scroll: false,
            cursorAt: {right: 88, bottom: 58},
            helper: function(e, ui) {
                $(this).draggable("option", "containment", [72, 42, $(window).width(), $(window).height()]);
                return M.getDDhelper();
            },
            start: function(e, ui) {
                $.treeDragging = true;
                $.hideContextMenu(e);
                var html = '';
                var id = $(e.target).attr('id');
                if (id) {
                    id = id.replace(/treea_+|(os_|pl_)/g, '');
                }
                if (id && M.d[id]) {
                    html = (
                        '<div class="transfer-filetype-icon ' + fileIcon(M.d[id]) + '"></div>' +
                        '<div class="tranfer-filetype-txt dragger-entry">' +
                        str_mtrunc(htmlentities(M.d[id].name)) + '</div>'
                    );
                }
                $('#draghelper .dragger-icon').remove();
                $('#draghelper .dragger-content').html(html);
                $('body').addClass('dragging');
                $.draggerHeight = $('#draghelper .dragger-content').outerHeight();
                $.draggerWidth = $('#draghelper .dragger-content').outerWidth();
            },
            drag: function(e, ui) {
                //console.log('tree dragging',e);
                if (ui.position.top + $.draggerHeight - 28 > $(window).height()) {
                    ui.position.top = $(window).height() - $.draggerHeight + 26;
                }
                if (ui.position.left + $.draggerWidth - 58 > $(window).width()) {
                    ui.position.left = $(window).width() - $.draggerWidth + 56;
                }
            },
            stop: function(e, u) {
                $.treeDragging = false;
                $('body').removeClass('dragging').removeClassWith("dndc-");
            }
        });

    $(
        '.fm-tree-panel .nw-fm-tree-item,' +
        '.rubbish-bin,' +
        '.fm-breadcrumbs,' +
        '.nw-fm-left-icons-panel .nw-fm-left-icon,' +
        '.shared-with-me tr,' +
        '.nw-conversations-item,' +
        'ul.conversations-pane > li,' +
        '.messages-block'
    ).filter(":visible").droppable({
        tolerance: 'pointer',
        drop: function(e, ui) {
            $.doDD(e, ui, 'drop', 1);
        },
        over: function(e, ui) {
            $.doDD(e, ui, 'over', 1);
        },
        out: function(e, ui) {
            $.doDD(e, ui, 'out', 1);
        }
    });

    // disabling right click, default contextmenu.
    $(document).rebind('contextmenu', function(e) {
        var $target = $(e.target);

        if (!is_fm() ||
            $target.parents('#startholder').length ||
            $target.is('input') ||
            $target.is('textarea') ||
            $target.is('#embed-code-field') ||
            $target.is('.download.info-txt') ||
            $target.closest('.multiple-input').length ||
            $target.closest('.create-folder-input-bl').length ||
            $target.closest('.content-panel.conversations').length ||
            $target.closest('.messages.content-area').length ||
            $target.closest('.chat-right-pad .user-card-data').length ||
            $target.parents('.fm-account-main').length ||
            $target.parents('.export-link-item').length ||
            $target.parents('.contact-fingerprint-txt').length ||
            $target.parents('.fm-breadcrumbs').length ||
            $target.hasClass('contact-details-user-name') ||
            $target.hasClass('contact-details-email') ||
            $target.hasClass('nw-conversations-name')) {
        }
        else if (!localStorage.contextmenu) {
            $.hideContextMenu();
            return false;
        }
    });

    $treeItem.rebind('click.treeUI, contextmenu.treeUI', function(e) {

        var $this = $(this);
        var id = $this.attr('id').replace('treea_', '');
        var tmpId = id;
        var cv = M.isCustomView(id);

        id = cv ? cv.nodeID : id;

        if (e.type === 'contextmenu') {
            $('.nw-fm-tree-item').removeClass('dragover');
            $this.addClass('dragover');

            var $uls = $this.parents('ul').find('.selected');

            if ($uls.length > 1) {
                $.selected = $uls.attrs('id')
                    .map(function(id) {
                        return id.replace(/treea_+|(os_|pl_)/g, '');
                    });
            }
            else {
                $.selected = [id];

                Soon(function() {
                    $this.addClass('hovered');
                });
            }
            return !!M.contextMenuUI(e, 1);
        }

        var $target = $(e.target);
        if ($target.hasClass('nw-fm-arrow-icon')) {
            M.onTreeUIExpand(tmpId);
        }
        else if (e.shiftKey) {
            $this.addClass('selected');
        }
        else {
            // plain click, remove all .selected from e.shiftKey
            $('#treesub_' + M.currentrootid + ' .nw-fm-tree-item').removeClass('selected');
            $this.addClass('selected');

            if ($target.hasClass('opened')) {
                M.onTreeUIExpand(tmpId);
            }
            if (e.ctrlKey) {
                $.ofShowNoFolders = true;
            }

            id = cv ? cv.prefixPath + id : id;

            M.openFolder(id, e.ctrlKey);
        }

        return false;
    });

    $('.nw-contact-item', $treePanel).rebind('contextmenu.treeUI', function(e) {
        var $self = $(this);

        if (!$self.hasClass('selected')) {
            $('.content-panel.contacts .nw-contact-item.selected').removeClass('selected');
            $self.addClass('selected');
        }

        $.selected = [$self.attr('id').replace('contact_', '')];
        M.searchPath();
        $.hideTopMenu();

        return Boolean(M.contextMenuUI(e, 1));
    });

    /**
     * Let's shoot two birds with a stone, when nodes are moved we need a resize
     * to let dynlist refresh - plus, we'll implicitly invoke initTreeScroll.
     */
    $(window).trigger('resize');

    if (d) {
        console.timeEnd('treeUI');
    }
};

FileManager.prototype.addTreeUIDelayed = function() {
    delay('treeUI', function() {
        M.addTreeUI();
    }, 30);
};

FileManager.prototype.onTreeUIExpand = function(id, force) {
    "use strict";

    this.buildtree({h: id});

    var $tree = $('#treea_' + id);

    if ($tree.hasClass('expanded') && !force) {
        fmtreenode(id, false);
        $('#treesub_' + id).removeClass('opened');
        $tree.removeClass('expanded');
    }
    else if ($tree.hasClass('contains-folders')) {
        fmtreenode(id, true);
        $('#treesub_' + id).addClass('opened')
            .find('.tree-item-on-search-hidden')
            .removeClass('tree-item-on-search-hidden');
        $tree.addClass('expanded');
    }

    M.addTreeUIDelayed();
};

FileManager.prototype.onTreeUIOpen = function(id, event, ignoreScroll) {
    "use strict";

    id = String(id);
    var id_r = this.getNodeRoot(id);
    var id_s = id.split('/')[0];
    var e, scrollTo = false, stickToTop = false;
    if (d){
        console.log("treeUIopen", id);
    }

    if (id_r === 'shares') {
        this.onSectionUIOpen('shared-with-me');
    }
    else if (id_r === 'out-shares') {
        this.onSectionUIOpen('out-shares');
    }
    else if (id_r === 'public-links') {
        this.onSectionUIOpen('public-links');
    }
    else if (this.InboxID && id_r === this.InboxID) {
        this.onSectionUIOpen('inbox');
    }
    else if (id_r === this.RootID) {
        this.onSectionUIOpen('cloud-drive');
    }
    else if (id_s === 'chat') {
        this.onSectionUIOpen('conversations');
    }
    else if (id_r === 'contacts') {
        this.onSectionUIOpen('contacts');
    }
    else if (id_r === 'ipc') {
        this.onSectionUIOpen('ipc');
    }
    else if (id_r === 'opc') {
        this.onSectionUIOpen('opc');
    }
    else if (id_s === 'user-management') {
        this.onSectionUIOpen('user-management');
    }
    else if (id_r === 'account') {
        this.onSectionUIOpen('account');
    }
    else if (id_r === 'dashboard') {
        this.onSectionUIOpen('dashboard');
    }
    else if (this.RubbishID && id_r === this.RubbishID) {
        this.onSectionUIOpen('rubbish-bin');
    }
    else if (id_s === 'transfers') {
        this.onSectionUIOpen('transfers');
    }
    else if (id_s === 'recents') {
        this.onSectionUIOpen('recents');
    }

    if (!fminitialized) {
        return false;
    }

    if (!event) {
        var ids = this.getPath(id);
        var i = 1;
        while (i < ids.length) {
            if (this.d[ids[i]] && ids[i].length === 8) {
                if (id_r === 'out-shares') {
                    this.onTreeUIExpand('os_' + ids[i], 1);
                }
                else if (id_r === 'public-links') {
                    this.onTreeUIExpand('pl_' + ids[i], 1);
                }
                else {
                    this.onTreeUIExpand(ids[i], 1);
                }
            }
            i++;
        }
        if (
            (ids[0] === 'contacts')
            && this.currentdirid
            && (String(this.currentdirid).length === 11)
            && (this.currentrootid === 'contacts')
        ) {
            this.onSectionUIOpen('contacts');
        }
        else if (ids[0] === 'contacts') {
            // XX: whats the goal of this? everytime when i'm in the contacts and I receive a share, it changes ONLY the
            // UI tree -> Shared with me... its a bug from what i can see and i also don't see any points of automatic
            // redirect in the UI when another user had sent me a shared folder.... its very bad UX. Plus, as a bonus
            // sectionUIopen is already called with sectionUIopen('contacts') few lines before this (when this func
            // is called by the renderNew()

            // sectionUIopen('shared-with-me');
        }
        else if (ids[0] === this.RootID) {
            this.onSectionUIOpen('cloud-drive');
        }
    }
    if ($.hideContextMenu) {
        $.hideContextMenu(event);
    }

    if (id_r === 'out-shares') {
        e = $('#treea_os_' + id.split('/')[1]);
    }
    else if (id_r === 'public-links') {
        e = $('#treea_pl_' + id.split('/')[1]);
    }
    else {
        e = $('#treea_' + id_s);
    }

    $('.fm-tree-panel .nw-fm-tree-item').removeClass('selected');
    e.addClass('selected');

    if (!ignoreScroll) {
        if (id === this.RootID || id === 'shares' || id === 'contacts' || id === 'chat' || id === 'opc' || id === 'ipc') {
            stickToTop = true;
            scrollTo = $('.nw-tree-panel-header');
        }
        else if (e.length && !e.visible()) {
            scrollTo = e;
        }
        // if (d) console.log('scroll to element?',ignoreScroll,scrollTo,stickToTop);

        var jsp = scrollTo && $('.fm-tree-panel').data('jsp');
        if (jsp) {
            setTimeout(function() {
                jsp.scrollToElement(scrollTo, stickToTop);
            }, 50);
        }
    }
    this.addTreeUIDelayed();
};

FileManager.prototype.onSectionUIOpen = function(id) {
    "use strict";

    var tmpId;
    if (d) {
        console.log('sectionUIopen', id, folderlink);
    }
    if (!anonymouschat && $.hideContextMenu) {
       $.hideContextMenu();
    }

    $('.nw-fm-left-icon').removeClass('active');
    if (this.hasInboxItems() === true) {
        $('.nw-fm-left-icon.inbox').removeClass('hidden');
    }
    else {
        $('.nw-fm-left-icon.inbox').addClass('hidden');
    }

    // view or hide left icon for business account, confirmed and payed
    if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === 1 || u_attr.b.s === 2) && u_privk) {
        $('.nw-fm-left-icon.user-management').removeClass('hidden');
    }
    else {
        $('.nw-fm-left-icon.user-management').addClass('hidden');
    }

    $('.content-panel').removeClass('active');

    if (id === 'opc' || id === 'ipc') {
        tmpId = 'contacts';
    }
    else if (id === 'account') {
        tmpId = 'account';

        // ToDo: Missing layout for empty Public Upload Page
        if (!Object.keys(mega.megadrop.pufs).length || !Object.keys(mega.megadrop.pups).length) {// Hide PUF tab
            $('.fm-account-button.megadrop').addClass('hidden');
        }
        else {
            $('.fm-account-button.megadrop').removeClass('hidden');
        }
    }
    else {
        tmpId = id;
    }

    if (id === 'out-shares' || id === 'public-links') {
        $('.nw-fm-left-icon.' + String('shared-with-me').replace(/[^\w-]/g, '')).addClass('active');
    }
    else {
        $('.nw-fm-left-icon.' + String(tmpId).replace(/[^\w-]/g, '')).addClass('active');
    }

    $('.content-panel.' + String(tmpId).replace(/[^\w-]/g, '')).addClass('active');
    $('.fm-left-menu').removeClass(
        'cloud-drive folder-link shared-with-me rubbish-bin contacts out-shares public-links ' +
        'conversations opc ipc inbox account dashboard transfers recents user-management'
    ).addClass(tmpId);
    $('.fm.fm-right-header, .fm-import-to-cloudrive, .fm-download-as-zip').addClass('hidden');
    $('.fm-import-to-cloudrive, .fm-download-as-zip').off('click');

    $('.fm-main').removeClass('active-folder-link');
    $('.nw-fm-left-icons-panel .logo').addClass('hidden');
    $('.fm-products-nav').text('');
    $('.nw-fm-tree-header.folder-link').hide();
    $('.nw-fm-left-icon.folder-link').removeClass('active');

    if (folderlink) {
        // XXX: isValidShareLink won't work properly when navigating from/to a folderlink
        /*if (!isValidShareLink()) {
         $('.fm-breadcrumbs.folder-link .right-arrow-bg').text('Invalid folder');
         } else*/
        if (id === 'cloud-drive' || id === 'transfers') {
            $('.nw-fm-left-icons-panel .logo').removeClass('hidden');
            $('.fm-main').addClass('active-folder-link');
            $('.fm-right-header').addClass('folder-link');
            $('.fm-left-menu').addClass('folder-link');
            $('.nw-fm-tree-header.folder-link').show();

            var $prodNav = $('.fm-products-nav').text('');
            if (!u_type) {
                $prodNav.safeHTML(translate(pages['pagesmenu']));
                onIdle(clickURLs);
            }

            // remove this two buttons from search result.
            if (M.currentdirid.substr(0, 6) !== 'search') {
                $('.fm-import-to-cloudrive, .fm-download-as-zip')
                    .removeClass('hidden')
                    .rebind('click', function() {
                        var c = $(this).attr('class');

                        if (c.indexOf('fm-import-to-cloudrive') > -1) {
                            M.importFolderLinkNodes([M.currentdirid]);
                        }
                        else if (c.indexOf('fm-download-as-zip') > -1) {
                            M.addDownload([M.currentdirid], true);
                        }
                    });
            }
            // if (!u_type) {
            // $('.fm-import-to-cloudrive').addClass('hidden');
            // }
        }
    }

    if (id !== 'conversations' || id !== "archivedchats") {
        if (id !== 'user-management') {
            $('.fm-right-header').removeClass('hidden');
            $('.fm-right-header-user-management').addClass('hidden');
        }
        else {
            $('.fm-right-header').addClass('hidden');
            $('.fm-right-header-user-management').removeClass('hidden');
        }
        $('.fm-chat-block').addClass('hidden');
        $('.section.conversations').addClass('hidden');
    }
    else {
        $('.section.conversations').removeClass('hidden');
    }

    if (
        (id !== 'cloud-drive') &&
        (id !== 'rubbish-bin') &&
        (id !== 'inbox') &&
        (
            (id !== 'shared-with-me') &&
            (M.currentdirid !== 'shares')
        ) &&
        (
            (id !== 'out-shares') &&
            (M.currentdirid !== 'out-shares')
        ) &&
        (
            (id !== 'public-links') &&
            (M.currentdirid !== 'public-links')
        )
    ) {
        $('.files-grid-view.fm').addClass('hidden');
        $('.fm-blocks-view.fm').addClass('hidden');
    }

    if (id !== 'contacts') {
        $('.contacts-details-block').addClass('hidden');
        $('.files-grid-view.contacts-view').addClass('hidden');
        $('.fm-blocks-view.contacts-view').addClass('hidden');
    }
    if (id !== 'user-management') {
        $('.fm-left-panel').removeClass('user-management');
        $('.user-management-tree-panel-header').addClass('hidden');
        $('.files-grid-view.user-management-view').addClass('hidden');
        $('.fm-blocks-view.user-management-view').addClass('hidden');
        $('.user-management-overview-bar').addClass('hidden');
        $('.fm-left-panel .nw-tree-panel-header').removeClass('hidden');
    }

    if (id !== 'opc') {
        $('.sent-requests-grid').addClass('hidden');

        // this's button in left panel of contacts tab
        $('.fm-recived-requests').removeClass('active');
    }

    if (id !== 'ipc') {
        $('.contact-requests-grid').addClass('hidden');
    }

    if (id !== 'shared-with-me' && id !== 'public-links') {
        $('.shared-blocks-view').addClass('hidden');
        $('.shared-grid-view').addClass('hidden');
    }

    if (id !== 'out-shares') {
        $('.out-shared-blocks-view').addClass('hidden');
        $('.out-shared-grid-view').addClass('hidden');
    }

    if (id !== 'shared-with-me' && id !== 'public-links' && id !== 'out-shares') {
        $('.shares-tabs-bl').addClass('hidden');
    }

    if (id !== 'contacts' && id !== 'opc' && id !== 'ipc') {
        $('.contacts-tabs-bl').addClass('hidden');
    }

    if (id !== "recents") {
        $(".fm-recents.container").addClass('hidden');
        $(".fm-left-panel").removeClass('hidden');
        $('.top-head').find(".recents-tab-link").addClass("hidden").removeClass('active');
    }
    if (id !== 'transfers') {
        if ($.transferClose) {
            $.transferClose();
        }
    }
    else {
        if (!$.transferOpen) {
            M.addTransferPanelUI();
        }
        $.transferOpen(true);
    }

    var headertxt = '';
    switch (id) {
        case 'contacts':
        case 'ipc':
        case 'opc':
            headertxt = l[5903];
            break;
        case 'conversations':
            headertxt = l[5914];
            break;
        case 'shared-with-me':
            headertxt = l[5915];
            break;
        case 'out-shares':
            headertxt = l[20645];
            break;
        case 'public-links':
            headertxt = l[20646];
            break;
        case 'cloud-drive':
            if (folderlink) {
                headertxt = Object(M.d[M.RootID]).name || '';
            }
            else {
                headertxt = l[5916];
            }
            break;
        case 'inbox':
            headertxt = l[949];
            break;
        case 'rubbish-bin':
            headertxt = l[6771];
            break;
        case 'user-management':
            headertxt = l[18677];
            break;
    }

    $('.fm-left-panel .nw-tree-panel-header span').text(headertxt);

    {
        // required tricks to make the conversations work with the old UI HTML/css structure
        if (id === "conversations") { // moving the control of the headers in the tree panel to chat.js + ui/conversations.jsx
            $('.fm-left-panel .nw-tree-panel-header').addClass('hidden');
            $('.fm-main.default > .fm-left-panel').addClass('hidden');
        }
        else if (id !== "recents") {
            $('.fm-left-panel .nw-tree-panel-header').removeClass('hidden');
            $('.fm-main.default > .fm-left-panel').removeClass('hidden');
        }

        // prevent unneeded flashing of the conversations section when switching between chats
        // new sections UI
        if (id === "conversations") {
            $('.section:not(.conversations)').addClass('hidden');
            $('.section.' + id).removeClass('hidden');
        }
        else {
            $('.section').addClass('hidden');
            $('.section.' + String(id).replace(/[^\w-]/g, '')).removeClass('hidden');
        }
    }
};

/**
 * Show storage overquota dialog
 * @param {*} quota Storage quota data, as returned from M.getStorageQuota()
 * @param {Object} [options] Additional options
 */
FileManager.prototype.showOverStorageQuota = function(quota, options) {
    'use strict'; /* jshint -W074 */

    var promise = new MegaPromise();
    var prevState = $('.fm-main').is('.almost-full, .full');
    $('.fm-main').removeClass('almost-full full');

    if (this.showOverStorageQuotaPromise) {
        promise = this.showOverStorageQuotaPromise;
    }
    this.showOverStorageQuotaPromise = promise;

    if (quota === -1) {
        quota = {percent: 100};
        quota.isFull = quota.isAlmostFull = true;
        options = {custom: 1};
    }

    if (Object(u_attr).p) {
        // update texts with "for free accounts" sentences removed.
        $('.fm-notification-block.full').safeHTML(l[16358]);
        $('.fm-notification-block.almost-full')
            .safeHTML('<div class="fm-notification-close"></div>' + l[16359]);
        $('.fm-dialog-body.storage-dialog.full .body-header').safeHTML(l[16360]);
        $('.fm-dialog-body.storage-dialog.almost-full .no-achievements-bl .body-p').safeHTML(l[16361]);
        $('.fm-dialog-body.storage-dialog.almost-full .achievements-bl .body-p')
            .safeHTML(l[16361] + ' ' + l[16314]);
    }
    else {
        $('.fm-dialog-body.storage-dialog.almost-full .no-achievements-bl .body-p')
            .safeHTML(l[16313].replace('%1', (4.99).toLocaleString()));
        $('.fm-dialog-body.storage-dialog.almost-full .achievements-bl .body-p')
            .safeHTML(l[16313].replace('%1', (4.99).toLocaleString()) + ' ' + l[16314]);
    }

    if (quota.isAlmostFull || Object(options).custom) {
        var $strgdlg = $('.fm-dialog.storage-dialog').removeClass('full almost-full');

        if (quota.isFull) {
            $('.fm-main').addClass('fm-notification full');
            $strgdlg.addClass('full')
                .find('.fm-dialog-body.full')
                .find('.fm-dialog-title')
                .text(Object(options).title || l[16302])
                .end()
                .find('.body-header')
                .safeHTML(Object(options).body || l[16360]);
        }
        else {
            if (quota.isAlmostFull) {
                $('.fm-main').addClass('fm-notification almost-full');
            }
            $strgdlg.addClass('almost-full')
                .find('.fm-dialog-body.almost-full')
                .find('.fm-dialog-title')
                .text(Object(options).title || l[16311])
                .end()
                .find('.body-header')
                .safeHTML(Object(options).body || l[16312]);

            // Storage chart and info
            var strQuotaLimit = bytesToSize(quota.mstrg, 0).split(' ');
            var strQuotaUsed = bytesToSize(quota.cstrg);
            var deg = 230 * quota.percent / 100;
            var $storageChart = $('.fm-account-blocks.storage', $strgdlg);

            // Storage space chart
            if (deg <= 180) {
                $storageChart.find('.left-chart span').css('transform', 'rotate(' + deg + 'deg)');
                $storageChart.find('.right-chart span').removeAttr('style');
            }
            else {
                $storageChart.find('.left-chart span').css('transform', 'rotate(180deg)');
                $storageChart.find('.right-chart span').css('transform', 'rotate(' + (deg - 180) + 'deg)');
            }

            $('.chart.data .size-txt', $strgdlg).text(strQuotaUsed);
            $('.chart.data .pecents-txt', $strgdlg).text(strQuotaLimit[0]);
            $('.chart.data .gb-txt', $strgdlg).text(strQuotaLimit[1]);
            $('.chart.data .perc-txt', $strgdlg).text(quota.percent + '%');
        }

        var closeDialog = function() {
            $strgdlg.off('dialog-closed');
            window.closeDialog();

            promise.resolve();
            delete M.showOverStorageQuotaPromise;
        };

        $strgdlg.rebind('dialog-closed', closeDialog);

        $('.button', $strgdlg).rebind('click', function() {
            var $this = $(this);

            closeDialog();

            if ($this.hasClass('choose-plan')) {
                loadSubPage('pro');
            }
            else if ($this.hasClass('get-bonuses')) {
                mega.achievem.achievementsListDialog();
            }

            return false;
        });
        $('.fm-dialog-close, .button.skip', $strgdlg).rebind('click', closeDialog);

        $('.fm-notification-block .fm-notification-close')
            .rebind('click', function() {
                $('.fm-main').removeClass('fm-notification almost-full full');
            });

        mega.achievem.enabled()
            .done(function() {
                $strgdlg.addClass('achievements')
                    .find('.semi-small-icon.rocket')
                    .rebind('click', function() {
                        closeDialog();
                        mega.achievem.achievementsListDialog();
                        return false;
                    });
            });

        clickURLs();
        $('a.gotorub').attr('href', '/fm/' + M.RubbishID)
            .rebind('click', function() {
                closeDialog();
                loadSubPage('fm/' + M.RubbishID);
                return false;
            });

        if (Object(u_attr).p) {
            $('.choose-plan', $strgdlg).text(l[16386]);
        }

        // if another dialog wasn't opened previously
        if (!prevState || Object(options).custom) {
            M.safeShowDialog('over-storage-quota', $strgdlg);
        }
        else {
            promise.reject();
        }
    }

    return promise;
};

FileManager.prototype.openSharingDialog = function() {
    'use strict';

    // check if this is a business expired account
    if (u_attr && u_attr.b && u_attr.b.s === -1) {
        $.hideContextMenu();
        M.showExpiredBusiness();
        return;
    }
    if (u_type === 0) {
        return ephemeralDialog(l[1006]);
    }
    var $dialog = $('.fm-dialog.share-dialog');

    var showShareDlg = function() {
        $.hideContextMenu();
        clearScrollPanel($('.share-dialog-contacts', $dialog));

        // Show the share dialog
        $dialog.removeClass('hidden');

        // Hide the optional message by default.
        // This gets enabled if user want to share
        $dialog.find('.share-message').hide();

        $dialog.find('.dialog-share-button').addClass('disabled');

        fillShareDialogWithContent();

        // Taking care about share dialog button 'Done'/share and scroll
        shareDialogContentCheck();

        // Clear text area message
        $('.share-message textarea', $dialog).val(l[6853]);

        // Maintain drop down list updated
        updateDialogDropDownList('.share-multiple-input');

        $('.share-dialog-icon.permissions-icon')
            .removeClass('active full-access read-and-write')
            .safeHTML('<span></span>' + l[55])
            .addClass('read-only');

        // Update dialog title text
        $('.fm-dialog-title', $dialog).text(l[5631] + ' "' + M.d[$.selected].name + '"');
        $('.multiple-input .token-input-token-mega', $dialog).remove();
        initTokenInputsScroll($('.multiple-input', $dialog));
        Soon(function() {
            $('.token-input-input-token-mega input', $dialog).trigger("focus");
        });

        dialogPositioning($dialog);

        return $dialog;
    };

    var mdList = mega.megadrop.isDropExist($.selected);
    if (mdList.length) {
        mega.megadrop.showRemoveWarning(mdList).done(function() {
            M.safeShowDialog('share', showShareDlg);
        });
    }
    else {
        M.safeShowDialog('share', showShareDlg);
    }
};

FileManager.prototype.getLinkAction = function() {
    'use strict';

    // check if this is a business expired account
    if (u_attr && u_attr.b && u_attr.b.s === -1) {
        $.hideContextMenu();
        showExpiredBusiness();
        return;
    }

    // ToDo: Selected can be more than one folder $.selected
    // Avoid multiple referencing $.selected instead use event
    // add new translation message '... for multiple folders.'
    // cancel descendant MEGAdrops after copyRights are accepted
    if (u_type === 0) {
        ephemeralDialog(l[1005]);
    }
    else {
        var isEmbed = $(this).hasClass('embedcode-item');
        var selNodes = Array.isArray($.selected) ? $.selected.concat() : [];
        var showDialog = function() {
            mega.Share.initCopyrightsDialog(selNodes, isEmbed);
        };

        var mdList = mega.megadrop.isDropExist(selNodes);
        if (mdList.length) {
            var fldName = mdList.length > 1 ? l[17626] : l[17403].replace('%1', escapeHTML(M.d[mdList[0]].name));

            msgDialog('confirmation', l[1003], fldName, false, function(e) {
                if (e) {
                    mega.megadrop.pufRemove(mdList);
                    // set showDialog as callback for after delete puf.
                    mega.megadrop.pufCallbacks[selNodes[0]] = {del: showDialog};
                }
            });
        }
        else {
            showDialog();
        }
    }
};


(function(global) {
    'use strict';

    var _cdialogq = Object.create(null);

    // Define what dialogs can be opened from other dialogs
    var diagInheritance = {
        'recovery-key-dialog': ['recovery-key-info'],
        properties: ['links', 'rename', 'copyrights', 'copy', 'move', 'share'],
        copy: ['createfolder'],
        move: ['createfolder'],
        register: ['terms'],
        selectFolder: ['createfolder']
    };

    var _openDialog = function(name, dsp) {
        if (d > 1) {
            console.log('safeShowDialog::_openDialog', name, typeof dsp, $.dialog);
        }

        onIdle(function() {
            if (typeof $.dialog === 'string') {
                if ($.dialog === name) {
                    if (d > 1) {
                        console.log('Reopening same dialog...', name);
                    }
                }

                // There are a few dialogs that can be opened from others, deal it.
                else if (!diagInheritance[$.dialog] || diagInheritance[$.dialog].indexOf(name) < 0) {
                    _cdialogq[name] = dsp;
                    return;
                }
            }

            dsp();
        });
    };

    mBroadcaster.addListener('closedialog', function() {
        var name = Object.keys(_cdialogq).shift();

        if (name) {
            _openDialog(name, _cdialogq[name]);
            delete _cdialogq[name];
        }
    });

    if (d) {
        global._cdialogq = _cdialogq;
    }

    /**
     * Prevent dispatching several dialogs in top on each other
     * @param {String} dialogName The dialog name to set on $.dialog
     * @param {Function|Object} dispatcher The dispatcher, either a jQuery's node/selector or a function
     */
    FileManager.prototype.safeShowDialog = function(dialogName, dispatcher) {

        dispatcher = (function(name, dsp) {
            return tryCatch(function() {
                var $dialog;

                if (d > 1) {
                    console.warn('Dispatching queued dialog.', name);
                }

                if (typeof dsp === 'function') {
                    $dialog = dsp();
                }
                else {
                    $dialog = $(dsp);
                }

                if ($dialog) {
                    if (!$dialog.hasClass('fm-dialog') && !$dialog.hasClass('fm-dialog-mobile')) {
                        throw new Error('Unexpected dialog type...');
                    }

                    // arrange to back any non-controlled dialogs,
                    // this class will be removed on the next closeDialog()
                    $('.fm-dialog:visible, .overlay:visible').addClass('arrange-to-back');

                    fm_showoverlay();
                    $dialog.removeClass('hidden arrange-to-back');

                    if (!is_mobile) {
                        // Center dialogs
                        $dialog.css({
                            'margin-left': -1 * ($dialog.outerWidth() / 2),
                            'margin-top': -1 * ($dialog.outerHeight() / 2)
                        });
                    }
                }
                $.dialog = String(name);
            }, function(ex) {
                // There was an exception dispatching the above code, move to the next queued dialog...
                if (d) {
                    console.warn(ex);
                }
                mBroadcaster.sendMessage('closedialog', ex);
            });
        })(dialogName, dispatcher);

        _openDialog(dialogName, dispatcher);
    };
})(self);
