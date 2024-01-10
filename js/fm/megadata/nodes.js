(function(global) {
    "use strict";
    const delInShareQueue = Object.create(null);
    const delUINode = tryCatch(h => removeUInode(h));

    const clearIndex = function(h) {
        if (this.nn && h in this.nn) {
            delete this.nn[h];
        }
        if (h in this.u) {
            this.u[h].c = 0;
        }
        if (this.su.EXP && h in this.su.EXP) {
            delete this.su.EXP[h];
        }
    };
    const delNodeVersions = function(p, h) {
        const v = fileversioning.getVersionHandles(h);

        if (v.length) {
            if (d) {
                console.debug('delNodeVersions(%s/%s)...', p, h, v);
            }

            for (let i = v.length; i--;) {
                // eslint-disable-next-line no-use-before-define
                delNodeIterator.call(this, v[i]);
            }
        }
    };
    const delNodeIterator = function(h, delInShareQ, level = 0) {
        const n = this.d[h];

        if (fminitialized) {
            delUINode(h);
        }

        if (this.c[h] && h.length < 11) {
            const c = Object.keys(this.c[h]);
            let l = c.length;

            while (l--) {
                const n = this.d[c[l]];

                if (n && n.tvf && !n.t) {
                    delNodeVersions.call(this, h, c[l]);
                }
                delNodeIterator.call(this, c[l], delInShareQ, l);
            }
            delete this.c[h];
        }

        if (fmdb) {
            fmdb.del('f', h);

            if (!n || n.ph) {
                fmdb.del('ph', h);
            }
        }

        if (n) {
            if (n.su) {
                // this is an inbound share
                delete this.c.shares[h];
                if (this.tree.shares) {
                    delete this.tree.shares[h];
                }
                delInShareQ.push(`${n.su}*${h}`);
                this.delIndex(n.su, h);
            }

            if (!level) {
                this.delIndex(n.p, h);
            }
            this.delHash(n);
            delete this.d[h];
        }

        clearIndex.call(this, h);
    };

    MegaData.prototype.delNode = function(h, ignoreDB, isBeingMoved) {
        const delInShareQ = delInShareQueue[h] = delInShareQueue[h] || [];

        if (d) {
            console.group('delNode(%s)', h);
        }
        // console.time(`delNode.${h}`);

        if (fminitialized) {
            // Handle Inbox/RubbishBin UI changes
            delay('fmLeftMenuUI', fmLeftMenuUI);
        }

        if (this.d[h] && !this.d[h].t && this.d[h].tvf) {
            const versions = fileversioning.getAllVersionsSync(h);
            for (let i = versions.length; i--;) {
                ufsc.delNode(versions[i].h, ignoreDB);
            }
        }
        else {
            // remove ufssizecache records
            if (h.length === 8) {
                ufsc.delNode(h, ignoreDB);
            }
        }

        // node deletion traversal
        delNodeIterator.call(this, h, delInShareQ);

        if (!isBeingMoved && delInShareQ.length) {
            const nodes = delInShareQ.map(uh => uh.substr(12));

            mega.keyMgr.enqueueShareRevocation(nodes);
        }

        if (fmdb && !ignoreDB) {
            // Perform DB deletions once we got acknowledge from API (action-packets)
            // which we can't do above because M.d[h] might be already deleted.
            for (let i = delInShareQ.length; i--;) {
                fmdb.del('s', delInShareQ[i]);
            }
            delete delInShareQueue[h];
        }

        if (d) {
            console.groupEnd();
        }
        // console.timeEnd(`delNode.${h}`);
    };
})(this);

MegaData.prototype.addNode = function(n, ignoreDB) {
    "use strict";

    if (n.su) {
        var u = this.u[n.su];
        if (u) {
            u.h = u.u;
            u.t = 1;
            u.p = 'contacts';
            this.addNode(u);
        }
        else if (d) {
            console.warn('No user record for incoming share', n.su);
        }
    }

    if (n.t < 2) {
        crypto_decryptnode(n);
        this.nodeUpdated(n, ignoreDB);
    }
    if (this.d[n.h] && this.d[n.h].shares) {
        n.shares = this.d[n.h].shares;
    }
    emplacenode(n);

    // sync data objs M.u <-> M.d
    if (n.h in this.u && this.u[n.h] !== n) {
        for (var k in n) {
            // merge changes from n->M.u[n.h]
            if (k !== 'name' && k in MEGA_USER_STRUCT) {
                this.u[n.h][k] = n[k];
            }
        }
        this.d[n.h] = this.u[n.h];
    }

    if (fminitialized) {
        newnodes.push(n);

        // Handle Inbox/RubbishBin UI changes
        delay('fmLeftMenuUI', fmLeftMenuUI);
    }
};

MegaData.prototype.delHash = function(n) {
    "use strict";

    if (this.h[n.hash] && this.h[n.hash].has(n.h)) {
        this.h[n.hash].delete(n.h);

        if (!this.h[n.hash].size) {
            delete this.h[n.hash];
        }
    }
};

MegaData.prototype.delIndex = function(p, h) {
    "use strict";
    // console.warn(`delIndex.${p}.${h}`);

    if (this.c[p] && this.c[p][h]) {
        delete this.c[p][h];
    }

    let empty = true;
    // eslint-disable-next-line no-unused-vars
    for (const i in this.c[p]) {
        empty = false;
        break;
    }
    if (empty) {
        delete this.c[p];
        if (fminitialized) {
            $(`#treea_${p}`).removeClass('contains-folders');
        }
    }
};

// eslint-disable-next-line complexity
MegaData.prototype.getPath = function(id) {
    'use strict';

    var result = [];
    var loop = true;
    var inshare;
    const cv = this.isCustomView(id);

    id = cv ? cv.nodeID : id;

    while (loop) {
        if (id === 'contacts' && result.length > 1) {
            id = 'shares';
        }

        if (inshare && !this.d[id]) {
            // we reached the inshare root, use the owner next
            id = inshare;
        }

        if (
            this.d[id]
            || id === 'messages'
            || id === 'shares'
            || id === 'out-shares'
            || id === 'public-links'
            || id === this.InboxID
            || id === 'contacts'
            || (id === 'albums' || cv && cv.type === 'albums')
            || M.isDynPage(id)
            || mega.gallery.sections[id]
            || id === 'file-requests'
            || id === 's4'
        ) {
            result.push(id);
        }
        else if (cv.type === 's4' && 'utils' in s4) {
            // Get S4 subpath for subpages other than Containers and Buckets
            // Container and Bucket will using existing method as it's node handle exist in M.d.
            return s4.utils.getS4SubPath(cv.original);
        }
        else if (!id || id.length !== 11) {
            return [];
        }
        else if (inshare && id.length === 11 && !this.d[id]) {
            result.push(id, 'shares');
            return result;
        }
        else if (window.megaChatIsReady && megaChat.chats[id]) {
            return [id, 'contacts'];
        }

        if (
            id === this.RootID
            || id === 'shares'
            || id === 'messages'
            || id === this.RubbishID
            || id === this.InboxID
            || M.isDynPage(id)
            || id === 'contacts'
        ) {
            loop = false;
        }

        if (loop) {

            if (id === 's4' || !(this.d[id] && this.d[id].p)) {
                break;
            }

            if (this.d[id].s4 && this.d[id].p === this.RootID) {
                id = 's4';
                continue;
            }

            inshare = this.d[id].su;
            id = this.d[id].p;
        }
    }

    // Get path for Out-shares, Public links, Discovery, and Albums.
    // This also cut off all path from invalid out-share and public-link path and return []
    if (cv && result.length > 1) {

        var outShareTree = M.getOutShareTree();

        for (var i = result.length - 1; i >= 0; i--) {
            if (cv.type === 'public-links' && typeof M.su.EXP !== 'undefined' && M.su.EXP[result[i]]) {
                result[i + 1] = 'public-links';
                break;
            }
            else if (cv.type === 'out-shares' && outShareTree[result[i]]) {
                result[i + 1] = 'out-shares';
                break;
            }
            else if (cv.type === 'gallery' && cv.nodeID === result[i]) {
                result[i + 1] = 'discovery';
                break;
            }
            else if (cv.type === 's4' && cv.containerID === result[i]) {
                result[i + 1] = 's4';
                break;
            }
            else if (cv.type === 'file-requests' && mega.fileRequest.publicFolderExists(result[i], true)) {
                result[i + 1] = 'file-requests';
                break;
            }
            result.pop();
        }
    }

    return result;
};

/**
 * Check entered path or id is a custom view like out-shares and public-links
 * If it is, return a set of object that contain detail of it.
 * If it is not, return false
 * @param {String} pathOrID Path or id of current element.
 * @return {Object|Boolean}
 */
MegaData.prototype.isCustomView = function(pathOrID) {

    "use strict";

    if (!pathOrID || typeof pathOrID !== 'string') {
        return false;
    }
    var result = Object.create(null);
    const node = M.getNodeByHandle(pathOrID.substr(0, 8));
    result.original = pathOrID;

    // Basic gallery view
    if (mega.gallery.sections[pathOrID]) {
        result.type = 'gallery';
        result.nodeID = pathOrID;
        result.prefixTree = '';
        result.prefixPath = '';
    }
    // Check whether the node is a bucket or a container
    else if ('utils' in s4 && node.s4 && node.t) {
        result.original = pathOrID.replace(/_/g, '/');
        const s4path = s4.utils.getS4SubPath(result.original).reverse();

        result.original = s4path[1] === s4path[2] ? `${s4path[1]}` : result.original;
        result.prefixTree = '';
        result.prefixPath = '';
        result.containerID = s4path[1];
        result.type = 's4';

        if (s4path.length > 2) {
            result.nodeID = s4path[2];
            result.prefixPath = `${s4path[1]}/`;
            result.subType = ['keys', 'policies', 'users', 'groups'].includes(s4path[2]) ? s4path[2] : 'bucket';
        }
        else if (s4path.length === 2 && node.p !== M.RootID) {
            result.containerID = node.p;
            result.nodeID = s4path[1];
            result.prefixPath = `${node.p}/`;
            result.subType = 'bucket';
        }
        else if (s4path.length === 2) {
            result.nodeID = s4path[1];
            result.subType = 'container';
        }
    }
    // Media discovery view
    else if (pathOrID.startsWith('discovery')) {
        result.type = 'gallery';
        result.nodeID = pathOrID.replace('discovery/', '');
        result.prefixTree = '';
        result.prefixPath = 'discovery/';
    }
    // Albums view
    else if (pathOrID === 'albums') {
        result.type = 'albums';
        result.nodeID = pathOrID;
        result.prefixTree = '';
        result.prefixPath = '';
    }
    // Specific album view
    else if (pathOrID.startsWith('albums/')) {
        result.type = 'albums';
        result.nodeID = pathOrID.replace('albums/', '');
        result.prefixTree = '';
        result.prefixPath = 'albums/';
    }
    // This is a out-share id from tree
    else if (pathOrID.substr(0, 3) === 'os_') {
        result.type = 'out-shares';
        result.nodeID = pathOrID.replace('os_', '');
        result.prefixTree = 'os_';
        result.prefixPath = 'out-shares/';
    }
    // This is a public-link id from tree
    else if (pathOrID.substr(0, 3) === 'pl_') {
        result.type = 'public-links';
        result.nodeID = pathOrID.replace('pl_', '');
        result.prefixTree = 'pl_';
        result.prefixPath = 'public-links/';
    }
    // This is a out-share path
    else if (pathOrID.substr(0, 11) === 'out-shares/') {
        result.type = 'out-shares';
        result.nodeID = pathOrID.replace('out-shares/', '');
        result.prefixTree = 'os_';
        result.prefixPath = 'out-shares/';
    }
    // This is a public-link path
    else if (pathOrID.substr(0, 13) === 'public-links/') {
        result.type = 'public-links';
        result.nodeID = pathOrID.replace('public-links/', '');
        result.prefixTree = 'pl_';
        result.prefixPath = 'public-links/';
    }
    else if (pathOrID.substr(0, 14) === 'file-requests/') {
        result.type = 'file-requests';
        result.nodeID = pathOrID.replace('file-requests/', '');
        result.prefixTree = 'fr_';
        result.prefixPath = 'file-requests/';
    }
    else if (pathOrID === 'out-shares') {
        result.type = result.nodeID = 'out-shares';
        result.prefixTree = 'os_';
        result.prefixPath = '';
    }
    else if (pathOrID === 'public-links') {
        result.type = result.nodeID = 'public-links';
        result.prefixTree = 'pl_';
        result.prefixPath = '';
    }
    else if (pathOrID === 'file-requests') {
        result.type = result.nodeID = 'file-requests';
        result.prefixTree = 'fr_';
        result.prefixPath = '';
    }

    // This is not a out-share or a public-link
    else {
        result = false;
    }
    return result;
};

/**
 * Clear the list of selected nodes, and returns it (Under mobile by using $.selected, SelectionManager under desktop)
 * @returns {Array} previously selected nodes;
 */
MegaData.prototype.clearSelectedNodes = function() {
    'use strict';
    let res = $.selected || [];

    if (window.selectionManager) {
        res = selectionManager.clear_selection();
    }
    else {
        $.selected = [];
    }

    return res;
};

/**
 * Select nodes in the current view, taking care of desktop or mobile
 * @param {String|Array} handles ufs-node's handle(s) to select.
 * @param {Boolean} [clean] expunge previously selected nodes
 */
MegaData.prototype.addSelectedNodes = function(handles, clean) {
    'use strict';
    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    $.selected = clean ? [] : this.clearSelectedNodes();
    $.selected.push(...handles.filter(Boolean));

    // This will take care of re-initializing the selection-manager on desktop.
    reselect(1);
};

/**
 * Checking if is the page is in Gallery section
 * @param {String} [path] Path to check or this.currentdirid
 * @returns {Boolean}
 */
MegaData.prototype.isGalleryPage = function(path) {
    'use strict';
    const customView = !path || path === this.currentdirid ? this.currentCustomView : this.isCustomView(path);

    return customView && customView.type === 'gallery';
};

/**
 * Checking if is the page is in Gallery section
 * @param {Number} [type] Type to check the page against:
 * 0 - Any album,
 * 1 - Albums main index page
 * 2 - A single album page (private or public)
 * @param {String} [path] Path to check or this.currentdirid
 * @returns {Boolean}
 */
MegaData.prototype.isAlbumsPage = function(type, path) {
    'use strict';

    type |= 0;

    if (pfid && (!type || type === 2) && mega.gallery.albums && mega.gallery.albums.isPublic) {
        return true;
    }

    path = String(path || this.currentdirid);
    const customView = path === this.currentdirid ? this.currentCustomView : this.isCustomView(path);

    return customView.type === 'albums'
        && !type
        || (type === 1 && path === 'albums')
        || (type === 2 && path.startsWith('albums/'))
        || false;
};

/**
 * Handle rubbish bin permanent items removal
 * How this works?
 * In case that param 'all' is true, then all items from rubbish are removed
 * In case that param 'all' is false, then selected nodes/items are removed and all child nodes/items if any
 * @param {Boolean} all To remove all or just selected nodes/items
 */
MegaData.prototype.clearRubbish = async function(all) {
    "use strict";

    if (M.isInvalidUserStatus()) {
        throw new MEGAException('[clearRubbish] Invalid user state.');
    }

    if (M.account) {
        // reset cached account data
        M.account.lastupdate = 0;
    }

    mLoadingSpinner.show('clear-rubbish');

    let res;
    const error = (ex) => {
        error.found = ex;
    };
    const handles = this.clearSelectedNodes();

    if (all) {
        queueMicrotask(() => {
            ulmanager.ulClearTargetDeleted(M.getTreeHandles(M.RubbishID));
        });
        res = await api.screq('dr').catch(error);
    }
    else {
        const promises = [];

        // Check is there an upload target the deleted folder.
        queueMicrotask(() => {
            ulmanager.ulClearTargetDeleted(handles);
        });

        for (let i = handles.length; i--;) {
            promises.push(api.screq({a: 'd', n: handles[i]}));
        }

        res = await Promise.allSettled(promises);
        for (let i = res.length; i--;) {
            if (res[i].reason) {
                console.warn(res[i].reason);
                error.found = res[i].reason;
            }
            res[i] = res[i].value;
        }
    }

    mLoadingSpinner.hide('clear-rubbish');

    if (error.found) {
        throw error.found;
    }

    return res;
};

/**
 * Confirm newly established nodes at specific locations retains expected validity.
 * @param {String|Array} nodes ufs-node's handle, or an array of them.
 * @name confirmNodesAtLocation
 * @memberOf MegaData.prototype
 * @returns {Promise<*>} ack
 */
lazy(MegaData.prototype, 'confirmNodesAtLocation', () => {
    'use strict';
    let promise;
    const bulk = new Set();
    const sml = `NAL.${makeUUID()}`;

    const attachS4Bucket = async(n) => {
        const name = n.name;
        return s4.kernel.bucket.create(n.p, n)
            .then(() => {
                if (name !== n.name) {
                    showToast('info', l.s4_bucket_autorename.replace('%1', n.name));
                }
            })
            .catch((ex) => {
                if (d) {
                    console.error(`Failed to establish S4 Bucket from existing node (${n.h})...`, ex, n);
                }
                return M.moveToRubbish(n.h);
            });
    };

    const dequeue = async(nodes) => {
        const promises = [];
        const parents = Object.create(null);

        for (let i = nodes.length; i--;) {
            const n = M.getNodeByHandle(nodes[i]);

            if (n) {
                const p = M.getNodeByHandle(n.p);
                const ps4t = p.s4 && s4.kernel.getS4NodeType(p);

                if (n.s4) {
                    if (d) {
                        console.warn(`Revoking S4 attribute for ${n.h}`);
                    }

                    if (ps4t !== 'container') {
                        promises.push(api.setNodeAttributes(n, {s4: undefined}));
                    }
                }

                if (ps4t) {

                    if (ps4t === 'container') {
                        promises.push(attachS4Bucket(n));
                    }
                    else if (ps4t === 'bucket') {

                        // @todo if type is bucket, validate expected object-type
                    }
                }

                parents[n.p] = n;
            }
        }

        if (promises.length) {
            await Promise.all(promises);
        }

        return parents;
    };

    const dispatcher = () => {
        const {resolve, reject} = promise;

        dequeue([...bulk])
            .then(resolve)
            .catch((ex) => {
                if (d) {
                    console.error('confirmNodesAtLocation', ex);
                }
                reject(ex);
            });

        bulk.clear();
        promise = null;
    };

    return (nodes) => {
        if (Array.isArray(nodes)) {
            nodes.map(bulk.add, bulk);
        }
        else {
            bulk.add(nodes);
        }
        delay(sml, dispatcher);
        return promise || (promise = mega.promise);
    };
});

// This function has a special hacky purpose, don't use it if you don't know what it does, use M.copyNodes instead.
MegaData.prototype.injectNodes = function(nodes, target, callback) {
    'use strict';
    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }
    let sane = nodes.filter((node) => this.isFileNode(node));

    if (sane.length !== nodes.length) {
        console.warn('injectNodes: Found invalid nodes.');
    }

    if (!sane.length) {
        return false;
    }

    nodes = [];
    sane = sane.map((node) => {
        if (!M.d[node.h]) {
            nodes.push(node.h);
            M.d[node.h] = node;
        }
        return node.h;
    });

    this.copyNodes(sane, target)
        .always((res) => {

            for (let i = nodes.length; i--;) {
                delete M.d[nodes[i]];
            }

            callback(res);
        });

    return nodes.length;
};

/**
 * Copy and/or import nodes.
 * @param {Array}       cn            Array of nodes that needs to be copied
 * @param {String}      t             Destination node handle
 * @param {Boolean}     [del]         Should we delete the node after copying? (Like a move operation)
 * @param {Array}       [tree]        optional tree from M.getCopyNodes
 * @returns {Promise} array of node-handles copied.
 */
MegaData.prototype.copyNodes = async function(cn, t, del, tree) {
    'use strict';
    const todel = [];
    const contact = String(t).length === 11;

    if (M.isInvalidUserStatus()) {
        throw EINTERNAL;
    }

    if (contact) {
        await api_cachepubkeys([t]);
    }

    if (!tree) {
        if (this.isFileNode(cn)) {
            tree = [cn];
        }
        else if ($.onImportCopyNodes) {
            tree = $.onImportCopyNodes;
            tree.isImporting = true;
        }
        else {
            // 1. get all nodes into memory
            tree = await this.getCopyNodes(cn, t, async() => {
                const handles = [...cn];
                const names = Object.create(null);
                const parents = Object.create(null);

                // 2. check for conflicts
                if (t !== M.RubbishID) {
                    const files = await fileconflict.check(cn, t, 'copy');

                    handles.length = 0;
                    for (let i = files.length; i--;) {
                        const n = files[i];

                        handles.push(n.h);
                        names[n.h] = n.name;

                        if (n._replaces) {
                            todel.push(n._replaces);
                        }
                        if (n.keepParent) {
                            parents[n.h] = n.keepParent;
                            del = false;
                            // it's complicated. For now if merging involved we wont delete
                            // as move to/from inshare is excuted as copy + del
                            // ---> here i am stopping 'del'
                        }
                    }

                    if (del) {
                        // Ensure we do only remove nodes agreed on the conflict resolution
                        cn = handles;
                    }
                }

                // 3. provide data back to getCopyNodes
                return {names, handles, parents};
            });
        }
    }

    if (!Object(tree).length) {
        // we may receive an empty array, for example if the user cancelled the fileconflict dialog

        return;
    }

    if (del) {
        await Promise.resolve(mega.fileRequestCommon.storage.isDropExist(cn))
            .then((shared) => {

                for (let i = tree.length; i--;) {
                    const n = this.getNodeByHandle(tree[i].h);

                    console.assert(n, 'Node not found... (%s)', tree[i].h);

                    if (n.shares || M.ps[n.h]) {
                        shared.push(n.h);
                    }
                }

                if (shared.length) {

                    // Confirm with the user the operation will revoke shares and he wants to
                    const type = `confirmation:!^${l[62]}!${l[16499]}`;

                    return asyncMsgDialog(type, l[870], l.shares_links_will_be_remove, l[6994], async(yes) => {
                        if (yes) {
                            return this.revokeShares(shared);
                        }
                        throw EBLOCKED;
                    });
                }
            });
    }

    if (tree.opSize) {

        await this.checkGoingOverStorageQuota(tree.opSize)
            .catch((ex) => {
                if (ex === EGOINGOVERQUOTA) {
                    // don't show an additional dialog for this error
                    throw EBLOCKED;
                }
                throw ex;
            });
    }
    const createAttribute = tryCatch((n, nn) => ab_to_base64(crypto_makeattr(n, nn)));

    const addRestoreAttribute = (t) => {
        for (let i = 0; i < cn.length; i++) {
            const src = this.getNodeByHandle(cn[i]);
            if (!src || this.getNodeRoot(src.h) === M.RubbishID) {
                continue;
            }

            for (let x = 0; x < t.length; x++) {
                if (t[x].h === src.h) {

                    if (d) {
                        console.debug('Adding restore attribute to %s with %s', t[x].h, src.p);
                    }
                    const n = {...M.d[t[x].h]};
                    const nn = Object.create(null);

                    if (!n.t) {
                        nn.k = n.k;
                    }
                    n.rr = src.p;

                    if (!(nn.a = createAttribute(n, nn))) {

                        console.warn(`Failed to create attribute for node ${n.h}, ignoring...`);
                        continue;
                    }

                    // new node inherits handle, parent and type
                    nn.h = n.h;
                    nn.t = n.t;

                    t[x] = nn;
                    break;
                }
            }
        }
    };

    const createAPIRequests = (targets) => {
        const request = [];

        for (const t in targets) {
            const req = {a: 'p', sm: 1, v: 3, t, n: targets[t]};

            const sn = this.getShareNodesSync(t, null, true);
            if (sn.length) {
                req.cr = crypto_makecr(targets[t], sn, false);
            }

            // eventually append 'cauth' ticket in the objj req.
            if (M.chat && megaChatIsReady) {
                megaChat.eventuallyAddDldTicketToReq(req);
            }

            if (t === this.RubbishID) {
                // since we are copying to rubbish we don't have multiple "d" as duplications are allowed in Rubbish
                // but below code is generic and will work regardless
                addRestoreAttribute(targets[t]);
            }

            const c = (t || "").length === 11;
            for (let i = 0; i < targets[t].length; i++) {

                targets[t][i].k = c
                    ? base64urlencode(encryptto(t, a32_to_str(targets[t][i].k)))
                    : a32_to_base64(encrypt_key(u_k_aes, targets[t][i].k));
            }

            if (c || t === M.InboxID) {
                req.vw = 1;
            }

            request.push(req);
        }

        return request.length < 2 ? request[0] : request;
    };

    const targets = Object.create(null);
    for (let i = 0; i < tree.length; i++) {
        const dst = tree[i].newTarget || t;

        if (targets[dst]) {
            targets[dst].push(tree[i]);
        }
        else {
            targets[dst] = [tree[i]];
        }
        delete tree[i].newTarget;
    }

    if (contact || tree.isImporting) {
        onIdle(getsc);
    }

    return api.screq(createAPIRequests(targets))
        .then(({pkt, result}) => {

            if (del) {
                const promises = [];

                for (let i = cn.length; i--;) {
                    // must not update DB pre-API
                    this.delNode(cn[i], true);

                    if (!result[i]) {
                        promises.push(api.screq({a: 'd', n: cn[i]}));
                    }
                }

                if (promises.length) {
                    Promise.all(promises).catch(dump);
                }
            }

            if (todel.length) {
                this.safeRemoveNodes(todel).catch(dump);
            }

            const total = tree.length;
            const success = total - Object.keys(result).length;

            if (total && success < total) {
                if (success) {
                    const items = mega.icu.format(l.download_and_import_items_count, total);
                    const message = mega.icu.format(l[8683], success).replace('%1', items);

                    msgDialog('warninga', l[882], message);
                }
                else {
                    msgDialog('error', l[882], l[2507]);
                }
            }

            result = [];
            for (let i = pkt.length; i--;) {
                const {scnodes} = pkt[i];
                if (scnodes) {
                    result.push(...scnodes.map(n => n.h));
                }
            }

            // @todo better error handling..
            this.confirmNodesAtLocation(result).catch(tell);

            return result;

        })
        .catch((ex) => {
            // If target of copy/move is in-shared folder, -17 may means ESHAREROVERQUOTA
            M.ulerror(null, ex === EOVERQUOTA && sharer(t) ? ESHAREROVERQUOTA : ex);

            throw ex;
        });
};

/**
 * Move nodes.
 * @param {Array}   n       Array of node handles
 * @param {String}  t       Target folder node handle
 * @param {Number} [folderConflictResolution] pass a default conflict resolution {optional}
 * @returns {Promise} Resolves with the number of moves
 */
MegaData.prototype.moveNodes = async function(n, t, folderConflictResolution) {
    'use strict';

    if (M.isInvalidUserStatus()) {
        throw EINTERNAL;
    }

    const todel = [];
    const promises = [];
    const handles = array.unique(n);
    const names = Object.create(null);
    const mergedFolder = Object.create(null);
    const parentsToKeep = Object.create(null);

    const collect = this.collectNodes(n, t, t && t !== this.RubbishID);

    if (newnodes.length) {
        promises.push(this.updFileManagerUI());
    }
    if (collect) {
        promises.push(collect);
    }
    if (promises.length) {
        await Promise.all(promises).catch(dump);
    }

    const cleanEmptyMergedFolders = () => {
        if (Object.keys(mergedFolder).length) {
            // cleaning empty folders (moved).
            // during merging folders may still have some items (user chose dont move for
            // one or more files).
            // therefore, we check folders in src, if found empty --> clean.
            const recursiveFolderCheck = (handle) => {
                let cleanMe = true;
                const tempDeleted = [];

                for (const h in this.c[handle]) {
                    if (!this.d[h].t) {
                        return false;
                    }

                    const res = recursiveFolderCheck(h);
                    if (res) {
                        tempDeleted.push(h);
                    }
                    else {
                        cleanMe = false;
                    }
                }

                if (cleanMe) {
                    for (let i = 0; i < tempDeleted.length; i++) {
                        const loc = todel.indexOf(tempDeleted[i]);
                        if (loc >= 0) {
                            todel.splice(loc, 1);
                        }
                    }

                    todel.push(handle);
                    return true;
                }
            };

            for (let i = 0; i < n.length; i++) {
                if (mergedFolder[n[i]]) {
                    recursiveFolderCheck(n[i]);
                }
            }
        }
    };

    const getPreEmptiveAttributeChanges = (n, p, a) => {
        let c = 0;

        a = a || Object.create(null);

        if (n.s4) {
            if (d) {
                console.warn('[%s] Removing S4 attribute...', n.h, n.s4, p);
            }

            c++;
            a.s4 = undefined;
        }

        if (names[n.h] && names[n.h] !== n.name) {
            if (d) {
                console.debug('[%s] Renaming node...', n.h, [n.name], [names[n.h]]);
            }

            c++;
            a.name = names[n.h];
        }

        return c && a;
    };

    // Get on due node attribute changes.
    const getAttributeChanges = (n, p, target, root) => {
        let c = 0;
        const a = Object.create(null);

        if (target === this.RubbishID && root !== this.RubbishID) {

            if (!n.rr || n.rr !== p) {

                if (d) {
                    console.debug('[%s] Adding Restore attribute...', n.h, n.rr, p);
                }

                c++;
                a.rr = p;
            }
        }
        else if (n.rr) {

            if (d) {
                console.debug('[%s] Removing Restore attribute...', n.h, n.rr, p);
            }

            c++;
            a.rr = undefined;
        }

        return getPreEmptiveAttributeChanges(n, p, a) || c && a;
    };

    // Fire an api request to move a node or a group of them to a specific location.
    const sendAPIRequest = (handles) => {

        // Perform node collection to initiate the move operation.
        const nodes = [];
        const request = [];
        const promises = [];
        const targets = Object.create(null);

        for (let i = 0; i < handles.length; i++) {
            const dst = parentsToKeep[handles[i]] || t;

            if (targets[dst]) {
                targets[dst].push(handles[i]);
            }
            else {
                targets[dst] = [handles[i]];
            }
        }

        for (const t in targets) {

            for (let i = 0; i < targets[t].length; i++) {
                let n = targets[t][i];
                const req = {a: 'm', t, n};

                if (this.getNodeRoot(req.n) === this.InboxID) {

                    mega.backupCenter.ackVaultWriteAccess(req.n, req);
                }
                request.push(processmove(req));

                if ((n = this.getNodeByHandle(n))) {

                    nodes.push([{...n}, t, this.getNodeRoot(n.h)]);

                    const a = getPreEmptiveAttributeChanges(n);
                    if (a) {
                        promises.push(api.setNodeAttributes(n, a));
                    }
                }
            }
        }

        if (request.length) {

            return Promise.all([mega.keyMgr.moveNodesApiReq(request.length < 2 ? request[0] : request), ...promises])
                .then(([{result, st}]) => {
                    const promises = [];

                    assert(result === 0, `APIv3 ${l[16]}...rc:${result}`);
                    assert(st && typeof st === 'string', `APIv3 ${l[16]}...st:${st}`);

                    for (let i = nodes.length; i--;) {
                        const [{h, p}, target, root] = nodes[i];
                        const n = this.getNodeByHandle(h);

                        assert(n.h === h && n.p !== p && n.p === target, `APIv3 ${l[16]}...mv:${n.h}`);

                        const a = getAttributeChanges(n, p, target, root);
                        if (a) {
                            promises.push(api.setNodeAttributes(n, a));
                        }

                        nodes[i] = h;
                    }

                    return Promise.all(promises).then(() => M.confirmNodesAtLocation(nodes)).then(() => st);
                })
                .then((res) => {
                    $.tresizer();
                    onIdle(fmLeftMenuUI);

                    // clean merged empty folders if any
                    cleanEmptyMergedFolders();

                    if (todel.length) {
                        // finish operation removing dangling nodes, if any
                        this.safeRemoveNodes(todel).catch(dump);
                    }

                    return res;
                })
                .catch(tell);
        }
    };

    // per specs, if one of merged folders [src or dest] has sharing --> stop
    const handleConflictResolution = (files) => {
        let sharingIssueBetweenMerged = false;
        if (!files.length) {
            // user canceled the operation.
            throw EBLOCKED;
        }
        for (let i = 0; i < files.length; i++) {
            const n = files[i];

            if (n._mergedFolderWith) {
                mergedFolder[n.h] = n._mergedFolderWith;

                let s = this.getShareNodesSync(n.h);
                if (s && s.length) {
                    sharingIssueBetweenMerged = true;
                    break;
                }
                s = this.getShareNodesSync(n._mergedFolderWith);
                if (s && s.length) {
                    sharingIssueBetweenMerged = true;
                    break;
                }

                // ignore this node, nothing to do
                continue;
            }
            names[n.h] = n.name;

            if (n._replaces) {
                todel.push(n._replaces);
            }
            if (n.keepParent) {
                parentsToKeep[n.h] = n.keepParent;
            }

            handles.push(n.h);
        }

        if (sharingIssueBetweenMerged) {

            return asyncMsgDialog('warningb', l[135], l[47], l[17739])
                .always(() => {
                    throw EBLOCKED;
                });
        }
    };

    // If the target folder is not the Rubbish, check whether we have to handle conflicts.
    if (t !== this.RubbishID) {
        handles.length = 0;

        await mega.fileRequest.preMoveCheck(n, t)
            .then(([n, t]) => {

                return fileconflict.check(n, t, 'move', null, folderConflictResolution)
                    .then(handleConflictResolution);
            });
    }

    return sendAPIRequest(handles);
};

/**
 * Helper function to move nodes falling back to copy+delete under inshares.
 *
 * @param {String} target  The handle for the target folder to move nodes into
 * @param {Array} [nodes]  Array of nodes to move, $.selected if none provided
 * @returns {Promise}
 */
MegaData.prototype.safeMoveNodes = async function safeMoveNodes(target, nodes) {
    'use strict';

    if (M.isInvalidUserStatus()) {
        throw EINTERNAL;
    }
    nodes = array.unique(nodes || $.selected || []);

    let c = 0;
    const pending = this.collectNodes(nodes, target);
    if (pending) {
        await pending;
    }

    const copy = [];
    const move = [];
    const promises = [];
    const totype = treetype(target);

    if (d) {
        ++c;
        console.group('safeMoveNodes for %s nodes to target %s (%s)', nodes.length, target, totype, nodes);
    }

    for (let i = nodes.length; i--;) {
        const node = nodes[i];
        const fromtype = treetype(node);

        if (fromtype === totype) {

            if (!this.isCircular(node, target)) {

                if (totype !== 'shares' || sharer(node) === sharer(target)) {

                    move.push(node);
                }
                else {
                    copy.push(node);
                }
            }
        }
        else {
            copy.push(node);
        }
    }

    if (copy.length) {
        console.debug('Performing %s copy+del operations...', copy.length);
        promises.push(M.copyNodes(copy, target, true));
    }
    if (move.length) {
        console.debug('Performing %s move operations...', move.length);
        promises.push(M.moveNodes(move, target));
    }
    M.clearSelectedNodes();

    if (promises.length) {

        await Promise.all(promises);
    }

    if (c) {
        console.groupEnd();
    }
};

/**
 * Helper function to remove nodes, either sending them to Rubbish or permanently.
 * @param {String|Array} handles The handle(s) to remove
 * @returns {Promise}
 */
MegaData.prototype.safeRemoveNodes = function(handles) {
    'use strict';

    if (M.isInvalidUserStatus()) {
        return Promise.reject(EINTERNAL);
    }

    handles = handles || [];

    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    handles = array.unique(handles);

    // Load required nodes into memory.
    return dbfetch.geta(handles).then(() => {
        var i;
        var toDel = [];
        var toMove = [];
        var promises = [];

        for (i = handles.length; i--;) {
            var h = handles[i];
            var n = M.getNodeByHandle(h);
            const fromtype = treetype(h);

            if (fromtype === 'shares' || fromtype === 'inbox' || n.p === M.RubbishID) {
                toDel.push(h);
            }
            else {
                toMove.push(h);
            }
        }

        if (toMove.length) {
            promises.push(M.moveNodes(toMove, M.RubbishID));
        }

        if (toDel.length) {
            for (i = toDel.length; i--;) {
                const req = {a: 'd', n: toDel[i]};
                if (M.getNodeRoot(req.n) === M.InboxID) {
                    mega.backupCenter.ackVaultWriteAccess(req.n, req);
                }
                promises.push(api.screq(req));
            }
        }

        return Promise.all(promises);
    });
};

/**
 * Revert nodes sent to the rubbish, i.e. they must have `rr` attributes
 * @param {String|Array} handles The handle(s) to revert
 * @returns {Promise}
 */
MegaData.prototype.revertRubbishNodes = mutex('restore-nodes', function(resolve, reject, handles) {
    'use strict';

    if (M.isInvalidUserStatus()) {
        return reject(EINTERNAL);
    }

    handles = handles || [];
    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    handles = array.unique(handles);

    if (d) {
        console.group('revertRubbishNodes for %s nodes...', handles.length, handles);
    }

    const promptFor = new Set([M.InboxID]);

    const finish = async({nodes, selTarget, targets}) => {

        // removeUInode may queued another `delay('openfolder', ...)`, let's overwrite it.
        delay.cancel('openfolder');

        const prompt = [...promptFor];
        for (let i = prompt.length; i--;) {
            const sel = targets[prompt[i]];

            if (sel) {
                M.addSelectedNodes(sel, true);

                const target = await selectFolderDialog('move').catch(dump);
                if (target) {
                    selTarget = [target, nodes = sel];
                    await M.moveNodes(sel, target, 3).catch(dump);
                }
            }
        }

        if (!is_mobile) {
            delay('openfolder', () => {
                M.openFolder(selTarget[0])
                    .catch(dump)
                    .finally(() => {
                        M.addSelectedNodes(nodes.length && nodes || selTarget[1], true);
                    });
            }, 90);
        }

        return targets;
    };

    // Load required nodes into memory.
    dbfetch.geta(handles).then(() => {
        const to = new Set();

        for (let i = handles.length; i--;) {
            const h = handles[i];
            const n = this.getNodeByHandle(h);

            if (!n) {
                if (d) {
                    console.debug('revertRubbishNodes: node not found.', h);
                }
            }
            else if (n.rr) {
                to.add(n.rr);
            }
        }

        return to.size && dbfetch.geta([...to]);
    }).then(() => {
        const targets = Object.create(null);

        for (let i = handles.length; i--;) {
            const h = handles[i];
            const n = this.getNodeByHandle(h);

            let target = n.rr;
            const root = target && this.getNodeRoot(target);

            if (this.getNodeRoot(h) !== M.RubbishID) {
                continue;
            }

            if (!M.d[target] || root === M.RubbishID || M.getNodeRights(target) < 2) {
                if (d) {
                    console.warn('Reverting falling back to cloud root for %s.', h, target, n);
                }
                target = M.RootID;
            }
            else if (promptFor.has(root)) {
                target = root;
            }

            if (targets[target]) {
                targets[target].push(h);
            }
            else {
                targets[target] = [h];
            }
        }
        assert($.len(targets), 'Invalid invocation, nothing to restore.', handles);

        let selTarget;
        const promises = [];

        for (var k in targets) {
            if (!promptFor.has(k)) {
                if (d) {
                    console.debug('Reverting %s into %s...', targets[k], k);
                }

                promises.push(this.safeMoveNodes(k, targets[k]));
            }
            selTarget = [k, targets[k]];
        }

        return Promise.all(promises)
            .then((handles) => {

                // we will only get new nodes if a copy+del was invoked.
                const nodes = handles.flat().map((h) => M.d[h]).filter(Boolean);

                return {nodes, selTarget, targets};
            });
    }).then(finish).then(resolve).catch(reject).finally(() => console.groupEnd());
});

/**
 * Helper to move nodes to the rubbish bin
 * @param {String|Array} handles The handle(s) to move
 * @returns {Promise}
 */
MegaData.prototype.moveToRubbish = async function(handles) {
    'use strict';
    let tag;

    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    handles = array.unique(handles);

    if (d) {
        tag = MurmurHash3(handles.join('~')).toString(36);
        console.group('[%s] moveToRubbish %s nodes...', tag, handles.length, handles);
        console.time(`moveToRubbish.${tag}`);
    }

    const pending = this.collectNodes(handles);
    if (pending) {
        await pending;
    }
    // @todo revoke + move in batched-mode.

    // always revoke any sharing status recursively across the affected nodes
    return Promise.all([this.revokeShares(handles), this.safeMoveNodes(this.RubbishID, handles)])
        .finally(() => {
            if (d) {
                console.timeEnd(`moveToRubbish.${tag}`);
                console.groupEnd();
            }
        });
};

/**
 * Stop sharing nodes recursively across provided handles.
 * @param {String|Array} handles The root node handle(s) to stop sharing
 * @returns {Promise}
 */
MegaData.prototype.revokeShares = async function(handles) {
    'use strict';

    if (M.isInvalidUserStatus()) {
        throw EINTERNAL;
    }

    if (d) {
        console.group('revokeShares for %s nodes...', handles.length, handles);
    }

    const pending = this.collectNodes(handles);
    if (pending) {
        await pending;
    }

    const links = [];
    const folders = [];

    const tree = (() => {
        let res = [];

        for (let i = handles.length; i--;) {
            const n = this.d[handles[i]];

            if (n) {
                if (n.t) {
                    folders.push(n.h);
                }
                if (n.ph) {
                    links.push(n.h);
                }
                res = [...res, ...this.getNodesSync(n.h, true)];
            }
            else if (d) {
                console.warn('revokeShares: node not found.', handles[i]);
            }
        }
        return res;
    })();

    const promises = (() => {
        const res = [];

        for (let i = tree.length; i--;) {
            const h = tree[i];

            for (const share in Object(this.d[h]).shares) {
                const user = this.d[h].shares[share].u;

                if (user === 'EXP') {
                    links.push(h);
                }
                else {
                    if (d) {
                        console.debug('Revoking shared folder %s with user %s...', h, user);
                    }
                    res.push(this.revokeFolderShare(h, user));
                }
            }

            for (var u in this.ps[h]) {
                if (d) {
                    console.debug('Revoking pending shared folder %s with user %s...', h, u);
                }
                res.push(this.revokeFolderShare(h, u, true));
            }
        }

        return res;
    })();

    let res = false;

    // delete pending outshares for the deleted nodes
    if (folders.length) {
        promises.push(mega.keyMgr.deletePendingOutShares(folders));
    }

    const widgets = mega.fileRequestCommon.storage.isDropExist(folders);
    if (widgets.length) {

        if (d) {
            console.debug('Revoking %s File request folders...', widgets.length);
        }

        promises.push(mega.fileRequest.removeList(widgets, true));
    }

    if (links.length) {

        if (d) {
            console.debug('Revoking %s public links...', links.length);
        }

        const exportLink = new mega.Share.ExportLink({'updateUI': true, 'nodesToProcess': array.unique(links)});
        promises.push(exportLink.removeExportLink(true));
    }

    if (promises.length) {

        if (d) {
            console.debug('revokeShares: awaiting for %s promises...', promises.length);
        }

        res = await Promise.allSettled(promises);
    }

    if (d) {
        console.groupEnd();
    }

    return res;
};

/**
 * Revoke folder share by invoking an s2 request.
 * @param {String} h The ufs-node handle
 * @param {String} usr The user-handle this node is shared with, or pcr id
 * @returns {Promise}
 */
MegaData.prototype.revokeFolderShare = function(h, usr) {
    'use strict';

    if (M.isInvalidUserStatus()) {
        return Promise.reject(EINTERNAL);
    }

    if (String(h).length !== 8 || String(usr).length !== 11) {
        if (d) {
            console.warn('revokeFolderShare: Invalid arguments...', h, usr);
        }
        return Promise.reject(EARGS);
    }

    return api.screq({a: 's2', n: h, s: [{u: Object(M.opc[usr]).m || usr, r: ''}], ha: '', i: requesti})
        .then(({result}) => {

            if (!result.r || result.r[0] !== 0) {
                if (d) {
                    console.warn('revokeFolderShare failed.', result, h, usr);
                }
                throw new Error('revokeFolderShare failed.');
            }
        });
};

/**
 * Function to invoke when a node has been modified.
 * @param {Object|MegaNode} n The ufs-node that got updated.
 * @param {Boolean} [ignoreDB] Whether to prevent saving to DB
 */
MegaData.prototype.nodeUpdated = function(n, ignoreDB) {
    if (n.h && n.h.length == 8) {
        if (n.t && n.td === undefined) {
            // Either this is a newly created folder or it comes from a fresh gettree
            n.td = 0;
            n.tf = 0;
            n.tb = 0;
        }

        if (this.nn && n.name && !n.fv) {
            this.nn[n.h] = n.name;
        }

        // update My chat files folder
        if (this.cf.h === n.h) {
            this.cf = n.p === M.RubbishID ? false : n;
        }

        // sync missingkeys with this node's key status
        if (crypto_keyok(n)) {
            // mark as fixed if necessary
            if (missingkeys[n.h]) {
                crypto_keyfixed(n.h);
            }
        }
        else {
            // always report missing keys as more shares may
            // now be affected
            if (n.k) {
                crypto_reportmissingkey(n);
            }
        }

        // maintain special incoming shares index
        if (n.su) {
            if (!this.c[n.su]) {
                this.c[n.su] = Object.create(null);
            }
            this.c[n.su][n.h] = n.t + 1;

            /*
            if (!M.d[n.p]) {
                n.sp = n.p;
                n.p = '';
            }*/

            if (!this.c.shares[n.h]) {
                if (n.sk && !u_sharekeys[n.h]) {
                    // extract sharekey from node's sk property
                    var k = crypto_process_sharekey(n.h, n.sk);
                    if (k !== false) {
                        crypto_setsharekey(n.h, k, ignoreDB);
                    }
                }

                this.c.shares[n.h] = { su: n.su, r: n.r, t: n.h };

                if (u_sharekeys[n.h]) {
                    this.c.shares[n.h].sk = a32_to_base64(u_sharekeys[n.h][0]);
                }

                if (fmdb && !ignoreDB) {
                    fmdb.add('s', {
                        o_t: `${n.su}*${n.h}`,
                        d: this.c.shares[n.h]
                    });
                }
            }
        }

        // store this node into IndexedDB
        ufsc.addToDB(n);

        // fire realtime UI updates if - and only if - required.
        if (fminitialized) {
            const {type} = this.currentCustomView || !1;

            // if node in cached mode in editor, clear it
            if (mega.fileTextEditor) {
                mega.fileTextEditor.clearCachedFileData(n.h);
            }

            if (type === 'gallery' || this.gallery) {
                tryCatch(() => mega.gallery.checkEveryGalleryUpdate(n))();
                tryCatch(() => mega.gallery.albums.onCDNodeUpdate(n))();
            }
            else if (type === 'albums') {
                tryCatch(() => mega.gallery.albums.onCDNodeUpdate(n))();
                mega.gallery.nodeUpdated = true;
            }
            else {
                mega.gallery.nodeUpdated = true;
                mega.gallery.albumsRendered = false;
            }

            if (this.isDynPage(this.currentdirid) > 1) {
                this.dynContentLoader[this.currentdirid].sync(n);
            }

            // Update versioning dialog if it is open and the folder is its parent folder,
            // the purpose of the following code is to update permisions of historical files.
            if ($.selected && $.selected.length && window.versiondialogid) {
                let parent = $.selected[0];

                while ((parent = this.getNodeByHandle(parent).p)) {
                    if (parent === n.h) {
                        fileversioning.updateFileVersioningDialog();
                        break;
                    }
                }
            }

            mBroadcaster.sendMessage(`nodeUpdated:${n.h}`);
        }
    }
};


/**
 * Fire DOM updating when a folder node's size gets updated
 * @param {MegaNode} node  node object to update in UI
 */
MegaData.prototype.onFolderSizeChangeUIUpdate = function(node) {
    "use strict";
    var p = this.viewmode === 0 && this.currentdirid || false;
    if (p && String(p).slice(-8) === node.p || M.currentCustomView || p === 'shares') {
        var elm = document.getElementById(node.h);

        if (elm) {
            var s1 = elm.querySelector('.size');
            var s2 = elm.querySelector('.shared-folder-size');

            if (s1 || s2) {
                var sizeText = bytesToSize(node.tb);

                if (s1) {
                    s1.textContent = sizeText;
                }
                if (s2) {
                    s2.textContent = sizeText;

                    if ((s2 = elm.querySelector('.shared-folder-info'))) {
                        s2.textContent = fm_contains(node.tf, node.td);
                    }
                }
            }
        }

        // @todo consider bringing back an approach to re-sort by size, one that wouldn't lead to uncaught exceptions.
    }
};

/**
 * Fire DOM updating when a node gets a new name
 * @param {String} itemHandle  node's handle
 * @param {String} newItemName the new name
 */
MegaData.prototype.onRenameUIUpdate = function(itemHandle, newItemName) {
    'use strict';

    if (fminitialized) {
        const n = this.getNodeByHandle(itemHandle);
        const domListNode = document.getElementById(n.h);
        const domTreeNode = document.getElementById(`treea_${n.h}`);

        // DOM update, left and right panel in 'Cloud Drive' tab
        if (domListNode) {
            const selectors = [
                '.file-block-title',
                '.shared-folder-name',
                '.mobile.fm-item-name',
                '.tranfer-filetype-txt'
            ];
            $(selectors.join(', '), domListNode).text(newItemName);
        }

        // DOM update, left and right panel in "Shared with me' tab
        if (domTreeNode) {
            $('span:nth-child(2)', domTreeNode).text(newItemName);
        }

        // DOM update, right panel view during browsing shared content
        if (M.currentdirid === itemHandle) {
            $('.shared-details-block .shared-details-pad .shared-details-folder-name').text(newItemName);
        }

        // DOM update, breadcrumbs in 'Shared with me' tab
        if (document.getElementById(`path_${n.h}`)) {
            delay('render:path_breadcrumbs', () => this.renderPathBreadcrumbs());
        }

        mega.fileRequest.onRename(itemHandle, newItemName);

        // update file versioning dialog if the name of the versioned file changes.
        if (!n.t && n.tvf > 0) {
            fileversioning.updateFileVersioningDialog(itemHandle);
        }
        fm_updated(n);

        if (document.getElementById(`treeli_${n.h}`)) {
            // Since n.h may not be a folder, we need to do some check to ensure we really need to do a tree redraw.
            // In case its rendered in the dom as #treeli_hash, then this is 100% a folder that was rendered in its old
            // order.
            // Last but not least, we throttle this, so that big move/rename operations would only redraw the tree once
            delay('onRenameUIUpdateTreePane', () => this.redrawTree());
        }

        if (this.recentsRender) {
            this.recentsRender.nodeChanged(itemHandle);
        }
    }
};

MegaData.prototype.rename = async function(itemHandle, newItemName) {
    'use strict';
    const n = this.getNodeByHandle(itemHandle);

    if (d) {
        console.assert(!n || n.name !== newItemName, 'Unneeded rename invoked.');
    }

    if (n && n.name !== newItemName) {
        const prop = {name: newItemName};

        if (n.s4) {
            const res = s4.kernel.validateForeignAction('rename', {node: n, ...prop});

            if (res) {
                if (res instanceof Promise) {
                    return res;
                }
                prop.name = res;
            }
        }

        return api.setNodeAttributes(n, prop);
    }
};

/**
 * Colour Label context menu update
 *
 * @param {Array | string} handles Selected nodes handles
 */
MegaData.prototype.colourLabelcmUpdate = function(handles) {

    'use strict';

    if (fminitialized && handles) {
        if (!Array.isArray(handles)) {
            handles = [handles];
        }

        const $items = $('.files-menu .dropdown-colour-item');
        const values = [];
        let hasLabelCnt = 0;

        for (let i = handles.length; i--;) {
            const node = M.d[handles[i]];
            if (!node) {
                if (d) {
                    console.warn('Node not found.', handles[i]);
                }
                continue;
            }

            if (node.lbl) {
                hasLabelCnt++;
                if (!values.includes(node.lbl)) {
                    values.push(node.lbl);
                }
            }
        }

        // Determine all nodes have the same label
        const isUnifiedLabel = values.length === 1 && handles.length === hasLabelCnt;

        // Reset label submenu
        $items.removeClass('active update-to');

        // Add active state label
        if (values.length > 0) {
            $items.addClass('update-to');

            for (let j = values.length; j--;) {
                $items.filter(`[data-label-id=${values[j]}]`).addClass('active');
            }

            if (isUnifiedLabel) {
                // Remove the 'update-to' classname since all nodes have the same label
                $items.filter(`[data-label-id=${values[0]}]`).removeClass('update-to');
            }
        }
    }
};

MegaData.prototype.getLabelClassFromId = function(id) {
    'use strict';
    return {
        '1': 'red', '2': 'orange', '3': 'yellow',
        '4': 'green', '5': 'blue', '6': 'purple', '7': 'grey'
    }[id] || '';
};

/**
 * labelDomUpdate
 *
 * @param {String} handle
 * @param {Number} value Current labelId
 */
MegaData.prototype.labelDomUpdate = function(handle, value) {
    "use strict";

    if (fminitialized) {

        const n = M.d[handle] || false;

        var labelId = parseInt(value);
        var removeClasses = 'colour-label red orange yellow blue green grey purple';
        var color = '<div class="colour-label-ind %1"></div>';
        var prefixTree = M.currentCustomView.prefixTree || '';
        var $treeElements = $(`#treea_${handle}`).add(`#treea_os_${handle}`).add(`#treea_pl_${handle}`);

        // Remove all colour label classes
        var $item = $(M.megaRender && M.megaRender.nodeMap[handle] || `#${handle}`);
        $item.removeClass(removeClasses);
        $('a', $item).removeClass(removeClasses);
        $('.label', $item).text('');
        $treeElements.removeClass('labeled');
        $('.colour-label-ind', $treeElements).remove();

        if (labelId) {
            // Add colour label classes.
            var lblColor = M.getLabelClassFromId(labelId);
            var colourClass = `colour-label ${lblColor}`;

            $item.addClass(colourClass);
            $('a', $item).addClass(colourClass);
            $('.nw-fm-tree-iconwrap', $treeElements)
                .safePrepend(color.replace('%1', M.getLabelClassFromId(labelId))).addClass('labeled');
            if (M.megaRender) {
                $('.label', $item).text(M.megaRender.labelsColors[lblColor]);
            }
        }

        var currentTreeLabel = M.filterTreePanel[`${M.currentTreeType}-label`];
        // if current tree is on filtering
        if (currentTreeLabel && Object.keys(currentTreeLabel).length > 0) {
            // and action is assigning new tag
            if (labelId && currentTreeLabel[labelId]) {
                $(`#treeli_${prefixTree}${handle}`).removeClass("tree-item-on-filter-hidden");
            }
            // and action is unassigning old tag
            else {
                $(`#treeli_${prefixTree}${handle}`).addClass("tree-item-on-filter-hidden");
            }
        }

        // make filter enable/disable depending on filter availabilty.
        $('.dropdown-section .dropdown-item-label')
            .add('.dropdown-section.filter-by .labels')
            .addClass('disabled static');

        if (M.isLabelExistNodeList(M.v)) {
            $('.dropdown-section .dropdown-item-label')
                .add('.dropdown-section.filter-by .labels')
                .removeClass('disabled static');
        }

        const {n: dir} = M.sortmode || {};

        if (n.p === M.currentdirid && dir === 'label') {

            const domNode = M.megaRender && M.megaRender.nodeMap[n.h] || document.getElementById(n.h);

            this.updateDomNodePosition(n, domNode);
        }
    }
};

/**
 * Labeling of nodes updates DOM and API
 *
 * @param {Array | string} handles Selected nodes handles
 * @param {Integer} newLabelState Numeric value of the new label
 */
MegaData.prototype.labeling = function(handles, newLabelState) {

    'use strict';

    if (fminitialized && handles) {
        onIdle(() => this.initLabelFilter(this.v));

        if (!Array.isArray(handles)) {
            handles = [handles];
        }
        newLabelState |= 0;

        handles.map(h => this.getNodeRights(h) > 1 && this.getNodeByHandle(h))
            .filter(Boolean)
            .map(n => {

                if (n.tvf) {
                    fileversioning.labelVersions(n.h, newLabelState);
                }

                return api.setNodeAttributes(n, {lbl: newLabelState}).catch(tell);
            });
    }
};

MegaData.prototype.labelFilterBlockUI = function() {
    "use strict";

    var type = M.currentLabelType;
    // Hide all filter DOM elements
    $('.fm-right-header.fm .filter-block.body').addClass('hidden');
    $('.files-grid-view.fm .filter-block.body').addClass('hidden');

    if (M.currentLabelFilter) {

        if (M.viewmode) {// Block view
            if (type === 'shares') {
                $(`.fm-right-header.fm .filter-block.${type}.body`).removeClass('hidden');
            }
            else if (type === 'contact') {
                $('.filter-block.body').addClass('hidden');
                $('.fm-right-header.fm .filter-block.body').addClass('hidden');
            }
            else {
                $(`.filter-block.${type}.body`).addClass('hidden');
                $(`.fm-right-header.fm .filter-block.${type}.body`).removeClass('hidden');
            }
        }
        else if (type === 'shares') {
            $(`.fm-right-header.fm .filter-block.${type}.body`).removeClass('hidden');
        }
        else if (type === 'contact') {
            $('.filter-block.body').addClass('hidden');
            $('.fm-right-header.fm .filter-block.body').addClass('hidden');
        }
        else {
            $(`.fm-right-header.fm .filter-block.${type}.body`).addClass('hidden');
            $(`.filter-block.${type}.body`).removeClass('hidden');
        }
    }
};

MegaData.prototype.labelType = function() {
    "use strict";

    var result = 'fm';
    switch (M.currentrootid) {
        case 'shares':
            result = 'shares';
            break;
        case 'out-shares':
            result = 'out-shares';
            break;
        case 'public-links':
            result = 'public-links';
            break;
        case M.RubbishID:
            result = 'rubbish';
            break;
        case 'contacts':
            result = 'contacts';
            break;
        default:
            break;
    }

    return result;
};

/*
 * update clicked label's display info
 *
 * @param {Object} e  event triggered to excuting this.
 */
MegaData.prototype.updateLabelInfo = function(e) {
    "use strict";
    const $target = $(e.target);
    const labelTxt = $target.data('label-txt');

    const map = {
        0: {
            'Red': l[19570], 'Orange': l[19574], 'Yellow': l[19578],
            'Green': l[19582], 'Blue': l[19586], 'Purple': l[19590], 'Grey': l[19594],
        },
        1: {
            'Red': l[19571], 'Orange': l[19575], 'Yellow': l[19579],
            'Green': l[19583], 'Blue': l[19587], 'Purple': l[19591], 'Grey': l[19595]
        }
    };

    $('.labels .dropdown-color-info')
        .safeHTML(map[$target.hasClass('active') | 0][labelTxt] || labelTxt)
        .addClass('active');
};

/*
 * filter fm and shared with me by tag colour
 *
 * @param {Object} e  event triggered to excuting this.
 */
MegaData.prototype.applyLabelFilter = function(e) {
    "use strict";

    var $t = $(e.target);
    var labelId = parseInt($t.data('label-id'));
    var type = M.currentLabelType;
    var $menuItems = $('.colour-sorting-menu .dropdown-colour-item');
    var $filterBlock = $(`.filter-block.${type}.body`);
    var fltIndicator = '<div class="colour-label-ind %1"></div>';
    var obj = M.filterLabel[type];// Global var holding colour tag filter information for fm and shares

    obj[labelId] = !obj[labelId];

    if (obj[labelId]) {
        $menuItems.filter(`[data-label-id=${labelId}]`).addClass('active');
        $filterBlock.find('.content').append(fltIndicator.replace('%1', M.getLabelClassFromId(labelId)));

        if (M.viewmode) {// Block view
            $(`.fm-right-header.fm .filter-block.${type}.body`).removeClass('hidden');
        }
        else if (M.currentrootid === M.RootID || M.currentrootid === M.RubbishID) {
            $(`.filter-block.${type}.body`).removeClass('hidden');
        }
        else {
            $(`.fm-right-header.fm .filter-block.${type}.body`).removeClass('hidden');
        }
    }
    else {
        delete obj[labelId];

        $menuItems.filter(`[data-label-id=${labelId}]`).removeClass('active');
        $(`.colour-label-ind.${M.getLabelClassFromId(labelId)}`, $filterBlock).remove();
        if (!Object.keys(obj).length) {
            delete M.filterLabel[type];
            $filterBlock.addClass('hidden');
            $.hideContextMenu();
        }
    }

    M.updateLabelInfo(e);
    M.openFolder(M.currentdirid, true);
};

/*
 * Check nodelist contains label
 *
 * @param {Object} nodelist     array of nodes
 *
 * @return {Boolean}
 */

MegaData.prototype.isLabelExistNodeList = function(nodelist) {
    "use strict";

    for (var i = nodelist.length; i--;) {
        var lbl = (nodelist[i] || {}).lbl | 0;
        if (lbl) {
            return true;
        }
    }
    return false;
};

/*
 * init label filter and sort if node item has label.
 *
 * @param {Object} nodelist     array of nodes
 */

MegaData.prototype.initLabelFilter = function(nodelist) {
    "use strict";

    if (d){
        console.log('checking label is existing');
    }

    var $fmMenu = $('.colour-sorting-menu .dropdown-section .dropdown-item-label')
        .add('.colour-sorting-menu .dropdown-section.filter-by .labels');

    if (this.isLabelExistNodeList(nodelist)){
        $fmMenu.removeClass('disabled static');
        if (d){
            console.log('label exist on node list, label filter is ON');
        }
    }
    else {
        $fmMenu.addClass('disabled static');
        if (d){
            console.log('no label exist on node list, label filter is OFF');
        }
    }
};

/**
 * favouriteDomUpdate
 *
 * @param {Object} node      Node object
 * @param {Number} favState  Favourites state 0 or 1
 */
MegaData.prototype.favouriteDomUpdate = function(node, favState) {
    'use strict';
    if (fminitialized) {

        delay(`fav.dom-update.${node.h}`, () => {

            const domListNode = M.megaRender && M.megaRender.nodeMap[node.h] || document.getElementById(node.h);

            if (domListNode) {
                const $gridView = $('.grid-status-icon', domListNode);
                const $blockView = $('.file-status-icon', domListNode);

                if (favState) {
                    // Add favourite
                    $gridView.removeClass('icon-dot').addClass('icon-favourite-filled');
                    $blockView.addClass('icon-favourite-filled');
                }
                else {
                    // Remove from favourites
                    $gridView.removeClass('icon-favourite-filled').addClass('icon-dot');
                    $blockView.removeClass('icon-favourite-filled');
                }
            }

            const {n} = M.sortmode || {};

            if (node.p === M.currentdirid && n === 'fav') {
                this.updateDomNodePosition(node, domListNode);
            }
        });
    }
};

MegaData.prototype.updateDomNodePosition = function(node, domNode) {

    'use strict';

    this.sort();
    const newindex = this.v.findIndex(n => n.h === node.h);

    if (this.megaRender && this.megaRender.megaList) {
        this.megaRender.megaList.repositionItem(node.h, newindex);
    }
    else if (domNode) {

        const {parentNode} = domNode;

        // item moved to last just using append
        if (newindex === this.v.length) {
            parentNode.appendChild(domNode);
        }
        else {
            parentNode.insertBefore(domNode, parentNode.childNodes[newindex]);
        }
    }
};

/**
 * Change node favourite state.
 * @param {Array}   handles     An array containing node handles
 * @param {Number}  newFavState Favourites state 0 or 1
 */
MegaData.prototype.favourite = function(handles, newFavState) {
    'use strict';

    if (fminitialized) {
        const exportLink = new mega.Share.ExportLink({});

        if (!Array.isArray(handles)) {
            handles = [handles];
        }
        const nodes = handles.map(h => this.getNodeByHandle(h)).filter(n => n && !exportLink.isTakenDown(n));

        for (let i = nodes.length; i--;) {
            const n = nodes[i];

            if (n.tvf) {
                fileversioning.favouriteVersions(n.h, newFavState).catch(dump);
            }
            api.setNodeAttributes(n, {fav: newFavState | 0}).catch(tell);
        }
    }
};

/**
 * isFavourite
 *
 * Search throught items via nodes and report about fav attribute
 * @param {Array} nodes Array of nodes Id
 * @returns {Boolean}
 */
MegaData.prototype.isFavourite = function(nodes) {
    'use strict';

    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }

    for (let i = nodes.length; i--;) {
        if (M.getNodeByHandle(nodes[i]).fav) {
            return true;
        }
    }
};

/**
 * versioningDomUpdate
 *
 * @param {Handle} fh      Node handle
 * @param {Number} versionsNumber  Number of previous versions.
 */
MegaData.prototype.versioningDomUpdate = function(fh) {

    var $nodeView = $(`#${fh}`);

    // For cached node but not rendered on dom, using cached selector will update missing dom node as well
    if (M.megaRender && M.megaRender.nodeMap[fh]) {
        $nodeView = $(M.megaRender.nodeMap[fh]);
    }

    var $versionsCol = $nodeView.find('td[megatype="versions"]');

    if (M.d[fh] && M.d[fh].tvf) {// Add versioning
        $nodeView.addClass('versioning');
        if ($versionsCol && $versionsCol.length) {
            var $verHtml = M.megaRender.versionColumnPrepare(M.d[fh].tvf, M.d[fh].tvb || 0);
            $versionsCol.empty().append($verHtml);
        }
    }
    else {// Remove versioning
        $nodeView.removeClass('versioning');
        if ($versionsCol && $versionsCol.length) {
            $versionsCol.empty();
        }
    }
};

MegaData.prototype.getNode = function(idOrObj) {
    if (isString(idOrObj) === true && this.d[idOrObj]) {
        return this.d[idOrObj];
    }
    else if (idOrObj && typeof idOrObj.t !== 'undefined') {
        return idOrObj;
    }

    return false;

};

/**
 * Returns all nodes under root (the entire tree)
 * FIXME: add reporting about how many nodes were dropped in the process
 *
 * @param {String}  root
 * @param {Boolean} [includeroot]  includes root itself
 * @param {Boolean} [excludebad]   prunes everything that's undecryptable - good nodes under a
 *                                 bad parent will NOT be returned to keep the result tree-shaped.
 * @param {Boolean} [excludeverions]  excludes file versions.
 * @returns {Promise}
 */
MegaData.prototype.getNodes = async function fm_getnodes(root, includeroot, excludebad, excludeverions) {
    'use strict';
    await dbfetch.coll([root]);
    return M.getNodesSync(root, includeroot, excludebad, excludeverions);
};

/**
 * Returns all nodes under root (the entire tree)
 * FIXME: add reporting about how many nodes were dropped in the process
 *
 * @param {String}  root
 * @param {Boolean} [includeroot]  includes root itself
 * @param {Boolean} [excludebad]   prunes everything that's undecryptable - good nodes under a
 *                                 bad parent will NOT be returned to keep the result tree-shaped.
 * @param {Boolean} [excludeverions]  excludes file versions.
 * @returns {Array}
 */
MegaData.prototype.getNodesSync = function fm_getnodessync(root, includeroot, excludebad, excludeverions) {
    var nodes = [];
    var parents = [root];
    var newparents;
    var i;

    while ((i = parents.length)) {

        newparents = [];

        while (i--) {
            const n = this.getNodeByHandle(parents[i]);

            // must exist and optionally be fully decrypted to qualify
            if (n && (!excludebad || !n.a)) {
                nodes.push(parents[i]);
                if (this.c[parents[i]] &&
                    (excludeverions && this.d[parents[i]].t || !excludeverions)) {
                    newparents = newparents.concat(Object.keys(this.c[parents[i]]));
                }
            }
        }

        parents = newparents;
    }

    if (!includeroot) {
        nodes.shift();
    }
    return nodes;
};

/**
 * Collect nodes recursively, as needed for a copy/move operation.
 * @param {String|Array} handles The node handles to retrieve recursively.
 * @param {String|Array} [targets] Optional target(s) these nodes will be moved into.
 * @param {Boolean} [recurse] get whole of target's sub-tree
 * @returns {Promise|*} a promise if retrieval was required.
 */
MegaData.prototype.collectNodes = function(handles, targets, recurse) {
    'use strict';
    var promises = [];

    if (targets) {
        if (!Array.isArray(targets)) {
            targets = [targets];
        }
        targets = array.unique(targets);

        if (recurse) {
            promises.push(dbfetch.coll(targets));
        }
        else {

            for (var t = targets.length; t--;) {
                if (M.c[targets[t]]) {
                    targets.splice(t, 1);
                }
            }

            if (targets.length) {
                promises.push(dbfetch.geta(targets));
            }
        }
    }

    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    handles = array.unique(handles);

    for (var i = handles.length; i--;) {
        const h = handles[i];
        const n = this.getNodeByHandle(h);

        if (n && (!n.t || M.c[h])) {
            handles.splice(i, 1);
        }
    }

    if (handles.length) {
        promises.push(dbfetch.coll(handles));
    }
    else if (!promises.length) {
        return false;
    }

    if (d) {
        console.warn('collectNodes', handles, targets);
    }

    return Promise.allSettled(promises);
};

/**
 * Get all clean (decrypted) subtrees under cn
 * FIXME: return total number of nodes omitted because of decryption issues
 *
 * @param {Array}           handles Node handles
 * @param {Array|String}    [target] destination folder for the copy-operation.
 * @param {Object|Function} [names] Object containing handle:name to perform renaming over these nodes,
 *                                  or a function returning a promise which will be fulfilled with them.
 * @returns {Promise}
 */
MegaData.prototype.getCopyNodes = async function(handles, target, names) {
    'use strict';
    await this.collectNodes(handles, target, target !== this.RubbishID);
    const res = typeof names === 'function' ? await names(handles) : {handles, names};

    return this.getCopyNodesSync(res.handles, res.names, res.parents);
};

/**
 * Get all clean (decrypted) subtrees under cn
 * FIXME: return total number of nodes omitted because of decryption issues
 *
 * @param {Array} handles An array of node's handles
 * @param {Object} [names] Object containing handle:name to perform renaming over these nodes
 * @returns {Array}
 */
MegaData.prototype.getCopyNodesSync = function fm_getcopynodesync(handles, names, presevedParents) {
    let tree = [];
    let opSize = 0;
    const res = [];

    // add all subtrees under handles[], including the roots
    for (let i = 0; i < handles.length; i++) {
        var tempR = this.getNodesSync(handles[i], true, true);
        if (presevedParents && presevedParents[handles[i]]) {
            for (var kh = 0; kh < tempR.length; kh++) {
                if (!presevedParents[tempR[kh]]) {
                    presevedParents[tempR[kh]] = presevedParents[handles[i]];
                }
            }
        }
        tree = [...tree, ...tempR];
    }

    for (let i = 0; i < tree.length; i++) {
        const n = {...this.getNodeByHandle(tree[i])};

        if (!n.h) {
            if (d) {
                console.warn('Node not found', tree[i]);
            }
            continue;
        }

        // repackage/-encrypt n for processing by the `p` API
        const nn = Object.create(null);

        // copied folders receive a new random key
        // copied files must retain their existing key
        if (!n.t) {
            nn.k = n.k;
        }

        // check if renaming should be done
        if (names && names[n.h] && names[n.h] !== n.name) {
            n.name = M.getSafeName(names[n.h]);
        }

        // check it need to clear node attribute
        if ($.clearCopyNodeAttr) {
            delete n.s4;
            delete n.lbl;
            delete n.fav;
        }

        // regardless to where the copy is remove rr
        delete n.rr;

        // new node inherits all attributes
        nn.a = ab_to_base64(crypto_makeattr(n, nn));

        // new node inherits handle, parent and type
        nn.h = n.h;
        nn.p = n.p;
        nn.t = n.t;

        if (presevedParents && presevedParents[n.h]) {
            nn.newTarget = presevedParents[n.h];
        }

        // remove parent unless child
        for (let j = 0; j < handles.length; j++) {
            if (handles[j] === nn.h) {
                delete nn.p;
                break;
            }
        }

        // count total size
        if (!n.t) {
            opSize += n.s || 0;
        }

        res.push(nn);
    }

    res.opSize = opSize;

    return res;
};

/**
 * Get all parent nodes having a u_sharekey
 *
 * @param {String} h       Node handle
 * @param {Object} [root]  output object to get the path root
 * @returns {Promise}
 */
MegaData.prototype.getShareNodes = async function(h, root, findShareKeys) {
    'use strict';
    if (!this.d[h]) {
        await dbfetch.acquire(h);
    }
    const out = root || {};
    const sharenodes = this.getShareNodesSync(h, out, findShareKeys);
    return {sharenodes, root: out.handle};
};

/**
 * Get all parent nodes having a u_sharekey
 *
 * @param {String} h       Node handle
 * @param {Object} [root]  output object to get the path root
 * @param {Boolean} [findShareKeys] check if the node was ever shared, not just currently shared.
 * @returns {Array}
 */
MegaData.prototype.getShareNodesSync = function fm_getsharenodessync(h, root, findShareKeys) {
    'use strict';

    const sn = [h, []];

    mega.keyMgr.setRefShareNodes(sn, root, findShareKeys);

    return sn[1];
};

/**
 * Retrieve a list of recent nodes
 * @param {Number} [limit] Limit the returned results, defaults to last 10000 nodes.
 * @param {Number} [until] Get nodes not older than this unix timestamp, defaults to nodes from past month.
 * @return {Promise}
 */
MegaData.prototype.getRecentNodes = function(limit, until) {
    'use strict';
    console.time("recents:collectNodes");

    return new Promise((resolve) => {
        var rubTree = M.getTreeHandles(M.RubbishID);
        var rubFilter = function(n) {
            return !rubTree.includes(n.p);
        };
        var getLocalNodes = function() {
            rubTree = rubFilter.tree;
            var nodes = Object.values(M.d)
                .filter((n) => {
                    return !n.t && n.ts > until && rubFilter(n);
                });

            resolve(nodes, limit);
        };
        rubFilter.tree = rubTree;
        limit = limit | 0 || 1e4;
        until = until || Math.round((Date.now() - 7776e6) / 1e3);

        if (fmdb) {
            rubTree = rubTree.map((h) => {
                return fmdb.toStore(h);
            });
            var binRubFilter = function(n) {
                for (var i = rubTree.length; i--;) {
                    if (!indexedDB.cmp(rubTree[i], n.p)) {
                        return false;
                    }
                }
                return true;
            };
            var dbRubFilter = FMDB.$useBinaryKeys ? binRubFilter : rubFilter;
            var options = {
                limit: limit,

                query: function(db) {
                    return db.orderBy('t').reverse().filter(dbRubFilter)
                        .until((row) => {
                            return until > row.t;
                        });
                },
                include: function(row) {
                    return row.t > until;
                }
            };
            fmdb.getbykey('f', options)
                .then((nodes) => {
                    if (nodes.length) {
                        const sort = M.getSortByDateTimeFn();
                        nodes = nodes.filter(n => !n.fv).sort((a, b) => sort(a, b, -1));
                        console.timeEnd("recents:collectNodes");
                        resolve(limit ? nodes.slice(0, limit) : nodes);
                        resolve = null;
                    }
                })
                .finally(() => {
                    if (resolve) {
                        getLocalNodes();
                    }
                });
        }
        else {
            getLocalNodes();
        }
    });
};

/**
 * Get Recent Actions
 * @param {Number} [limit] Limit the returned nodes in the interactions results, defaults to last 10000 nodes.
 * @param {Number} [until] Get nodes not older than this unix timestamp, defaults to nodes from past month.
 * @return {Promise}
 */
MegaData.prototype.getRecentActionsList = function(limit, until) {
    'use strict';

    var tree = Object.assign.apply(null, [{}].concat(Object.values(M.tree)));

    // Get date from timestamp with Today & Yesterday titles.
    var getDate = function(ts) {
        var today = moment().startOf('day');
        var yesterday = today.clone().subtract(1, 'days');
        var format = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};

        getDate = function(ts) {
            var date = moment(ts * 1e3);
            return date.isSame(today, 'd')
                ? l[1301]
                : date.isSame(yesterday, 'd')
                    ? l[1302]
                    : time2date(ts, 4);
        };
        return getDate(ts);
    };

    // Sort array of objects by ts, most recent first.
    var byTimeDesc = function(a, b) {
        if (a.ts === b.ts) {
            return 0;
        }
        return a.ts > b.ts ? -1 : 1;
    };

    // Create a new action object based off first node in group.
    var newActionBucket = function(n, actionType, blockType) {
        var b = [];
        b.ts = n.ts;
        b.date = getDate(b.ts);
        b.path = [];
        b.user = n.u;
        b.action = actionType;
        b.type = blockType;
        var {p} = n;

        while (tree[p]) {
            var t = tree[p];
            p = t.p;
            b.path.push({
                name: t.h === M.RootID ? l[164] : t.name || t.h,
                h: t.h,
                pathPart: true
            });
            if (t.t & M.IS_SHARED) {
                b.outshare = true;
            }
            if (t.su && !tree[p]) {
                b.path.push({
                    name: l[5542],
                    h: 'shares',
                    pathPart: true
                });
                b.inshare = true;
            }
        }
        return b;
    };

    return new Promise((resolve, reject) => {
        M.getRecentNodes(limit, until).then((nodes) => {
            console.time("recents:collateActions");
            nodes.sort(byTimeDesc);

            // Index is used for finding correct bucket for node.
            var index = {};

            // Action list to return to caller.
            var recentActions = [];
            recentActions.nodeCount = nodes.length;

            // Radix sort nodes into buckets.
            for (var i = 0; i < nodes.length; i++) {
                var n = new MegaNode(nodes[i]);
                var actionType = n.tvf ? "updated" : "added";
                var blockType = is_image2(n) || is_video(n) === 1 ? 'media' : 'files';
                index[n.u] = index[n.u] || Object.create(null);
                index[n.u][n.p] = index[n.u][n.p] || Object.create(null);
                index[n.u][n.p][actionType] = index[n.u][n.p][actionType] || Object.create(null);
                index[n.u][n.p][actionType][blockType] = index[n.u][n.p][actionType][blockType] || { endts: 0 };

                // Split nodes into groups based on time separation.
                var bucket = index[n.u][n.p][actionType][blockType];
                if (bucket.endts === 0 || n.ts < bucket.endts) {
                    bucket.endts = n.ts - 21600; // 6 Hours
                    bucket.group = newActionBucket(n, actionType, blockType);
                    recentActions.push(bucket.group);
                }

                // Populate node properties.
                n.recent = true;
                delete n.ar;

                // Add node to bucket.
                bucket.group.push(n);
            }

            console.timeEnd("recents:collateActions");
            M.recentActions = recentActions;
            resolve(recentActions);
        }).catch(reject);
    });
};

/**
 * Retrieve all folders hierarchy starting from provided handle
 * @param {String} h The root node handle
 * @return {Array} node handles
 */
MegaData.prototype.getTreeHandles = function _(h) {
    'use strict';

    var result = [h];
    var tree = Object.keys(M.tree[h] || {});

    for (var i = tree.length; i--;) {
        result.push.apply(result, _(tree[i]));
    }

    return result;
};

/**
 * Retrieve node rights.
 * @details Former rightsById()
 * @param {String} id The node handle
 * @returns {Number} 0: read-only, 1: read-and-write, 2: full-access
 */
MegaData.prototype.getNodeRights = function(id) {
    "use strict";

    if (this.isDynPage(id)) {
        return this.dynContentLoader[id].options.rights | 0;
    }

    if (folderlink || !id || id.length !== 8 || id === 'policies') {
        return false;
    }

    if (this.geS4NodeType(id) === 'container') {
        return 0;
    }

    while (this.d[id] && this.d[id].p) {
        if (this.d[id].r >= 0) {
            if (missingkeys[id]) {
                return 0;
            }
            return this.d[id].r;
        }
        id = this.d[id].p;
    }

    return 2;
};

/**
 * Retrieve the root node handle.
 * @details Former RootbyId()
 * @param {String} id The node handle.
 */
MegaData.prototype.getNodeRoot = function(id) {
    "use strict";
    if (id === 'recents') {
        return id;
    }
    if (typeof id === 'string') {
        id = id.replace('chat/', '');
    }
    var p = this.getPath(id);
    return p[p.length - 1];
};

/**
 * Check whether a node is in the root
 * @param {MegaNode|Object} n ufs-node, or raw node object.
 * @param {Boolean} [any] in any root, or just RootID.
 * @returns {Boolean|Number} value
 */
MegaData.prototype.isInRoot = function(n, any) {
    'use strict';

    if (n.t > 1 && n.t < 5) {
        // It's a root node itself.
        return -1;
    }

    return n.p && n.p.length === 8 && (n.p === this.RootID || any && (n.p === this.InboxID || n.p === this.RubbishID));
};

// returns true if h1 cannot be moved into h2 without creating circular linkage, false otherwise
MegaData.prototype.isCircular = function(h1, h2) {
    "use strict";

    if (this.d[h1] && this.d[h1].p === h2) {
        return true;
    }

    for (; ;) {
        if (h1 === h2) {
            return true;
        }

        if (!this.d[h2]) {
            return false;
        }

        h2 = this.d[h2].p;
    }
};

/**
 * Can be used to be passed to ['nodeId', {nodeObj}].every(...).
 *
 * @param element
 * @param index
 * @param array
 * @returns {boolean}
 * @private
 */
MegaData.prototype._everyTypeFile = function(element, index, array) {
    var node = this.getNode(element);
    return node && node.t === 0;
};

/**
 * Can be used to be passed to ['nodeId', {nodeObj}].every(...).
 *
 * @param element
 * @param index
 * @param array
 * @returns {boolean}
 * @private
 */
MegaData.prototype._everyTypeFolder = function(element, index, array) {
    var node = this.getNode(element);
    return node && node.t;
};

/**
 * Will return true/false if the passed node Id/node object/array of nodeids or objects is/are all files.
 *
 * @param nodesId {String|Object|Array}
 * @returns {boolean}
 */
MegaData.prototype.isFile = function(nodesId) {
    var nodes = nodesId;
    if (!Array.isArray(nodesId)) {
        nodes = [nodesId];
    }

    return nodes.every(this._everyTypeFile.bind(this));
};

/**
 * Will return true/false if the passed node Id/node object/array of nodeids or objects is/are all folders.
 *
 * @param nodesId {String|Object|Array}
 * @returns {boolean}
 */
MegaData.prototype.isFolder = function(nodesId) {
    var nodes = nodesId;
    if (!Array.isArray(nodesId)) {
        nodes = [nodesId];
    }

    return nodes.every(this._everyTypeFolder.bind(this));
};

/**
 * Create new folder on the cloud
 * @param {String} target The handle where the folder will be created.
 * @param {String|Array} name Either a string with the folder name to create, or an array of them.
 * @return {Promise} the handle of the deeper created folder.
 */
MegaData.prototype.createFolder = promisify(function(resolve, reject, target, name, attrs) {
    "use strict";
    var self = this;
    var inflight = self.cfInflightR;

    target = String(target || M.RootID);

    // Prevent unneeded API calls if target is not a valid handle
    if (target.length !== 8 && target.length !== 11) {
        return reject(EACCESS);
    }

    if (Array.isArray(name)) {
        name = name.map(String.trim).filter(String);

        if (name.length) {
            // Iterate through the array of folder names, creating one at a time
            (function next(target, folderName) {
                self.createFolder(target, folderName)
                    .then((folderHandle) => {
                        if (name.length) {
                            next(folderHandle, name.shift());
                        }
                        else {
                            resolve(folderHandle);
                        }
                    })
                    .catch(reject);
            })(target, name.shift());
            return;
        }

        name = null;
    }

    if (!name) {
        return resolve(target);
    }

    if (!inflight[target]) {
        inflight[target] = Object.create(null);
    }
    if (!inflight[target][name]) {
        inflight[target][name] = [];
    }

    if (inflight[target][name].push([resolve, reject]) > 1) {
        if (d) {
            console.debug('deduplicated folder creation attempt on %s for "%s"...', target, name);
        }
        return;
    }

    var _dispatch = function(idx, result) {
        var queue = inflight[target][name];

        delete inflight[target][name];
        if (!$.len(inflight[target])) {
            delete inflight[target];
        }

        for (var i = 0; i < queue.length; i++) {
            queue[i][idx](result);
        }
    };
    reject = _dispatch.bind(null, 1);
    resolve = _dispatch.bind(null, 0);

    var _done = function cfDone() {

        if (M.c[target]) {
            // Check if a folder with the same name already exists.
            for (var handle in M.c[target]) {
                if (M.d[handle] && M.d[handle].t && M.d[handle].name === name) {
                    return resolve(M.d[handle].h);
                }
            }
        }

        const n = {...attrs, name};
        if (M.d[target].s4) {
            s4.kernel.setNodeAttributesByRef(target, n);
        }

        var attr = ab_to_base64(crypto_makeattr(n));
        var key = a32_to_base64(encrypt_key(u_k_aes, n.k));
        var req = {a: 'p', t: target, n: [{h: 'xxxxxxxx', t: 1, a: attr, k: key}], i: requesti};
        var sn = M.getShareNodesSync(target, null, true);

        if (sn.length) {
            req.cr = crypto_makecr([n], sn, false);
            req.cr[1][0] = 'xxxxxxxx';
        }

        api.screq(req).then(({handle}) => resolve(handle))
            .then(() => {
                if (M.d[target].s4 && name !== n.name) {
                    showToast('info', l.s4_bucket_autorename.replace('%1', n.name));
                }
            }).catch(reject);
    };

    if (M.c[target]) {
        _done();
    }
    else {
        dbfetch.get(target).always(_done);
    }
});

/**
 * Create new folder on the cloud
 * @param {Object} paths Object containing folders on keys, node handles will be filled as their values
 * @param {String} target Node handle where the paths will be created
 * @return {Promise}
 */
MegaData.prototype.createFolders = promisify(function(resolve, reject, paths, target) {
    'use strict';
    const kind = Symbol('~\\:<p*>');
    const logger = d && MegaLogger.getLogger('mkdir', false, this.logger);

    // paths walker to create hierarchy
    var walk = function(paths, s) {
        var p = paths.shift();

        if (p) {
            s = walk(paths, s[p] = s[p] || Object.create(null));
        }
        return s;
    };

    var struct = Object.create(null);
    var folders = Object.keys(paths);

    // create paths hierarchy
    for (var i = folders.length; i--;) {
        var path = folders[i];

        Object.defineProperty(walk(M.getSafePath(path), struct), kind, {value: path});
    }
    folders = folders.length;

    (function _mkdir(s, t) {
        if (d > 1) {
            logger.debug('mkdir under %s (%s) for...', t, M.getNodeByHandle(t).name, s);
        }
        Object.keys(s).forEach((name) => {
            M.createFolder(t, name).always((res) => {
                if (res.length !== 8) {
                    if (d) {
                        const err = 'Failed to create folder "%s" on target %s(%s)';
                        logger.warn(err, name, t, M.getNodeByHandle(t).name, res);
                    }
                    return reject(res);
                }

                var c = s[name]; // children for the just created folder

                if (c[kind]) {
                    if (d) {
                        console.assert(paths[c[kind]] === null, 'Hmm... check this...');
                    }

                    // record created folder node handle
                    paths[c[kind]] = res;
                    folders--;
                }

                if (d > 1) {
                    logger.debug('folder "%s" got handle %s on %s (%s)', name, res, t, M.getNodeByHandle(t).name);
                }

                onIdle(_mkdir.bind(null, c, res));
            });
        });

        if (!folders) {
            if (d) {
                logger.info('Operation completed.', paths);
            }
            resolve(paths);
        }
    })(struct, target);
});

// leave incoming share h
// FIXME: implement sn tagging to prevent race condition
MegaData.prototype.leaveShare = promisify(function(resolve, reject, h) {
    "use strict";

    if (d) {
        console.warn('leaveShare', h);
    }

    // leaving inner nested shares is not allowed: walk to the share root
    while (this.d[h] && this.d[this.d[h].p]) {
        h = this.d[h].p;
    }

    if (this.d[h] && this.d[h].su) {
        mLoadingSpinner.show('leave-share');

        api.screq({a: 'd', n: h})
            .then(resolve)
            .catch(ex => {
                if (d) {
                    console.warn('leaveShare', h, ex);
                }
                reject(ex);
            })
            .finally(() => {
                mLoadingSpinner.hide('leave-share');
            });
    }
    else {
        if (d) {
            console.warn('Cannot leaveShare', h);
        }
        reject(ENOENT);
    }
});

/**
 * Creates a new public link if one does not already exist.
 * @param {String} handle ufs-node handle, file or folder.
 * @returns {Promise<{ph, n: ({ph}|*|boolean), key: *}>}
 */
MegaData.prototype.createPublicLink = async function(handle) {
    'use strict';

    await dbfetch.get(handle);
    const n = this.getNodeByHandle(handle);

    if (n.t && this.getNodeShare(n).h !== n.h) {
        await api_setshare(n.h, [{u: 'EXP', r: 0}]);
        if (d) {
            console.assert(n.ph, 'Public handle not found...?!');
        }
    }

    if (!n.ph) {
        await api.screq({a: 'l', n: n.h});
    }

    if (!n.ph) {
        throw new Error('Unexpected failure retrieving public handle...');
    }

    const res = {n, ph: n.ph, key: n.t ? u_sharekeys[n.h][0] : n.k};

    res.link = mega.flags.nlfe
        ? `${getBaseUrl()}/${n.t ? 'folder' : 'file'}/${res.ph}#${a32_to_base64(res.key)}`
        : `${getBaseUrl()}/#${n.t ? 'F' : ''}!${res.ph}!${a32_to_base64(res.key)}`;

    return res;
};

/**
 * Retrieve node share.
 * @param {String|Object} node cloud node or handle
 * @param {String} [user] The user's handle
 * @return {Object} the share object, or false if not found.
 */
MegaData.prototype.getNodeShare = function(node, user) {
    "use strict";

    user = user || 'EXP';

    if (typeof node !== 'object') {
        node = this.getNodeByHandle(node);
    }

    if (node && node.shares && user in node.shares) {
        return node.shares[user];
    }

    return false;
};

/**
 * Retrieve all users a node is being shared with
 * @param {Object} node    The ufs-node
 * @param {String} exclude A list of users to exclude
 * @return {Array} users list
 */
MegaData.prototype.getNodeShareUsers = function(node, exclude) {
    "use strict";

    var result = [];

    if (typeof node !== 'object') {
        node = this.getNodeByHandle(node);
    }

    if (node && node.shares) {
        var users = Object.keys(node.shares);

        if (exclude) {
            if (!Array.isArray(exclude)) {
                exclude = [exclude];
            }

            users = users.filter((user) => {
                return !exclude.includes(user);
            });
        }

        result = users;
    }

    return result;
};

/**
 * Collect users to whom nodes are being shared.
 * @param {Array} nodes An array of nodes, or handles
 * @param {Boolean} [userobj] Whether return user-objects of just their handles
 * @returns {Array} an array of user-handles/objects
 */
MegaData.prototype.getSharingUsers = function(nodes, userobj) {
    "use strict";

    var users = [];

    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }

    for (var i = nodes.length; i--;) {
        var node = nodes[i] || false;

        // It's a handle?
        if (typeof node === 'string') {
            node = this.getNodeByHandle(node);
        }

        // outbound shares
        if (node.shares) {
            users = users.concat(this.getNodeShareUsers(node, 'EXP'));
        }

        // inbound shares
        if (node.su) {
            users.push(node.su);
        }

        // outbound pending shares
        if (this.ps[node.h]) {
            users = users.concat(Object.keys(this.ps[node.h]));
        }
    }

    users = array.unique(users);

    if (userobj) {
        users = users.map((h) => {
            return M.getUserByHandle(h);
        });
    }

    return users;
};

/** @function MegaData.prototype.nodeShare */
lazy(MegaData.prototype, 'nodeShare', () => {
    'use strict';
    let lock = false;
    let inflight = new Map();
    const tick = Promise.resolve();
    const debug = d > 2 ? console.debug.bind(console, '[mdNodeShare]') : nop;

    const setNodeShare = tryCatch((h, s, ignoreDB) => {
        const n = M.d[h];
        if (!n || !s) {
            if (d && s) {
                debug(`Node ${h} not found.`, s, ignoreDB);
            }
            return;
        }
        debug(`Establishing node-share for ${h}`, s, [n]);

        if (typeof n.shares === 'undefined') {
            n.shares = Object.create(null);
        }
        n.shares[s.u] = s;

        // Maintain special outgoing shares index by user
        if (!M.su[s.u]) {
            M.su[s.u] = Object.create(null);
        }
        M.su[s.u][h] = 1;

        if (n.t) {
            // update tree node flags
            ufsc.addTreeNode(n);
        }
        else if (n.fa && s.u === 'EXP' && s.down) {
            debug('cleaning fa for taken-down node...', n.fa, [n], s);
            if (thumbnails.has(n.fa)) {
                thumbnails.replace(n.h, null);
            }
            delete n.fa;
            M.nodeUpdated(n);
        }

        if (fmdb && !ignoreDB && !pfkey) {
            fmdb.add('s', {o_t: `${h}*${s.u}`, d: s});

            if (u_sharekeys[h]) {
                fmdb.add('ok', {
                    h: h,
                    d: {
                        k: a32_to_base64(encrypt_key(u_k_aes, u_sharekeys[h][0])),
                        ha: crypto_handleauth(h)
                    }
                });
            }
            else if (d && !M.getNodeShare(h)) {
                console.warn(`No share key for node ${h}`, n);
            }
        }

        if (fminitialized) {
            sharedUInode(h);
        }
    });

    return async function mdNodeShare(h, s, ignoreDB) {
        if (this.d[h]) {
            return setNodeShare(h, s, ignoreDB);
        }

        if (inflight.has(h)) {
            inflight.get(h).push([h, s, ignoreDB]);
        }
        else {
            inflight.set(h, [[h, s, ignoreDB]]);
        }

        // wait for concurrent calls within the same tick.
        await tick;

        debug('acquiring lock....', h);

        // too fancy for eslint?..
        // eslint-disable-next-line no-unmodified-loop-condition
        while (lock) {
            await tSleep(1);
        }

        // dispatch inflight entries - FIFO
        if (inflight.size) {
            lock = true;

            let q = inflight;
            inflight = new Map();

            await dbfetch.acquire([...q.keys()]);

            q = [...q.values()].flat();
            for (let i = q.length; i--;) {
                setNodeShare(...q[i]);
            }

            // We're done, release the lock for the awaiting callers
            lock = false;
        }
    };
});

/**
 * Remove outbound share.
 * @param {String}  h    Node handle.
 * @param {String}  u    User handle to remove the associated share
 * @param {Boolean} okd  Whether API notified the node is no longer
 *                       shared with anybody else and therefore the
 *                       owner share key must be removed too.
 */
MegaData.prototype.delNodeShare = function(h, u, okd) {
    "use strict";

    if (this.d[h] && typeof this.d[h].shares !== 'undefined') {
        var updnode;

        if (this.su[u]) {
            delete this.su[u][h];
        }

        if (fmdb) {
            fmdb.del('s', `${h}*${u}`);
        }

        api_updfkey(h);
        delete this.d[h].shares[u];

        if (u === 'EXP' && this.d[h].ph) {
            delete this.d[h].ph;

            if (fmdb) {
                fmdb.del('ph', h);
            }

            updnode = true;
        }

        var a;
        for (var i in this.d[h].shares) {

            // If there is only public link in shares, and deletion is not target public link.
            if (i === 'EXP' && Object.keys(this.d[h].shares).length === 1 && u !== 'EXP') {
                updnode = true;
            }

            if (this.d[h].shares[i]) {
                a = true;
                break;
            }
        }

        if (!a) {
            delete this.d[h].shares;
            updnode = true;

            if (!M.ps[h]) {
                // out-share revoked, clear bit from trusted-share-keys
                mega.keyMgr.revokeUsedNewShareKey(h).catch(dump);
            }
        }

        if (updnode) {
            this.nodeUpdated(this.d[h]);

            if (fminitialized) {
                sharedUInode(h);
            }
        }
    }

    if (okd) {
        // The node is no longer shared with anybody, ensure it's properly cleared..

        // nb: ref to commit history.
        console.error(`The 'okd' flag is discontinued.`);
    }
};


/**
 * Retrieve an user object by its handle
 * @param {String} handle The user's handle
 * @return {Object} The user object, of false if not found
 */
MegaData.prototype.getUserByHandle = function(handle) {
    "use strict";

    var user = false;

    if (Object(this.u).hasOwnProperty(handle)) {
        user = this.u[handle];

        if (user instanceof MegaDataObject) {
            user = user._data;
        }
    }
    else if (this.opc[handle]) {
        user = this.opc[handle];
    }
    else if (this.ipc[handle]) {
        user = this.ipc[handle];
    }

    if (!user && handle === u_handle) {
        user = u_attr;
    }

    return user;
};

/**
 * Retrieve an user object by its email
 * @param {String} email The user's handle
 * @return {Object} The user object, of false if not found
 */
MegaData.prototype.getUserByEmail = function(email) {
    var user = false;

    M.u.every((contact, u) => {
        if (M.u[u].m === email) {
            // Found the user object
            user = M.u[u];

            if (user instanceof MegaDataObject) {
                user = user._data;
            }
            return false;
        }
        return true;
    });

    return user;
};

/**
 * Retrieve an user object
 * @param {String} str An email or handle
 * @return {Object} The user object, of false if not found
 */
MegaData.prototype.getUser = function(str) {
    "use strict";

    var user = false;

    if (typeof str !== 'string') {
        // Check if it's an user object already..

        if (Object(str).hasOwnProperty('u')) {
            // Yup, likely.. let's see
            user = this.getUserByHandle(str.u);
        }
    }
    else if (str.length === 11) {
        // It's an user handle
        user = this.getUserByHandle(str);
    }
    else if (str.indexOf('@') > 0) {
        // It's an email..
        user = this.getUserByEmail(str);
    }

    return user;
};

/**
 * Retrieve the name of an user or ufs node by its handle
 * @param {String} handle The handle
 * @return {String} the name, of an empty string if not found
 */
MegaData.prototype.getNameByHandle = function(handle) {
    "use strict";

    var result = '';

    handle = String(handle);

    if (handle.length === 11) {
        var user = this.getUserByHandle(handle);

        // If user exists locally, use Nickname or FirstName LastName or fallback to email
        if (user) {
            result = nicknames.getNickname(user) || user.m;
        }
        else if (window.megaChatIsReady && megaChat.chats[handle]) {
            var chat = megaChat.chats[handle];
            result = chat.topic;
            if (!result) {
                var members = Object.keys(chat.members || {});
                array.remove(members, u_handle);
                result = members.map((h) => {
                    user = M.getUserByHandle(h);
                    return user ? user.name && $.trim(user.name) || user.m : h;
                }).join(', ');
            }
        }
    }
    else if (handle.length === 8) {
        var node = this.getNodeByHandle(handle);

        if (node) {
            if (node.name) {
                result = node.name;
            }
            else if (missingkeys[handle]) {
                result = node.t ? l[8686] : l[8687];
            }
            else {
                const map = {
                    [M.RootID]: l[164],
                    [M.InboxID]: l[166],
                    [M.RubbishID]: l[167],
                    [M.BackupsId]: l.restricted_folder_button
                };
                result = map[handle] || result;
            }
        }
    }

    return String(result);
};

/**
 * Retrieve an ufs node by its handle
 * @param {String} handle The node's handle
 * @return {Object} The node object, of false if not found
 */
MegaData.prototype.getNodeByHandle = function(handle) {
    "use strict";

    if (this.d[handle]) {
        return this.d[handle];
    }

    if (this.chd[handle]) {
        return this.chd[handle];
    }

    for (var i = this.v.length; i--;) {
        if (this.v[i].h === handle) {
            return this.v[i];
        }
    }

    if (handle && handle.length === 8) {
        // @todo we should not need this...

        for (const ch in this.chd) {
            const n = this.chd[ch];

            if (n.h === handle) {
                if (d > 2) {
                    console.warn('Found chat node by raw handle %s, you may provide the chat handle %s', n.h, ch);
                }
                return n;
            }
        }
    }

    return false;
};

/**
 * Retrieve the parent of an ufs node
 * @param {String|Object} node The node or its handle
 * @return {Object} The parent handle, of false if not found
 */
MegaData.prototype.getNodeParent = function(node) {
    "use strict";

    if (typeof node === 'string') {
        node = this.getNodeByHandle(node);
    }

    if (node && node.su) {
        // This might be a nested inshare, only return the parent as long it does exists.
        return this.d[node.p] ? node.p : 'shares';
    }

    return node && node.p || false;
};

/**
 * Refresh UI on node removal.
 * @param {String} handle The ufs-node's handle.
 * @param {String} [parent] this node's parent.
 */
MegaData.prototype.nodeRemovalUIRefresh = function(handle, parent) {
    'use strict';
    const n = this.getNodeByHandle(handle);
    const customView = this.currentCustomView;
    const currentDir = customView && customView.nodeID || this.currentdirid;

    if (n.t && (currentDir === n.h || this.isCircular(n.h, currentDir))) {
        // If the node being removed is a folder, get out of it to the nearest available parent
        const root = this.getNodeRoot(parent || n.h);
        const path = this.getPath(parent || this.getNodeParent(n) || root);

        // Mark this node as pending to prevent going to the Rubbish meanwhile parsing action-packets..
        this.nodeRemovalUIRefresh.pending = n.h;

        delay('openfolder', () => {
            let target = null;
            let promise = Promise.resolve();

            for (let i = 0; i < path.length; ++i) {
                const n = this.getNodeByHandle(path[i]);
                if (n && this.getNodeRoot(n.h) !== this.RubbishID) {
                    target = path[i];
                    break;
                }
            }

            if (d) {
                console.debug('nodeRemovalUIRefresh(%s)', handle, target, path);
            }

            if (!target && path[0] === this.RubbishID) {
                // fired 'dr'
                target = path[0];
            }

            if (target && this.getNodeRoot(handle) !== root) {
                if (customView) {
                    target = target === this.RootID ? customView.type : customView.prefixPath + target;
                }
                promise = this.openFolder(target);
            }

            this.nodeRemovalUIRefresh.pending = null;
            delay('redraw-tree', () => promise.then(() => this.redrawTree()));
        }, 90);
    }
};

/**
 * Retrieve media properties for a file node.
 * @param {MegaNode|String} node An ufs node or handle
 * @return {Object} Media properties.
 */
MegaData.prototype.getMediaProperties = function(node) {
    'use strict';
    node = typeof node === 'string' ? this.getNodeByHandle(node) : node;

    if (this.getNodeShare(node).down) {
        // File is taken down.
        return {icon: fileIcon(node)};
    }

    var isText = false;
    var isImage = is_image2(node);
    var mediaType = is_video(node);
    var isVideo = mediaType > 0;
    var isAudio = mediaType > 1;
    var isPreviewable = isImage || isVideo;

    if (!isPreviewable && is_text(node)) {
        isText = isPreviewable = true;
    }

    return {
        isText: isText,
        isImage: isImage,
        isVideo: isVideo,
        isAudio: isAudio,
        icon: fileIcon(node),
        isPreviewable: isPreviewable,
        showThumbnail: String(node.fa).indexOf(':1*') > 0
    };
};

/**
 * Preview a node in-browser.
 * @param {MegaNode|String} node An ufs node or handle
 * @return {Boolean} whether it was shown.
 */
MegaData.prototype.viewMediaFile = function(node) {
    'use strict';
    node = typeof node === 'string' ? this.getNodeByHandle(node) : node;
    var prop = M.getMediaProperties(node);
    var handle = node.ch || node.h;
    var result = true;

    console.assert(prop.isPreviewable, 'This is not viewable..');

    if (prop.isText) {
        loadingDialog.show();
        mega.fileTextEditor.getFile(handle)
            .then((data) => {
                loadingDialog.hide();
                mega.textEditorUI.setupEditor(node.name, data, handle, true);
            })
            .catch((ex) => {
                console.warn(ex);
                loadingDialog.hide();
            });
    }
    else if (typeof slideshow === 'function') {
        if (prop.isVideo) {
            $.autoplay = node.h;
        }
        slideshow(handle, 0, true);
    }
    else {
        console.assert(is_mobile, 'Where are we?...');
        result = false;
    }

    return result;
};

/**
 * Retrieve dashboard statistics data
 */
MegaData.prototype.getDashboardData = function() {
    "use strict";

    var res = Object.create(null);
    var s = this.account.stats;

    res.files = {
        cnt: s[this.RootID].files - s[this.RootID].vfiles,
        size: s[this.RootID].bytes - s[this.RootID].vbytes
    };
    res.folders = { cnt: s[this.RootID].folders, size: s[this.RootID].fsize };
    res.rubbish = { cnt: s[this.RubbishID].files, size: s[this.RubbishID].bytes };
    res.ishares = { cnt: s.inshares.items, size: s.inshares.bytes, xfiles: s.inshares.files };
    res.oshares = { cnt: s.outshares.items, size: s.outshares.bytes };

    res.backups = {
        cnt: this.d[this.BackupsId] ? this.d[this.BackupsId].td : 0,
        size: this.d[this.BackupsId] ? this.d[this.BackupsId].tb : 0,
        xfiles: this.d[this.BackupsId] ? this.d[this.BackupsId].tf : 0
    };
    res.links = { cnt: s.links.folders, size: s.links.bytes, xfiles: s.links.files };
    res.versions = {
        cnt: s[this.RootID].vfiles + s[this.InboxID].vfiles,
        size: s[this.RootID].vbytes + s[this.InboxID].vbytes
    };

    return res;
};

/**
 * Check whether an object is a file node
 * @param {String} n The object to check
 * @return {Boolean}
 */
MegaData.prototype.isFileNode = function(n) {
    "use strict";

    return crypto_keyok(n) && !n.t;
};

/**
 * called when user try to remove pending contact from shared dialog
 * should be changed case M.ps structure is changed, take a look at processPS()
 *
 * @param {string} nodeHandle
 * @param {string} pendingContactId
 *
 *
 */
MegaData.prototype.deletePendingShare = function(nodeHandle, pendingContactId) {
    "use strict";

    if (this.d[nodeHandle]) {

        if (this.ps[nodeHandle] && this.ps[nodeHandle][pendingContactId]) {
            this.delPS(pendingContactId, nodeHandle);

            if (this.ps[nodeHandle] === undefined &&
                (this.d[nodeHandle].shares === undefined ||
                    'EXP' in this.d[nodeHandle].shares && Object.keys(this.d[nodeHandle].shares).length === 1)) {
                this.nodeUpdated(M.d[nodeHandle]);
            }
        }
    }
};

MegaData.prototype.emptySharefolderUI = tryCatch(function(lSel) {
    "use strict";

    const contentBlock = document.querySelector('.shared-folder-content');
    let selectedView = null;
    let emptyBlock = null;
    let clonedEmptyBlock = null;
    const emptyBlockFilter = mega.ui.mNodeFilter && mega.ui.mNodeFilter.selectedFilters
        ? '.fm-empty-search' : '.fm-empty-folder';

    if (!contentBlock) {
        return;
    }

    selectedView = contentBlock.querySelector(lSel || this.fsViewSel);
    emptyBlock = contentBlock.querySelector('.fm-empty-sharef');

    if (!selectedView || emptyBlock) {
        return;
    }

    clonedEmptyBlock = document.querySelector(emptyBlockFilter).cloneNode(true);
    clonedEmptyBlock.classList.remove('hidden');
    clonedEmptyBlock.classList.add('fm-empty-sharef');

    selectedView.classList.add('hidden');
    selectedView.parentNode.insertBefore(clonedEmptyBlock, selectedView);
    contentBlock.classList.remove('hidden');

    $.tresizer();
});


/**
 * M.disableCircularTargets
 *
 * Disable parent tree DOM element and all children.
 * @param {String} pref, id prefix i.e. { #fi_, #mctreea_ }
 */
MegaData.prototype.disableCircularTargets = function disableCircularTargets(pref) {
    "use strict";

    var nodes = $.selected || [];

    for (var s = nodes.length; s--;) {
        var handle = nodes[s];
        var node = M.d[handle];

        if (node) {
            $(pref + handle).addClass('disabled');

            if (node.p) {
                // Disable parent dir
                $(pref + node.p).addClass('disabled');

                // Disable moving to rubbish from rubbish
                if (M.getNodeRoot(handle) === M.RubbishID) {
                    $(pref + M.RubbishID).addClass('disabled');
                }
            }
            else if (d && node.t < 2 && node.h !== M.RootID /* folderlink*/) {
                console.error('M.disableCircularTargets: parent-less node!', handle, pref);
            }
        }
        else if (d > 1) {
            console.warn('[disableCircularTargets] Node %s%s not found.', pref, handle);
        }

        // Disable all children folders
        this.disableDescendantFolders(handle, pref);
    }
};

/**
 * Disable descendant folders
 * @param {String} id The node handle
 * @param {String} pref, id prefix i.e. { #fi_, #mctreea_ }
 */
MegaData.prototype.disableDescendantFolders = function(id, pref) {
    'use strict';

    if (this.tree[id]) {
        var folders = Object.values(this.tree[id]);

        for (var i = folders.length; i--;) {
            var {h} = folders[i];

            if (this.tree[h]) {
                this.disableDescendantFolders(h, pref);
            }
            $(pref + h).addClass('disabled');
        }
    }
};

/**
 * Import welcome pdf into the current account.
 * @returns {Promise}
 */
MegaData.prototype.importWelcomePDF = async function() {
    'use strict';

    const {result: {ph, k}} = await api.req({a: 'wpdf'});
    const {result: {at}} = await api.req({a: 'g', p: ph});

    if (d) {
        console.info('Importing Welcome PDF (%s)', ph, at);
    }

    assert(typeof at === 'string');
    return this.importFileLink(ph, k, at);
};

/**
 * Retrieve public-link node.
 * @param {String} ph public-handle
 * @param {String} key decryption key
 * @return {Promise<MegaNode>} decrypted node.
 */
MegaData.prototype.getFileLinkNode = async function(ph, key) {
    'use strict';
    let n;
    if ((key = base64_to_a32(key).slice(0, 8)).length === 8
        && (n = (await api.req({a: 'g', p: ph})).result).at) {

        n.a = n.at;
        crypto_procattr(n, key);
        if (n.name) {
            n = new MegaNode({...n, t: 0, ph, h: ph, k: key});
            n.shares = {EXP: {u: "EXP", r: 0, ...n}};
        }
    }
    assert(n && n.name, api_strerror(EKEY));

    return n;
};

// eslint-disable-next-line complexity -- @private
MegaData.prototype.bulkLinkReview = async function(data, clean) {
    'use strict';
    const h = '00000000';
    const nodes = this.d;
    const trees = this.c;

    mLoadingSpinner.show('cmp-link-review');

    if (this.RootID !== h || clean) {
        u_reset();
        if (megaChatIsReady) {
            megaChat.destroy(true);
        }
        fm_addhtml();
        mega.ui.setTheme(2);
        mega.loadReport = {};
        eventlog = loadfm = fetchfm = dump;
        mclp = MediaInfoLib.getMediaCodecsList();

        this.reset();
        this.addNode({h, p: '', u: "gTxFhlOd_LQ", t: 2, k: [0, 0, 0, 0], ts: 0, name: "\u{1F46E}"});

        folderlink = pfid = this.RootID;
        pfkey = a32_to_base64(this.d[this.RootID].k);

        await loadfm_done(-0x800e0fff);
    }
    ufsc = new UFSSizeCache();

    const promises = [];
    const links = Object.create(null);
    const addLink = (ph, key) => this.getFileLinkNode(ph, key)
        .then((n) => {
            n.foreign = 1;
            n.p = this.RootID;
            n.link = `${ph}!${key}`;
            this.addNode(n);
        })
        .catch(dump.bind(null, `${ph}!${key}`));

    let m;
    const filter = new Set(Array.isArray(data) ? data : []);
    const rex = /(?:[!/]|^)([\w-]{8})[!#]([\w-]{22,43})\b/g;

    while ((m = rex.exec(data))) {
        const [, ph, key] = m;

        if (key.length > 22) {
            promises.push(addLink(ph, key));
        }
        else {
            links[ph] = key;
        }

        if ('/?!'.includes(data[rex.lastIndex])) {
            filter.add(data.slice(rex.lastIndex).split(/\W/, 2)[1]);
        }
    }

    await Promise.all(promises)
        .then(() => this.updFileManagerUI())
        .catch(dump);

    const add = (n) => {
        if (!n_h) {
            n_h = n.h;
            n.p = this.RootID;
            decWorkerPool.signal({d, pfkey, n_h, secureKeyMgr: self.secureKeyMgr, allowNullKeys: self.allowNullKeys});
        }
        n.foreign = 1;
        n.nauth = pfid;
        n.pfid = pfid;
        n.pfkey = pfkey;
        decWorkerPool.postNode(n);
    };
    const ch = api.addChannel(-1, 'cs', freeze({'[': tree_residue, '[{[f{': add}));

    for (const ph in links) {
        n_h = null;
        pfid = ph;
        pfkey = links[ph];
        api_setfolder(ph);
        await api.req({a: 'f', c: 1, r: 1}, ch).catch(dump);

        const n = M.d[n_h];
        if (n) {
            this.addNode(n);
        }
        console.assert(n, `Failed to load ${ph}!${pfkey}`);
    }
    api.removeChannel(ch);

    n_h = null;
    folderlink = pfid = this.RootID;
    pfkey = a32_to_base64(this.d[this.RootID].k);

    await ufsc.save();

    if (filter.size) {
        const nh = [...filter];
        const tree = this.tree[this.RootID] || {};

        for (let i = nh.length; i--;) {
            const n = this.d[nh[i]] || nodes[nh[i]];

            n.p = this.RootID;
            this.addNode(n);

            if (!this.c[n.h]) {
                const c = Object.keys(this.c[n.h] = trees[n.h] || {});

                for (let j = c.length; j--;) {
                    const h = c[j];
                    this.d[h] = nodes[h];
                }
                ufsc.addNode(n);
            }
        }

        this.c[this.RootID] =
            Object.keys(this.c[this.RootID])
                .reduce((s, h) => {
                    if (filter.has(h) || this.d[h].ph) {
                        s[h] = -1;
                    }
                    else {
                        delete tree[h];
                    }
                    return s;
                }, {});
    }
    mLoadingSpinner.hide('cmp-link-review');

    return this.updFileManagerUI();
};

MegaData.prototype.bulkFileLinkImport = async function(data, target, verify) {
    'use strict';
    const req = {a: 'p', n: [], cr: [[], [], []]};
    let links = Object.create(null);

    String(data).replace(/(?:[!/]|^)([\w-]{8})[!#]([\w-]{43})\b/g, (x, ph, key) => {
        links[ph] = this.getFileLinkNode(ph, key).catch(dump.bind(null, ph));
    });

    for (const ph in links) {
        links[ph] = await links[ph];
    }

    if (verify) {
        [links, target] = await verify(links, target);
    }
    req.t = target = target || M.currentdirid;

    // eslint-disable-next-line guard-for-in
    for (const ph in links) {
        const n = links[ph];

        if (n instanceof MegaNode) {
            if (u_sharekeys[target]) {
                req.cr[2].push(0, req.cr[2].length / 3, a32_to_base64(encrypt_key(u_sharekeys[target][1], n.k)));
            }
            req.n.push({ph, t: 0, a: n.at, fa: n.fa, ov: n.ov, k: a32_to_base64(encrypt_key(u_k_aes, n.k))});
        }
    }

    if (req.cr[2].length) {
        req.cr[0][0] = target;
    }
    else {
        delete req.cr;
    }

    console.info('bulkFileLinkImport', links, req);

    return api.screq(req);
};

/**
 * Import file link
 * @param {String} ph  Public handle
 * @param {String} key  Node key
 * @param {String} attr Node attributes
 * @param {String} [srcNode] Prompt the user to choose a target for this source node...
 * @returns {Promise}
 */
MegaData.prototype.importFileLink = function importFileLink(ph, key, attr, srcNode) {
    'use strict';
    return new Promise((resolve, reject) => {
        var req = {a: 'p'};
        var n = {
            t: 0,
            ph: ph,
            a: attr,
            k: a32_to_base64(encrypt_key(u_k_aes, base64_to_a32(key).slice(0, 8)))
        };

        var _import = function(target) {
            req.n = [n];
            req.t = target;

            api.screq(req)
                .then(resolve)
                .catch((ex) => {
                    M.ulerror(null, ex);
                    reject(ex);
                });
        };

        if (srcNode) {
            $.mcImport = true;
            $.saveToDialogPromise = reject;

            // Remove original fav and lbl for new node.
            delete srcNode.fav;
            delete srcNode.lbl;

            n.a = ab_to_base64(crypto_makeattr(srcNode));

            openSaveToDialog(srcNode, (srcNode, target) => {
                M.getShareNodes(target, null, true).then(({sharenodes}) => {
                    const {name} = srcNode;

                    fileconflict.check([srcNode], target, 'import').always((files) => {
                        var file = files && files[0];

                        if (file) {
                            if (file._replaces) {
                                n.ov = file._replaces;
                            }

                            if (file.fa) {
                                n.fa = file.fa;
                            }

                            if (name !== file.name) {
                                n.a = ab_to_base64(crypto_makeattr(file));
                            }

                            if (sharenodes && sharenodes.length) {
                                req.cr = crypto_makecr([file], sharenodes, false);
                            }

                            _import(target);
                            M.openFolder(target);
                        }
                        else {
                            reject(EBLOCKED);
                        }
                    });
                }).catch(reject);
            });
        }
        else {
            _import(!folderlink && M.RootID ? M.RootID : undefined);
        }
    });
};

/**
 * Import folderlink nodes
 * @param {Array} nodes The array of nodes to import
 */
MegaData.prototype.importFolderLinkNodes = function importFolderLinkNodes(nodes) {
    "use strict";
    const {pfid, pfcol} = window;

    var _import = function(data) {
        M.onFileManagerReady(() => {
            loadingDialog.hide('import');
            openCopyDialog(() => {
                $.mcImport = true;
                $.selected = data[0];
                $.onImportCopyNodes = data[1];
                $.onImportCopyNodes.opSize = data[2];

                // This is an album import dialog, entering $.albumImport mode
                if (data[3] === '<pfcol>') {
                    console.assert($.albumImport, 'Error: Failed to load temporary value from session storage...');
                    mega.gallery.albumsRendered = false;
                }

                if (d) {
                    console.log('Importing Nodes...', $.selected, $.onImportCopyNodes, data[2]);
                }
            });
        });
    };

    if (($.onImportCopyNodes || sessionStorage.folderLinkImport) && !folderlink) {
        loadingDialog.show('import');
        if ($.onImportCopyNodes) {
            _import($.onImportCopyNodes);
        }
        else {
            var kv = MegaDexie.create(u_handle);
            var key = `import.${sessionStorage.folderLinkImport}`;

            kv.get(key)
                .then((data) => {
                    _import(data);
                    kv.remove(key, true).dump(key);
                })
                .catch((ex) => {
                    if (ex && d) {
                        console.error(ex);
                    }
                    loadingDialog.hide('import');
                    kv.remove(key, true).dump(key);

                    if (ex) {
                        tell(`${l[2507]}: ${ex}`);
                    }
                });
        }
        nodes = null;
        delete sessionStorage.folderLinkImport;
    }

    var sel = [].concat(nodes || []);

    if (sel.length) {
        var FLRootID = M.RootID;

        mega.ui.showLoginRequiredDialog({
            title: l.login_signup_dlg_title,
            textContent: l.login_signup_dlg_msg,
            showRegister: true
        }).then(() => {
            loadingDialog.show();

            tryCatch(() => {
                sessionStorage.folderLinkImport = FLRootID;
            })();

            // It is import so need to clear existing attribute for new node.
            $.clearCopyNodeAttr = true;

            return M.getCopyNodes(sel)
                .then((nodes) => {
                    var data = [sel, nodes, nodes.opSize];
                    var fallback = function() {
                        $.onImportCopyNodes = data;
                        loadSubPage('fm');
                    };

                    if (pfcol) {
                        this.preparePublicSetImport(pfid, data);
                        sessionStorage.albumLinkImport = pfid;
                    }

                    if (!sessionStorage.folderLinkImport || nodes.length > 6000) {
                        fallback();
                    }
                    else {
                        MegaDexie.create(u_handle)
                            .set(`import.${FLRootID}`, data)
                            .then(() => {
                                loadSubPage('fm');
                            })
                            .catch((ex) => {
                                if (d) {
                                    console.warn('Cannot import using indexedDB...', ex);
                                }
                                fallback();
                            });
                    }
                });
        }).catch((ex) => {
            // If no ex, it was canceled
            if (ex) {
                tell(ex);
            }
        }).finally(() => {
            delete $.clearCopyNodeAttr;
        });
    }
};

/**
 * @param {String} pfid public-folder/link's ID to be used during the import
 * @param {Array<(String|MegaNode[])>} data The array of selections and nodes to import
 */
MegaData.prototype.preparePublicSetImport = function(pfid, data) {
    'use strict';

    const [sel, nodes] = data;

    if (sel[0] !== pfid) {
        const n = M.d[pfid];
        const nn = Object.create(null);

        nn.t = 1;
        nn.h = n.h;
        nn.a = ab_to_base64(crypto_makeattr(n, nn));

        for (let i = nodes.length; i--;) {
            nodes[i].p = pfid;
        }
        nodes.unshift(nn);
    }

    data.push('<pfcol>');
};

/**
 * Simplified check whether an object is a S4 container or bucket node
 * @param {MegaNode|Object|String} n The object to check
 * @returns {String} Node type
 */
MegaData.prototype.geS4NodeType = function(n) {
    "use strict";

    if (typeof n === 'string') {
        n = this.getNodeByHandle(n);
    }

    if (crypto_keyok(n)) {

        if (n.s4 && n.p === this.RootID) {
            return 'container';
        }

        if ((n = M.d[n.p]) && n.s4 && n.p === this.RootID) {
            return 'bucket';
        }
    }

    return false;
};

/**
 * Utility functions to handle 'My chat files' folder.
 * @name myChatFilesFolder
 * @memberOf MegaData
 * @type {Object}
 */
lazy(MegaData.prototype, 'myChatFilesFolder', () => {

    'use strict';

    return mega.attr.getFolderFactory(
        "cf",
        false,
        true,
        'h',
        [l[20157], 'My chat files'],
        base64urlencode,
        base64urldecode
    ).change((handle) => {

        if (handle) {
            const treeItem = document.querySelector(`[id="treea_${handle}"] .nw-fm-tree-folder`);
            const fmItem = document.querySelector(`[id="${handle}"] .folder`);

            if (treeItem) {
                treeItem.classList.add('chat-folder');
            }

            if (fmItem) {
                fmItem.classList.add('folder-chat');
            }
        }
    });
});
