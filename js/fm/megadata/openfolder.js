(function(global) {
    "use strict"; /* jshint -W089 */
    /* eslint-disable complexity */// <- @todo ...

    const dynPages = {
        'faves': {
            /**
             * Filter nodes by.
             * @param {MegaNode} n - node
             * @returns {Boolean} match criteria result
             */
            filter(n) {
                if (!(n && n.fav && !n.fv && !n.rr)) {
                    return false;
                }

                if (M.currentLabelFilter && !M.filterByLabel(n)) {
                    return false;
                }

                const root = M.getNodeRoot(n.h);
                return root !== M.RubbishID && root !== 'shares';
            },
            /**
             * Internal properties, populated as options.
             * @private
             */
            get properties() {
                return {
                    /**
                     * Container rights, as per getNodeRights() 0: read-only, 1: read-and-write, 2: full-access
                     * @type Number
                     */
                    rights: 0,
                    /**
                     * Under what place is shown.
                     * @type {String}
                     */
                    location: 'cloud-drive',
                    /**
                     * Common type, long-name, etc
                     * @type String
                     */
                    type: 'favourites',
                    /**
                     * Localized name
                     * @type String
                     */
                    localeName: l.gallery_favourites
                };
            }
        }
    };
    Object.setPrototypeOf(dynPages, null);
    Object.freeze(dynPages);

    /**
     * Dynamic content loader
     * @param {Object} obj destructible
     * @param {String} obj.section The FM section/page name, i.e. `fm/${section}`
     * @param {Function|String} obj.filter MegaNode filter, or property to filter nodes for.
     * @param {Object} [obj.options] Additional internal options.
     * @constructor
     */
    class DynContentLoader {
        constructor({section, filter, ...options}) {
            if (typeof filter === 'string') {
                const prop = filter;
                filter = (n) => n && !!n[prop];
            }

            Object.defineProperty(this, 'filter', {value: filter});
            Object.defineProperty(this, 'section', {value: section});
            Object.defineProperty(this, 'options', {value: {...options.properties}});

            Object.defineProperty(this, 'inflight', {value: new Set()});
            Object.defineProperty(this, '__ident_0', {value: `dcl:${section}.${makeUUID()}`});

            console.assert(!DynContentLoader.instances.has(section), `dcl:${section} already exists..`);
            DynContentLoader.instances.add(section);

            /** @type {Boolean|Promise} */
            this.ready = false;
        }

        /**
         * Tells whether the section is active (i.e. in current view to the user)
         * @returns {boolean} to be or not to be
         */
        get visible() {
            return M.currentdirid === this.section;
        }

        /**
         * Sort nodes based on current sorting parameters
         * @returns {void}
         */
        sortNodes() {
            const {sortmode, sortRules} = M;

            if (sortmode) {
                const {n, d} = sortmode;
                const sort = sortRules[n];

                if (typeof sort === 'function') {
                    return sort(d);
                }
            }
            return M.sort();
        }

        /**
         * Initialize rendering for the section.
         * @returns {Promise<*>} void
         */
        async setup() {
            if (!this.ready) {
                document.documentElement.classList.add('wait-cursor');

                this.ready = this.fetch().catch(dump)
                    .finally(() => {
                        if (this.visible) {
                            document.documentElement.classList.remove('wait-cursor');
                        }
                        this.ready = true;
                    });
            }

            return this.update();
        }

        /**
         * Preload required nodes from FMDB.
         * @returns {Promise<*>} void
         */
        async fetch() {
            const opts = Object.assign({limit: 200, offset: 0}, this.options);

            const inflight = [];
            await fmdb.getchunk('f', opts, (chunk) => {
                opts.offset += opts.limit;
                opts.limit = Math.min(122880, opts.limit << 1);

                const bulk = [];
                for (let i = chunk.length; i--;) {
                    const n = chunk[i];

                    if (!M.d[n.h] && this.filter(n)) {
                        bulk.push(n.h);
                    }
                }

                if (bulk.length) {
                    inflight.push(
                        dbfetch.geta(bulk)
                            .then(() => this.visible && this.update(bulk.map(h => M.d[h])))
                            .catch(dump)
                    );
                }
            });

            return inflight.length && Promise.allSettled(inflight);
        }

        /**
         * Update the list of filtered nodes by the property
         * @param {Array} [nodes] Array of filtered MegaNodes, if none given this is the first rendering attempt.
         * @returns {*} void
         */
        update(nodes) {
            if (nodes) {
                const {v: list, megaRender: {megaList} = false} = M;

                if (nodes.length) {
                    list.push(...nodes.filter(this.filter));
                    this.sortNodes();
                }

                if (megaList && list.length) {
                    megaList.batchReplace(list);
                }
                else {
                    M.renderMain(false);
                }
            }
            else {
                M.v = [];
                for (const h in M.d) {
                    if (this.filter(M.d[h])) {
                        M.v.push(M.d[h]);
                    }
                }
            }

            if (!M.v.length) {
                this.setEmptyPage().catch(dump);
            }
        }

        /**
         * Synchronize updated nodes.
         * @param {MegaNode} n The ufs-node being updated
         * @returns {void} void
         */
        sync(n) {
            if (this.visible) {
                this.inflight.add(n.h);

                delay(this.__ident_0, () => {
                    const inflight = new Set(this.inflight);
                    this.inflight.clear();

                    if (this.visible && inflight.size) {
                        for (let i = M.v.length; i--;) {
                            const {h} = M.v[i];

                            if (inflight.has(h)) {
                                const n = M.d[h];

                                if (!this.filter(n)) {
                                    removeUInode(n.h);
                                }
                                inflight.delete(h);
                            }
                        }
                        this.update([...inflight].map(h => M.d[h]));
                    }
                }, 35);
            }
        }

        async setEmptyPage() {
            await this.ready;
            if (this.visible && !M.v.length) {
                $(`.fm-empty-${this.section}`, '.fm-right-files-block').removeClass('hidden');
            }
        }

        get [Symbol.toStringTag]() {
            return 'DynContentLoader';
        }
    }

    Object.defineProperty(DynContentLoader, 'instances', {value: new Set()});

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
        this.fmsorting = id === 'shares' || id === 'out-shares' || id === 'public-links' ?
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
        else if (this.currentrootid === 's4') {
            let target = id;

            if (!('kernel' in s4 && (target = s4.utils.validateS4Url(id)))) {
                console.error('invalid code-path...');
                return this.openFolder('fm').catch(dump);
            }

            if (target !== id) {
                this.currentdirid = id = target;
                this.currentCustomView = this.isCustomView(id);
            }

            // Render S4 section / S4 FM header
            queueMicrotask(() => s4.ui.render());
        }

        const $fmRightFilesBlock = $('.fm-right-files-block');
        const $fmRightHeader = $('.fm-right-header', $fmRightFilesBlock);
        const $resultsCount = $('.fm-search-count', $fmRightHeader).addClass('hidden');

        $('.nw-fm-tree-item.opened').removeClass('opened');
        $('.fm-notification-block.duplicated-items-found').removeClass('visible');
        $('.fm-breadcrumbs-wrapper, .column-settings.overlap', $fmRightFilesBlock).removeClass('hidden');

        if (folderlink && !pfcol || id !== M.RootID && M.currentrootid === M.RootID) {
            this.gallery = 0;
            if ((fmconfig.uiviewmode | 0) && fmconfig.viewmode === 2 ||
                typeof fmconfig.viewmodes !== 'undefined' && typeof fmconfig.viewmodes[id] !== 'undefined'
                && fmconfig.viewmodes[id] === 2) {
                this.gallery = 1;
            }
            $('.fm-files-view-icon').filter('.media-view').removeClass('hidden');
        }
        else {
            $('.fm-files-view-icon').filter('.media-view').addClass('hidden');
        }

        if (mega.ui.mNodeFilter) {
            // XXX: Do not reset the filter selections if navigated to the same location.
            let stash = this.previousdirid === this.currentdirid;

            if (!stash && this.previousdirid) {
                stash = this.search && String(this.previousdirid).substr(0, 6) === 'search';
            }
            mega.ui.mNodeFilter.resetFilterSelections(stash);
        }

        if (id === undefined && folderlink) {
            // Error reading shared folder link! (Eg, server gave a -11 (EACCESS) error)
            // Force cleaning the current cloud contents and showing an empty msg
            this.renderMain();
        }
        // Skip M.renderMain and clear folder nodes for sections without viewmode switchers
        else if (this.chat || !id ||
            (this.gallery && (!is_mobile || !pfcol)) ||
            id.substr(0, 7) === 'account' ||
            id.substr(0, 7) === 'devices' ||
            id.substr(0, 9) === 'dashboard' ||
            id.substr(0, 15) === 'user-management' ||
            id.substr(0, 5) === 'refer') {

            this.v = [];
            delay.cancel('rmSetupUI');

            if (typeof sharedFolderUI === 'function') {
                // Remove shares-specific UI.
                sharedFolderUI();
            }

            if (this.gallery) {
                queueMicrotask(() => {
                    galleryUI(this.gallery > 1 && this.currentCustomView.nodeID);
                });
            }
        }
        else {

            if (d) {
                console.time('time for rendering');
            }

            $fmRightFilesBlock.removeClass('hidden');

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
            else if (id.substr(0, 6) === 'search') {
                this.filterBySearch(this.currentdirid);
                $('.fm-breadcrumbs-wrapper', $fmRightHeader).addClass('hidden');
                $('.column-settings.overlap').addClass('hidden');
                $resultsCount.removeClass('hidden');
                $resultsCount.text(mega.icu.format(l.search_results_count, M.v.length));
            }
            else if (this.currentCustomView) {
                this.filterByParent(this.currentCustomView.nodeID);
            }
            else if (dynPages[id]) {
                this.dynContentLoader[id].setup().catch(dump);
            }
            else {
                this.filterByParent(this.currentdirid);
            }

            if (id.substr(0, 9) !== 'transfers') {
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

            // Default to Thumbnail View When Media Discovery View Not Available
            if (this.viewmode === 2) {
                this.viewmode = 1;
            }

            if (is_mobile) {
                // Ignore sort modes set in desktop until that is supported in mobile...
                // this.overrideSortMode = this.overrideSortMode || ['name', 1];
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

                if (!document.getElementById(`treea_${treeid}`)) {
                    n = this.d[nodeid];
                    if (n && n.p) {
                        M.onTreeUIOpen(prefixPath + n.p, false, true);
                    }
                }

                M.onTreeUIOpen(currentdirid);
                $('#treea_' + treeid).addClass('opened');

                onIdle(() => {
                    M.renderPathBreadcrumbs(fid);
                });
            }
            if (d) {
                console.timeEnd('time for rendering');
            }
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

                if (window.pfcol) {
                    newHashLocation = newHashLocation.replace('folder/', 'collection/');
                }
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

        delay('render:search_breadcrumbs', () => M.renderSearchBreadcrumbs());
        M.initLabelFilter(this.v);
        // Potentially getting back?
        // M.treeSearchUI();
        // M.treeSortUI();
        // M.treeFilterUI();
        // M.redrawTreeFilterUI();
    };

    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    /**
     * Open Cloud Folder or Site Section/Page
     *
     * @param {String}  id      The folder id
     * @param {Boolean} [force] If that folder is already open, re-render it
     * @returns {Promise} fulfilled on completion
     */
    MegaData.prototype.openFolder = async function(id, force) {
        let isFirstOpen, fetchDBNodes, fetchDBShares;

        document.documentElement.classList.remove('wait-cursor');

        if (d) {
            console.warn('openFolder(%s, %s), currentdir=%s, fmloaded=%s',
                maph(id), force, maph(this.currentdirid), loadfm.loaded);
        }

        if (!loadfm.loaded) {
            console.error('Internal error, do not call openFolder before the cloud finished loading.');
            throw EACCESS;
        }

        if (!fminitialized) {
            isFirstOpen = true;
        }
        else if (id && id === this.currentdirid && !force) {
            // Do nothing if same path is chosen
            return EEXIST;
        }
        let cv = this.isCustomView(id);

        const $viewIcons =
            $(`.fm-files-view-icon${pfid ? '' : ':not(.media-view)'}`)
                .removeClass('hidden');
        $('.fm-right-account-block, .fm-right-block, .fm-filter-chips-wrapper').addClass('hidden');

        this.chat = false;
        this.search = false;
        this.recents = false;
        this.albums = false;

        if (
            this.gallery
            && (
                mega.gallery.sections[id]
                || (pfid && $viewIcons.filter('.media-view').hasClass('active'))
            )
        ) {
            // @todo call completion (?)
            $('.gallery-tabs-bl', '.fm-right-files-block').removeClass('hidden');
        }
        else {
            this.gallery = false;
        }

        if (id === 'rubbish') {
            id = this.RubbishID;
        }
        else if (id === 'backups') {
            id = this.BackupsId || this.RootID;
        }
        else if (id === 'cloudroot' || id === 'fm' || id === this.InboxID) {
            id = this.RootID;
        }
        else if (id && id.substr(0, 4) === 'chat') {
            if (is_mobile) {
                // @todo implement the chat on mobile :)
                id = this.RootID;
            }
            else {
                var self = this;
                this.chat = true;

                return new Promise((resolve, reject) => {
                    _openFolderCompletion.call(self, id, isFirstOpen);

                    if (isFirstOpen) {
                        // do not wait for the chat to load on the first call
                        resolve(id);
                    }

                    onIdle(function _(isInitial) {
                        if (!megaChatIsReady) {
                            // Wait for the chat to be ready (lazy loading)
                            M.renderChatIsLoading();
                            return mBroadcaster.once('chat_initialized', SoonFc(20, _.bind(this, true)));
                        }
                        if (!self.chat) {
                            // We moved elsewhere meanwhile
                            return reject(EACCESS);
                        }

                        M.addTreeUI();
                        megaChat.renderListing(id, isInitial).then(resolve).catch(reject);
                    });
                });
            }
        }
        else if (id && id.substr(0, 15) === 'user-management' && is_mobile) {

            id = this.RootID;
        }
        else if (id && id.substr(0, 15) === 'user-management' && u_attr && u_attr.pf) {

            M.onFileManagerReady(() => {

                M.onSectionUIOpen('user-management');

                // If Pro Flexi flexi, show just the invoices
                M.require('businessAcc_js', 'businessAccUI_js').done(() => {

                    var usersM = new BusinessAccountUI();

                    usersM.viewBusinessInvoicesPage();
                });
            });
        }
        else if (id && id.substr(0, 15) === 'user-management') {

            M.onFileManagerReady(() => {

                M.onSectionUIOpen('user-management');

                // id = 'user-management';
                M.require('businessAcc_js', 'businessAccUI_js').done(() => {

                    if (!new BusinessAccount().isBusinessMasterAcc()) {
                        return M.openFolder('cloudroot');
                    }
                    const subPage = id.replace('/', '').split('user-management')[1];
                    if (u_attr.b.s === -1 && !(subPage && subPage === 'account')) {
                        return M.openFolder('cloudroot');
                    }

                    var usersM = new BusinessAccountUI();

                    // checking if we loaded sub-users and drew them
                    if (!usersM.initialized) {

                        // if not, then the fastest way is to render the business home page
                        usersM.viewSubAccountListUI(undefined, undefined, true);
                    }
                    else if (usersM.isRedrawNeeded(M.suba, usersM.business.previousSubList)) {
                        usersM.viewSubAccountListUI(undefined, undefined, true);
                    }

                    if (subPage && subPage.length > 2) {
                        if (subPage === 'account') {
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
                        else {
                            usersM.viewSubAccountListUI();
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
        else if (id === 'file-requests') {
            id = 'file-requests';
        }
        else if (id && id.substr(0, 7) === 'account') {
            M.onFileManagerReady(accountUI);
        }
        else if (!is_mobile && id && id.substr(0, 7) === 'devices') {
            M.onFileManagerReady(() => {
                mega.backupCenter.openSection();
            });
        }
        else if (id && id.substr(0, 9) === 'dashboard') {
            M.onFileManagerReady(() => dashboardUI());
        }
        else if (id && id.substr(0, 7) === 'recents') {
            M.onFileManagerReady(openRecents);
        }
        else if (id && id.substr(0, 5) === 'refer') {
            M.onFileManagerReady(affiliateUI);
        }
        else if (id && id.substr(0, 7) === 'search/') {
            this.search = true;
        }
        else if (id && id.substr(0, 10) === 'discovery/') {
            if (cv.nodeID === M.RootID || cv.nodeID === M.RubbishID || !M.d[cv.nodeID]) {
                // Preventing MD on root folder
                return M.openFolder('cloudroot');
            }

            fetchDBNodes = true;
            id = cv.nodeID;

            this.gallery = 2;
        }
        else if (cv.type === 'gallery' || window.pfcol) {
            this.albums = 1;
            this.gallery = 1;
        }
        else if (cv.type === 's4') {

            id = cv.nodeID;
            fetchDBNodes = ['container', 'bucket'].includes(cv.subType) && id.length === 8;
        }
        else if (
            id &&
            (
                id.substr(0, 11) === 'out-shares/' ||
                id.substr(0, 13) === 'public-links/' ||
                id.substr(0, 14) === 'file-requests/'
            )
        ) {
            fetchDBNodes = true;
            id = cv.nodeID;
        }
        else if (String(id).length === 11) {
            if (M.u[id] && id !== u_handle) {
                loadSubPage('fm/chat/contacts/' + id);
            }
            else {
                loadSubPage('fm/chat/contacts');
            }
            return EAGAIN;
        }
        else if (id && id.startsWith('albums')) {
            this.albums = true;
        }
        else if (id !== 'transfers') {
            if (id && id.substr(0, 9) === 'versions/') {
                id = id.substr(9);
            }
            if (!id) {
                id = this.RootID;
            }
            else if (!this.d[id] || this.d[id].t && !this.c[id]) {
                fetchDBNodes = !id || id.length !== 8 ? -1 : !!window.fmdb;
            }
        }

        if (!this.chat && megaChatIsReady) {
            megaChat.cleanup();
        }

        const {promise} = mega;
        const masterPromise = promise.then((h) => {
            if (d) {
                console.warn('openFolder completed for %s, currentdir=%s', maph(id), maph(M.currentdirid));
                console.assert(String(id).endsWith(h));
            }

            delay(`mega:openfolder!${id}`, () => {
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

            return h;
        });

        fetchDBNodes = fetchDBNodes || dbfetch.isLoading(id);

        if (fetchDBNodes > 0 || $.ofShowNoFolders) {

            if ($.ofShowNoFolders) {
                if (fmdb) {
                    await dbfetch.tree([id]);
                }
            }
            else if (!dynPages[id]) {
                const stream = fminitialized && !is_mobile;

                if (stream) {
                    // eslint-disable-next-line local-rules/open -- not a window.open() call.
                    await dbfetch.open(id, promise).catch(dump);
                }
                else if (!this.d[id] || this.d[id].t && !this.c[id]) {

                    await dbfetch.get(id);
                }
            }
        }

        // Check this is valid custom view page. If not, head to its root page.
        if (cv && !M.getPath(cv.original).length) {
            cv = M.isCustomView(cv.type);

            if (!cv) {
                id = M.RootID;
            }
        }
        else if (M.getPath(id).pop() === 'shares') {

            fetchDBShares = true;
        }
        else if (!this.d[id] && !dynPages[id] && (pfid || fetchDBNodes)) {

            id = M.RootID;
        }

        if (fetchDBShares) {
            const handles = Object.keys(M.c.shares || {});

            for (let i = handles.length; i--;) {
                if (M.d[handles[i]]) {
                    handles.splice(i, 1);
                }
            }

            if (handles.length) {
                if (mega.infinity && !$.inSharesRebuild) {
                    // @todo validate which nodes are legit to query here
                    loadingDialog.show();
                }
                await dbfetch.geta(handles).catch(dump);
            }

            if (!$.inSharesRebuild) {
                $.inSharesRebuild = Date.now();

                queueMicrotask(() => {
                    mega.keyMgr.decryptInShares()
                        .then(() => {
                            return this.showContactVerificationDialog();
                        })
                        .catch(dump);
                });
                M.buildtree({h: 'shares'}, M.buildtree.FORCE_REBUILD);
            }
        }

        // In MEGA Lite mode, remove this temporary class
        if (mega.lite.inLiteMode) {
            $('.files-grid-view.fm').removeClass('mega-lite-hidden');
        }

        _openFolderCompletion.call(this, id = cv.original || id, isFirstOpen);

        onIdle(() => {
            promise.resolve(id);
        });
        return masterPromise;
    };

    /**
     * Tells whether this is dynamic-handled site section.
     * @param {String} name page/section name.
     * @returns {Number} 0: no, -1: yes, but not initialized yet, 1: yes, but not visible, 2: yes, and visible
     */
    MegaData.prototype.isDynPage = function(name) {
        if (!dynPages[name]) {
            return 0;
        }

        if (!DynContentLoader.instances.has(name)) {
            return -1;
        }

        return this.dynContentLoader[name].visible + 1;
    };

    /** @property MegaData.dynContentLoader */
    lazy(MegaData.prototype, 'dynContentLoader', () => {
        const obj = Object.create(null);
        Object.keys(dynPages)
            .reduce((o, k) =>
                lazy(o, k, () => new DynContentLoader({section: k, ...dynPages[k]})), obj);
        return obj;
    });
})(this);
