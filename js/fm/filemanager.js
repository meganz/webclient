function FileManager() {
    "use strict";

    this.logger = new MegaLogger('FileManager');
    this.columnsWidth = {
        cloud: Object.create(null),
        inshare: Object.create(null),
        outshare: Object.create(null)
    };

    this.columnsWidth.cloud.fav = { max: 50, min: 50, curr: 50, viewed: true };
    this.columnsWidth.cloud.fname = { max: 5000, min: 180, curr: '100%', viewed: true };
    this.columnsWidth.cloud.label = { max: 130, min: 80, curr: 80, viewed: false };
    this.columnsWidth.cloud.size = { max: 160, min: 100, curr: 100, viewed: true };
    this.columnsWidth.cloud.type = { max: 180, min: 130, curr: 130, viewed: true };
    this.columnsWidth.cloud.timeAd = { max: 180, min: 130, curr: 130, viewed: true };
    this.columnsWidth.cloud.timeMd = { max: 180, min: 130, curr: 130, viewed: false };
    this.columnsWidth.cloud.versions = { max: 180, min: 130, curr: 130, viewed: false };
    this.columnsWidth.cloud.playtime = { max: 180, min: 130, curr: 130, viewed: false };
    this.columnsWidth.cloud.extras = { max: 140, min: 93, curr: 93, viewed: true };
    this.columnsWidth.cloud.accessCtrl = { max: 180, min: 130, curr: 130, viewed: true };
    this.columnsWidth.cloud.fileLoc = { max: 180, min: 130, curr: 130, viewed: false };

    this.columnsWidth.makeNameColumnStatic = function() {

        const header = document.querySelector('.files-grid-view.fm .grid-table thead th[megatype="fname"]');
        if (!header) {
            console.assert(false);
            return;
        }

        // check if it's still dynamic
        if (header.style.width.startsWith('calc(') || header.style.width === '100%') {

            var currWidth = getComputedStyle(header).width;

            M.columnsWidth.cloud.fname.curr = currWidth.replace('px', '') | 0;
            header.style.width = currWidth;
        }
    };

    this.columnsWidth.updateColumnStyle = function() {

        for (var col in M.columnsWidth.cloud) {

            const header = document.querySelector(`.files-grid-view.fm th[megatype="${col}"]`);

            if (!header) {
                continue;
            }

            if (M.columnsWidth.cloud[col]) {

                if (typeof M.columnsWidth.cloud[col].curr !== 'number') {

                    if (col === 'fname') {

                        // This is large screen, lets show full table
                        if (document.body.offsetWidth > 1800) {
                            M.columnsWidth.cloud[col].curr = header.style.width = '100%';
                        }
                        else {
                            // hardcoded spacing values due to performance.
                            // Width of .nw-fm-left-icons-panel = 64px;
                            // Width of .grid-wrapper margin left and right = 52px;
                            // Width of spacing want to achieve = 560px on small screen or depends on active column;
                            // =================
                            // Sum of above = 676px on small screen or depends on active column

                            M.columnsWidth.cloud[col].curr = header.style.width =
                                `calc(100vw - ${$.leftPaneResizable.element.outerWidth() + 676}px)`;
                        }
                    }

                    const headerWidth = getComputedStyle(header).width.replace('px', '') | 0;

                    if (headerWidth < M.columnsWidth.cloud[col].min) {
                        header.style.width = `${M.columnsWidth.cloud[col].min}px`;
                    }
                    else if (headerWidth > M.columnsWidth.cloud[col].max) {
                        header.style.width = `${M.columnsWidth.cloud[col].max}px`;
                    }
                }

                if (M.columnsWidth.cloud[col].viewed) {
                    $('.grid-table.fm').addClass(`v-${col}`);
                }
                else {
                    $('.grid-table.fm').removeClass(`v-${col}`);
                }
            }
        }
    };
}
FileManager.prototype.constructor = FileManager;

FileManager.prototype.showExpiredBusiness = function() {
    'use strict';
    M.require('businessAcc_js', 'businessAccUI_js').done(() => {
        const isMaster = u_attr.b && u_attr.b.m || u_attr.pf;
        const business_ui = new BusinessAccountUI();
        business_ui.showExpiredDialog(isMaster);
    });
};

/** Check if this is a business expired account, or ODW paywall. */
FileManager.prototype.isInvalidUserStatus = function() {
    'use strict';
    let res = false;

    if (mega.paywall) {
        if ((u_attr.b && u_attr.b.s === -1) || (u_attr.pf && u_attr.pf.s === -1)) {
            if ($.hideContextMenu) {
                $.hideContextMenu();
            }
            M.showExpiredBusiness();
            res = true;
        }
        else if (u_attr.uspw) {
            if ($.hideContextMenu) {
                $.hideContextMenu();
            }
            M.showOverStorageQuota(EPAYWALL).catch(dump);
            res = true;
        }
    }
    if (res) {
        window.onerror = null;
    }
    return res;
};

/**
 * Initialize the rendering of the cloud/file-manager
 * @details Former renderfm()
 * @returns {MegaPromise}
 */
FileManager.prototype.initFileManager = async function() {
    "use strict";

    if (d) {
        console.time('renderfm');
    }

    this.initFileManagerUI();
    this.sortByName();
    this.renderTree();

    const $treesub = $(`#treesub_${M.RootID}`);
    if (!$treesub.hasClass('opened')) {
        $treesub.addClass('opened');
    }

    const path = $.autoSelectNode && M.getNodeByHandle($.autoSelectNode).p || M.currentdirid || getLandingPage();

    if (!pfid && !is_mobile && u_type) {
        const s4e = u_attr.s4;
        const pTag = 's4-setup';

        if (d) {
            console.assert(!window[pTag], 'S4 Setup already ongoing...');
        }

        if (s4e && !window[pTag]) {
            const hold = !!this.getNodeByHandle(path.slice(0, 8)).s4;
            window[pTag] = Date.now();

            const s4load =
                Promise.allSettled([this.getPersistentData(pTag), this.require('s4')])
                    .then(([{value}]) => {
                        this.setPersistentData(pTag, Date.now()).catch(dump);

                        const cnt = Object.keys(this.c[this.RootID] || {})
                            .map((h) => this.d[h]).filter((n) => n && n.s4);

                        const res = [cnt, value];
                        return cnt.length && value ? dbfetch.geta(cnt.map(n => n.h)).then(() => res) : res;
                    })
                    .then(([cnt, pending]) => {
                        const promises = [];

                        if (pending) {
                            if (d) {
                                pending = new Date(pending).toISOString();
                                console.warn('Previous S4 Container creation did not complete.', pending);
                            }

                            while (cnt.length) {
                                const n = cnt.pop();

                                if (Object.keys(this.c[n.h] || {}).length) {
                                    cnt.push(n);
                                    if (d) {
                                        console.error(`S4 Container ${n.h} is not empty.`, cnt);
                                    }
                                    break;
                                }

                                promises.push(
                                    api.setNodeAttributes(n, {name: `${pTag}.lost&found`})
                                        .then(() => this.moveToRubbish([n.h]))
                                );
                            }
                        }

                        if (!cnt.length) {
                            return Promise.allSettled(promises)
                                .then(() => s4.kernel.container.create(true));
                        }
                    })
                    .then(() => {
                        window[pTag] = null;
                        this.delPersistentData(pTag).dump(pTag);
                        $('.js-s4-tree-panel').removeClass('hidden');
                        return this.buildtree({h: 's4'}, this.buildtree.FORCE_REBUILD);
                    })
                    .catch((ex) => {
                        reportError(ex);
                        if (hold) {
                            throw ex;
                        }
                    });

            if (hold) {
                // We're (re)loading over a s4-page, hold it up.
                await s4load;
            }
        }

        if (mega.rewindEnabled) {

            Promise.resolve(M.require('rewind'))
                .then(() => {
                    if (d) {
                        console.info('REWIND Initialized.', [mega.rewind]);
                    }
                })
                .catch((ex) => {
                    reportError(ex);
                    delete mega.rewind;
                });
        }
    }

    if (path) {
        this.onFileManagerReady(fmLeftMenuUI);
    }

    const res = await this.openFolder(path, true);

    if (megaChatIsReady) {
        megaChat.renderMyStatus();
    }

    if (d) {
        console.timeEnd('renderfm');
    }

    return res;
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
    $('button.l-pane-visibility').removeClass('active');

    $('.fm-dialog-overlay').rebind('click.fm', function(ev) {
        if ($.dialog === 'pro-login-dialog'
            || $.dialog === 'share'
            || $.dialog === 'share-add'
            || $.dialog === 'cookies-dialog'
            || $.dialog === 'affiliate-redeem-dialog'
            || $.dialog === 'discount-offer'
            || $.dialog === 'voucher-info-dlg'
            || $.dialog === "chat-incoming-call"
            || $.dialog === 'stripe-pay'
            || $.dialog === 'start-meeting-dialog'
            || $.dialog === 'meetings-call-consent'
            || $.dialog === 'fingerprint-dialog'
            || $.dialog === 'fingerprint-admin-dlg'
            || $.dialog === 'meetings-schedule-dialog'
            || String($.dialog).startsWith('verify-email')
            || String($.dialog).startsWith('s4-managed')
            || localStorage.awaitingConfirmationAccount) {
            return false;
        }
        showLoseChangesWarning().done(function() {
            closeDialog(ev);
        });
        $.hideContextMenu();

        if (is_eplusplus && megaChatIsReady && megaChat.activeCall) {
            // In call permissions dialog may have been shown. Don't leave the call UI.
            return;
        }

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
        $('.activity-status-block').addClass('hidden');

        var $prodNav = $('.fm-products-nav').text('');
        if (!u_type) {
            $prodNav.safeHTML(translate(pages['pagesmenu']));
            onIdle(clickURLs);
        }

        $('button.l-pane-visibility').rebind('click.leftpane', function() {
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
                            .safeHTML('<span class="selectable-txt">@@</span>', M.getNameByHandle(M.RootID));
                    }
                });
            }
            $.tresizer();
        });

        $('button.l-pane-visibility').trigger('click');
    }
    else {
        $('.nw-fm-left-icons-panel .logo').addClass('hidden');
        $('.fm-main').removeClass('active-folder-link');
        $('.fm-products-nav').text('');
    }

    $.doDD = function(e, ui, a, type) {

        // Prevent drop behavior for the `FloatingVideo` component
        // See: ui/meetings/float.jsx
        if (ui.helper.hasClass('float-video') || !$(ui.draggable).hasClass('ui-draggable')) {
            return;
        }

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
        let id;

        if (c && c.indexOf('nw-fm-tree-item') > -1) {
            // tree dragged:
            id = $(ui.draggable).attr('id');
            if (id.indexOf('treea_') > -1) {
                ids = [id.replace('treea_', '')];
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

        // Checks selected/dragseleted items has folder on it
        const hasFolder = ids && ids.some((id) => M.getNodeByHandle(id).t);

        // Workaround a problem where we get over[1] -> over[2] -> out[1]
        if (a === 'out' && $.currentOver !== $(e.target).attr('id')) {
            a = 'noop';
        }

        if (type == 1) {
            // tree dropped:
            c = $(e.target).attr('class');
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
            else if (c && c.indexOf('js-lpbtn') > -1 && a === 'drop') {
                if (c.indexOf('cloud-drive') > -1) {
                    // Drag and drop to the cloud drive in the file manager left panel
                    t = M.RootID;
                }
                else if (c.includes('s4') && M.tree.s4) {
                    const cn = s4.utils.getContainersList();

                    // Drag and drop folder to the only container or skip
                    if (cn.length === 1 && M.isFolder(ids)) {
                        t = cn[0].h;
                    }
                    else {
                        dd = 'noop';
                    }
                }
                else if (c.indexOf('rubbish-bin') > -1) {
                    // Drag and drop to the rubbish bin in the file manager left panel
                    t = M.RubbishID;
                }
            }
            else if (c && c.indexOf('js-lpbtn') > -1 && c.indexOf('cloud-drive') > -1 && a === 'over') {
                // Drag and over the cloud drive in the file manager left panel
                t = M.RootID;
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
                t = $(e.target).attr('id');
                if (t && t.indexOf('treea_') > -1) {
                    t = t.replace('treea_', '');
                }
                else if (t && t.indexOf('path_') > -1) {
                    t = t.replace('path_', '');
                }
                else if (M.currentdirid !== 'shares' || !M.d[t] || M.getNodeRoot(t) !== 'shares') {
                    t = undefined;
                }
            }
        }
        else {
            // grid dropped:
            c = $(e.target).attr('class');
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
            id = $(e.target).attr('id');
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
                        c = $(id).attr('class');
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
                c = String($(e.target).attr('class'));

                $.draggingClass = ('dndc-warning');
                if (c.indexOf('rubbish-bin') > -1) {
                    $.draggingClass = ('dndc-to-rubbish');
                }
                else if (c.indexOf('conversations') > -1) {
                    if (hasFolder) {
                        c = null;
                    }
                    else {
                        $.draggingClass = 'dndc-to-conversations';
                    }
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
                        $(e.target).click();
                    }, 920);
                }
            }
            else if (dd === 'chat-attach') {
                $.draggingClass = ('dndc-to-conversations');
            }
            else {
                const {type} = M.isCustomView(t) || {};
                $.draggingClass = M.d[t] || type === 's4' ? 'dndc-warning' : 'dndc-move';
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
                currentRoom.attachNodes(ids).catch(dump);
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
                        loadingDialog.pshow();
                        M.moveNodes($.moveids, $.movet)
                            .then((moves) => {
                                if (moves
                                    && M.currentdirid !== 'out-shares'
                                    && M.currentdirid !== 'public-links'
                                    && M.currentdirid !== 'file-requests'
                                    && String(M.currentdirid).split("/")[0] !== "search") {
                                    $ddelm.remove();
                                }
                            })
                            .catch((ex) => {
                                if (ex !== EBLOCKED) {
                                    // user canceled file-conflict dialog.
                                    tell(ex);
                                }
                            })
                            .finally(() => loadingDialog.phide());

                        if (window.selectionManager) {
                            selectionManager.resetTo($.movet);
                        }
                    }
                }, 50);
            }
            else if ((dd === 'copy') || (dd === 'copydel')) {
                nRevert();
                $.copyids = ids;
                $.copyt = t;
                setTimeout(() => {
                    M.copyNodes($.copyids, $.copyt, dd === 'copydel')
                        .then(() => {

                            // Update files count...
                            if (M.currentdirid === 'shares' && !M.viewmode) {
                                M.openFolder('shares', 1);
                            }
                        })
                        .catch((ex) => {
                            if (ex === EOVERQUOTA) {
                                return msgDialog('warninga', l[135], l[8435]);
                            }
                            // Tell the user there was an error unless he cancelled the file-conflict dialog
                            if (ex !== EINCOMPLETE) {
                                tell(ex);
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
    // M.treeSearchUI();
    // M.treeFilterUI();
    // M.treeSortUI();
    M.initTreePanelSorting();
    M.initContextUI();
    initShareDialog();
    M.addTransferPanelUI();
    M.initUIKeyEvents();
    M.onFileManagerReady(topmenuUI);
    M.initMegaSwitchUI();

    // disabling right click, default contextmenu.
    var alwaysShowContextMenu = Boolean(localStorage.contextmenu);
    $(document).rebind('contextmenu.doc', function(ev) {
        var target = ev.target;
        var ALLOWED_IDS = {'embed-code-field': 1};
        var ALLOWED_NODES = {INPUT: 1, TEXTAREA: 1, VIDEO: 1};
        var ALLOWED_CLASSES = [
            'contact-details-user-name',
            'contact-details-email',
            'js-selectable-text',
            'nw-conversations-name'
        ];
        var ALLOWED_PARENTS =
            '#startholder, .fm-account-main, .export-link-item, .contact-fingerprint-txt, .fm-breadcrumbs, ' +
            '.fm-affiliate, .text-editor-container';
        var ALLOWED_CLOSEST =
            '.multiple-input, .create-folder-input-bl, .content-panel.conversations, ' +
            '.messages.content-area, .chat-right-pad .user-card-data';

        if (ALLOWED_NODES[target.nodeName] || ALLOWED_IDS[target.id] || alwaysShowContextMenu) {
            return;
        }

        for (var i = ALLOWED_CLASSES.length; i--;) {
            if (target.classList && target.classList.contains(ALLOWED_CLASSES[i])) {
                return;
            }
        }

        var $target = $(target);
        if (!is_fm() || $target.parents(ALLOWED_PARENTS).length || $target.closest(ALLOWED_CLOSEST).length) {
            return;
        }

        $.hideContextMenu();
        return false;
    });

    var $fmholder = $('#fmholder');
    $('.grid-table .grid-view-resize').rebind('mousedown.colresize', function(col) {
        var $me = $(this);
        var th = $me.closest('th');
        var startOffset = th.outerWidth() - col.pageX;

        $fmholder.rebind('mousemove.colresize', function(col) {
            var newWidth = startOffset + col.pageX;

            const min = th.attr('data-minwidth') | 0;

            if (newWidth < min) {
                newWidth = min;
            }

            var colType = th.attr('megatype');
            if (colType) {
                if (newWidth < M.columnsWidth.cloud[colType].min) {
                    return;
                }
                if (newWidth > M.columnsWidth.cloud[colType].max) {
                    return;
                }
                th.outerWidth(newWidth);
                M.columnsWidth.cloud[colType].curr = newWidth;

                if (M.megaRender && M.megaRender.megaList) {
                    if (M.megaRender.megaList._scrollIsInitialized) {
                        M.megaRender.megaList.scrollUpdate();
                    }
                    else {
                        M.megaRender.megaList.resized();
                    }
                }
            }
            else {
                th.outerWidth(newWidth);
            }

            $('#fmholder').css('cursor', 'col-resize');
        });

        $fmholder.rebind('mouseup.colresize', function() {
            M.columnsWidth.makeNameColumnStatic();
            $('#fmholder').css('cursor', '');
            $fmholder.off('mouseup.colresize');
            $fmholder.off('mousemove.colresize');
        });
    });

    $('.ps', $fmholder)
        .rebind('ps-scroll-left.fm-x-scroll ps-scroll-right.fm-x-scroll', function(e) {
            if (!e || !e.target) {
                console.warn('no scroll event info...!');
                console.warn(e);
                return;
            }
            var $target = $(e.target);
            if (!$target.hasClass('grid-scrolling-table megaListContainer')) {
                return;
            }
        });

    $('.fm-files-view-icon').rebind('click', function() {
        $.hideContextMenu();

        const viewIcon = $(this);
        var viewValue = viewIcon.hasClass('media-view') ? 2 : viewIcon.hasClass('listing-view') ? 0 : 1;

        if (fmconfig.uiviewmode | 0) {
            mega.config.set('viewmode', viewValue);
        }
        else {
            fmviewmode(M.currentdirid, viewValue);
        }
        $('.fm-files-view-icon').removeClass('active');

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

        return false;
    });

    $('.fm-folder-upload, .fm-file-upload').rebind('click', (element) => {
        $.hideContextMenu();
        if (element.currentTarget.classList.contains('fm-folder-upload')) {

            // Log that User clicks on Upload folder button
            eventlog(500009);

            $('#fileselect2').click();
        }
        else {
            // Log that User clicks on Upload file button
            eventlog(500011);

            $('#fileselect1').click();
        }
    });

    $.hideContextMenu = function(event) {

        var a, b, currentNodeClass;

        if (event && event.target) {

            a = event.target.parentNode;
            currentNodeClass = event.target.classList;
            if (!currentNodeClass.length) {
                currentNodeClass = a.classList;
            }
            if (currentNodeClass && currentNodeClass.contains('dropdown')
                && (currentNodeClass.contains('download-item')
                    || currentNodeClass.contains('move-item'))
                && currentNodeClass.contains('active')
                || currentNodeClass.contains('inshare-dl-button0')) {
                return false;
            }

            if (!(a && a.classList.contains('breadcrumb-dropdown-link'))) {
                $('.breadcrumb-dropdown').removeClass('active');
            }
        }
        $('.dropdown-search').addClass('hidden');
        $('.nw-sorting-menu').addClass('hidden');
        $('.colour-sorting-menu').addClass('hidden');
        $('.nw-tree-panel-arrows').removeClass('active');
        $('.nw-fm-tree-item').removeClass('dragover');
        $('.nw-fm-tree-item.hovered').removeClass('hovered');
        $('.data-block-view .file-settings-icon').removeClass('active');
        $('.column-settings.overlap').removeClass('c-opened');
        $('.js-statusbarbtn.options').removeClass('c-opened');

        const $jqe = $('.shared-details-info-block .fm-share-download');
        if ($jqe.hasClass('active')) {
            // close & cleanup
            $jqe.trigger('click');
        }
        $('.fm-share-download').removeClass('active disabled');

        const $threeDotsContextMenu = $('.shared-details-info-block .grid-url-arrow');
        if ($threeDotsContextMenu.hasClass('active')) {
            $threeDotsContextMenu.trigger('click');
        }
        $('.grid-url-arrow').removeClass('active');

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

        // enable scrolling
        if ($.disabledContianer) {
            Ps.enable($.disabledContianer[0]);
            delete $.disabledContianer;
        }

        mBroadcaster.sendMessage('contextmenuclose');
    };

    $fmholder.rebind('click.contextmenu', function(e) {
        $.hideContextMenu(e);
        if ($.hideTopMenu) {
            $.hideTopMenu(e);
        }
        if (M.chat) {
            // chat can handle its own links..no need to return false on every "click" and "element" :O
            // halt early, to save some CPU cycles if in chat.
            return;
        }
        var $target = $(e.target);
        var exclude = '.upgradelink, .campaign-logo, .resellerbuy, .linkified, '
            + 'a.red, a.mailto, a.top-social-button, .notif-help';

        if ($target.attr('type') !== 'file'
            && !$target.is(exclude)
            && !$target.parent().is(exclude)) {
            return false;
        }
    });

    if (page !== "chat") {
        $('.fm-right-header.fm').removeClass('hidden');
    }

    folderlink = folderlink || 0;

    if ((typeof dl_import !== 'undefined') && dl_import) {
        M.onFileManagerReady(importFile);
    }

    $('.dropdown.body.context').rebind('contextmenu.dropdown', function(e) {
        if (!localStorage.contextmenu) {
            e.preventDefault();
        }
    });

    $('.nw-fm-left-icon, .js-lpbtn').rebind('contextmenu', (ev) => {
        M.contextMenuUI(ev, 1);
        return false;
    });

    // stop sort and filter dialog clicking close itself
    $('.nw-sorting-menu').on('click', function(e) {
        e.stopPropagation();
    });

    var self = this;

    if (!this.fmTabState || this.fmTabState['cloud-drive'].root !== M.RootID) {
        this.fmTabState = {
            'cloud-drive': { // My-files
                root: M.RootID,
                prev: null,
                subpages: [
                    M.InboxID, M.RubbishID,
                    'recents', 'shares', 'faves', 'out-shares', 'public-links', 'file-requests'
                ]
            },
            'gallery':         {root: 'photos',    prev: null, subpages: Object.keys(mega.gallery.sections)},
            'photos': {
                root: 'photos',
                prev: null,
                subpages: ['cloud-drive-photos', 'camera-uploads-photos']
            },
            'images': {
                root: 'images',
                prev: null,
                subpages: ['cloud-drive-images', 'camera-uploads-images']
            },
            'videos': {
                root: 'videos',
                prev: null,
                subpages: ['cloud-drive-videos', 'camera-uploads-videos']
            },
            'favourites':      {root: 'favourites',prev: null},
            'albums':          {root: 'photos',    prev: null},
            'folder-link':     {root: M.RootID,    prev: null},
            'conversations':   {
                root: 'chat',
                prev: null,
                subpages: ['chat/contacts', 'chat/contacts/received', 'chat/contacts/sent']
            },
            'transfers':       {root: 'transfers', prev: null},
            'account':         {root: 'account',   prev: null},
            'dashboard':       {root: 'dashboard', prev: null, subpages: ['refer']},
            'user-management': {root: 'user-management', prev: null},
            'shared-with-me':  {root: 'shares',    prev: null, subpages: ['out-shares']},
            'public-links':    {root: 'public-links',    prev: null},
            'recents':         {root: 'recents',   prev: null},
            'faves':           {root: 'faves',   prev: null},
            'backups':         {root: 'backups',   prev: null},
            'rubbish-bin':     {root: M.RubbishID, prev: null},
            'backup-center':   {root: 'devices', prev: null},
            'file-requests':   {root: 'file-requests',    prev: null}
        };
    }

    var isMegaSyncTransfer = true;

    $('.js-fm-tab').rebind('click.fmTabState', function() {
        treesearch = false;
        var clickedClass = this.className;

        if (!clickedClass) {
            return;
        }

        if ((ul_queue && ul_queue.length) || (dl_queue && dl_queue.length)) {
            isMegaSyncTransfer = false;
        }
        if (clickedClass.indexOf('transfers') > -1) {
            if (isMegaSyncTransfer && window.useMegaSync === 2) {
                megasync.transferManager();
                return;
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

        let activeClass = '.js-fm-tab';

        if (this.classList.contains('btn-myfiles')) {
            activeClass = '.btn-myfiles';
        }
        else if (this.classList.contains('btn-galleries')) {
            activeClass = '.btn-galleries';
        }

        activeClass = ('' + $(activeClass + '.active:visible')
            .attr('class')).split(" ").filter(function(c) {
            return !!self.fmTabState[c];
        })[0];

        var activeTab = self.fmTabState[activeClass];

        if (activeTab) {
            if (activeTab.root === M.currentrootid
                || activeTab.root === 'chat'
                || M.isAlbumsPage()
                || activeTab.subpages && activeTab.subpages.includes(M.currentrootid || M.currentdirid)
            ) {
                activeTab.prev = M.currentdirid;
                M.lastActiveTab = activeClass;
            }
            else if (d) {
                console.warn('Root mismatch', M.currentrootid, M.currentdirid, activeTab);
            }
        }

        if (this.classList.contains('devices')) {
            if (u_type === 0) {

                // Show message 'This page is for registered users only'
                ephemeralDialog(l[17146]);
            }
            else {

                loadSubPage('fm/devices');
            }
        }

        if (this.classList.contains('account') || this.classList.contains('dashboard')) {
            $.hideTopMenu();

            if (u_type === 0) {
                if (this.classList.contains('account')) {
                    ephemeralDialog(l[7687]);
                }
                else {
                    // Show message 'This page is for registered users only'
                    ephemeralDialog(l[17146]);
                }
            }
            else if (this.classList.contains('dashboard')) {
                if (M.currentdirid !== 'refer' && self.fmTabState.dashboard.prev === 'refer') {
                    loadSubPage('fm/refer');
                    return false;
                }
                self.fmTabState.dashboard.prev = null;
                loadSubPage('fm/dashboard');
            }
            else {
                loadSubPage('fm/account');
            }
            return false;
        }

        const isGalleryRedirect = this.dataset.locationPref
            && (M.isAlbumsPage() || M.isGalleryPage() || this.matches('.nw-fm-left-icon.gallery'));

        for (var tab in self.fmTabState) {
            if (~clickedClass.indexOf(tab)) {
                tab = self.fmTabState[tab];

                if (tab.root === 'transfers' && pfcol) {
                    break;
                }

                var targetFolder = null;

                if (tab.root === 'backups') {
                    targetFolder = M.BackupsId || M.RootID;
                }
                // Clicked on the currently active tab, should open the root (e.g. go back)
                else if (clickedClass.indexOf(activeClass) !== -1) {
                    targetFolder = (isGalleryRedirect) ? this.dataset.locationPref : tab.root;

                    // special case handling for the chat, re-render current conversation
                    if (
                        tab.root === 'chat' &&
                        String(M.currentdirid).substr(0, 5) === 'chat/' &&
                        !M.currentdirid.startsWith('chat/contacts')
                    ) {
                        targetFolder = M.currentdirid;
                    }
                }
                else if (tab.prev && (M.d[tab.prev] || M.isCustomView(tab.prev) ||
                    (tab.subpages && tab.subpages.indexOf(tab.prev) > -1))) {
                    targetFolder = tab.prev;
                }
                else if (isGalleryRedirect) {
                    targetFolder = this.dataset.locationPref;
                }
                else {
                    targetFolder = tab.root;
                }

                M.openFolder(targetFolder, true);

                break;
            }
        }
    });

    if (dlMethod.warn) {
        window.onerror = null;
        console.error('This browser is using an outdated download method, good luck...', '' + window.ua);
    }

    // chat can handle the left-panel resizing on its own
    const lPane = $('.fm-left-panel').filter(":not(.chat-lp-body)");
    $.leftPaneResizable = new FMResizablePane(lPane, {
        'direction': 'e',
        'minWidth': mega.flags.ab_ads ? 260 : 200,
        'maxWidth': 400,
        'persistanceKey': 'leftPaneWidth',
        'handle': '.left-pane-drag-handle',
        'pagechange': () => {
            let {'cloud-drive': {subpages: myFiles} = false} = this.fmTabState;
            myFiles = myFiles ? array.to.object([M.RootID, ...myFiles]) : false;

            return function() {
                let maxWidth = null;

                if (!myFiles[M.currentrootid]) {
                    maxWidth = 400;
                }
                this.setOption('maxWidth', maxWidth);
            };
        }
    });

    $($.leftPaneResizable).rebind('resize.lhp', function() {
        var w = lPane.width();
        if ($.leftPaneResizable.options.maxWidth && w >= $.leftPaneResizable.options.maxWidth) {
            $('.left-pane-drag-handle').css('cursor', 'w-resize');
            $('body').css('cursor', 'w-resize');
        }
        else if (w <= $.leftPaneResizable.options.minWidth) {
            $('.left-pane-drag-handle').css('cursor', 'e-resize');
            $('body').css('cursor', 'e-resize');
        }
        else {
            $('.left-pane-drag-handle').css('cursor', 'ew-resize');
            $('body').css('cursor', 'ew-resize');
        }

        if (!this.element.hasClass('ui-resizable-resizing')) {
            $('body').css('cursor', 'auto');
        }

        if (lPane.width() < $.leftPaneResizable.options.updateWidth + 60) {
            lPane.addClass('small-left-panel');
        }
        else {
            lPane.removeClass('small-left-panel');
        }

        $.tresizer();
    });

    $(window).rebind('resize.fmrh hashchange.fmrh', fm_resize_handler);

    if (ua.details.os === "Apple") {

        $(window).rebind('blur.ps-unfocus', () => {

            $('.ps').rebind('ps-scroll-y.ps-unfocus', e => {

                $(e.target).addClass('ps-outfocused-scrolling');

                delay('ps-out-focused-' + $(e.target).data('ps-id'), function __psOutFocused() {
                    $(e.target).removeClass('ps-outfocused-scrolling');
                }, 1000);
            });
        });

        if (!document.hasFocus()) {
            $(window).trigger('blur.ps-unfocus');
        }

        $(window).rebind('focus.ps-unfocus', function() {

            $('.ps').off('ps-scroll-y.ps-unfocus');
        });
    }

    if (d) {
        console.timeEnd('initUI');
    }
};

/**
 * A FileManager related method for (re)initializing the shortcuts and selection managers.
 *
 * @param container
 * @param aUpdate
 * @param {Boolean} [refresh] are we re-attaching the container?
 */
FileManager.prototype.initShortcutsAndSelection = function(container, aUpdate, refresh) {
    'use strict';

    if (!window.fmShortcuts) {
        window.fmShortcuts = new FMShortcuts();
    }

    if (!aUpdate) {
        if (window.selectionManager) {
            window.selectionManager.destroy();
        }

        if (M.previousdirid !== M.currentdirid && !refresh) {
            // do not retain selected nodes unless re-rendering the same view
            $.selected = [];
        }
        // or re-rendering the same view but previous view is media discovery view
        else if (!M.gallery && !$('#gallery-view').hasClass('hidden')) {
            for (let i = $.selected.length - 1; i >= 0; i--) {
                if (!M.v.includes(M.d[$.selected[i]])) {
                    $.selected.splice(i, 1);
                }
            }
        }

        /**
         * (Re)Init the selectionManager, because the .selectable() is reinitialized and we need to
         * reattach to its events.
         *
         * @type {SelectionManager}
         */
        window.selectionManager = new SelectionManager2_DOM(
            $(container),
            {
                'onSelectedUpdated': (selected_list) => {
                    $.selected = selected_list;
                }
            }
        ).reinitialize();
    }
};


/**
 * Update FileManager on new nodes availability
 * @details Former rendernew()
 * @returns {MegaPromise}
 */
// eslint-disable-next-line complexity
FileManager.prototype.updFileManagerUI = async function() {
    "use strict";

    var treebuild = Object.create(null);
    var UImain = false;
    var UItree = false;
    var newcontact = false;
    var newpath = false;
    var newshare = false;
    var selnode;
    var buildtree = function(n) {
        delay('updFileManagerUI:buildtree:' + n.h, function() {
            M.buildtree(n, M.buildtree.FORCE_REBUILD);
            M.addTreeUIDelayed();
        }, 2600);
    };

    if (d) {
        console.warn('updFileManagerUI for %d nodes.', newnodes.length);
        console.time('rendernew');
    }

    const view = Object.create(null);
    view[this.currentdirid] = 1;
    view[this.currentCustomView.nodeID] = 1;

    if (this.currentdirid === 'file-requests') {
        Object.assign(view, mega.fileRequest.getPuHandleList());
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

        if (view[newNode.p] || view[newNode.h]
            || newNode.su && this.currentdirid === 'shares'
            || newNode.shares && this.currentdirid === 'out-shares') {

            UImain = true;

            if ($.onRenderNewSelectNode === newNode.h) {
                delete $.onRenderNewSelectNode;
                selnode = newNode.h;
            }
        }

        if (!newpath && document.getElementById(`path_${newNode.h}`)) {
            newpath = true;
        }
    }

    for (var h in treebuild) {
        var tb = this.d[h];
        if (tb) {
            // If this is out-shares or public-links page, build both cloud-drive tree and it's own
            if (this.currentCustomView) {
                if (tb.h === M.RubbishID) {
                    tb = {h: M.RootID};
                }
                this.buildtree(tb, this.buildtree.FORCE_REBUILD, 'cloud-drive');
                this.buildtree({h: this.currentCustomView.type}, this.buildtree.FORCE_REBUILD);
            }
            else {
                buildtree(tb);
            }
            UItree = true;
        }
    }

    if (d) {
        console.log('rendernew, dir=%s, root=%s, mode=%d', this.currentdirid, this.currentrootid, this.viewmode);
        console.log('rendernew.stat', newcontact, newshare, UImain, newpath);
        console.log('rendernew.tree', Object.keys(treebuild));
    }
    let renderPromise = null;

    if (UImain) {
        if (UItree || this.v.length) {
            var emptyBeforeUpd = !M.v.length;
            this.filterByParent(this.currentCustomView.nodeID || this.currentdirid);
            this.sort();
            this.renderMain(!emptyBeforeUpd);
        }
        else {
            renderPromise = this.openFolder(this.currentdirid, true);
        }

        UImain = this.currentdirid;
    }

    if (this.currentdirid === "recents" && this.recentsRender) {
        this.recentsRender.updateState();
    }

    if (UItree) {
        if (this.currentrootid === 'shares') {
            this.renderTree();
        }
        else if (this.currentCustomView) {
            this.addTreeUIDelayed(90);
        }

        if (this.currentdirid === 'shares' && !this.viewmode) {

            renderPromise = Promise.resolve(renderPromise)
                .then(() => this.openFolder('shares', true));
        }
    }

    newnodes = [];
    if (renderPromise) {
        await renderPromise;
    }

    if (UItree && this.nodeRemovalUIRefresh.pending !== this.currentdirid) {
        this.onTreeUIOpen(this.currentdirid);
    }

    if (newcontact) {
        useravatar.refresh().catch(dump);

        if (megaChatIsReady) {
            megaChat.renderMyStatus();
        }
    }
    if (newshare) {
        M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
    }
    if (newpath) {
        delay('render:path_breadcrumbs', () => M.renderPathBreadcrumbs());
    }

    if (UImain === M.currentdirid) {
        if (selnode) {
            onIdle(() => {
                $.selected = [selnode];
                reselect(1);
            });
        }

        if (window.selectionManager) {
            // update the total count of nodes
            var tmp = selectionManager.vSelectionBar;
            if (tmp) {
                var mm = String(tmp.textContent).split('/').map(Number);
                tmp.textContent = mm[0] + ' / ' + M.v.length;
            }
        }

    }

    if (u_type === 0) {
        // Show "ephemeral session warning"
        topmenuUI();
    }

    delay('dashboard:upd', () => {
        if (M.currentdirid === 'dashboard') {
            dashboardUI(true);
        }
        else if (UImain === M.currentdirid) {
            delay('rendernew:mediainfo:collect', () => {
                mBroadcaster.sendMessage('mediainfo:collect');
                $.tresizer();
            }, 3200);
        }
    }, 2000);

    mBroadcaster.sendMessage('updFileManagerUI');

    if (d) {
        console.timeEnd('rendernew');
    }
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
                .removeClass('hidden')
                .addClass('active');

            $this.addClass('opened');
        }

        // If MEGA Lite mode and the selection contains a folder, hide the regular download option (only zip allowed),
        // otherwise this throws an error about downloading an empty folder then downloads as a zip anyway.
        if (mega.lite.inLiteMode && mega.lite.containsFolderInSelection($.selected)) {
            $(c + '.download-standart-item').addClass('hidden');
            return false;
        }

        // Make standard download option visible for files (and folders in regular mode)
        $(c + '.download-standart-item').removeClass('hidden');
    });

    var safeMoveNodes = function() {
        if (!$(this).hasClass('disabled')) {
            $.hideContextMenu();
            mLoadingSpinner.show('safeMoveNodes');
            M.safeMoveNodes(String($(this).attr('id')).replace('fi_', '')).catch(dump)
                .finally(() => mLoadingSpinner.hide('safeMoveNodes'));
        }
        return false;
    };

    $(c + '.cloud-item').rebind('click', safeMoveNodes);

    $('.dropdown.body.files-menu').off('click', '.folder-item');
    $('.dropdown.body.files-menu').on('click', '.folder-item', safeMoveNodes);
    safeMoveNodes = undefined;

    $(c + '.download-item').rebind('click', function() {
        var c = this.className;

        // If MEGA Lite mode and attempting to download a folder(s) by clicking on the Download item, disable the click
        if (mega.lite.inLiteMode && mega.lite.containsFolderInSelection($.selected)) {
            return false;
        }

        if (c && (c.indexOf('contains-submenu') > -1 || c.indexOf('msync-found') > -1)) {
            M.addDownload($.selected);
        }
    });

    $(c + '.download-standart-item').rebind('click', function() {
        if (folderlink) {
            eventlog(99768);
        }
        M.addDownload($.selected);
    });

    $(c + '.zipdownload-item').rebind('click', function() {
        if (folderlink) {
            eventlog(99769);
        }
        M.addDownload($.selected, true);
    });


    $(c + '.syncmegasync-item').rebind('click', function () {
        // check if this is a business expired account
        if (M.isInvalidUserStatus()) {
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

    $(c + '.getlink-item, ' + c + '.embedcode-item, ' + c + '.cd-getlink-item').rebind('click', function(e) {

        M.getLinkAction.call(this);

        if ($(e.currentTarget).hasClass('cd-getlink-item')) {
            if ($(e.currentTarget).hasClass('manage-link')) {
                // event log for manage link/s
                eventlog(500030);
            }
            else {
                // event log for share link
                eventlog(500028);
            }
        }

    });

    $(c + '.removelink-item, ' + c + '.cd-removelink-item').rebind('click', (e) => {
        // check if this is a business expired account
        if (M.isInvalidUserStatus()) {
            return;
        }

        if (u_type === 0) {
            ephemeralDialog(l[1005]);
        }
        else {
            var media = false;
            var handles = Array.isArray($.selected) && $.selected.concat();
            var removeLink = function(e) {
                if (e) {
                    var exportLink = new mega.Share.ExportLink({'updateUI': true, 'nodesToProcess': handles});
                    exportLink.removeExportLink();
                }
            };
            let files = 0;
            let folders = 0;
            for (var i = handles.length; i--;) {
                if (is_video(M.d[handles[i]]) === 1) {
                    media = true;
                }
                if (M.d[handles[i]].t) {
                    folders++;
                }
                else {
                    files++;
                }
            }

            var mediaRemoveLink = () => {
                msgDialog('confirmation', l[882], l[17824], 0, removeLink);
            };

            if (mega.config.get('nowarnpl')) {
                if (media) {
                    mediaRemoveLink();
                }
                else {
                    removeLink(true);
                }
            }
            else {
                let subtitle = l.plink_remove_dlg_text_mixed;
                if (files > 0 && folders === 0) {
                    subtitle = mega.icu.format(l.plink_remove_dlg_text_file, files);
                }
                else if (files === 0 && folders > 0) {
                    subtitle = mega.icu.format(l.plink_remove_dlg_text_folder, folders);
                }
                const title = mega.icu.format(l.plink_remove_dlg_title, handles.length);
                if (media) {
                    subtitle += `<br><br>${l[17824]}`;
                }
                msgDialog('confirmation', '', title, subtitle, removeLink, 'nowarnpl');
            }
        }

        if ($(e.currentTarget).hasClass('cd-removelink-item')) {
            eventlog(500031);
        }
    });

    $(c + '.dispute-item').rebind('click', function() {
        // Find the first takendown node in the list. This is the item we will use to prefill with.
        localStorage.removeItem('takedownDisputeNodeURL');
        for (var i = 0; i < $.selected.length; i++) {
            var node = M.getNodeByHandle($.selected[i]);
            if (node.t & M.IS_TAKENDOWN || M.getNodeShare(node).down === 1) {
                var disputeURL = mega.getPublicNodeExportLink(node);
                if (disputeURL) {
                    localStorage.setItem('takedownDisputeNodeURL', disputeURL);
                }
                break;
            }
        }
        mega.redirect('mega.io', 'dispute', false, false, false);
    });

    $(c + '.rename-item').rebind('click', function() {
        // check if this is a business expired account
        if (M.isInvalidUserStatus()) {
            return;
        }
        renameDialog();
    });

    $(c + '.sh4r1ng-item').rebind('click', function() {
        M.openSharingDialog($.selected[0]);
    });

    $(`${c}.removeshare-item, ${c}.cd-removeshare-item`).rebind('click', (e) => {
        if (M.isInvalidUserStatus()) {
            return;
        }

        msgDialog(`remove:!^${l[23737]}!${l[82]}`, '', l.remove_share_title, l.remove_share_msg, res => {
            if (res) {
                new mega.Share().removeSharesFromSelected().dump('remove-share');
            }
        }, 1);

        if ($(e.currentTarget).hasClass('cd-removeshare-item')) {
            eventlog(500033);
        }
    });

    $(c + '.cd-sh4r1ng-item').rebind('click', (e) => {
        M.openSharingDialog($.selected[0]);

        if ($(e.currentTarget).hasClass('manage-share')) {
            // event log for manage folder
            eventlog(500032);
        }
        else {
            // event log for share folder
            eventlog(500029);
        }
    });

    // Move Dialog
    $(c + '.advanced-item, ' + c + '.move-item').rebind('click', openMoveDialog);

    $(c + '.copy-item').rebind('click', openCopyDialog);

    $(c + '.revert-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        mLoadingSpinner.show('restore-nodes');
        M.revertRubbishNodes($.selected)
            .catch((ex) => {
                if (ex !== EBLOCKED) {
                    // user canceled file-conflict dialog.
                    tell(ex);
                }
            })
            .finally(() => mLoadingSpinner.hide('restore-nodes'));
    });

    $(c + '.import-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }

        if (pfcol) {
            $.selected = Object.keys(mega.gallery.albums.grid.timeline.selections);
        }

        eventlog(pfcol ? 99832 : 99767);
        ASSERT(folderlink, 'Import needs to be used in folder links.');

        M.importFolderLinkNodes($.selected);
    });

    $(c + '.newfolder-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        createFolderDialog();
    });
    // eslint-disable-next-line local-rules/jquery-scopes
    $(c + '.newfile-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        createFileDialog();
    });

    $(c + '.fileupload-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        $('#fileselect3').click();
    });

    $(c + '.folderupload-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        $('#fileselect4').click();
    });

    $(c + '.remove-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        if ($(this).hasClass('disabled')) {
            return false;
        }
        closeDialog();
        fmremove();
    });

    $(c + '.addcontact-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        contactAddDialog();
    });

    $(c + '.startchat-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
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
            megaChat.createAndShowGroupRoomFor(user_handle, "", {keyRotation: true, createChatLink: false});
        }
    });

    $(c + '.startaudio-item,' + c + '.startaudiovideo-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            megaChat.createAndShowPrivateRoom(user_handle)
                .then(function(room) {
                    room.setActive();
                    room.startAudioCall();
                });
        }
    });

    $(c + '.startvideo-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            megaChat.createAndShowPrivateRoom(user_handle)
                .then(function(room) {
                    room.setActive();
                    room.startVideoCall();
                });
        }
    });

    $(c + '.view-profile-item').rebind('click', function(e) {
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            loadSubPage('fm/chat/contacts/' + user_handle);
            // there seem to be some duplicated callbacks triggered by menus.js, but since I'm not sure what would the
            // side effects of that can be, I'm stopping propagation here to reduce risk of those causing double
            // loadSubPage calls (which breaks fm/$contact -> fm/chat/contacts/$contact redirects, because it triggers
            // a race in openFolder)
            e.stopPropagation();
        }
    });

    $(c + '.send-files-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            megaChat.openChatAndSendFilesDialog(user_handle);
        }
    });

    $(c + '.share-folder-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        var $this = $(this);
        var user_handle = $.selected && $.selected[0];

        if (!$this.is('.disabled') && user_handle) {
            openCopyShareDialog(user_handle);
        }
    });

    $(`${c}.leaveshare-item`).rebind('click', () => {
        if (M.isInvalidUserStatus()) {
            return;
        }
        const errHandler = ex => {
            if (ex === EMASTERONLY) {
                msgDialog('warningb', '', l.err_bus_sub_leave_share_dlg_title, l.err_bus_sub_leave_share_dlg_text);
            }
        };

        for (let i = 0; i < $.selected.length; i++) {
            M.leaveShare($.selected[i]).catch(errHandler);
        }
    });

    // Bind Set Nickname context menu button
    $(c + '.set-nickname').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        var userHandle = $.selected && $.selected[0];

        $.hideContextMenu();
        nicknames.setNicknameDialog.init(userHandle);
    });

    $(c + '.remove-contact').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        if ($(this).hasClass('disabled')) {
            return;
        }
        var user_handle = $.selected && $.selected[0];

        fmremove(user_handle);
    });

    $(c + '.properties-item').rebind('click', function() {
        propertiesDialog();
    });

    if (pfid) {
        $(`${c}.vhl-item`).rebind('click', () => {
            for (let i = $.selected.length; i--;) {
                let n = M.d[$.selected[i]];
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
        });
    }

    // eslint-disable-next-line local-rules/jquery-scopes
    $(c + '.edit-file-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        var nodeHandle = $.selected && $.selected[0];
        if (!nodeHandle) {
            return;
        }

        // Close properties dialog if context menu was triggered there
        if ($.dialog === 'properties') {
            propertiesDialog(true);
        }

        loadingDialog.show('common', l[23130]);

        mega.fileTextEditor.getFile(nodeHandle).done(
            function(data) {
                loadingDialog.hide();
                mega.textEditorUI.setupEditor(M.d[nodeHandle].name, data, nodeHandle);
            }
        ).fail(function() {
            loadingDialog.hide();
        });
    });

    $(c + '.properties-versions').rebind('click', function() {
        fileversioning.fileVersioningDialog();
    });

    $(c + '.clearprevious-versions').rebind('click', function() {

        if (M.isInvalidUserStatus()) {
            return;
        }

        if ($.selected && $.selected.length > 0) {

            const fselected = M.getNodeByHandle($.selected[0]);

            if ($.selected && $.selected.length === 1 && fselected.t && fselected.tvf) {

                const sfWithVf = Object.create(null);

                sfWithVf[$.selected[0]] = fselected.tvf;

                const _getChildFolderWithVerion = function _(h) {

                    if (!M.tree[h]) {
                        return;
                    }

                    const fHandles = Object.keys(M.tree[h]);

                    for (let i = fHandles.length; i--;) {

                        if (M.tree[h][fHandles[i]].tvf) {

                            sfWithVf[fHandles[i]] = M.tree[h][fHandles[i]].tvf;
                            sfWithVf[h] -= M.tree[h][fHandles[i]].tvf;
                            _(fHandles[i]);
                        }

                        if (!sfWithVf[h]) {

                            delete sfWithVf[h];
                            break;
                        }
                    }
                };

                msgDialog('remove', l[1003], l.clear_prev_version_folder, l[1007], async(e) => {

                    if (e) {

                        _getChildFolderWithVerion($.selected[0]);

                        const fh = Object.keys(sfWithVf);
                        await dbfetch.geta(fh);

                        for (let i = fh.length; i--;) {

                            const cfh = Object.keys(M.c[fh[i]]);

                            for (let j = cfh.length; j--;) {

                                const cfn = M.getNodeByHandle(cfh[j]);

                                if (!cfn.t && cfn.tvf) {
                                    fileversioning.clearPreviousVersions(cfh[j]);
                                }
                            }
                        }
                    }
                });

                return;
            }

            const fvNode = [];

            for (let i = $.selected.length; i--;) {

                const selected = M.getNodeByHandle($.selected[i]);

                if (!selected.t && selected.tvf) {
                    fvNode.push($.selected[i]);
                }
            }

            msgDialog('remove', l[1003], mega.icu.format(l[17154], fvNode.length), l[1007], (e) => {

                if (e) {
                    for (let i = fvNode.length; i--;) {
                        fileversioning.clearPreviousVersions(fvNode[i]);
                    }
                }
            });
        }
    });

    $(c + '.findupes-item').rebind('click', M.findDupes);

    $(c + '.add-star-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }

        let newFavState;

        if ($.selected.length > 1) {
            // Determine the new fav state value from multiselection
            newFavState = Number($('i', $(this)).hasClass('icon-favourite'));
        }
        else {
            newFavState = Number(!M.isFavourite($.selected));
        }

        M.favourite($.selected, newFavState);
    });

    $(`${c}.send-to-contact-item, ${c}.cd-send-to-contact-item`).rebind('click', (ev) => {
        openCopyDialog('conversations');

        if ($(ev.currentTarget).hasClass('cd-send-to-contact-item')) {
            // eveng log for send contact folder
            eventlog(500027);
        }
    });

    $('.submenu.labels .dropdown-colour-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }

        const classList = this.classList;
        let labelId = parseInt(this.dataset.labelId);

        // Remove the existing label from nodes
        if (classList.contains('active') && !classList.contains('update-to')) {
            labelId = 0;
        }

        M.labeling($.selected, labelId);
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

    $('.filter-block.body .close').rebind('click', function() {
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
        if ($(this).hasClass('update-to')) {
            switch (labelTxt) {
                case "Red":
                    labelTxt = l.update_to_red;
                    break;
                case "Orange":
                    labelTxt = l.update_to_orange;
                    break;
                case "Yellow":
                    labelTxt = l.update_to_yellow;
                    break;
                case "Green":
                    labelTxt = l.update_to_green;
                    break;
                case "Blue":
                    labelTxt = l.update_to_blue;
                    break;
                case "Purple":
                    labelTxt = l.update_to_purple;
                    break;
                case "Grey":
                    labelTxt = l.update_to_grey;
                    break;
            }
        }
        else if ($(this).hasClass('active')) {
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
        if (
            M.currentrootid === 'out-shares' ||
            M.currentrootid === 'public-links' ||
            M.currentrootid === 'file-requests'
        ) {
            target = M.currentrootid + '/' + target;
        }
        else if (M.dyh) {
            target = M.dyh('folder-id', target);
        }
        $('.js-lpbtn').removeClass('active');
        M.openFolder(target);
    });

    $(c + '.verify-credential').rebind('click', () => fingerprintDialog(M.d[$.selected[0]].su));

    $(`${c}.open-gallery`).rebind('click', () => {
        var target = $.selected[0];
        M.openFolder(`discovery/${target}`);
    });

    $(`${c}.open-cloud-item, ${c}.open-in-location, ${c}.open-s4-item`)
        .rebind('click.openItem', () => {

        const node = M.d[$.selected[0]];

        // Incoming Shares section if shared folder doestn't have parent
        const target = node.su && (!node.p || !M.d[node.p]) ? 'shares' : node.p;

        if (mega.gallery.sections[M.currentdirid]) {
            M.fmTabState.gallery.prev = M.currentdirid;
        }

        M.openFolder(target).then(() => {
            selectionManager.add_to_selection(node.h, true);
        });
    });

    $(`${c}.hide-backup`).rebind('click.hBckp', () => {

        mega.backupCenter.hideDevice();
    });

    $(`${c}.get-more-quota`).rebind('click.getQuota', () => {

        loadSubPage('pro');
    });

    $(`${c}.new-backup`).rebind('click.nBckp', () => {

        mega.backupCenter.addNewBackup();
    });

    $(`${c}.view-in-bc-item`).rebind('click.openBC', () => {

        mega.backupCenter.showFolder($.selected[0]);
    });

    $(`${c}.move-backup-item`).rebind('click.moveBckp', () => {

        if (!$.selected.length || !mega.backupCenter.selectedSync
            || mega.backupCenter.selectedSync.nodeHandle !== $.selected[0]) {

            return false;
        }

        selectFolderDialog('move')
            .then((target) => {
                if (target) {
                    loadingDialog.pshow();
                    return mega.backupCenter.stopSync(undefined, mega.backupCenter.selectedSync.nodeHandle, target);
                }
            })
            .catch(tell)
            .finally(() => {
                loadingDialog.phide();
            });
    });

    $(`${c}.remove-backup-item`).rebind('click.removeBckp', () => {

        if (!$.selected.length || !mega.backupCenter.selectedSync
            || mega.backupCenter.selectedSync.nodeHandle !== $.selected[0]) {

            return false;
        }

        msgDialog(
            'remove',
            l[882],
            l[13751],
            l[1007],
            (e) => {

                if (e) {

                    loadingDialog.pshow();

                    mega.backupCenter.stopSync(
                        undefined, mega.backupCenter.selectedSync.nodeHandle
                    )
                        .then(nop)
                        .catch((ex) => {
                            msgDialog('warninga', l[135], l[47], ex);
                        })
                        .finally(() => {

                            loadingDialog.phide();
                        });
                }
            }
        );
    });

    $(`${c}.stopbackup-item`).rebind('click.stopBckp', () => {

        mega.backupCenter.showStopBackupDialog();
    });

    $(`${c}.stopsync-item`).rebind('click.stopSync', () => {

        mega.backupCenter.showStopConfirmationDialog();
    });

    $(c + '.preview-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        closeDialog();
        slideshow($.selected[0]);
    });

    $(c + '.play-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        var n = $.selected[0];

        closeDialog();

        $.autoplay = n;
        slideshow(n);
    });

    $(c + '.clearbin-item').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }
        doClearbin(true);
    });

    $(c + '.transfer-play, ' + c + '.transfer-pause').rebind('click', function() {
        var $trs = $('.transfer-table tr.ui-selected');

        if ($(this).hasClass('transfer-play')) {
            if ($trs.filter('.transfer-upload').length && ulmanager.ulOverStorageQuota) {
                ulmanager.ulShowOverStorageQuotaDialog();
                return;
            }

            if (dlmanager.isOverQuota) {
                dlmanager.showOverQuotaDialog();
                return;
            }
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
        tfsheadupdate({c: toabort});
        mega.tpw.removeRow(toabort);

        onIdle(function() {
            // XXX: better way to stretch the scrollbar?
            $(window).trigger('resize');
        });
        $('.transfer-table tr.ui-selected').removeClass('ui-selected');
    });

    $(`${c}.new-bucket-item`)
        .rebind('click.createBucket', () => s4.ui.showDialog(s4.buckets.dialogs.create));

    $(`${c}.settings-item`)
        .rebind('click.showSettings', () => s4.ui.showDialog(s4.buckets.dialogs.settings, M.d[$.selected[0]]));

    $(`${c}.managepuburl-item`)
        .rebind('click.managePA', () => s4.ui.showDialog(s4.objects.dialogs.access, M.d[$.selected[0]]));

    if (window.pfcol) {
        $(`${c}.play-slideshow, ${c}.preview-item, ${c}.play-item`).rebind('click', function() {
            if (M.isInvalidUserStatus()) {
                return;
            }

            closeDialog();
            mega.gallery.playSlideshow(
                mega.gallery.getAlbumIdFromPath(),
                this.classList.contains('play-slideshow'),
                this.classList.contains('play-item')
            );
        });
    }

    if (mega.keyMgr.version) {

        queueMicrotask(() => {

            this.fireKeyMgrDependantActions().catch(dump);
        });
    }
};

FileManager.prototype.fireKeyMgrDependantActions = async function() {
    'use strict';

    if (sessionStorage.folderLinkImport || ($.onImportCopyNodes && !$.onImportCopyNodes.opSize)) {

        await M.importFolderLinkNodes(false);
    }
};

FileManager.prototype.createFolderUI = function() {
    "use strict";

    const $inputWrapper = $('.fm-dialog-body', '.create-new-folder.popup');
    const ltWSpaceWarning = new InputFloatWarning($inputWrapper);

    var doCreateFolder = function() {

        // Log that Create button clicked within the Create folder dialog
        eventlog(500008);

        var $input = $('input', $inputWrapper);
        var name = $input.val();
        var errorMsg = '';

        if (name.trim() === '') { // Check if enter a folder name
            errorMsg = l.EmptyName;
        }
        else if (!M.isSafeName(name)) { // Check if folder name is valid
            errorMsg = name.length > 250 ? l.LongName : l[24708];
        }
        else if (duplicated(name)) { // Check if folder name already exists
            errorMsg = l[23219];
        }

        if (errorMsg) {
            $('.duplicated-input-warning span', $inputWrapper).text(errorMsg);
            $inputWrapper.addClass('duplicate');

            setTimeout(() => {
                $inputWrapper.removeClass('duplicate');
                $input.removeClass('error');
                $input.trigger("focus");
            }, 2000);

            return;
        }

        $input.val('');
        $('.fm-new-folder').removeClass('active');
        $('.create-new-folder').addClass('hidden');

        mLoadingSpinner.show('create-folder');
        var currentdirid = M.currentCustomView.nodeID || M.currentdirid;

        M.createFolder(currentdirid, name)
            .then((h) => {
                const ok = typeof h === 'string' && h.length === 8;

                if (d) {
                    console.log('Created new folder %s->%s.', currentdirid, h);
                    console.assert(ok, `Invalid createFolder result ${h}`, h);
                }
                if (ok) {
                    // @todo the previously created folder is leaved selected, FIXME
                    $.selected = [h];
                    reselect(1);
                }
            })
            .catch(tell)
            .finally(() => {
                mLoadingSpinner.hide('create-folder');
            });

        return false;
    };

    $('.fm-new-folder').rebind('click', function(e) {

        if (M.isInvalidUserStatus()) {
            return;
        }

        ltWSpaceWarning.hide();

        // Log that top menu Create folder clicked
        eventlog(500007);

        var $me = $(this);
        var $nFolderDialog = $('.create-new-folder', 'body').removeClass('filled-input');

        var $nameInput = $('input', $nFolderDialog).val('');

        if ($me.hasClass('active')) {
            $me.removeClass('active filled-input');
            $nFolderDialog.addClass('hidden');
        }
        else {
            $me.addClass('active');
            $nFolderDialog.removeClass('hidden');
            topPopupAlign(this, '.dropdown.create-new-folder');
            $nameInput.focus();
        }
        $.hideContextMenu();
        return false;
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
        ltWSpaceWarning.check({type: 1});
        $('.create-new-folder').addClass('filled-input');
        if ($(this).val() === '') {
            $('.create-new-folder').removeClass('filled-input');
        }
        if (e.which === 13) {
            doCreateFolder();
        }
    });

    $('.create-new-folder input').rebind('focus.create-new-f', function() {
        if ($(this).val() === l[157]) {
            $(this).val('');
        }
        $(this).removeAttr('placeholder');
        $('.create-new-folder').addClass('focused');
    });

    $('.create-new-folder input').rebind('blur.create-new-f', function() {
        $('.create-new-folder').removeClass('focused');
        $(this).attr('placeholder', l[157]);
    });

    $('.fm-new-shared-folder').rebind('click', function() {
        if (u_type === 0) {
            ephemeralDialog(l[997]);
        }
        else {
            openNewSharedFolderDialog().catch(dump);
        }
    });

    $('.fm-new-link').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }

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
FileManager.prototype.initFileAndFolderSelectDialog = function(type, OnSelectCallback) {
    'use strict';
    /* eslint-enable id-length */
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
    var doClose = function(noClearSelected) {
        ReactDOM.unmountComponentAtNode(dialogPlacer);
        constructor.domNode.remove();
        dialogPlacer.remove();
        if (!noClearSelected) {
            selected = [];
        }
        closeDialog();
    };

    var options = {
        'create-new-link': {
            title: l[20667],
            classes: 'no-incoming', // Hide incoming share tab
            selectLabel: l[1523],
            folderSelectable: true, // Can select folder(s)
            onAttach: function() {
                doClose(true);
                $.selected = selected;
                M.getLinkAction();
            }
        },
        'openFile': {
            title: l[22666],
            classes: 'no-incoming', // Hide incoming share tab
            selectLabel: l[865],
            folderSelectNotAllowed: true,
            folderSelectable: false, // Can select folder(s)
            customFilterFn: function(node) {
                if (node.t) {
                    return true;
                }
                if (node.s >= 20971520) {
                    return false;
                }

                if (is_text(node)) {
                    return true;
                }
                return false;
            },
            onAttach: function() {
                doClose(true);
                $.selected = selected;
                if (OnSelectCallback) {
                    OnSelectCallback(selected);
                }
            }
        }
    };

    var prop = {
        title: options[type].title,
        folderSelectable: options[type].folderSelectable,
        selectLabel: options[type].selectLabel,
        className: options[type].classes,
        onClose: function() {
            doClose();
        },
        onSelected: function(node) {
            selected = node;
        },
        onAttachClicked: options[type].onAttach,
    };
    if (options[type].folderSelectNotAllowed) {
        prop.folderSelectNotAllowed = options[type].folderSelectNotAllowed;
    }
    if (options[type].customFilterFn) {
        prop.customFilterFn = options[type].customFilterFn;
    }

    var dialog = React.createElement(CloudBrowserModalDialogUI.CloudBrowserDialog, prop);

    constructor = ReactDOM.render(dialog, dialogPlacer);
};

FileManager.prototype.initNewChatlinkDialog = function() {
    'use strict';

    // If chat is not ready.
    if (!megaChatIsReady) {
        if (megaChatIsDisabled) {
            console.error('Mega Chat is disabled, cannot proceed');
        }
        else {
            // Waiting for chat_initialized broadcaster.
            loadingDialog.show();
            mBroadcaster.once('chat_initialized', this.initNewChatlinkDialog.bind(this));
        }
        return false;
    }

    loadingDialog.hide();

    var dialogPlacer = document.createElement('div');

    var dialog = React.createElement(StartGroupChatDialogUI.StartGroupChatWizard, {
        name: "start-group-chat",
        flowType: 2,
        onClose: function() {
            ReactDOM.unmountComponentAtNode(dialogPlacer);
            dialogPlacer.remove();
            closeDialog();
        }
    });

    ReactDOM.render(dialog, dialogPlacer);
};

FileManager.prototype.initUIKeyEvents = function() {
    "use strict";

    $(window).rebind('keydown.uikeyevents', function(e) {
        if ((M.chat && !$.dialog) || M.isAlbumsPage()) {
            return true;
        }

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
        var is_selection_manager_available = !!window.selectionManager;

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


        if (!is_fm() && page !== 'login' && page.substr(0, 3) !== 'pro') {
            return true;
        }

        /**
         * Because of te .unbind, this can only be here... it would be better if its moved to iconUI(), but maybe some
         * other day :)
         */
        if (
            page === 'fm/recents' &&
            !slideshowid &&
            !$.dialog
        ) {
            // left or right
            if (e.keyCode === 37 || e.keyCode === 39) {
                M.recentsRender.keySelectPrevNext(e.keyCode === 39 | 0 || -1, e.shiftKey);
            }
            // up or down
            else if (e.keyCode === 38 || e.keyCode === 40) {
                M.recentsRender.keySelectUpDown(e.keyCode === 40 | 0 || -1, e.shiftKey);
            }

            return;
        }
        else if (
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
            String($.selectddUIgrid).indexOf('.grid-scrolling-table') > -1 &&
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
            String($.selectddUIgrid).indexOf('.grid-scrolling-table') > -1 &&
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
            (M.getNodeRights(M.currentdirid) > 1 || M.currentCustomView) &&
            !M.isGalleryPage() &&
            M.currentrootid !== M.InboxID &&
            M.currentdirid !== 'devices'
        ) {
            const nodes = s.filter(h => !M.d[h] || M.getNodeRoot(M.d[h].h) !== M.InboxID);
            if (M.isInvalidUserStatus() || $.msgDialog === 'remove') {
                return;
            }

            if (nodes.length) {
                // delete
                fmremove(nodes);
            }
        }
        else if ((e.keyCode === 46) && (selPanel.length > 0)
            && !$.dialog && M.getNodeRights(M.currentdirid) > 1) {
            msgDialog('confirmation', l[1003], mega.icu.format(l[17092], s.length), false, (e) => {

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
            $.selected = s.filter(h => !M.getNodeShare(h).down);

            if ($.selected && $.selected.length > 0) {
                var n = M.d[$.selected[0]];

                if (M.getNodeRoot(n.h) === M.RubbishID) {
                    propertiesDialog();
                }
                else if (n && n.t) {
                    M.openFolder(n.h);
                }
                else if ($.selected.length < 2 && (is_image2(n) || is_video(n))) {
                    const $elm = mega.gallery.sections[M.currentdirid]
                        ? $(`#${n.h}.data-block-view`, '#gallery-view')
                        : $('.dropdown-item.play-item');

                    if ($elm.length) {
                        $elm.trigger('click').trigger('dblclick');
                    }
                    else {
                        slideshow($.selected[0]);
                    }
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
        else if ((e.keyCode === 13) && ($.dialog === 'rename')) {
            $('.rename-dialog-button.rename').trigger('click');
        }
        else if (e.keyCode === 27 && $.dialog && ($.msgDialog === 'confirmation')) {
            return false;
        }
        // If the Esc key is pressed while the payment address dialog is visible, close it
        else if ((e.keyCode === 27) && !$('.payment-address-dialog').hasClass('hidden')) {
            addressDialog.closeDialog();
        }
        else if (e.keyCode === 27 && ($.copyDialog || $.moveDialog || $.selectFolderDialog
            || $.copyrightsDialog || $.saveAsDialog)) {
            closeDialog();
        }
        else if (e.keyCode == 27 && $.topMenu) {
            topMenu(1);
        }
        else if (e.keyCode == 27 && $.dialog) {
            if ($.dialog === 'share-add' || $.dialog === 'share' || $.dialog === 'meetings-schedule-dialog') {
                return false;
            }
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
                $.warningCallback = null;
            }
        }
        else if (e.keyCode === 13 && ($.msgDialog === 'confirmation' || $.msgDialog === 'remove' ||
            (($.msgDialog === 'warninga' || $.msgDialog === 'warningb' || $.msgDialog === 'info' ||
            $.msgDialog === 'error') && $('#msgDialog .mega-button').length === 1))) {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
                $.warningCallback = null;
            }
        }
        else if (
            !is_transfers_or_accounts &&
            (e.keyCode === 113 /* F2 */) &&
            (s.length > 0) &&
            !$.dialog && M.getNodeRights(M.d[s[0]] && M.d[s[0]].h) > 1 &&
            M.currentrootid !== M.InboxID &&
            M.currentdirid !== 'devices' && M.getNodeRoot(M.d[s[0]].h) !== M.InboxID
        ) {
            renameDialog();
        }
        else if (
            is_selection_manager_available &&
            e.keyCode == 65 &&
            e.ctrlKey &&
            !$.dialog &&
            !M.isGalleryPage()
        ) {
            if (is_transfers_or_accounts) {
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

        if (sl && String($.selectddUIgrid).indexOf('.grid-scrolling-table') > -1) {
            // if something is selected, scroll to that item
            const $scrollBlock = sl.closest('.ps');
            if (M.megaRender && M.megaRender.megaList && M.megaRender.megaList._wasRendered) {
                M.megaRender.megaList.scrollToItem(sl.data('id'));
            }
            else if ($scrollBlock.length) {
                scrollToElement($scrollBlock, sl);
            }
        }

        M.renderSearchBreadcrumbs();
    });
};

FileManager.prototype.addTransferPanelUI = function() {
    "use strict";

    var transferPanelContextMenu = function(target) {
        var file;
        var tclear;

        // Please be aware that menu items are all hyperlink elements with the dropdown-item classname.
        // Here only hide all menu items and display correct ones,
        // which should not include any ones under submenu with the span tag.
        var $menuitems = $('.dropdown.body.files-menu a.dropdown-item');
        $menuitems.addClass('hidden');

        $menuitems.filter('.transfer-pause,.transfer-play,.move-up,.move-down,.transfer-clear').removeClass('hidden');

        tclear = $menuitems.filter('.transfer-clear').contents('span').get(0) || {};
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
                $menuitems.addClass('hidden')
                    .filter('.transfer-clear').removeClass('hidden');
                tclear.textContent = l[7218];
            }
            else {
                if (started) {
                    $menuitems.filter('.move-up,.move-down').addClass('hidden');
                }
                if (paused === ids.length) {
                    $menuitems.filter('.transfer-pause').addClass('hidden');
                }

                var prev = target.first().prev();
                var next = target.last().next();

                if (prev.length === 0 || !prev.hasClass('transfer-queued')) {
                    $menuitems.filter('.move-up').addClass('hidden');
                }
                if (next.length === 0) {
                    $menuitems.filter('.move-down').addClass('hidden');
                }
            }
        }
        else if (!(file = GlobalProgress[$(target).attr('id')])) {
            /* no file, it is a finished operation */
            $menuitems.addClass('hidden')
                .filter('.transfer-clear').removeClass('hidden');
            tclear.textContent = l[7218];
        }
        else {
            if (file.started) {
                $menuitems.filter('.move-up,.move-down').addClass('hidden');
            }
            if (file.paused) {
                $menuitems.filter('.transfer-pause').addClass('hidden');
            }
            else {
                $menuitems.filter('.transfer-play').addClass('hidden');
            }

            if (!target.prev().length || !target.prev().hasClass('transfer-queued')) {
                $menuitems.filter('.move-up').addClass('hidden');
            }
            if (target.next().length === 0) {
                $menuitems.filter('.move-down').addClass('hidden');
            }
        }

        // XXX: Hide context-menu's menu-up/down items for now to check if that's the
        // origin of some problems, users can still use the new d&d logic to move transfers
        $menuitems.filter('.move-up,.move-down').addClass('hidden');

        var parent = $menuitems.parent();
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
        var domScrollingTable = tfse.domScrollingTable;
        var domTable = tfse.domTable;
        tfse = undefined;

        // Show/Hide header if there is no items in transfer list
        if (domTable.querySelector('tr')) {
            domTableEmptyTxt.classList.add('hidden');
            domScrollingTable.style.display = '';
        }
        else {
            domTableEmptyTxt.classList.remove('hidden');
            domScrollingTable.style.display = 'none';
        }

        $(domScrollingTable).rebind('click.tst contextmenu.tst', function(e) {
            if (!$(e.target).closest('.transfer-table').length) {
                $('.ui-selected', domTable).removeClass('ui-selected');
            }
        });

        var $tmp = $('.grid-url-arrow, .clear-transfer-icon, .link-transfer-status', domTable);
        $tmp.rebind('click', function(e) {
            var target = $(this).closest('tr');
            e.preventDefault();
            e.stopPropagation(); // do not treat it as a regular click on the file
            $('tr', domTable).removeClass('ui-selected');

            if ($(this).hasClass('link-transfer-status')) {

                var $trs = $(this).closest('tr');

                if ($(this).hasClass('transfer-play')) {
                    if ($trs.filter('.transfer-upload').length && ulmanager.ulOverStorageQuota) {
                        ulmanager.ulShowOverStorageQuotaDialog();
                        return;
                    }

                    if (dlmanager.isOverQuota) {
                        dlmanager.showOverQuotaDialog();
                        return;
                    }
                }

                var ids = $trs.attrs('id');

                if ($(this).hasClass('transfer-play')) {
                    ids.map(fm_tfsresume);
                }
                else {
                    ids.filter(id => !String(id).startsWith('LOCKed_')).map(fm_tfspause);
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
                    tfsheadupdate({c: target.attr('id')});
                    mega.tpw.removeRow(target.attr('id'));
                    $.clearTransferPanel();
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
                $.hideContextMenu();
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
            var domScrollingTable = M.getTransferElements().domScrollingTable;
            if (!domScrollingTable.classList.contains('ps')) {
                Ps.initialize(domScrollingTable);
            }
            fm_tfsupdate(); // this will call $.transferHeader();
        }
    };

    $.clearTransferPanel = function() {
        var obj = M.getTransferElements();
        if (obj.domTable && !obj.domTable.querySelector('tr')) {
            $('.transfer-clear-all-icon').addClass('disabled');
            $('.transfer-pause-icon').addClass('disabled');
            $('.transfer-clear-completed').addClass('disabled');
            obj.domTableEmptyTxt.classList.remove('hidden');
            obj.domUploadBlock.classList.add('hidden');
            obj.domDownloadBlock.classList.add('hidden');
            obj.domUploadBlock.classList.remove('overquota', 'error');
            obj.domDownloadBlock.classList.remove('overquota', 'error');
            obj.domUploadProgressText.textContent = l[1418];
            obj.domDownloadProgressText.textContent = l[1418];
            $('.nw-fm-left-icon.transfers').removeClass('transfering').find('p').removeAttr('style');
        }

        if (M.currentdirid === 'transfers') {
            fm_tfsupdate();
            $.tresizer();
        }
    };

    $.removeTransferItems = function($trs) {
        var type = null;
        if (!$trs) {
            $trs = $('.transfer-table tr.transfer-completed');
            type = mega.tpw.DONE;
        }
        var $len = $trs.length;
        const ids = [];
        for (let i = 0; i < $trs.length; i++) {
            ids.push($trs.eq(i).prop('id'));
        }
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
        tfsheadupdate({c: ids});
        mega.tpw.clearRows(type);
    };
    bindTransfersMassEvents('.fm-transfers-header');

    $('.transfer-clear-completed').rebind('click', function() {
        if (!$(this).hasClass('disabled')) {
            $.removeTransferItems();
        }
    });
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

    if (this.chat) {
        return;
    }
    if (d) {
        console.time('iconUI');
    }

    // #file-request change column title for public link page
    let dateLabel = l[17445];
    switch (page) {
        case 'fm/public-links':
            dateLabel = l[20694];
            break;
        case 'fm/file-requests':
            dateLabel = l.file_request_page_label_request_created;
            break;
    }

    if (dateLabel) {
        $('.files-menu.context .dropdown-item.sort-timeAd span').safeHTML(dateLabel);
    }

    $('.fm-files-view-icon').removeClass('active').filter('.block-view').addClass('active');
    $('.shared-grid-view').addClass('hidden');
    $('.out-shared-grid-view').addClass('hidden');
    $('.files-grid-view.fm').addClass('hidden');
    $('.fm-blocks-view.fm').addClass('hidden');

    if (this.currentdirid === 'shares') {
        $('.shared-blocks-view').removeClass('hidden');
        initPerfectScrollbar($('.shared-blocks-scrolling', '.shared-blocks-view'));
    }
    else if (this.currentdirid === 'out-shares') {
        $('.out-shared-blocks-view').removeClass('hidden');
        initPerfectScrollbar($('.out-shared-blocks-scrolling', '.out-shared-blocks-view'));
    }
    else if (this.currentrootid === 'shares' && !this.v.length) {
        const viewModeClass = (M.viewmode ? '.fm-blocks-view' : '.files-grid-view') + '.fm.shared-folder-content';

        $(viewModeClass).removeClass('hidden');
        initPerfectScrollbar($(viewModeClass));
    }
    // user management ui update is handled in Business Account classes.
    else if (this.v.length && !M.isGalleryPage()) {

        $('.fm-blocks-view.fm', '.fmholder')
            .removeClass('hidden out-shares-view public-links-view file-requests-view s4-view');

        if (this.currentCustomView) {
            $('.fm-blocks-view.fm', '.fmholder').addClass(`${this.currentCustomView.type}-view`);
        }

        if (!aQuiet) {
            initPerfectScrollbar($('.file-block-scrolling', '.fm-blocks-view.fm'));
        }
    }

    $('.fm-blocks-view, .fm-empty-cloud, .fm-empty-folder,' +
        '.shared-blocks-view, .out-shared-blocks-view, .fm-empty-s4-bucket')
        .rebind('contextmenu.fm', function(e) {
            // Remove context menu option from filtered view and media discovery view
            if (page === "fm/links" || M.gallery) {
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

    $('.files-menu.context .submenu.sorting .dropdown-item.sort-grid-item').rebind('click', function(e) {
        var sortType;
        var $me = $(this);

        if ($me.hasClass('sort-size')) {
            sortType = 'size';
        }
        else if ($me.hasClass('sort-name')) {
            sortType = 'name';
        }
        else if ($me.hasClass('sort-label')) {
            sortType = 'label';
        }
        else if ($me.hasClass('sort-type')) {
            sortType = 'type';
        }
        else if ($me.hasClass('sort-timeAd')) {
            sortType = 'ts';
        }
        else if ($me.hasClass('sort-timeMd')) {
            sortType = 'mtime';
        }
        else if ($me.hasClass('sort-fav')) {
            sortType = 'fav';
        }
        else if ($me.hasClass('sort-owner')) {
            sortType = 'owner';
        }
        else if ($me.hasClass('sort-access')) {
            sortType = 'access';
        }
        else if ($me.hasClass('sort-sharedwith')) {
            sortType = 'sharedwith';
        }
        else if ($me.hasClass('sort-sharecreated')) {
            sortType = 'date';
        }
        else if ($me.hasClass('sort-versions')) {
            sortType = 'versions';
        }
        else if ($me.hasClass('sort-playtime')) {
            sortType = 'playtime';
        }

        var classToAdd = 'selected';
        var iconClassToAdd = 'icon-up';
        var sortDir = 1;

        if ($me.hasClass('selected') && !$me.hasClass('inverted') ) {
            classToAdd += ' inverted';
            iconClassToAdd = 'icon-down';
            sortDir = -1;
        }

        $('.files-menu.context .submenu.sorting .dropdown-item.sort-grid-item').removeClass('selected inverted');
        $('i.sprite-fm-mono', $me).removeClass('icon-up icon-down').addClass(iconClassToAdd);
        $me.addClass(classToAdd);

        M.doSort(sortType, sortDir);
        M.renderMain();
    });

    if (this.currentdirid === 'shares') {
        $.selectddUIgrid = '.shared-blocks-scrolling';
        $.selectddUIitem = 'a';
    }
    else if (this.currentdirid === 'out-shares') {
        $.selectddUIgrid = '.out-shared-blocks-scrolling';
        $.selectddUIitem = 'a';
    }
    else if (M.isGalleryPage()) {
        $.selectddUIgrid = '.gallery-view';
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

    if (this.chat || this.gallery) {
        return;
    }
    if (d) {
        console.time('gridUI');
    }

    // Change title for Public link page
    let dateLabel = l[17445];
    switch (page) {
        case 'fm/public-links':
            dateLabel = l[20694];
            break;
        case 'fm/file-requests':
            dateLabel = l.file_request_page_label_request_created;
            break;
    }

    if (dateLabel) {
        $('.fm .grid-table thead .ts').text(dateLabel);
        $('.fm .grid-table thead .date').text(dateLabel);
        $('.dropdown.body.files-menu .dropdown-item.visible-col-select[megatype="timeAd"] span').text(dateLabel);
    }

    // $.gridDragging=false;
    $.gridLastSelected = false;
    $('.fm-files-view-icon').removeClass('active').filter('.listing-view').addClass('active');

    $.gridHeader = function() {
        if (folderlink) {
            M.columnsWidth.cloud.versions.viewed = false;
            M.columnsWidth.cloud.versions.disabled = true;
            M.columnsWidth.cloud.fav.viewed = false;
            M.columnsWidth.cloud.fav.disabled = true;
            M.columnsWidth.cloud.label.viewed = false;
            M.columnsWidth.cloud.label.disabled = true;
            M.columnsWidth.cloud.accessCtrl.viewed = false;
            M.columnsWidth.cloud.accessCtrl.disabled = true;
        }
        else {
            if (M.columnsWidth.cloud.fav.disabled) {
                // came from folder-link
                M.columnsWidth.cloud.fav.viewed = true;
            }
            M.columnsWidth.cloud.versions.disabled = false;
            M.columnsWidth.cloud.fav.disabled = false;
            M.columnsWidth.cloud.label.disabled = false;
            M.columnsWidth.cloud.type.disabled = false;

            // if we have FM configuration
            var storedColumnsPreferences = mega.config.get('fmColPrefs');
            if (storedColumnsPreferences !== undefined) {
                var prefs = getFMColPrefs(storedColumnsPreferences);
                const cgMenu = new Set(['fav', 'fname', 'size', 'type', 'timeAd', 'extras', 'accessCtrl', 'playtime']);
                for (var colPref in prefs) {
                    if (Object.prototype.hasOwnProperty.call(prefs, colPref)) {
                        M.columnsWidth.cloud[colPref].viewed =
                            prefs[colPref] > 0;
                    }
                    if (cgMenu.has(colPref)) {
                        M.columnsWidth.cloud[colPref].disabled = false;
                    }
                }
            }
            else {
                // restore default columns (to show/hide columns)
                const defaultColumnShow = new Set(['fav', 'fname', 'size', 'type', 'timeAd', 'extras', 'accessCtrl']);
                const defaultColumnHidden = new Set(['label', 'timeMd', 'versions', 'playtime', 'fileLoc']);
                for (const col in M.columnsWidth.cloud) {
                    if (defaultColumnShow.has(col)) {
                        M.columnsWidth.cloud[col].viewed = true;
                        M.columnsWidth.cloud[col].disabled = false;
                    }
                    else if (defaultColumnHidden.has(col)) {
                        M.columnsWidth.cloud[col].viewed = false;
                        if (col === 'playtime') {
                            M.columnsWidth.cloud[col].disabled = false;
                        }
                    }
                }
            }

            if (String(M.currentdirid).startsWith('search')) {
                // modified column to show for /search (Added link location dir)
                const searchCol = new Set(['fav', 'fname', 'size', 'timeMd', 'fileLoc', 'extras']);
                for (const col in M.columnsWidth.cloud) {
                    if (searchCol.has(col)) {
                        M.columnsWidth.cloud[col].viewed = true;
                        M.columnsWidth.cloud[col].disabled = false;
                    }
                    else {
                        M.columnsWidth.cloud[col].viewed = false;
                        M.columnsWidth.cloud[col].disabled = true;
                    }
                }
            }

            if (
                M.currentrootid === M.RubbishID
                || M.currentrootid === 'shares'
            ) {
                M.columnsWidth.cloud.fav.disabled = true;
                M.columnsWidth.cloud.fav.viewed = false;
            }

            if (M.currentrootid === 's4' && M.d[M.currentdirid.split('/').pop()]) {
                M.columnsWidth.cloud.accessCtrl.viewed = true;
                M.columnsWidth.cloud.accessCtrl.disabled = false;
            }
            else {
                M.columnsWidth.cloud.accessCtrl.viewed = false;
                M.columnsWidth.cloud.accessCtrl.disabled = true;
            }
        }

        if (M && M.columnsWidth && M.columnsWidth.cloud) {

            M.columnsWidth.updateColumnStyle();

            if (M.megaRender && M.megaRender.megaList) {
                if (!M.megaRender.megaList._scrollIsInitialized) {
                    M.megaRender.megaList.resized();
                }
                else {
                    M.megaRender.megaList.scrollUpdate();
                }
            }
        }
    };

    $('.fm-blocks-view.fm').addClass('hidden');
    $('.fm-chat-block').addClass('hidden');
    $('.shared-blocks-view').addClass('hidden');
    $('.shared-grid-view').addClass('hidden');
    $('.out-shared-blocks-view').addClass('hidden');
    $('.out-shared-grid-view').addClass('hidden');
    $('.files-grid-view.fm').addClass('hidden');

    if (this.currentdirid === 'shares') {
        $('.shared-grid-view').removeClass('hidden');
        initPerfectScrollbar($('.grid-scrolling-table', '.shared-grid-view'));
    }
    else if (this.currentdirid === 'out-shares') {
        $('.out-shared-grid-view').removeClass('hidden');
        initPerfectScrollbar($('.grid-scrolling-table', '.out-shared-grid-view'));
    }
    else if (this.currentrootid === 'shares' && !this.v.length) {
        const viewModeClass = (M.viewmode ? '.fm-blocks-view' : '.files-grid-view') + '.fm.shared-folder-content';

        $(viewModeClass).removeClass('hidden');
        initPerfectScrollbar($(viewModeClass, '.shared-details-block'));
    }
    else if (this.v.length) {
        $('.files-grid-view.fm', '.fmholder').removeClass('hidden');
        $('.files-grid-view.fm', '.fmholder')
            .removeClass('out-shares-view public-links-view file-requests-view');

        if (this.currentCustomView) {
            if (M.isGalleryPage() || M.isAlbumsPage()) {
                $('.files-grid-view.fm', '.fmholder').addClass('hidden');
            }
            else {
                $('.files-grid-view.fm', '.fmholder')
                    .addClass(`${this.currentCustomView.type}-view`);
            }
        }
        else {
            $('.files-grid-view.fm', '.fmholder')
                .removeClass('out-shares-view public-links-view s4-view');
        }

        $.gridHeader();

        // if there is any node that already rendered before getting correct value, update with resize handler.
        fm_resize_handler();
    }

    $('.grid-url-arrow').show();
    $('.grid-url-header').text('');

    $('.files-grid-view.fm .grid-scrolling-table,.files-grid-view.fm .file-block-scrolling,.fm-empty-cloud,' +
        '.fm-empty-folder,.fm.shared-folder-content, .fm-empty-s4-bucket').rebind('contextmenu.fm', e => {
        // Remove context menu option from filtered view and media discovery view
        if (page === "fm/links" && page === "fm/faves" || M.gallery) {
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
    $('.grid-table.shared-with-me tr td:first-child').add('.grid-table.out-shares tr td:first-child')
        .add('.grid-table.fm tr td:nth-child(2)').rebind('click', function() {
            $.hideContextMenu();
            if (M.isInvalidUserStatus()) {
                return;
            }
            var id = $(this).parent().attr('id');
            var newFavState = Number(!M.isFavourite(id));

            // Handling favourites is allowed for full permissions shares only
            if (M.getNodeRights(id) > 1) {
                M.favourite(id, newFavState);
                return false;
            }
        });

    $('.grid-table .arrow').rebind('click', function(e) {
        // this grid-table is used in the chat - in Archived chats. It won't work there, so - skip doing anything.
        if (M.chat) {
            return;
        }
        var cls = $(this).attr('class');
        var dir = 1;

        // Excludes colour sorting dialog for contacts
        if (cls.includes('name') && !pfid) {
            return M.labelSortMenuUI(e);
        }
        else {
            M.resetLabelSortMenuUI();

            if (cls && cls.indexOf('desc') > -1) {
                dir = -1;
            }
            for (var sortBy in M.sortRules) {
                if (cls.indexOf(sortBy) !== -1) {

                    var dateColumns = ['ts', 'mtime', 'date'];

                    if (dir !== -1 && dateColumns.indexOf(sortBy) !== -1) {
                        if (cls.indexOf('asc') === -1) {
                            dir = -1;
                        }
                    }

                    M.doSort(sortBy, dir);
                    M.renderMain();

                    break;
                }
            }
        }
    });

    var showColumnsContextMenu = function(e) {
        var notAllowedTabs = ['shares', 'out-shares'];
        if (notAllowedTabs.indexOf(M.currentdirid) !== -1) {
            return false;
        }
        M.contextMenuUI(e, 7);
        return false;
    };

    $('.grid-table th').rebind('contextmenu', e => showColumnsContextMenu(e));

    $('.column-settings.overlap').rebind('click',
        function(e) {
            var $me = $(this);
            if ($me.hasClass('c-opened')) {
                $.hideContextMenu();
                return false;
            }
            showColumnsContextMenu(e);
            $me.addClass('c-opened');
            return false;
        });

    $('.files-menu.context .dropdown-item.visible-col-select').rebind('click', function(e) {
        var $me = $(this);
        if ($me.hasClass('notactive')) {
            return false;
        }

        var targetCol = $me.attr('megatype');

        if ($me.attr('isviewed')) {
            $me.removeAttr('isviewed');
            $('i', $me).removeClass('icon-check').addClass('icon-add');
            M.columnsWidth.cloud[targetCol].viewed = false;
        }
        else {
            $me.attr('isviewed', 'y');
            $('i', $me).removeClass('icon-add').addClass('icon-check');
            M.columnsWidth.cloud[targetCol].viewed = true;
        }

        M.columnsWidth.cloud.fname.lastOffsetWidth = null;
        M.columnsWidth.updateColumnStyle();

        var columnPreferences = mega.config.get('fmColPrefs');
        if (columnPreferences === undefined) {
            columnPreferences = 108; // default
        }
        var colConfigNb = getNumberColPrefs(targetCol);
        if (colConfigNb) {
            if (M.columnsWidth.cloud[targetCol].viewed) {
                columnPreferences |= colConfigNb;
            }
            else {
                columnPreferences &= ~colConfigNb;
            }
        }
        mega.config.set('fmColPrefs', columnPreferences);

        if (M.megaRender && M.megaRender.megaList) {
            if (!M.megaRender.megaList._scrollIsInitialized) {
                M.megaRender.megaList.resized();
            }
            else {
                M.megaRender.megaList.scrollUpdate();
            }
        }
        $.hideContextMenu && $.hideContextMenu();
        return false;
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
                if (c.indexOf(f) !== -1) {
                    M.doSort(f, d);
                    M.renderMain();
                    break;
                }
            }
        }
    });

    $('.grid-table .grid-file-location').rebind('click.fileLocation', (e) => {
        const h = $(e.target).closest('tr').attr('id');
        const node = M.getNodeByHandle(h);

        // Incoming Shares section if shared folder doesn't have parent
        const target = node.su && (!node.p || !M.d[node.p]) ? 'shares' : node.p;
        M.openFolder(target).then(() => {
            selectionManager.add_to_selection(node.h, true);
        });
    });

    if (this.currentdirid === 'shares') {
        $.selectddUIgrid = '.shared-grid-view .grid-scrolling-table';
    }
    else if (this.currentdirid === 'out-shares') {
        $.selectddUIgrid = '.out-shared-grid-view .grid-scrolling-table';
    }
    else if (M.isGalleryPage()) {
        $.selectddUIgrid = '.gallery-view';
    }
    else {
        $.selectddUIgrid = '.files-grid-view.fm .grid-scrolling-table';
    }

    $.selectddUIitem = 'tbody tr';
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

// Todo Enhance this or probably make this into MegaInput?
FileManager.prototype.initMegaSwitchUI = function() {

    'use strict';

    const $switches = $('.mega-switch');

    const _setHandleIcon = ($handle, on) => {

        if (on) {
            $handle.removeClass('icon-minimise-after');
            $handle.addClass('icon-check-after');
        }
        else {
            $handle.addClass('icon-minimise-after');
            $handle.removeClass('icon-check-after');
        }
    };

    $switches.attr({
        'role': 'switch',
        'aria-checked': function() {

            const on = this.classList.contains('toggle-on');
            const $handle = $('.mega-feature-switch', this).addClass('sprite-fm-mono-after');

            _setHandleIcon($handle, on);

            return on;
        },
        'tabindex': '0',
    });

    $(document).rebind('update.accessibility', '.mega-switch', e => {

        const on = e.target.classList.contains('toggle-on');

        e.target.setAttribute('aria-checked', on);

        _setHandleIcon($(e.target.querySelector('.mega-feature-switch')).addClass('sprite-fm-mono-after'), on);
    });
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

FileManager.prototype.addSelectDragDropUI = function(refresh) {
    "use strict";

    if (this.currentdirid &&
        (this.currentdirid.substr(0, 7) === 'account' || M.isGalleryPage())) {
        return false;
    }

    if (d) {
        console.time('selectddUI');
    }

    var mainSel = $.selectddUIgrid + ' ' + $.selectddUIitem;
    var dropSel = $.selectddUIgrid + ' ' + $.selectddUIitem + '.folder';

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
            if (d) {
                console.log('draggable.start');
            }
            $.hideContextMenu(e);
            $.gridDragging = true;
            $('body').addClass('dragging');
            if (!$(this).hasClass('ui-selected')) {
                selectionManager.resetTo($(this).attr('id'));
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
                            escapeHTML(n.name) + '</div>'
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
                M.onTreeUIOpen(M.currentdirid, false, true);
            }, 200);
            delete $.dragSelected;
        }
    });

    $ddUIgrid.selectable({
        filter: $.selectddUIitem,
        cancel: '.ps__rail-y, .ps__rail-x, thead',
        start: e => {
            $.hideContextMenu(e);
            $.hideTopMenu();
            $.selecting = true;
        },
        stop: () => {
            M.renderSearchBreadcrumbs();
            $.selecting = false;
        },
        appendTo: $.selectddUIgrid
    });

    // Since selectablecreate is triggered only on first creation of the selectable widget, we need to find a way
    // to notify any code (selectionManager) that it can now hook selectable events after the widget is created
    $ddUIgrid.trigger('selectablereinitialized');

    const contextMenuHandler = function(e) {
        $.hideContextMenu(e);

        if (e.shiftKey) {
            selectionManager.shift_select_to($(this).attr('id'), false, true, true);
        }
        else if (e.ctrlKey !== false || e.metaKey !== false) {
            selectionManager.add_to_selection($(this).attr('id'));
            $.gridLastSelected = this;
        }
        else {
            var id = $(this).attr('id');

            if (selectionManager.selected_list.indexOf(id) === -1) {
                selectionManager.resetTo(id);
            }
            else {
                selectionManager.add_to_selection(id);
                $.gridLastSelected = this;
            }
        }

        M.renderSearchBreadcrumbs();
        $.hideTopMenu();

        return !!M.contextMenuUI(e, 1);
    };

    if (!$ddUIgrid.hasClass('ddinit')) {

        $ddUIgrid.addClass('ddinit').rebind('click.filemanager', $.selectddUIitem, function(e, smEvent) {

            // This is triggered from Selection Manager
            if (smEvent) {
                e = smEvent;
            }

            if ($.gridDragging) {
                return false;
            }

            const $this = $(this);

            if (e.shiftKey) {
                selectionManager.shift_select_to($this.attr('id'), false, true, $.selected.length === 0);
            }
            else if (!e.ctrlKey && !e.metaKey) {

                $.gridLastSelected = this;

                selectionManager.clear_selection();
                selectionManager.add_to_selection($this.attr('id'), true);
            }
            else if ($this.hasClass("ui-selected")) {
                selectionManager.remove_from_selection($this.attr('id'), false);
            }
            else {
                $.gridLastSelected = this;
                selectionManager.add_to_selection($this.attr('id'));
            }
            M.renderSearchBreadcrumbs();
            $.hideContextMenu(e);

            if ($.hideTopMenu) {
                $.hideTopMenu();
            }

            return false;
        });

        $ddUIgrid.rebind('contextmenu.filemanager', $.selectddUIitem, contextMenuHandler);

        $ddUIgrid.rebind('mousewheel.selectAndScroll', e => {

            if ($.selecting) {

                delay('selectAndScroll', () => {

                    $ddUIgrid = $($.selectddUIgrid);

                    $ddUIgrid.selectable('refresh');
                    $ddUIgrid.selectable('triggerMouseMove', e);
                }, 50);
            }
        });
    }

    // Open folder/file in filemanager
    let tappedItemId = '';
    $ddUIitem.rebind('dblclick.openTarget touchend.tabletOpenTarget', (e) => {
        let h = $(e.currentTarget).attr('id');
        const n = M.getNodeByHandle(h);

        if (!n || M.getNodeShare(n).down) {
            // Prevent to preview any kind of taken down files
            if (n) {
                contextMenuHandler.call(e.currentTarget, e);
            }
            return false;
        }

        // Emulate dblclick on tablet devices
        if (e.type === 'touchend' && tappedItemId !== h) {

            tappedItemId = h;
            delay('ddUIitem:touchend.tot', () => {
                tappedItemId = '';
            }, 600);

            return false;
        }

        if (n.t) {
            if (e.ctrlKey) {
                $.ofShowNoFolders = true;
            }
            $('.top-context-menu').hide();
            if (
                M.currentrootid === 'out-shares' ||
                M.currentrootid === 'public-links' ||
                M.currentrootid === 'file-requests'
            ) {
                h = M.currentrootid + '/' + h;
            }
            else if (M.dyh) {
                h = M.dyh('folder-id', h);
            }
            M.openFolder(h);
        }
        else if (is_image2(n) || is_video(n)) {
            if (is_video(n)) {
                $.autoplay = h;
            }
            slideshow(h);
        }
        else if (is_text(n)) {
            $.selected = [h];
            // there's no jquery parent for this container.
            // eslint-disable-next-line local-rules/jquery-scopes
            $('.dropdown.body.context .dropdown-item.edit-file-item').trigger('click');
        }
        else if (M.getNodeRoot(n.h) === M.RubbishID) {
            propertiesDialog();
        }
        else {
            M.addDownload([h]);
        }
    });

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

FileManager.prototype.onSectionUIOpen = function(id) {
    "use strict";

    var tmpId;
    var $fmholder = $('#fmholder', 'body');
    const isAlbums = M.isAlbumsPage();

    if (d) {
        console.group('sectionUIOpen', id, folderlink);
        console.time('sectionUIOpen');
    }
    if ($.hideContextMenu) {
        $.hideContextMenu();
    }

    $('.nw-fm-left-icon', $fmholder).removeClass('active');

    if (u_type === 3 || window.is_eplusplus) {
        $('.nw-fm-left-icon.conversations', $fmholder).removeClass('hidden');
    }
    else {
        $('.nw-fm-left-icon.conversations', $fmholder).addClass('hidden');
    }

    // View or hide left icon for business account, confirmed and paid.
    if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === 1 || u_attr.b.s === 2) && u_privk) {
        $('.nw-fm-left-icon.user-management', $fmholder).removeClass('hidden');
    }
    else {
        $('.nw-fm-left-icon.user-management', $fmholder).addClass('hidden');
    }

    switch (id) {
        case 'opc':
        case 'ipc':
        case 'recents':
        case 'search':
        case 'shared-with-me':
        case 'out-shares':
        case 'public-links':
        case 'backups':
        case 'rubbish-bin':
        case 's4':
        case 'file-requests':
            tmpId = 'cloud-drive';
            break;
        case 'devices':
            tmpId = 'backup-center';
            break;
        case 'affiliate':
            tmpId = 'dashboard';
            break;
        case 'albums':
            tmpId = 'gallery';
            break;
        case 'discovery':
            tmpId = 'cloud-drive';
            break;
        default:
            if (M.isDynPage(id)) {
                const {location} = M.dynContentLoader[id].options;
                if (location) {
                    tmpId = location;
                    break;
                }
            }
            tmpId = (mega.gallery.sections[id] || isAlbums) ? 'gallery' : id;
    }

    const fmLeftIconName = String(tmpId).replace(/[^\w-]/g, '');
    let fmLeftIcons = document.getElementsByClassName('nw-fm-left-icon');

    if (fmLeftIcons[fmLeftIconName] && !fmLeftIcons[fmLeftIconName].classList.contains('active')) {
        fmLeftIcons[fmLeftIconName].classList.add('active');
    }

    let contentPanels = document.getElementsByClassName('content-panel');

    for (let i = contentPanels.length; i--;) {

        if (contentPanels[i].classList.contains(fmLeftIconName)) {

            if (!contentPanels[i].classList.contains('active')) {
                contentPanels[i].classList.add('active');
            }
        }
        else if (contentPanels[i].classList.contains('active')) {
            contentPanels[i].classList.remove('active');
        }
    }

    this.currentTreeType = M.treePanelType();

    $('.fm.fm-right-header, .fm-import-download-buttons, .gallery-tabs-bl', $fmholder).addClass('hidden');
    $('.fm-import-to-cloudrive, .fm-download-as-zip', $fmholder).off('click');

    $fmholder.removeClass('affiliate-program');
    $('.fm-main', $fmholder).removeClass('active-folder-link');
    $('.nw-fm-left-icons-panel .logo', $fmholder).addClass('hidden');
    $('.fm-products-nav', $fmholder).text('');
    $('.nw-fm-left-icon.folder-link', $fmholder).removeClass('active');

    // Prevent autofill prevent fake form to be submitted
    $('#search-fake-form-2', $fmholder).rebind('submit', function() {
        return false;
    });

    if (folderlink) {
        // XXX: isValidShareLink won't work properly when navigating from/to a folderlink
        /*if (!isValidShareLink()) {
         $('.fm-breadcrumbs.folder-link .right-arrow-bg').text('Invalid folder');
         } else*/
        if (id === 'cloud-drive' || id === 'transfers') {
            $('.nw-fm-left-icons-panel .logo', $fmholder).removeClass('hidden');
            $('.fm-main', $fmholder).addClass('active-folder-link');
            $('.fm-right-header', $fmholder).addClass('folder-link');

            var $prodNav = $('.fm-products-nav').text('');
            if (!u_type) {
                $prodNav.safeHTML(translate(pages['pagesmenu']));
                onIdle(function() {
                    clickURLs();
                    bottompage.initNavButtons($fmholder);
                });
            }

            // Remove import and download buttons from the search result.
            if (!String(M.currentdirid).startsWith('search')) {
                const $btnWrap = $('.fm-import-download-buttons', $fmholder).removeClass('hidden');

                megasync.isInstalled((err, is) => {

                    if (!err || is) {

                        $('.merge-mega-button', $btnWrap).removeClass('merge-mega-button');
                        $('.download-dropdown', $btnWrap).addClass('hidden');
                    }
                });

                $('.fm-import-to-cloudrive', $btnWrap).rebind('click', () => {
                    eventlog(pfcol ? 99831 : 99765);
                    // Import the current folder, could be the root or sub folder
                    M.importFolderLinkNodes([M.RootID]);
                });

                $('.fm-download-as-zip', $btnWrap).rebind('click', () => {

                    eventlog(pfcol ? 99954 : 99766);
                    // Download the current folder, could be the root or sub folder
                    M.addDownload([M.RootID], true);
                });

                $('.fm-megasync-download', $btnWrap).rebind('click', () => {

                    loadingDialog.show();
                    megasync.isInstalled((err, is) => {

                        loadingDialog.hide();

                        if (fmconfig.dlThroughMEGAsync && (!err || is)) {
                            $('.megasync-overlay').removeClass('downloading');
                            M.addDownload([M.RootID]);
                        }
                        else {
                            dlmanager.showMEGASyncOverlay();
                        }
                    });
                });
            }
        }
    }

    if (id !== 'conversations') {
        if (id === 'user-management') {
            $('.fm-right-header').addClass('hidden');
            $('.fm-right-header-user-management').removeClass('hidden');
            M.hideEmptyGrids();
        }
        else if (M.isGalleryPage(id) || isAlbums) {
            $('.fm-right-header').addClass('hidden');
            $('.fm-right-header-user-management').addClass('hidden');
        }
        else {
            $('.fm-right-header').removeClass('hidden');
            $('.fm-right-header-user-management').addClass('hidden');
        }

        $('.fm-chat-block').addClass('hidden');
    }

    if (
        id !== 'cloud-drive' &&
        !M.isDynPage(id) &&
        id !== 'rubbish-bin' &&
        id !== 'backups' &&
        id !== 'shared-with-me' &&
        !String(M.currentdirid).includes('shares') &&
        id !== 'out-shares' &&
        !String(M.currentdirid).includes('out-shares') &&
        id !== 'public-links' &&
        !String(M.currentdirid).includes('public-links') &&
        id !== 'file-requests' &&
        !String(M.currentdirid).includes('file-requests') &&
        id !== 's4' &&
        M.currentrootid !== 's4'
    ) {
        $('.files-grid-view.fm').addClass('hidden');
        $('.fm-blocks-view.fm').addClass('hidden');
    }

    if (id !== 'user-management') {
        $('.fm-left-panel').removeClass('user-management');
        $('.user-management-tree-panel-header').addClass('hidden');
        $('.files-grid-view.user-management-view').addClass('hidden');
        $('.fm-blocks-view.user-management-view').addClass('hidden');
        $('.user-management-overview-bar').addClass('hidden');
    }

    if (id !== 'shared-with-me' && M.currentdirid !== 'shares') {
        $('.shared-blocks-view').addClass('hidden');
        $('.shared-grid-view').addClass('hidden');
    }

    if (M.currentdirid !== 'out-shares') {
        $('.out-shared-blocks-view').addClass('hidden');
        $('.out-shared-grid-view').addClass('hidden');
    }

    if (id !== 'shared-with-me' && id !== 'out-shares' || M.search) {
        $('.shares-tabs-bl').addClass('hidden');
    }

    if (!M.gallery || isAlbums) {
        $('.gallery-view').addClass('hidden');
    }

    if (M.previousdirid && M.isAlbumsPage(0, M.previousdirid)
        || !$('#albums-view', $('.fm-right-files-block')).hasClass('hidden')) {
        if (M.isGalleryPage()) {
            mega.gallery.albums.disposeInteractions();
        }
        else if (isAlbums && mega.gallery.albums && mega.gallery.albums.grid) {
            mega.gallery.albums.grid.clear();
        }
        else {
            $('#albums-view', $('.fm-right-files-block')).addClass('hidden');

            if (mega.gallery.albums) {
                mega.gallery.albums.disposeAll();
            }
        }
    }

    $(".fm-left-panel:not(.chat-lp-body)").removeClass('hidden');

    if (id !== "recents") {
        $(".fm-recents.container").addClass('hidden');
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

    if (id === 'affiliate') {
        $('#fmholder').addClass('affiliate-program');
    }

    // required tricks to make the conversations work with the old UI HTML/css structure
    if (id === "conversations") {
        // moving the control of the headers in the tree panel to chat.js + ui/conversations.jsx
        $('.fm-main.default > .fm-left-panel').addClass('hidden');

        if (!is_mobile) {
            window.mega.ui.searchbar.refresh();
        }
    }
    else if (id !== "recents") {
        $('.fm-main.default > .fm-left-panel').removeClass('hidden');
    }

    // new sections UI
    let sections = document.getElementsByClassName('section');

    for (let i = sections.length; i--;) {

        if (sections[i].classList.contains(tmpId)) {
            sections[i].classList.remove('hidden');
        }
        else {
            sections[i].classList.add('hidden');
        }
    }

    // Revamp Implementation Begin
    $('.js-fm-left-panel').children('section').addClass('hidden');

    let panel;

    if (
        (id === 'cloud-drive' && !folderlink)
        || id === 'shared-with-me'
        || id === 'out-shares'
        || id === 'public-links'
        || id === 'backups'
        || id === 'rubbish-bin'
        || id === 'recents'
        || id === 'discovery'
        || id === 's4'
        || isAlbums
        || M.isDynPage(id)
        || mega.gallery.sections[id]
        || id === 'file-requests'
    ) {
        M.initLeftPanel();
    }
    else if (id === 'cloud-drive' || id === 'dashboard'
        || id === 'account' || id === 'devices') {

        panel = document.getElementsByClassName('js-other-tree-panel').item(0);

        if (panel) {
            panel.classList.remove('hidden');
        }
    }
    else if (id === 'user-management') {

        panel = document.getElementsByClassName('js-other-tree-panel').item(0);

        if (panel) {
            panel.classList.remove('hidden');
        }

        panel = document.getElementsByClassName('js-lp-usermanagement').item(0);

        // Don't show the panel if Pro Flexi
        if (panel && !u_attr.pf) {
            panel.classList.remove('hidden');
        }

        if (selectionManager) {
            selectionManager.clear_selection();
        }
    }

    // Revamp Implementation End

    if (d) {
        console.timeEnd('sectionUIOpen');
        console.groupEnd();
    }
};


FileManager.prototype.getLinkAction = function() {
    'use strict';

    if (M.isInvalidUserStatus()) {
        return;
    }

    // ToDo: Selected can be more than one folder $.selected
    // Avoid multiple referencing $.selected instead use event
    // add new translation message '... for multiple folders.'
    // cancel descendant File requests folders after copyRights are accepted
    if (u_type === 0) {
        ephemeralDialog(l[1005]);
    }
    else {
        var isEmbed = $(this).hasClass('embedcode-item');
        var selNodes = Array.isArray($.selected) ? $.selected.concat() : [];
        var showDialog = function() {
            mega.Share.initCopyrightsDialog(selNodes, isEmbed);
        };

        const mdList = mega.fileRequestCommon.storage.isDropExist(selNodes);
        if (mdList.length) {
            var fldName = mdList.length > 1 ? l[17626] : l[17403].replace('%1', escapeHTML(M.d[mdList[0]].name));

            msgDialog('confirmation', l[1003], fldName, l[18229], function(e) {
                if (e) {
                    mega.fileRequest.removeList(mdList, true).then(showDialog).catch(dump);
                }
            });
        }
        else {
            showDialog();
        }
    }
};

/**
 * Initialize Statusbar Links related user interface
 */
FileManager.prototype.initStatusBarLinks = function() {
    "use strict";

    // Set hover text to Share link or Share links depending on number selected
    const linkHoverText = mega.icu.format(l.share_link, $.selected.length);
    const $selectionStatusBar = $('.selection-status-bar');

    $('.js-statusbarbtn.link', $selectionStatusBar).attr('data-simpletip', linkHoverText);
    $('.js-statusbarbtn', $selectionStatusBar).rebind('click', function(e) {
        const isMegaList = M.dyh ? M.dyh('is-mega-list') : true;
        if (!isMegaList) {
            M.dyh('init-status-bar-links', e, this.classList);
        }
        else if (this.classList.contains('download')) {
            if (M.isAlbumsPage()) {
                mega.gallery.albums.downloadSelectedElements();
            }
            else {
                M.addDownload($.selected);
            }
        }
        else if (this.classList.contains('share')) {
            M.openSharingDialog($.selected[0]);
        }
        else if (this.classList.contains('sendto')) {
            openCopyDialog('conversations');
        }
        else if (this.classList.contains('link')) {
            M.getLinkAction();
        }
        else if (this.classList.contains('delete')) {

            if (M.isInvalidUserStatus() || this.classList.contains('disabled')) {
                return false;
            }

            closeDialog();
            fmremove();
        }
        else if (this.classList.contains('options')) {
            if (this.classList.contains('c-opened')) {
                this.classList.remove('c-opened');
                $.hideContextMenu();
                return false;
            }

            M.contextMenuUI(e, 1);
            this.classList.add('c-opened');
        }
        else if (this.classList.contains('preview')) {
            if (M.isAlbumsPage()) {
                mega.gallery.albums.previewSelectedElements();
            }
            else {
                slideshow(M.d[$.selected[0]], false);
            }
        }
        else if (this.classList.contains('delete-from-album')) {
            mega.gallery.albums.requestAlbumElementsRemoval();
        }

        return false;
    });
};

FileManager.prototype.initLeftPanel = function() {
    'use strict';

    const isGallery = M.isGalleryPage();
    const isDiscovery = isGallery && M.currentCustomView.prefixPath === 'discovery/';
    const isAlbums = M.isAlbumsPage();

    let elements = document.getElementsByClassName('js-lpbtn');

    for (var i = elements.length; i--;) {
        elements[i].classList.remove('active');
    }

    elements = document.getElementsByClassName(
        ((isGallery && !isDiscovery) || isAlbums)
            ? 'js-lp-gallery'
            : 'js-lp-myfiles'
    );

    for (var j = elements.length; j--;) {
        elements[j].classList.remove('hidden');
    }

    if ((isGallery || isAlbums) && mega.gallery.albums) {
        mega.gallery.albums.init();
    }

    document.getElementsByClassName('js-lp-storage-usage')[0].classList.remove('hidden');

    this.checkLeftStorageBlock();

    if (M.currentdirid === M.RootID) {
        $('.js-clouddrive-btn').addClass('active');
    }
    else if (M.currentdirid === M.BackupsId || M.currentrootid === M.InboxID) {
        $('.js-lpbtn[data-link="backups"]').addClass('active');
    }
    else if (M.currentrootid === 'shares' || M.currentrootid === 'out-shares') {
        $('.js-lpbtn[data-link="shares"]').addClass('active');
    }
    else if (M.currentdirid === 'recents') {
        $('.js-lpbtn[data-link="recents"]').addClass('active');
    }
    else if (M.currentrootid === 'public-links') {
        $('.js-lpbtn[data-link="links"]').addClass('active');
    }
    else if (M.currentrootid === 'file-requests') {
        $('.js-lpbtn[data-link="file-requests"]').addClass('active'); // Active left panel button
    }
    else if (M.currentrootid === M.RubbishID) {
        $('.js-lpbtn[data-link="bin"]').addClass('active');
    }
    else if (M.isDynPage(M.currentdirid)) {
        $(`.js-lpbtn[data-link="${M.currentdirid}"]`, '.js-myfiles-panel').addClass('active');
    }
    else if (isGallery && mega.gallery.sections[M.currentdirid]) { // If gallery and is not Discovery
        $(`.js-lpbtn[data-link="${mega.gallery.sections[M.currentdirid].root}"]`).addClass('active');
    }
    else if (M.currentrootid === 's4' && M.currentCustomView.subType === 'container') {
        $('.js-lpbtn[data-link="s4"]').addClass('active');
    }

    if (u_attr) {
        const galleryBtn = document.querySelector('.nw-fm-left-icon.gallery');

        if (galleryBtn && (!galleryBtn.dataset.locationPref || isGallery)) {
            mega.gallery.updateButtonsStates(elements, galleryBtn);
        }
    }

    $('.js-lpbtn').rebind('click.openSubTab', function(e) {

        let link = $(this).attr('data-link');

        if (link === 'clouddrive') {

            let $el = $(this);

            if (M.currentdirid === M.RootID || $(e.target).hasClass('js-cloudtree-expander')) {
                $el.toggleClass('collapse');
                const $treeContentPanel = $('.content-panel.active');
                if ($treeContentPanel.hasClass('collapse')) {
                    $treeContentPanel.removeClass('collapse');
                    M.addTreeUIDelayed();
                }
                else {
                    $treeContentPanel.addClass('collapse');
                }
                $.tresizer();
            }
            else {
                M.openFolder(M.RootID, true);
            }
            return;
        }
        else if (link === 'upgrade') {
            loadSubPage('pro');
        }
        else if (M.isGalleryPage(link)) {

            onIdle(() => {
                const gallery = mega.gallery[link];

                if (gallery && link === M.previousdirid && link !== M.currentdirid) {
                    gallery.mode = false;
                    gallery.setMode('a', 1);
                }
            });
        }
        else if (link === 's4' && 'ui' in s4) {
            const $eTarget = $(this);
            const $s4ContentPanel = $('.content-panel.s4', '.js-myfiles-panel');

            if (M.dyh && M.dyh('is-section', 'container') || $(e.target).hasClass('js-cloudtree-expander')) {
                $eTarget.toggleClass('collapse');
                if ($s4ContentPanel.hasClass('collapse')) {
                    $s4ContentPanel.removeClass('collapse');
                    M.addTreeUIDelayed();
                }
                else {
                    $s4ContentPanel.addClass('collapse');
                }
            }
            else {
                s4.ui.renderRoot();
            }
        }
    });

    if (M.currentrootid === 's4') {
        // Auto expand the tree pane if access any component pages of s4
        $('.js-lpbtn.js-s4-btn', '.js-myfiles-panel').removeClass('collapse');
        $('.content-panel.s4', '.js-myfiles-panel').removeClass('collapse');
        M.addTreeUIDelayed();
    }
};


/**
 * Get "My Backups" folder Handle
 * @return {void}
 */
FileManager.prototype.getMyBackups = async function() {

    'use strict';

    const res = await Promise.resolve(mega.attr.get(u_handle, 'bak', -2, 1)).catch(nop);

    if (!res) {
        return;
    }

    const handle = base64urlencode(res);

    if (!handle) {
        return;
    }

    M.BackupsId = handle;

    const lPaneButton = document.querySelector('.js-lp-myfiles .js-backups-btn');

    if (lPaneButton.classList.contains('hidden')) {
        lPaneButton.classList.remove('hidden');
    }
};

FileManager.prototype.getCameraUploads = async function() {

    "use strict";

    const nodes = [];
    const res = await Promise.resolve(mega.attr.get(u_handle, "cam", false, true)).catch(nop);

    if (!res) {
        return;
    }

    const handle = base64urlencode(res.h);

    if (!handle) {
        return;
    }

    nodes.push(handle);
    M.CameraId = handle;

    this.cameraUploadUI();

    const handle2 = base64urlencode(res.sh);

    if (handle2) {
        nodes.push(handle2);
        M.SecondCameraId = handle2;
    }

    return nodes;
};

FileManager.prototype.cameraUploadUI = function() {

    "use strict";

    if (M.CameraId) {

        const treeItem = document.querySelector(`[id="treea_${M.CameraId}"] .nw-fm-tree-folder`);
        const fmItem = document.querySelector(`[id="${M.CameraId}"] .folder`);

        if (treeItem) {
            treeItem.classList.add('camera-folder');
        }

        if (fmItem) {
            fmItem.classList.add('folder-camera');
        }
    }
};

(function(global) {
    'use strict';

    var _cdialogq = Object.create(null);

    // Define what dialogs can be opened from other dialogs
    var diagInheritance = {
        'recovery-key-dialog': ['recovery-key-info'],
        properties: ['links', 'rename', 'copyrights', 'copy', 'move', 'share', 'saveAs'],
        copy: ['createfolder'],
        move: ['createfolder'],
        register: ['terms'],
        selectFolder: ['createfolder'],
        saveAs: ['createfolder'],
        share: ['share-add', 'fingerprint-dialog'],
        'stripe-pay': ['stripe-pay-success', 'stripe-pay-failure']
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
                    if (!$dialog.hasClass('mega-dialog') &&
                        !$dialog.hasClass('fm-dialog-mobile') &&
                        !$dialog.hasClass('fm-dialog')) {

                        throw new Error(`Unexpected dialog(${name}) type...`);
                    }

                    if (!$dialog.is('#ob-dialog')) {
                        // arrange to back any non-controlled dialogs except message dialog,
                        // this class will be removed on the next closeDialog()
                        $('.mega-dialog:not(#msgDialog):visible, .overlay:visible').addClass('arrange-to-back');
                        fm_showoverlay();
                    }
                    $dialog.removeClass('hidden arrange-to-back');
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

    /**
     * Don't use this method, unless you know what you are doing.
     * This method would ditch the currently queued dialogs, without notifying via
     * sendMessage('closedialog') or .trigger('dialog-closed').
     * This may cause side effects of some dialogs, not unmounting correctly, despite being hidden.
     * E.g. this is specially dangerous with dialogs that do keyboard shortcuts or other global events.
     */
    Object.defineProperty(FileManager.prototype.safeShowDialog, 'abort', {
        value: function _abort() {
            if (d && $.dialog) {
                console.info('Aborting dialogs dispatcher while on %s, queued: ', $.dialog, _cdialogq);
            }

            delete $.dialog;
            loadingDialog.hide('force');
            _cdialogq = Object.create(null);

            $('html, body').removeClass('overlayed');
            $('.fm-dialog-overlay').addClass('hidden');
            $('.mega-dialog:visible, .overlay:visible').addClass('hidden');
        }
    });

})(self);

Object.freeze(FileManager.prototype);
