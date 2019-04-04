(function(global) {
    "use strict"; /* jshint -W089 */

    // map handle to root name
    var maph = function(h) {
        if (h === M.RootID) {
            return h + ' (RootID)';
        }
        if (h === M.InboxID) {
            return h + ' (InboxID)';
        }
        if (h === M.RubbishID) {
            return h + ' (RubbishID)';
        }

        return h;
    };

    /**
     * Invoke M.openFolder() completion.
     *
     * @param {String}      id               The folder id
     * @param {String}      newHashLocation  location change
     * @param {Boolean}     first            Whether this is the first open call
     * @param {MegaPromise} promise          Completion promise
     * @private
     */
    var _openFolderCompletion = function(id, newHashLocation, first, promise) {
        // if the id is a file handle, then set the folder id as the file's folder.
        var n;
        var fid;
        if (M.d[id] && (M.d[id].t === 0)) {
            fid = fileversioning.getTopNodeSync(id);
            id = M.d[fid].p;
        }
        this.previousdirid = this.currentdirid;
        this.currentdirid = id;
        this.currentrootid = this.chat ? "chat" : this.getNodeRoot(id);
        this.currentLabelType = M.labelType();
        this.currentLabelFilter = M.filterLabel[this.currentLabelType];
        this.fmsorting = (id === 'contacts' || id === 'shares') ? 0 : fmconfig.uisorting | 0;

        if (first) {
            fminitialized = true;
            $('.top-search-bl').show();
            mBroadcaster.sendMessage('fm:initialized');

            if (d) {
                console.log('d%s, c%s, t%s', $.len(this.d), $.len(this.c), $.len(this.tree));
                console.log('RootID=%s, InboxID=%s, RubbishID=%s', this.RootID, this.InboxID, this.RubbishID);
            }
        }

        if (d) {
            console.log('previd=%s, currid=%s, currroot=%s',
                maph(this.previousdirid), maph(this.currentdirid), maph(this.currentrootid));
        }

        if (this.currentrootid === this.RootID) {
            this.lastSeenCloudFolder = this.currentdirid;
        }

        $('.nw-fm-tree-item').removeClass('opened');

        if (this.chat) {
            this.v = [];
            sharedFolderUI(); // remove shares-specific UI

            if (megaChatIsReady) {
                var roomId = String(id).split('/').pop();

                if (roomId.length === 11) {
                    megaChat.setAttachments(roomId);
                }
            }
        }
        else if (id === undefined && folderlink) {
            // Error reading shared folder link! (Eg, server gave a -11 (EACCESS) error)
            // Force cleaning the current cloud contents and showing an empty msg
            this.renderMain();
        }
        else if (id && (id.substr(0, 7) !== 'account')
            && (id.substr(0, 9) !== 'dashboard')
            && (id.substr(0, 15) !== 'user-management')
            && (id.substr(0, 13) !== 'notifications')
            && (id.substring(0, 7) !== 'recents')) {

            $('.fm-right-files-block').removeClass('hidden');

            if (d) {
                console.time('time for rendering');
            }

            if (id === 'transfers') {
                this.v = [];
            }
            else if (id === 'links') {
                if (this.su.EXP) {
                    this.v = Object.keys(this.su.EXP)
                        .map(function(h) {
                            return M.d[h];
                        });
                }
                else {
                    this.v = [];
                }
            }
            else if ($.ofShowNoFolders) {
                delete $.ofShowNoFolders;

                this.v = (function _(v) {
                    var p = [];
                    var hton = function(h) {
                        return M.d[h];
                    };
                    var fltn = function(h) {
                        var n = M.d[h];
                        if (n) {
                            if (!n.t) {
                                return h;
                            }
                            p.push(h);
                        }
                        return '';
                    };
                    return v.reduce(function(v, h) {
                        return v.concat(Object.keys(M.c[h] || {}));
                    }, []).map(fltn).filter(String).map(hton).concat(p.length ? _(p) : []);
                })([id]);
            }
            else if (id === 'opc') {
                this.v = Object.values(this.opc || {});
            }
            else if (id === 'ipc') {
                this.v = Object.values(this.ipc || {});
            }
            else if (id.substr(0, 6) === 'search') {
                this.filterBySearch(this.currentdirid);
            }
            else {
                this.filterByParent(this.currentdirid);
            }

            if (id.substr(0, 4) !== 'chat' && id.substr(0, 9) !== 'transfers') {
                this.labelFilterBlockUI();
            }

            var viewmode = 0;// 0 is list view, 1 block view
            if (this.overrideViewMode !== undefined) {
                viewmode = this.overrideViewMode;
                delete this.overrideViewMode;
            }
            else if (fmconfig.uiviewmode | 0) {
                viewmode = fmconfig.viewmode | 0;
            }
            else if (typeof fmconfig.viewmodes !== 'undefined' && typeof fmconfig.viewmodes[id] !== 'undefined') {
                viewmode = fmconfig.viewmodes[id];
            }
            else {
                for (var i = Math.min(this.v.length, 200); i--;) {
                    n = this.v[i];

                    if (String(n.fa).indexOf(':0*') > 0 || is_image2(n)
                        || is_video(n) || MediaInfoLib.isFileSupported(n)) {

                        viewmode = 1;
                        break;
                    }
                }
            }
            this.viewmode = viewmode;

            if (is_mobile) {
                // Ignore sort modes set in desktop until that is supported in mobile...
                this.overrideSortMode = this.overrideSortMode || ['name', 1];
            }

            if (this.overrideSortMode) {
                this.doSort(this.overrideSortMode[0], this.overrideSortMode[1]);
                delete this.overrideSortMode;
            }
            else if (this.fmsorting && fmconfig.sorting) {
                this.doSort(fmconfig.sorting.n, fmconfig.sorting.d);
            }
            else if (fmconfig.sortmodes && fmconfig.sortmodes[id]) {
                this.doSort(fmconfig.sortmodes[id].n, fmconfig.sortmodes[id].d);
            }
            else if (this.currentdirid === 'contacts') {
                this.doSort('status', 1);
            }
            else if (this.currentdirid === 'opc' || this.currentdirid === 'ipc') {
                M.doSort('email', 1);
            }
            else {
                this.doSort('name', 1);
            }

            this.renderMain();

            if (fminitialized && !is_mobile) {
                var currentdirid = this.currentdirid;
                if (id.substr(0, 6) === 'search' || id === 'links') {
                    currentdirid = this.RootID;

                    if (this.d[this.previousdirid]) {
                        currentdirid = this.previousdirid;
                    }
                }

                if ($('#treea_' + currentdirid).length === 0) {
                    n = this.d[currentdirid];
                    if (n && n.p) {
                        M.onTreeUIOpen(n.p, false, true);
                    }
                }
                M.onTreeUIOpen(currentdirid, currentdirid === 'contacts');

                $('#treea_' + currentdirid).addClass('opened');
            }
            if (d) {
                console.timeEnd('time for rendering');
            }

            Soon(function() {
                M.renderPath(fid);

                if ($.autoSelectNode) {
                    $.selected = [$.autoSelectNode];
                    delete $.autoSelectNode;
                    reselect(1);
                }
            });
        }

        // If a folderlink, and entering a new folder.
        if (pfid && this.currentrootid === this.RootID) {
            var target = '';
            if (this.currentdirid !== this.RootID) {
                target = '!' + this.currentdirid;
            }
            newHashLocation = 'F!' + pfid + '!' + pfkey + target;
            this.lastSeenFolderLink = newHashLocation;
        }
        else {
            // new hash location can be altered already by the chat logic in the previous lines in this func
            if (!newHashLocation) {
                newHashLocation = 'fm/' + this.currentdirid;
            }
        }
        try {

            if (hashLogic) {
                document.location.hash = '#' + newHashLocation;
            }
            else {
                if (window.location.pathname !== "/" + newHashLocation && !pfid) {
                    loadSubPage(newHashLocation);
                }
                else if (pfid && document.location.hash !== '#' + newHashLocation) {
                    history.pushState({fmpage: newHashLocation}, "", "#" + newHashLocation);
                    page = newHashLocation;
                }
            }
        }
        catch (ex) {
            console.error(ex);
        }

        this.currentTreeType = M.treePanelType();

        M.searchPath();
        M.treeSearchUI();
        M.treeSortUI();
        M.treeFilterUI();
        M.initLabelFilter(this.v);
        M.redrawTreeFilterUI();

        promise.resolve(id);
        mBroadcaster.sendMessage('mega:openfolder');
    };

    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    /**
     * Open Cloud Folder or Site Section/Page
     *
     * @param {String}  id      The folder id
     * @param {Boolean} [force] If that folder is already open, re-render it
     * @param {Boolean} [chat]  Some chat flag..
     * @returns {MegaPromise} revoked when opening finishes
     */
    MegaData.prototype.openFolder = function(id, force, chat) {
        var newHashLocation;
        var fetchdbnodes;
        var fetchshares;
        var firstopen;

        $('.fm-right-account-block, .fm-right-block.dashboard').addClass('hidden');
        $('.fm-files-view-icon').removeClass('hidden');

        if (d) {
            console.warn('openFolder(%s, %s), currentdir=%s, fmloaded=%s',
                maph(id), force, maph(this.currentdirid), loadfm.loaded);
        }

        if (!loadfm.loaded) {
            console.error('Internal error, do not call openFolder before the cloud finished loading.');
            return MegaPromise.reject(EACCESS);
        }

        if (!folderlink) {
            // open the dashboard by default
            /*id = id || 'dashboard';
             disabled for now
             */
        }

        if (!is_mobile && (id !== 'notifications') && !$('.fm-main.notifications').hasClass('hidden')) {
            M.addNotificationsUI(1);
        }

        if (!fminitialized) {
            firstopen = true;
        }
        else if (id && id === this.currentdirid && !force) {
            // Do nothing if same path is chosen
            return MegaPromise.resolve(EEXIST);
        }

        this.chat = false;
        this.search = false;
        this.recents = false;

        if (id === 'rubbish') {
            id = this.RubbishID;
        }
        else if (id === 'inbox') {
            id = this.InboxID;
        }
        else if (id === 'cloudroot') {
            id = this.RootID;
        }
        else if (id === 'contacts') {
            id = 'contacts';
        }
        else if (id === 'opc') {
            id = 'opc';
        }
        else if (id === 'ipc') {
            id = 'ipc';
        }
        else if (id && id.substr(0, 15) === 'user-management') {
            // id = 'user-management';
            M.require('businessAcc_js', 'businessAccUI_js').done(function () {
                M.onFileManagerReady(function () {
                    if (!new BusinessAccount().isBusinessMasterAcc()) {
                        return M.openFolder('cloudroot');
                    }

                    var usersM = new BusinessAccountUI();

                    M.onSectionUIOpen('user-management');
                    // checking if we loaded sub-users and drew them
                    if (!usersM.initialized) {
                        // if not, then the fastest way is to render the business home page
                        usersM.viewSubAccountListUI(undefined, undefined, true);
                    }
                    else if (usersM.isRedrawNeeded(M.suba, usersM.business.previousSubList)) {
                        usersM.viewSubAccountListUI(undefined, undefined, true);
                    }
                    var subPage = id.replace('/', '').split('user-management')[1];
                    if (subPage && subPage.length > 2) {
                        if (subPage === 'overview') {
                            usersM.viewBusinessAccountOverview();
                        }
                        else if (subPage === 'account') {
                            usersM.viewBusinessAccountPage();
                        }
                        else if (subPage === 'invoices') {
                            usersM.viewBusinessInvoicesPage();
                        }
                        else if (subPage.indexOf('invdet!') > -1) {
                            var invId = subPage.split('!')[1];
                            usersM.viewInvoiceDetail(invId);
                        }
                        else if (subPage.length === 11) {
                            usersM.viewSubAccountInfoUI(subPage);
                        }
                    }
                    else {
                        // No need to check if the current object is not the first instance
                        // because rendering is optimized inside it
                        usersM.viewSubAccountListUI();
                    }
                });
            });
        }
        else if (id === 'shares') {
            id = 'shares';
        }
        else if (id === 'chat') {
            if (!megaChatIsReady) {
                id = this.RootID;
            }
            else {
                this.chat = true;
                megaChat.displayArchivedChats = false;
                megaChat.refreshConversations();
                M.addTreeUI();
                var room = megaChat.renderListing();

                if (room) {
                    newHashLocation = room.getRoomUrl();
                }
                else {
                    if (megaChat.$conversationsAppInstance) {
                        megaChat.$conversationsAppInstance.safeForceUpdate();
                    }
                }
            }
        }
        else if (id && id.substr(0, 7) === 'account') {
            M.onFileManagerReady(accountUI);
        }
        else if (id && id.substr(0, 9) === 'dashboard') {
            M.onFileManagerReady(dashboardUI);
        }
        else if (id && id.substr(0, 7) === 'recents') {
            M.onFileManagerReady(openRecents);
        }
        else if (id && id.substr(0, 13) === 'notifications') {
            M.addNotificationsUI();
        }
        else if (id && id.substr(0, 7) === 'search/') {
            this.search = true;
        }
        else if (id && id.substr(0, 5) === 'chat/') {
            this.chat = true;
            this.addTreeUI();

            if (megaChatIsReady) {
                // XX: using the old code...for now
                chatui(id);
            }
        }
        else if (String(id).length === 11) {
            if (M.u[id] && id !== u_handle) {
                fetchshares = !M.c[id];
            }
            else {
                id = 'contacts';
            }
        }
        else if (id !== 'transfers' && id !== 'links') {
            if (id && id.substr(0, 9) === 'versions/') {
                id = id.substr(9);
            }
            if (!id) {
                id = this.RootID;
            }
            else if (fmdb && (!this.d[id] || (this.d[id].t && !this.c[id]))) {
                fetchdbnodes = true;
            }
        }

        if (megaChatIsReady) {
            if (!this.chat) {
                if (megaChat.getCurrentRoom()) {
                    megaChat.getCurrentRoom().hide();
                }
            }
        }

        var promise = new MegaPromise();
        var fetchShares = function() {
            dbfetch.geta(Object.keys(M.c.shares || {}))
                .always(function() {
                    if (!$.inSharesRebuild) {
                        $.inSharesRebuild = Date.now();
                        M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
                    }
                    _openFolderCompletion.call(M, id, newHashLocation, firstopen, promise);
                });
        };

        if (fetchdbnodes || $.ofShowNoFolders) {
            var tp = $.ofShowNoFolders ? dbfetch.tree([id]) : dbfetch.get(id);

            tp.always(function() {
                if (!M.d[id]) {
                    id = M.RootID;
                }

                if (M.getPath(id).pop() === 'shares') {
                    fetchShares();
                }
                else {
                    _openFolderCompletion.call(M, id, newHashLocation, firstopen, promise);
                }
            });
        }
        else if (fetchshares || id === 'shares') {
            fetchShares();
        }
        else {
            _openFolderCompletion.call(this, id, newHashLocation, firstopen, promise);
        }

        return promise;
    };
})(this);
