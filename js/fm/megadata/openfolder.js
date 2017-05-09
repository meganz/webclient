(function(global) {
    /**
     * Invoke M.openFolder() completion.
     *
     * @param {String}      id               The folder id
     * @param {String}      newHashLocation  location change
     * @param {MegaPromise} promise          Completion promise
     * @private
     */
    var _openFolderCompletion = function(id, newHashLocation, first, promise) {
        this.previousdirid = this.currentdirid;
        this.currentdirid = id;
        this.currentrootid = RootbyId(id);

        if (first) {
            fminitialized = true;
            $('.top-search-bl').show();
            mBroadcaster.sendMessage('fm:initialized');
        }

        if (M.currentrootid === M.RootID) {
            M.lastSeenCloudFolder = M.currentdirid;
        }

        $('.nw-fm-tree-item').removeClass('opened');

        if (this.chat) {
            M.v = [];
            sharedFolderUI(); // remove shares-specific UI
            //$.tresizer();
        }
        else if (id === undefined && folderlink) {
            // Error reading shared folder link! (Eg, server gave a -11 (EACCESS) error)
            // Force cleaning the current cloud contents and showing an empty msg
            if (!is_mobile) {
                M.renderMain();
            }
            else {
                // Trigger rendering of mobile file manager
                mobile.cloud.renderLayout();
            }
        }
        else if (id && (id.substr(0, 7) !== 'account')
            && (id.substr(0, 9) !== 'dashboard')
            && (id.substr(0, 13) !== 'notifications')) {
            $('.fm-right-files-block').removeClass('hidden');
            if (d) {
                console.time('time for rendering');
            }
            if (id === 'transfers') {
                M.v = [];
            }
            else if (id.substr(0, 6) === 'search') {
                M.filterBySearch(M.currentdirid);
            }
            else {
                M.filterByParent(M.currentdirid);
            }

            var viewmode = 0;// 0 is list view, 1 block view
            if (M.overrideViewMode !== undefined) {
                viewmode = M.overrideViewMode;
                delete M.overrideViewMode;
            }
            else if (typeof fmconfig.uiviewmode !== 'undefined' && fmconfig.uiviewmode) {
                if (fmconfig.viewmode) {
                    viewmode = fmconfig.viewmode;
                }
            }
            else if (typeof fmconfig.viewmodes !== 'undefined' && typeof fmconfig.viewmodes[id] !== 'undefined') {
                viewmode = fmconfig.viewmodes[id];
            }
            else {
                for (var i = this.v.length; i--;) {
                    if (is_image(this.v[i])) {
                        viewmode = 1;
                        break;
                    }
                }
            }
            M.viewmode = viewmode;
            if (M.overrideSortMode) {
                M.doSort(M.overrideSortMode[0], M.overrideSortMode[1]);
                delete M.overrideSortMode;
            }
            else if (fmconfig.uisorting && fmconfig.sorting) {
                M.doSort(fmconfig.sorting.n, fmconfig.sorting.d);
            }
            else if (fmconfig.sortmodes && fmconfig.sortmodes[id]) {
                M.doSort(fmconfig.sortmodes[id].n, fmconfig.sortmodes[id].d);
            }
            else if (M.currentdirid === 'contacts') {
                M.doSort('status', 1);
            }
            else {
                M.doSort('name', 1);
            }

            if (M.currentdirid === 'opc') {
                this.v = [];
                for (var i in M.opc) {
                    this.v.push(M.opc[i]);
                }
            }
            else if (M.currentdirid === 'ipc') {
                this.v = [];
                for (var i in M.ipc) {
                    this.v.push(M.ipc[i]);
                }
            }

            if (!is_mobile) {
                M.renderMain();
            }
            else {
                // Trigger rendering of mobile file manager
                mobile.cloud.renderLayout();
            }

            if (fminitialized && !is_mobile) {
                var currentdirid = M.currentdirid;
                if (id.substr(0, 6) === 'search') {
                    currentdirid = M.RootID;

                    if (M.d[M.previousdirid]) {
                        currentdirid = M.previousdirid;
                    }
                }

                if ($('#treea_' + currentdirid).length === 0) {
                    var n = M.d[currentdirid];
                    if (n && n.p) {
                        treeUIopen(n.p, false, true);
                    }
                }
                treeUIopen(currentdirid, currentdirid === 'contacts');

                $('#treea_' + currentdirid).addClass('opened');
            }
            if (d) {
                console.timeEnd('time for rendering');
            }

            Soon(function() {
                M.renderPath();
            });
        }


        // If a folderlink, and entering a new folder.
        if (pfid && this.currentrootid === this.RootID) {
            var target = '';
            if (this.currentdirid !== this.RootID) {
                target = '!' + this.currentdirid;
            }
            newHashLocation = 'F!' + pfid + '!' + pfkey + target;
            M.lastSeenFolderLink = newHashLocation;
        }
        else {
            // new hash location can be altered already by the chat logic in the previous lines in this func
            if (!newHashLocation) {
                newHashLocation = 'fm/' + M.currentdirid;
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
        if (!is_mobile) {
            searchPath();

            var sortMenu = new mega.SortMenu();
            sortMenu.treeSearchUI();
        }

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
     * @returns {MegaPromise}
     */
    MegaData.prototype.openFolder = function(id, force, chat) {
        var newHashLocation;
        var fetchdbnodes;
        var firstopen;

        $('.fm-right-account-block, .fm-right-block.dashboard').addClass('hidden');
        $('.fm-files-view-icon').removeClass('hidden');

        if (d) {
            console.warn('openFolder()', M.currentdirid, id, force, loadfm.loaded);
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
            notificationsUI(1);
        }

        this.search = false;
        this.chat = false;

        if (!fminitialized) {
            firstopen = true;
        }
        else if (id && id === this.currentdirid && !force) {
            // Do nothing if same path is chosen
            return MegaPromise.resolve(EEXIST);
        }

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
        else if (id === 'shares') {
            id = 'shares';
        }
        else if (id === 'chat') {
            if (!megaChatIsReady) {
                id = this.RootID;
            }
            else {
                this.chat = true;

                megaChat.refreshConversations();
                treeUI();
                var room = megaChat.renderListing();

                if (room) {
                    newHashLocation = room.getRoomUrl();
                }
            }
        }
        else if (id && id.substr(0, 7) === 'account') {
            accountUI();
        }
        else if (id && id.substr(0, 9) === 'dashboard') {
            dashboardUI();
        }
        else if (id && id.substr(0, 13) === 'notifications') {
            notificationsUI();
        }
        else if (id && id.substr(0, 7) === 'search/') {
            this.search = true;
        }
        else if (id && id.substr(0, 5) === 'chat/') {
            this.chat = true;
            treeUI();

            if (megaChatIsReady) {
                // XX: using the old code...for now
                chatui(id);
            }
        }
        else if (id !== 'transfers') {
            if (!id) {
                id = this.RootID;
            }
            else if (fmdb && (!M.d[id] || (M.d[id].t && !M.c[id]))) {
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

        if (fetchdbnodes) {

            dbfetch.get(id)
                .always(function() {
                    if (!M.d[id]) {
                        id = M.RootID;
                    }
                    _openFolderCompletion.call(M, id, newHashLocation, firstopen, promise);
                });
        }
        else if (id === 'shares') {
            dbfetch.geta(Object.keys(M.c.shares || {}))
                .always(function() {
                    _openFolderCompletion.call(M, id, newHashLocation, firstopen, promise);
                });
        }
        else {
            _openFolderCompletion.call(this, id, newHashLocation, firstopen, promise);
        }

        return promise;
    };
})(this);
