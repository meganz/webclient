(function(global) {
    "use strict"; /* jshint -W089 */
    /* eslint-disable complexity */// <- @todo ...

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

        if (d > 1) {
            return h + ' ('
                + M.getPath(M.currentdirid)
                    .reverse()
                    .map(function(h) {
                        return M.getNameByHandle(h);
                    })
                    .join('/')
                + ')';
        }

        return h;
    };

    /**
     * Invoke M.openFolder() completion.
     *
     * @param {String}      id               The folder id
     * @param {Boolean}     first            Whether this is the first open call
     * @private
     */
    var _openFolderCompletion = function(id, first) {
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
        this.fmsorting = (id === 'contacts' || id === 'shares' || id === 'out-shares' || id === 'public-links') ?
            0 : fmconfig.uisorting | 0;
        this.currentCustomView = this.isCustomView(id);

        if (first) {
            fminitialized = true;

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
        $('.files-grid-view.fm').removeClass('duplication-found');
        $('.fm-blocks-view.fm').removeClass('duplication-found');
        $('.duplicated-items-found').addClass('hidden');

        if (this.chat) {
            this.v = [];
            sharedFolderUI(); // remove shares-specific UI
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
            else if (this.currentCustomView){
                this.filterByParent(this.currentCustomView.nodeID);
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
            else if (this.currentCustomView && typeof fmconfig.viewmodes !== 'undefined'
                && typeof fmconfig.viewmodes[this.currentCustomView.original] !== 'undefined') {
                viewmode = fmconfig.viewmodes[this.currentCustomView.original];
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

                if (id.substr(0, 6) === 'search') {
                    currentdirid = this.RootID;

                    if (this.d[this.previousdirid]) {
                        currentdirid = this.previousdirid;
                    }
                }

                var prefixPath = '';
                var treeid = currentdirid;
                var nodeid = currentdirid;

                if (this.currentCustomView) {
                    treeid = this.currentCustomView.prefixTree + this.currentCustomView.nodeID;
                    nodeid = this.currentCustomView.nodeID;
                    prefixPath = this.currentCustomView.prefixPath;
                }

                if (treeid.indexOf('/') > -1) {
                    treeid = treeid.split('/')[0];
                }

                if ($('#treea_' + treeid).length === 0) {
                    n = this.d[nodeid];
                    if (n && n.p) {
                        M.onTreeUIOpen(prefixPath + n.p, false, true);
                    }
                }

                M.onTreeUIOpen(currentdirid, currentdirid === 'contacts');

                $('#treea_' + treeid).addClass('opened');
            }
            if (d) {
                console.timeEnd('time for rendering');
            }

            Soon(function() {
                M.renderPath(fid);
            });
        }

        var newHashLocation = 'fm/' + this.currentdirid;

        // If a folderlink, and entering a new folder.
        if (pfid && this.currentrootid === this.RootID) {
            var target = '';
            var curLink = getSitePath();
            if (isPublickLinkV2(curLink)) {
                if (this.currentdirid !== this.RootID) {
                    target = '/folder/' + this.currentdirid;
                }
                else if ($.autoSelectNode) {
                    var selectedNode = M.getNodeByHandle($.autoSelectNode);
                    if (selectedNode && selectedNode.p) {
                        target = '/folder/' + selectedNode.p;
                    }
                }
                newHashLocation = 'folder/' + pfid + '#' + pfkey + target;
            }
            else {
                if (this.currentdirid !== this.RootID) {
                    target = '!' + this.currentdirid;
                }
                newHashLocation = 'F!' + pfid + '!' + pfkey + target;
            }
            this.lastSeenFolderLink = newHashLocation;
        }

        if (getSitePath() !== '/' + newHashLocation && !this.chat) {
            loadSubPage(newHashLocation);
        }

        this.currentTreeType = this.currentCustomView.type || M.treePanelType();

        M.searchPath();
        M.treeSearchUI();
        M.treeSortUI();
        M.treeFilterUI();
        M.initLabelFilter(this.v);
        M.redrawTreeFilterUI();
    };

    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    /**
     * Open Cloud Folder or Site Section/Page
     *
     * @param {String}  id      The folder id
     * @param {Boolean} [force] If that folder is already open, re-render it
     * @returns {MegaPromise} fulfilled on completion
     */
    MegaData.prototype.openFolder = function(id, force) {
        var fetchdbnodes;
        var fetchshares;
        var firstopen;
        var cv = M.isCustomView(id);

        document.documentElement.classList.remove('wait-cursor');
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
        else if (id && id.substr(0, 4) === 'chat') {
            if (is_mobile) {
                // @todo implement the chat on mobile :)

                id = this.RootID;
            }
            else {
                var self = this;
                this.chat = true;

                return new MegaPromise(function(resolve, reject) {
                    _openFolderCompletion.call(self, id, firstopen);

                    if (firstopen) {
                        // do not wait for the chat to load on the first call
                        resolve(id);
                    }

                    onIdle(function _() {
                        if (!megaChatIsReady) {
                            // Wait for the chat to be ready (lazy loading)
                            M.renderChatIsLoading();
                            return mBroadcaster.once('chat_initialized', SoonFc(20, _));
                        }
                        if (!self.chat) {
                            // We moved elsewhere meanwhile
                            return reject(EACCESS);
                        }

                        M.addTreeUI();
                        megaChat.renderListing(id).then(resolve).catch(reject);
                    });
                });
            }
        }
        else if (id && id.substr(0, 15) === 'user-management') {
            // id = 'user-management';
            M.require('businessAcc_js', 'businessAccUI_js').done(function() {
                M.onFileManagerReady(function() {
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
        else if (id === 'out-shares') {
            id = 'out-shares';
        }
        else if (id === 'public-links') {
            id = 'public-links';
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
        else if (id && id.substr(0, 9) === 'refer') {
            M.onFileManagerReady(affiliateUI);
        }
        else if (id && id.substr(0, 7) === 'search/') {
            this.search = true;
        }
        else if (id && (id.substr(0, 11) === 'out-shares/' || id.substr(0, 13) === 'public-links/')) {
            fetchdbnodes = true;
            id = cv.nodeID;
        }
        else if (String(id).length === 11) {
            if (M.u[id] && id !== u_handle) {
                fetchshares = !M.c[id];
            }
            else {
                id = 'contacts';
            }
        }
        else if (id !== 'transfers') {
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

        if (!this.chat && megaChatIsReady) {
            var room = megaChat.getCurrentRoom();
            if (room) {
                room.hide();
            }
        }

        var promise = new MegaPromise();
        var finish = function() {
            _openFolderCompletion.call(M, id = cv.original || id, firstopen);

            if (promise) {
                promise.resolve(id);
            }
        };
        var loadend = function() {
            // Check this is valid custom view page. If not head to it's root page.
            if (cv && !M.getPath(cv.original).length) {
                cv = M.isCustomView(cv.type);
            }
            else if (M.getPath(id).pop() === 'shares') {
                fetchshares = true;
            }
            else if (!M.d[id] && fetchdbnodes) {
                id = M.RootID;
            }

            if (fetchshares) {
                var handles = Object.keys(M.c.shares || {});
                for (var i = handles.length; i--;) {
                    if (M.d[handles[i]]) {
                        handles.splice(i, 1);
                    }
                }
                dbfetch.geta(handles)
                    .always(function() {
                        if (!$.inSharesRebuild) {
                            $.inSharesRebuild = Date.now();
                            M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
                        }
                        finish();
                    });
                return;
            }

            if (cv) {
                M.buildtree({h: cv.type}, M.buildtree.FORCE_REBUILD, cv.type);
            }

            finish();
        };

        promise.then(function(h) {
            if (d) {
                console.warn('openFolder completed for %s, currentdir=%s', maph(id), maph(M.currentdirid));
                console.assert(id.endsWith(h));
            }
            delay('mega:openfolder!' + id, function() {
                if (M.currentdirid !== id) {
                    return;
                }
                if ($.autoSelectNode) {
                    $.selected = [$.autoSelectNode];
                    delete $.autoSelectNode;
                    reselect(1);
                }
                mBroadcaster.sendMessage('mega:openfolder', id);
                $.tresizer();
            }, 90);
        });
        var masterPromise = promise;

        fetchdbnodes = fetchdbnodes || dbfetch.isLoading(id);

        if (fetchdbnodes || $.ofShowNoFolders) {
            var tp;
            var stream = fminitialized && !is_mobile;

            if ($.ofShowNoFolders) {
                tp = dbfetch.tree([id]);
            }
            else if (stream) {
                tp = dbfetch.open(id, promise);
                promise = null;
            }
            else {
                tp = dbfetch.get(id);
            }

            tp.always(loadend);
        }
        else {
            loadend();
        }

        return masterPromise;
    };
})(this);
