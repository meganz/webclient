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

            if (!Object.keys(this.su.EXP).length) {
                delete this.su.EXP;
            }

            if (this.su[h] instanceof Set) {
                this.su[h].delete('EXP');

                if (!this.su[h].size) {
                    delete this.su[h];
                }
            }
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
        const n = this.d[h] || this.tnd[h];

        if (fminitialized) {
            delUINode(h);
        }
        const sc = n === this.tnd[h] ? this.tnc : this.c;
        const sd = n === this.tnd[h] ? this.tnd : this.d;

        if (sc[h] && h.length < 11) {
            const c = Object.keys(sc[h]);
            let l = c.length;

            while (l--) {
                const n = sd[c[l]];

                if (n && n.tvf && !n.t) {
                    delNodeVersions.call(this, h, c[l]);
                }
                delNodeIterator.call(this, c[l], delInShareQ, l);
            }
            delete sc[h];
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
            if (n.t) {
                mega.quickAccessLocations.remove(n.h);
            }
            this.delHash(n);
            delete sd[h];
        }

        clearIndex.call(this, h);
    };

    MegaData.prototype.delNode = function(h, ignoreDB, isBeingMoved) {
        const delInShareQ = delInShareQueue[h] = delInShareQueue[h] || [];

        if (d) {
            console.group('delNode(%s)', h);
        }
        // console.time(`delNode.${h}`);

        const nodeType = this.d[h] && this.d[h].t;

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

        /**
        if (!isBeingMoved && delInShareQ.length) {
            const nodes = delInShareQ.map(uh => uh.substr(12));

            mega.keyMgr.enqueueShareRevocation(nodes);
        }
        /**/

        if (fmdb && !ignoreDB) {
            // Perform DB deletions once we got acknowledge from API (action-packets)
            // which we can't do above because M.d[h] might be already deleted.
            for (let i = delInShareQ.length; i--;) {
                fmdb.del('s', delInShareQ[i]);
            }
            delete delInShareQueue[h];
        }

        if (mega.devices.ui) {
            mega.devices.ui.onRemoveNode(h, nodeType);
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

    const sc = this.c[p] ? this.c : this.tnc;

    if (sc[p] && sc[p][h]) {
        delete sc[p][h];
    }

    let empty = true;
    // eslint-disable-next-line no-unused-vars
    for (const i in sc[p]) {
        empty = false;
        break;
    }
    if (empty) {
        delete sc[p];
        if (fminitialized) {
            $(`#treea_${p}`).removeClass('contains-folders');

            M.atrophy(null, p);
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

        // skip devices
        const n = M.onDeviceCenter && this.dcd[id] ? false : M.getNodeByHandle(id);

        if (
            n
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
            || id === mega.devices.rootId
            || id === 'pwm'
        ) {
            result.push(id);
        }
        else if (cv.type === 's4' && 'utils' in s4) {
            // Get S4 subpath for subpages other than Containers and Buckets
            // Container and Bucket will using existing method as it's node handle exist in M.d.
            return s4.utils.getS4SubPath(cv.original);
        }
        else if (cv.type === mega.devices.rootId) {
            return cv.original.split('/').reverse();
        }
        else if (cv.type === 'pwm' && id === 'account') {
            // Get PWM subpath only for account subpage
            return [id, 'pwm'];
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

            if (id === 's4' || !n.p) {
                break;
            }

            if (n.s4 && this.getS4NodeType(n) === 'container') {
                id = 's4';
                continue;
            }

            id = n.p;
            inshare = n.su;
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
            else if (cv.type === mega.devices.rootId) {
                result[i + 1] = mega.devices.rootId;
                break;
            }
            else if (cv.type === 'pwm' && cv.nodeID === result[i]) {
                result[i + 1] = 'pwm';
                break;
            }
            result.pop();
        }
    }

    return result;
};

/**
 * @param {String|MegaNode} node ufs-node [handle]
 * @param {String} [sep] file/path separator
 * @returns {string}
 */
MegaData.prototype.getNamedPath = function(node, sep) {
    'use strict';

    return this.getPath(node).map(h => this.getNameByHandle(h) || h).reverse().join(sep || '\u241c');
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
    else if ('utils' in s4 && node.s4 && node.t && this.getS4NodeType(node)) {
        result.original = pathOrID.replace(/_/g, '/');
        const s4path = s4.utils.getS4SubPath(result.original).reverse();

        result.original = s4path[1] === s4path[2] ? `${s4path[1]}` : result.original;
        result.prefixTree = '';
        result.prefixPath = '';
        result.containerID = s4path[1];
        result.type = 's4';

        if (s4path.length > 2) {
            result.containerID = s4.utils.getBucketNode(s4path[2]).p || s4path[1];
            result.nodeID = s4path[2];
            result.prefixPath = `${result.containerID}/`;
            result.subType = ['keys', 'policies', 'users', 'groups'].includes(s4path[2]) ? s4path[2] : 'bucket';
        }
        else if (s4path.length === 2 && node.p !== M.RootID) {
            result.containerID = s4.utils.getBucketNode(node).p || node.p;
            result.nodeID = s4path[1];
            result.prefixPath = `${result.containerID}/`;
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
    else if (pathOrID.startsWith(mega.devices.rootId)) {
        result.original = pathOrID.replace(/device-centre_/g, 'device-centre/');

        const aPath = result.original.split('/');
        result.nodeID = aPath[aPath.length - 1];

        result.type = mega.devices.rootId;
        result.prefixTree = '';
        result.prefixPath = `${mega.devices.rootId}/`;
    }

    else if (pathOrID === 'pwm' || pathOrID === mega.pwmh) {
        result.type = 'pwm';
        result.nodeID = mega.pwmh;
        result.prefixTree = '';
        result.prefixPath = '';
        result.original = 'pwm';
    }
    else if (pathOrID.startsWith('pwm/') || node.pwm) {
        result.type = 'pwm';
        result.nodeID = pathOrID.replace('pwm/', '');
        result.prefixTree = '';
        result.prefixPath = 'pwm/';
        result.subType = pathOrID.replace('pwm/', '');
        result.original = pathOrID;
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
 * Returns the currently selected node handles.
 * Uses `selectionManager.selected_list` if available, otherwise falls back to `$.selected`.
 *
 * @returns {Array<string>} Array of selected node handles.
 */
MegaData.prototype.getSelectedNodes = function() {
    'use strict';

    return window.selectionManager && selectionManager.selected_list || $.selected || false;
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
 * Checking if is the page is in Albums section
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
 * Checking if is the page is in Media discovery section
 * @param {String} [path] Path to check or this.currentdirid
 * @returns {Boolean}
 */
MegaData.prototype.isMediaDiscoveryPage = function(path) {
    'use strict';

    path = String(path || this.currentdirid);

    return M.gallery && (pfid && !pfcol || path !== M.RootID &&
        (M.currentrootid === M.RootID || M.onDeviceCenter));
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
                const ps4t = p.s4 && 'kernel' in s4 && s4.kernel.getS4NodeType(p);

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

/**
 * Set the Pitag for put request
 * @param {Object} req - The request object
 * @param {String} purpose - The purpose of the request
 * @param {String|Array} [extra] - Extra information for the request,
 *                                 Import is using it to figure out which type of link it is from,
 *                                 Upload file using it to pass uploaded file information
 *                                 Create folder triggered by upload is using for determine how upload triggered
 *                                 Copy from chat is using it to track which chatroom is copied files from
 **/
MegaData.prototype.setPitag = function(req, purpose, extra) {

    "use strict";

    if (!['p', 'pp', 'xp'].includes(req.a)) {
        console.error('Invalid request type for setting Pitag, only p is allowed:', req.a);
        return;
    }

    let trigger = '.';
    let pick = '.';
    let targetTag = M.getNodeRoot(req.t) === 'shares' ? 'i' : 'D';
    let source = '.';

    const _chatType = cid => {

        if (Array.isArray(cid)) {
            cid = cid[0];
        }

        if (cid.length > 11) {
            cid = cid.split('/')[2];
        }

        if (cid === u_handle) {
            return 's';
        }
        else if (megaChat) {
            const chatRoom = megaChat.getChatById(cid);
            return chatRoom.type === 'private' ? 'c' : 'C';
        }
    };

    if (purpose === 'U') {

        if (typeof extra === 'object') {
            // Upload to Chat
            if (extra.chatid) {
                targetTag = _chatType(extra.chatid);
            }

            trigger = extra.pitagTrigger || 'p';
            pick = extra.webkitRelativePath || extra.path ? 'F' : 'f';
        }
        else { // Folder created by upload
            pick = 'F';
            trigger = extra || 'p';
        }
    }
    else if (purpose === 'C') {

        // For copy, we do not track pick and trigger, but only source
        source = 'D';

        // Copy from Chat is always only single file, so let's just track first item
        const {h} = req.n[0];
        const {p} = M.getNodeByHandle(h);

        if (p && p.length === 11) {
            source = _chatType(p);
        }
        else if (M.getNodeRoot(h) === 'shares') {
            source = 'i';
        }

        if (extra && extra.targetChatId) {
            targetTag = _chatType(extra.targetChatId);
        }
    }
    else if (purpose === 'P') {
        targetTag = '.';
    }
    else if (purpose === 'I') {
        source = extra || 'f';
    }

    req.p = `${purpose}${trigger}${pick}${targetTag}${source}`;

    if (req.a === 'p' && req.n) {
        for (let i = req.n.length; i--;) {
            const n = req.n[i];

            if (n.k && n.k.length > 511) {
                eventlog(500996, JSON.stringify([1, req.v | 0, n.k.length, req.p]));
            }
        }
    }
};


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
 * @param {String|Array} [extra]      Extra information for pitag
 * @returns {Promise} array of node-handles copied.
 */
MegaData.prototype.copyNodes = async function(cn, t, del, tree, extra) {
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
            tree = await this.getCopyNodes(cn, {target: t, cfp: true}, async() => {
                const handles = [...cn];
                const names = Object.create(null);
                const parents = Object.create(null);

                // 2. check for conflicts
                if (t !== M.RubbishID) {
                    const files = await fileconflict.check(cn, t, 'copy');
                    if (!files || !files.length) {
                        throw EBLOCKED;
                    }

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

    // Display confirmation dialog when copying to/from object storage
    if ('utils' in s4 && await s4.utils.confirmAction(cn, t).catch(ex => {
        if (ex === EBLOCKED) {
            // User cancelled.
            throw EBLOCKED;
        }
        dump(ex);
    }) === false) {
        return;
    }

    if (del) {
        await Promise.resolve(mega.fileRequestCommon.storage.isDropExist(cn))
            .then((shared) => {

                for (let i = tree.length; i--;) {
                    const n = this.getNodeByHandle(tree[i].h);

                    console.assert(n, 'Node not found... (%s)', tree[i].h);

                    if (this.isOutShare(n)) {
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
    if (tree.isImporting) {
        tree = await fileconflict.checkImport(tree, t);
        if (!tree || !tree.length) {
            throw EBLOCKED;
        }
    }
    if (tree._importPart) {
        for (let i = tree.length; i--;) {
            if (tree[i]._replaces && !fileversioning.dvState) {
                tree[i].ov = tree[i]._replaces;
            }
            else if (tree[i]._replaces) {
                todel.push(tree[i]._replaces);
            }
            delete tree[i]._replaces;
        }
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

            let purpose = 'C';

            if (tree._importPart || $.albumImport) {
                purpose = 'I';
                extra = $.albumImport ? 'A' : 'F';
            }

            M.setPitag(req, purpose, extra);

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
                let ops = 0;
                const promises = [];
                const sign = Symbol('skip');

                for (let i = cn.length; i--;) {

                    if (result[i]) {
                        console.error('copy failed, %s', cn[i], result[i]);
                        promises.push(sign);
                    }
                    else {
                        const req = {
                            a: 'd',
                            n: cn[i]
                        };
                        if (treetype(cn[i]) === 'inbox') {
                            req.vw = 1;
                        }
                        ++ops;
                        promises.push(api.screq(req));
                    }
                }

                if (ops) {
                    Promise.allSettled(promises)
                        .then((res) => {
                            for (let i = res.length; i--;) {

                                if (res[i].status === 'rejected') {
                                    const reason = api_strerror(res[i].reason | 0);
                                    const message = `${l[6949]}, ${this.getNamedPath(cn[i])}: ${reason}`;

                                    console.error(message);
                                    showToast('warning', message);
                                }
                            }
                            dump(res);
                        })
                        .catch(tell);
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
                    result = array.extend(result, scnodes.map(n => n.h));
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

    // Display confirmation dialog when moving to/from object storage
    if ('utils' in s4 && await s4.utils.confirmAction(n, t, true).catch(ex => {
        if (ex === EBLOCKED) {
            // User cancelled.
            throw EBLOCKED;
        }
        dump(ex);
    }) === false) {
        return;
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

                    mega.devices.ui.ackVaultWriteAccess(req.n, req);
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

        const cleanups = () => {
            // clean merged empty folders if any
            cleanEmptyMergedFolders();

            if (todel.length) {
                // finish operation removing dangling nodes, if any
                this.safeRemoveNodes(todel).catch(dump);
            }
        };

        if (request.length) {

            return Promise.all([mega.keyMgr.moveNodesApiReq(request.length < 2 ? request[0] : request), ...promises])
                .then(([{result, st}]) => {
                    const promises = [];

                    assert(result === 0, `APIv3 ${l[16]}...rc:${result}`);
                    assert(st && typeof st === 'string', `APIv3 ${l[16]}...st:${st}`);

                    for (let i = nodes.length; i--;) {
                        const [{h, p}, target, root] = nodes[i];
                        const n = this.getNodeByHandle(h);

                        assert(this.tnc[p] || n.h === h && n.p !== p && n.p === target, `APIv3 ${l[16]}...mv:${n.h}`);

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

                    cleanups();

                    return res;
                })
                .catch(tell);
        }

        // we might have a dummy move operation that include empty folder.
        cleanups();
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

    if (copy.length | move.length && target === this.RubbishID) {
        // always revoke any sharing status recursively across the affected nodes
        promises.push(this.revokeShares(nodes, -0xBEEF));
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
                    mega.devices.ui.ackVaultWriteAccess(req.n, req);
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

    assert(this.RubbishID && this.RubbishID.length === 8, `Invalid rub=${this.RubbishID}`);

    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    handles = array.unique(handles);

    if (d) {
        tag = MurmurHash3(handles.join('~')).toString(36);
        console.group('[%s] moveToRubbish %s nodes...', tag, handles.length, handles);
        console.time(`moveToRubbish.${tag}`);
    }

    return this.safeMoveNodes(this.RubbishID, handles)
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
 * @param {*} [light] magic indicating nodes are already on memory.
 * @returns {Promise}
 */
MegaData.prototype.revokeShares = async function(handles, light) {
    'use strict';

    if (M.isInvalidUserStatus()) {
        throw EINTERNAL;
    }

    if (d) {
        console.group('revokeShares for %s nodes...', handles.length, handles);
    }

    if (light !== -0xBEEF) {
        const pending = this.collectNodes(handles);
        if (pending) {
            await pending;
        }
    }

    const links = [];
    const folders = [];

    const tree = (() => {
        let res = [];

        for (let i = handles.length; i--;) {
            const n = this.getNodeByHandle(handles[i]);

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
            const su = [...this.su[h] || []];

            for (let i = su.length; i--;) {
                const user = su[i];

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
    'use strict';

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

        if (!ignoreDB && this.tnc[n.p]) {
            if (self.d) {
                console.warn(`forcefully ignoring DB for transient container... (updating ${n.p}->${n.h})`);
            }
            ignoreDB = true;
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
        if (!ignoreDB) {
            ufsc.addToDB(n);
        }

        // fire realtime UI updates if - and only if - required.
        if (fminitialized) {
            const {type} = this.currentCustomView || !1;

            // if node in cached mode in editor, clear it
            if (mega.fileTextEditor) {
                mega.fileTextEditor.clearCachedFileData(n.h);
            }

            if (mega.devices.ui) {
                mega.devices.ui.onUpdateNode(n.h);
            }
            if (mega.ui.secondaryNav) {
                mega.ui.secondaryNav.updateCard(n.h);
            }

            // TODO: Improve the list rendering to only update each node if the action packet does not affect
            // list ordering.
            // Currently, we lack the detailed feature for this, which will be part of the PWM extension.
            if (type === 'pwm' && n && n.pwm && mega.pm.pwmFeature) {
                tryCatch(() => mega.ui.pm.list.initLayout().catch(reportError))();
            }

            if (this.isDynPage(this.currentdirid) > 1) {
                this.dynContentLoader[this.currentdirid].sync(n);
            }

            // Update versioning dialog if it is open and the folder is its parent folder,
            // the purpose of the following code is to update permisions of historical files.
            if ($.selected && $.selected.length && window.fileversioning && fileversioning.isOpen) {
                let parent = $.selected[0];

                while ((parent = this.getNodeByHandle(parent).p)) {
                    if (parent === n.h) {
                        fileversioning.updateFileVersioningDialog();
                        break;
                    }
                }
            }

            if (n.su && mega.ui.header.contactsButton && mega.ui.header.contactsButton.hasClass('active')) {
                delay('flyout-contact-refresh', () => {
                    if (mega.ui.flyout.name === `contact-${n.su}`) {
                        mega.ui.flyout.showContactFlyout(n.su);
                    }
                });
            }

            if (mega.gallery.nodeUpdated !== -0xFEEDFACE) {
                // @todo 'n' references a node that may NOT be in M.d[] YET, fix gallery-related code.
                delay(`gallery:node-update(${n.h})`, () => mega.gallery.handleNodeUpdate(n));
            }

            if (M.recentsRender && M.currentdirid !== 'recents') {
                delay('recents.nodeUpdateReset', () => {
                    M.recentsRender.reset();
                });
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
    var p = this.onListView && this.currentdirid || false;
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

        if (M.currentrootid !== 'recents') {
            fm_updated(n);
        }

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
            const res = 'kernel' in s4 && s4.kernel.validateForeignAction('rename', {node: n, ...prop});

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
 * @param {MegaNode} n ufs-node
 * @param {Number} value Current labelId
 */
MegaData.prototype.labelDomUpdate = function(n, value) {
    "use strict";

    if (fminitialized) {
        const handle = n.h;
        var labelId = parseInt(value);
        var removeClasses = 'red orange yellow blue green grey purple';
        var color = '<div class="colour-label-ind %1"></div>';
        var prefixTree = M.currentCustomView.prefixTree || '';
        var $treeElements = $(`#treea_${handle}`).add(`#treea_os_${handle}`).add(`#treea_pl_${handle}`);

        // Remove all colour label classes
        const $item = $(document.getElementById(handle));
        $item.removeClass(`colour-label ${removeClasses}`);
        const $lbl = $('i.colour-label', $item).removeClass(removeClasses);
        $('.label', $item).text('');
        $treeElements.removeClass('labeled');
        $('.colour-label-ind', $treeElements).remove();

        if ($treeElements.length) {
            const treeFolders = $treeElements[0].querySelectorAll('.nw-fm-tree-folder');
            const exclude = ['inbound-share', 'shared-folder', 'file-request-folder', 'camera-folder', 'chat-folder'];
            for (let i = treeFolders.length; i--;) {
                // Limit to plain folders only
                if (![...treeFolders[i].classList].some(c => exclude.includes(c))) {
                    MegaNodeComponent.label.set(n, treeFolders[i]);
                }
            }
        }
        if (labelId) {
            // Add colour label classes.
            var lblColor = M.getLabelClassFromId(labelId);
            var colourClass = `colour-label ${lblColor}`;

            $item.addClass(colourClass);
            $lbl.addClass(colourClass);
            // $('.nw-fm-tree-iconwrap', $treeElements)
            //     .safePrepend(color.replace('%1', M.getLabelClassFromId(labelId))).addClass('labeled');
            if (M.megaRender) {
                $('.label', $item).text(M.megaRender.labelsColors[lblColor]);
            }
        }

        const {n: dir} = M.sortmode || {};

        if (n.p === M.currentdirid && dir === 'label') {

            const domNode = $item[0];

            this.updateDomNodePosition(n, domNode);
        }

        if (M.recentsRender) {
            M.recentsRender.nodeChanged(n.h);
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

        if (!Array.isArray(handles)) {
            handles = [handles];
        }
        newLabelState |= 0;
        let fileCount = 0;
        let folderCount = 0;

        const promises = handles.map(h => this.getNodeRights(h) > 1 && this.getNodeByHandle(h))
            .filter(Boolean)
            .map(n => {

                if (n.tvf) {
                    fileversioning.labelVersions(n.h, newLabelState);
                }
                if (n.t) {
                    folderCount++;
                }
                else {
                    fileCount++;
                }

                return api.setNodeAttributes(n, {lbl: newLabelState});
            });
        return Promise.all(promises)
            .then(() => {
                if (folderCount) {
                    eventlog(newLabelState ? 500930 : 500932, folderCount);
                }
                if (fileCount) {
                    eventlog(newLabelState ? 500931 : 500933, fileCount);
                }
            })
            .catch(tell);
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
 * Check nodelist contains label
 *
 * @param {Object} nodelist     array of nodes
 *
 * @return {Boolean}
 */

MegaData.prototype.isLabelExistNodeList = function(nodelist) {
    "use strict";

    for (var i = nodelist && nodelist.length; i--;) {
        var lbl = (nodelist[i] || {}).lbl | 0;
        if (lbl) {
            return true;
        }
    }
    return false;
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

            if (M.currentrootid === 'shares') {
                return;
            }

            const domListNode = document.getElementById(node.h);

            if (domListNode) {
                const $gridView = $('.grid-status-icon', domListNode);
                const $blockView = $('.file-status-icon', domListNode);

                if (favState) {
                    // Add favourite
                    $gridView.removeClass('icon-heart-thin-outline').addClass('icon-heart-thin-solid');
                    domListNode.classList.add('favourited');
                    $gridView.attr('data-simpletip', l[5872]);

                    // Recent is still using old style
                    if (M.currentdirid === 'recents') {
                        $blockView.addClass('icon-favourite-filled');
                    }
                }
                else {
                    // Remove from favourites
                    $gridView.removeClass('icon-heart-thin-solid').addClass('icon-heart-thin-outline');
                    domListNode.classList.remove('favourited');
                    $gridView.attr('data-simpletip', l[5871]);

                    // Recent is still using old style
                    if (M.currentdirid === 'recents') {
                        $blockView.removeClass('icon-favourite-filled');
                    }
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
        if (!Array.isArray(handles)) {
            handles = [handles];
        }
        const nodes = handles.map(h => this.getNodeByHandle(h)).filter(n => n && !this.getNodeShare(n).down);

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
    await this.collectNodes(root);
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

        if (n) {
            if (n.t) {
                // expunge tnc
                this.atrophy(n.h, -1);
                this.tnc[n.p] = null;
            }
            else {
                handles.splice(i, 1);
            }
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
 * @param {Object|String}    [target] destination folder for the copy-operation, or an options object.
 * @param {Object|Function} [names] Object containing handle:name to perform renaming over these nodes,
 *                                  or a function returning a promise which will be fulfilled with them.
 * @returns {Promise}
 */
MegaData.prototype.getCopyNodes = async function(handles, target, names) {
    'use strict';
    const options = {handles, names};
    if (typeof target === 'object') {
        Object.assign(options, target);
        target = null;
    }
    target = options.target || target;

    let recurse = target !== this.RubbishID;
    if (recurse && options.cfp) {
        let i = handles.length;
        while (i--) {
            if (this.getNodeByHandle(handles[i]).t) {
                break;
            }
        }
        if (i < 0) {
            recurse = false;
        }
    }

    await this.collectNodes(handles, target, recurse);
    Object.assign(options, typeof options.names === 'function' && await options.names(handles));

    return this.getCopyNodesSync(options);
};

/**
 * Get all clean (decrypted) subtrees under cn
 * FIXME: return total number of nodes omitted because of decryption issues
 *
 * @param {Array} blk.handles An array of node's handles
 * @param {Object} [blk.names] Object containing handle:name to perform renaming over these nodes
 * @private
 */
MegaData.prototype.getCopyNodesSync = function(blk) {
    'use strict';
    let tree = [];
    let opSize = 0;
    const res = [];
    const pick = (n) => blk[n] || !1;
    const names = pick('names');
    const handles = pick('handles');
    const parents = pick('parents');
    const clearna = pick('clearna');

    // add all subtrees under handles[], including the roots
    for (let i = 0; i < handles.length; i++) {
        var tempR = this.getNodesSync(handles[i], true, true);
        if (parents[handles[i]]) {
            for (var kh = 0; kh < tempR.length; kh++) {
                if (!parents[tempR[kh]]) {
                    parents[tempR[kh]] = parents[handles[i]];
                }
            }
        }
        tree = [...tree, ...tempR];
    }

    for (let i = 0; i < tree.length; i++) {
        const n = {...this.getNodeByHandle(tree[i])};

        if (!n.h) {
            console.warn('Node not found', tree[i]);
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
        if (names[n.h] && names[n.h] !== n.name) {
            n.name = M.getSafeName(names[n.h]);
        }

        // check it need to clear node attribute
        if (clearna) {
            delete n.s4;
            delete n.lbl;
            delete n.fav;
            delete n.sen;
        }

        // regardless to where the copy is remove rr
        delete n.rr;

        // It is from incoming shares so need to clear sen attribute
        if (sharer(n.h)) {
            delete n.sen;
        }

        // new node inherits all attributes
        nn.a = ab_to_base64(crypto_makeattr(n, nn));

        // new node inherits handle, parent and type
        nn.h = n.h;
        nn.p = n.p;
        nn.t = n.t;

        if (parents[n.h]) {
            nn.newTarget = parents[n.h];
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
    if (!this.d[h] || this.d[h].t && !this.c[h]) {
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
                    return !n.t && n.ts > until && rubFilter(n) && mega.sensitives.shouldShowNode(n);
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
                        nodes = nodes.filter(n => !n.fv && mega.sensitives.shouldShowNode(n))
                            .sort((a, b) => sort(a, b, -1));
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

    const tree = Object.assign.apply(null, [{}].concat(Object.values(M.tree)));
    let s4ContainerHandles = Object.create(null);

    if (u_attr.s4 && s4.utils) {
        s4ContainerHandles = array.to.object(s4.utils.getContainersList().map(({ h }) => h), true);
    }

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
                p,
                pathPart: true,
                lbl: t.lbl,
                s4Root: s4ContainerHandles[t.h],
                sen: (t.t & M.IS_SEN) && 1
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
                b.su = t.su;
            }
        }
        return b;
    };

    return new Promise((resolve, reject) => {
        M.getRecentNodes(limit, until).then((nodes) => {
            console.time("recents:collateActions");
            nodes.sort(byTimeDesc);

            // Index is used for finding correct bucket for node.
            const index = {};

            // Action list to return to caller.
            const recentActions = [];
            recentActions.nodeCount = nodes.length;

            // Radix sort nodes into buckets.
            for (var i = 0; i < nodes.length; i++) {
                const n = new MegaNode(nodes[i]);
                const actionType = n.tvf ? "updated" : "added";
                const blockType = 'files';
                index[n.u] = index[n.u] || Object.create(null);
                index[n.u][n.p] = index[n.u][n.p] || Object.create(null);
                index[n.u][n.p][actionType] = index[n.u][n.p][actionType] || Object.create(null);
                index[n.u][n.p][actionType][blockType] = index[n.u][n.p][actionType][blockType] || { endts: 0 };

                // Split nodes into groups based on time separation.
                const bucket = index[n.u][n.p][actionType][blockType];
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
MegaData.prototype.getTreeHandles = function _(h, seen) {
    'use strict';

    var result = [h];
    var tree = Object.keys(M.tree[h] || {});
    seen = seen || {[h]: 1};

    for (var i = tree.length; i--;) {
        console.assert(seen[tree[i]] === undefined, 'Circular reference detected in getTreeHandles');
        if (!seen[tree[i]]) {
            result.push.apply(result, _(tree[i], seen));
            seen[tree[i]] = 1;
        }
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
        return id === 'recents';
    }

    if (this.getS4NodeType(id) === 'container') {
        return 0;
    }

    let n = this.getNodeByHandle(id);
    while (n.p) {
        if (n.r >= 0) {
            if (missingkeys[n.h]) {
                return 0;
            }
            return n.r;
        }
        n = this.getNodeByHandle(n.p);
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
    if (!this.nrc) {
        // @todo rather, check the whole codebase and replace uses in loops for the exact same parents..
        this.nrc = Object.create(null);
        queueMicrotask(() => {
            this.nrc = false;
        });
    }
    if (typeof id === 'string') {
        id = id.replace('chat/', '');
    }
    const idx = this.getNodeByHandle(id).p || id;
    if (!this.nrc[idx]) {
        const p = this.getPath(id);
        this.nrc[idx] = p[p.length - 1];
    }
    return this.nrc[idx];
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

    if (this.getNodeByHandle(h1).p === h2) {
        return true;
    }

    for (; ;) {
        if (h1 === h2) {
            return true;
        }

        h2 = this.getNodeByHandle(h2);
        if (!h2) {
            return false;
        }

        h2 = h2.p;
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
    const pitag = {};

    if (attrs) {
        if (attrs.pitagFrom) {
            pitag.pitagFrom = attrs.pitagFrom;
            delete attrs.pitagFrom;
        }
        if (attrs.pitagTrigger) {
            pitag.pitagTrigger = attrs.pitagTrigger;
            delete attrs.pitagTrigger;
        }
    }

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
                self.createFolder(target, folderName, pitag)
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

        // Check if a folder with the same name already exists.
        const h = M.getChildren(target, (n) => n.t && n.name === name && n.h);
        if (h) {
            return resolve(h);
        }

        const n = {...attrs, name};
        if (M.getNodeByHandle(target).s4 && 'kernel' in s4) {
            s4.kernel.setNodeAttributesByRef(target, n);
        }

        var attr = ab_to_base64(crypto_makeattr(n));
        var key = a32_to_base64(encrypt_key(u_k_aes, n.k));
        var req = {a: 'p', t: target, n: [{h: 'xxxxxxxx', t: 1, a: attr, k: key}], i: requesti};

        M.setPitag(req, pitag.pitagFrom || 'F', pitag.pitagTrigger);

        var sn = M.getShareNodesSync(target, null, true);

        if (sn.length) {
            req.cr = crypto_makecr([n], sn, false);
            req.cr[1][0] = 'xxxxxxxx';
        }

        if (M.getNodeRoot(target) === 'pwm') {
            req.vw = 1;
        }

        api.screq(req)
            .then(({st, handle}) => {
                if (d) {
                    console.debug('Created folder %s/%s...(%s)', target, handle, n.name, st);
                }

                if (M.getNodeByHandle(target).s4) {
                    if (name !== n.name) {
                        showToast('info', l.s4_bucket_autorename.replace('%1', n.name));
                    }

                    // wait for other tabs (if any) to catch up with this st
                    if (typeof st === 'string') {
                        return api.catchup(st).then(() => resolve(handle));
                    }
                }

                resolve(handle);
            })
            .catch(reject);
    };

    if (M.getChildren(target)) {
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
MegaData.prototype.createFolders = promisify(function(resolve, reject, paths, target, attrs) {
    'use strict';
    const {mkdir} = factory.require('mkdir');

    return mkdir(target, paths, (t, name) => this.createFolder(t, name, attrs)).then(resolve).catch(reject);
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

    res.link = `${getBaseUrl()}/${n.t ? 'folder' : 'file'}/${res.ph}#${a32_to_base64(res.key)}`;

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
    return this.su[user] && this.su[user][node && node.h || node] || false;
};

/**
 * Persist node-share, mem + FMDB.
 * @param {Object} share node-share
 * @param {*} [ignoreDB] ignore..fmdb
 */
MegaData.prototype.setNodeShare = function(share, ignoreDB) {
    'use strict';
    const {h, u} = share;

    // Maintain special outgoing shares index by user
    if (!this.su[u]) {
        this.su[u] = Object.create(null);
    }
    this.su[u][h] = freeze({...share});

    // ...and, by node-handle
    if (this.su[h]) {
        this.su[h].add(u);
    }
    else {
        this.su[h] = new Set([u]);
    }

    if (fmdb && !ignoreDB && !pfkey) {
        fmdb.add('s', {o_t: `${h}*${u}`, d: share});

        if (u_sharekeys[h]) {
            fmdb.add('ok', {
                h,
                d: {
                    ha: crypto_handleauth(h),
                    k: a32_to_base64(encrypt_key(u_k_aes, u_sharekeys[h][0]))
                }
            });
        }
        else if (self.d && !this.getNodeShare(h)) {
            console.warn(`No share key for node ${h}`, M.d[h]);
        }
    }
};

/**
 * [Infinity/Lite] emplace node-shares into memory.
 * @param {String} id type, e.g. out-shares or public-links
 * @returns {Promise|void} null
 */
MegaData.prototype.loadNodeShares = function(id) {
    'use strict';
    const p = [];
    const load = (h, s) => {
        if (!(this.d[h] && this.d[h].shares)) {
            if (s && s.h === h) {
                p.push(this.nodeShare(h, s, true));
            }
            else {
                if (self.d) {
                    console.warn(`No share seem to exist for ${h}, loading into memory normally...`, s);
                }
                p.push(dbfetch.acquire(h));
            }
        }
    };
    const stub = (u) => {
        for (const h in this.su[u]) {
            load(h, this.su[u][h]);
        }
    };
    if (String(id).startsWith('out-shares')) {
        for (const u in this.su) {
            if (u.length === 11) {
                stub(u);
            }
        }
    }
    else if (String(id).startsWith('public-links')) {
        stub('EXP');
    }
    else if (this.su[id] instanceof Set) {
        for (const u of this.su[id]) {
            load(id, this.su[u][id]);
        }
    }

    if (p.length) {
        return Promise.allSettled(p);
    }
};

/**
 * Get outgoing shares for a node, formerly {@link MegaNode.shares}
 * @param {MegaNode|String|*} [n] ufs-node, or their handle
 * @param {Array|String} [exc] user(s) to exclude
 * @param {*} [wp] include pending out-shares (true by default)
 * @return {Object|*}
 * @details DO NOT WRITE INTO THE RETURNED OBJECT OR YOU'LL BE FIRED
 */
MegaData.prototype.getOutShares = function(n, exc, wp) {
    'use strict';
    let res = false;
    const h = n && n.h || n;

    console.assert(!this.su[h] || this.su[h] instanceof Set, `Invalid su[] instance for ${h} ?!`, this.su[h]);

    if (this.su[h] instanceof Set) {
        const su = [...this.su[h]];

        if (exc && !Array.isArray(exc)) {
            exc = [exc];
        }

        res = Object.create(null);
        for (let i = su.length; i--;) {
            const u = su[i];

            if (!exc || !exc.includes(u)) {
                res[u] = this.su[u][h];
            }
        }

        if (exc && !Object.keys(res).length) {
            res = false;
        }
    }
    if (wp !== false && this.ps[h]) {
        res = Object.assign(res || Object.create(null), this.ps[h]);
    }
    return res;
};

/**
 * Retrieve count of outgoing shares
 * @param {String|Object|MegaNode} h node-handle
 * @param {Array|String} [exc] user exclusion
 * @return {Number} count.
 */
MegaData.prototype.getOutSharesCount = function(h, exc) {
    'use strict';
    return Object.keys(this.getOutShares(h) || {})
        .filter(exc ? (u) => u && u !== exc : Boolean)
        .length;
};

/**
 * Check whether a node is a root out-share
 * (to check against ancestors as well, do use {@link shared})
 * @param {String|Object|MegaNode} h node-handle
 * @param {Array|String} [exc] user exclusion
 * @returns {Object|Number|Set}
 */
MegaData.prototype.isOutShare = function(h, exc) {
    'use strict';

    h = h && h.h || h;
    return this.ps[h] || (exc ? this.getNodeShareUsers(h, exc).length : this.su[h]);
};

/**
 * Check whether a node is a root in-share
 * (to check against ancestors as well, do use {@link sharer})
 * @param {String|MegaNode} n node(-handle)
 * @returns {Boolean|*}
 */
MegaData.prototype.isInShare = function(n) {
    'use strict';

    return this.c.shares[n.h || n] || n.su || this.getNodeByHandle(n).su;
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

    if (typeof node !== 'string') {
        node = node && node.h;
    }

    if (this.su[node]) {
        result = [...this.su[node]];

        if (exclude) {
            if (Array.isArray(exclude)) {

                for (let i = exclude.length; i--;) {
                    const p = result.indexOf(exclude[i]);
                    if (p !== -1) {
                        result.splice(p, 1);
                    }
                }
            }
            else {
                const p = result.indexOf(exclude);
                if (p !== -1) {
                    result.splice(p, 1);
                }
            }
        }
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
        if (this.su[node.h]) {
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
        if (s) {
            console.assert(h === s.h);
            M.setNodeShare(s, ignoreDB);
        }
        const n = M.getNodeByHandle(h);
        if (!n || !s) {
            if (d && s) {
                debug(`Node ${h} not found.`, s, ignoreDB);
            }
            return;
        }
        let updnode = false;
        debug(`Establishing node-share for ${h}`, s, [n]);

        // @todo ditch MegaNode.shares use completely, maintain M.su only, adapt MegaNode.ph uses(?)

        if (typeof n.shares === 'undefined') {
            n.shares = Object.create(null);
        }
        n.shares[s.u] = s;

        // Restore Public link handle, we may do lose it from a move operation (d->t)
        if (s.u === 'EXP' && s.ph && (!n.ph || s.ph !== n.ph)) {
            debug(`Updating public-handle for... ${n.h}, ${n.ph} -> ${s.ph}`, s, n);
            n.ph = s.ph;
            updnode = true;
        }

        if (n.t) {
            // update tree node flags
            if (!updnode) {
                ufsc.addTreeNode(n);
            }
        }
        else if (n.fa && s.u === 'EXP' && s.down) {
            debug('cleaning fa for taken-down node...', n.fa, [n], s);
            if (thumbnails.has(n.fa)) {
                thumbnails.replace(n.h, null);
            }
            delete n.fa;
            updnode = true;
        }

        if (updnode) {
            M.nodeUpdated(n, ignoreDB);
        }

        if (fminitialized) {
            sharedUInode(h);
        }
    });

    return async function mdNodeShare(h, s, ignoreDB) {
        if (this.getNodeByHandle(h)) {
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
 */
MegaData.prototype.delNodeShare = async function(h, u) {
    "use strict";

    // @todo ditch MegaNode.shares use completely, maintain M.su only, adapt MegaNode.ph uses(?)

    if (!(this.d[h] && this.d[h].shares)) {
        if (self.d) {
            console.assert(this.d[h] || mega.infinity, `we don't know about ${h}...yet?`, mega.infinity);
        }
        await this.loadNodeShares(h);
    }
    const n = this.getNodeByHandle(h);

    console.assert(n || !this.su[u], `invalid share status for ${h}...`, [n], !!this.su[u], mega.infinity);

    if (n) {
        var updnode;

        if (this.su[u]) {
            delete this.su[u][h];

            if (!Object.keys(this.su[u]).length) {
                delete this.su[u];
            }
        }
        if (this.su[h]) {
            this.su[h].delete(u);

            if (!this.su[h].size) {
                delete this.su[h];
            }
        }

        if (fmdb) {
            fmdb.del('s', `${h}*${u}`);
        }

        api_updfkey(h);
        if (n.shares) {
            delete n.shares[u];
        }

        if (u === 'EXP') {
            updnode = updnode || !!n.ph;
            delete n.ph;

            if (fmdb) {
                fmdb.del('ph', h);
            }

        }

        var a;
        for (const i in n.shares) {

            // If there is only public link in shares, and deletion is not target public link.
            if (i === 'EXP' && Object.keys(n.shares).length === 1 && u !== 'EXP') {
                updnode = true;
            }

            if (n.shares[i]) {
                a = true;
                break;
            }
        }

        if (!a) {
            updnode = updnode || !!n.shares;
            delete n.shares;

            if (!M.ps[h]) {
                // out-share revoked, clear bit from trusted-share-keys
                mega.keyMgr.revokeUsedNewShareKey(h).catch(dump);
            }
        }

        if (updnode) {
            this.nodeUpdated(n, !this.d[h]);

            if (fminitialized) {
                sharedUInode(h);
            }
        }
    }
};


/**
 * Retrieve an user object by its handle
 * @param {String} handle The user's handle
 * @return {Object} The user object, of false if not found
 */
MegaData.prototype.getUserByHandle = function(handle) {
    "use strict";
    let user;

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

    return user || false;
};

/**
 * Retrieve an user object by its email
 * @param {String} email The user's handle
 * @return {Object} The user object, of false if not found
 */
MegaData.prototype.getUserByEmail = function(email) {

    let user = false;
    const emailLowercase = String(email).toLowerCase();

    M.u.every((contact, u) => {
        if (String(M.u[u].m).toLowerCase() === emailLowercase) {
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
        else if (Object(str).hasOwnProperty('m')) {
            user = this.getUserByEmail(str.m);
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
 * Gets a display name for given email. If available it will use the user or contact's name.
 * If the name is unavailable (e.g. a new contact request or similar scenario) then it will use the email address.
 * NB: Up to the caller performing any sanitization prior to HTML insertion.
 * @param {*} any an email address, or object possibly containing one
 * @returns {String|*} Returns a "display-name" for the associated email, or just the email.
 */
MegaData.prototype.getNameByEmail = function(any) {
    'use strict';

    const user = this.getUser(any);
    return this.getNameByHandle(user.u || user.h) || any || false;
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

    if (this.tnd[handle]) {
        // console.warn('feeding transient node...', handle);
        return this.tnd[handle];
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

    if (M.dcd[handle]) {
        return M.dcd[handle];
    }

    return false;
};

/**
 * Retrieve node children container.
 * Over Infinity/Lite we may load a folder partially, being those nodes memory-only, non-FMDB backed.
 * @param {String|MegaNode} handle node[-handle]
 * @param {Function} [each] function to execute for each node
 * @return {*} store or filtering result
 */
MegaData.prototype.getChildren = function(handle, each) {
    'use strict';
    let res = false;

    if (this.c[handle]) {
        res = this.c[handle];
    }
    else if (this.tnc[handle]) {
        res = this.tnc[handle];
    }

    if (res && each) {
        for (const h in res) {
            const v = each(res[h].h ? res[h] : this.getNodeByHandle(h));
            if (v) {
                return v;
            }
        }
        res = -0;
    }

    if (res && self.d) {
        console.assert(this.getNodeByHandle(handle));
    }

    return res;
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
        return this.getNodeByHandle(node.p) ? node.p : 'shares';
    }

    return node && node.p || false;
};

/**
 * @param {*} [t] folder handle.
 * @param {*} [p] actioned parent
 * @return {*} what it is
 */
MegaData.prototype.atrophy = function(t, p) {
    'use strict';
    let res = 0;
    const clear = t === null;

    t = t || this.currentCustomView.nodeID || this.currentdirid;

    if (p < 0) {
        p = this.tnc[t];
        if (p) {
            for (const h in p) {
                if (p[h].t) {
                    this.atrophy(p[h].h, -1);
                }
            }
            this.tnc[t] = null;
        }
        return p;
    }

    if (this.tnc[t]) {
        if (this.c[t]) {
            if (self.d) {
                console.warn(`The folder ${t} seems fully loaded, while we're still retaining transient nodes...`);
            }
            this.tnc[t] = null;
        }
        else {
            res = $.len(this.tnc[t]) || -1;
        }
    }

    if (clear && (!p || p === t)) {
        this.tnc[t] = null;

        if (self.d) {
            console.warn(`Refreshing transient folder ${t}...`, p);
        }
        delay('openfolder', () => this.openFolder(this.currentdirid, true));
    }

    return res;
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
                    const {type, original, prefixPath} = customView;
                    target = target === this.RootID && !M.onDeviceCenter ?
                        type :
                        type === mega.devices.rootId ? original : prefixPath + target;
                }
                promise = this.openFolder(target);
            }

            this.nodeRemovalUIRefresh.pending = null;
            delay('redraw-tree', () => promise.then(() => this.redrawTree()));
        }, 90);
    }

    delay(`refresh-dialog-content:${handle}`, () => {
        if (self.selectionManager) {
            selectionManager.remove_from_selection(handle);
        }
        if ($.dialog === 'move' || $.dialog === 'copy') {
            refreshDialogContent();
        }
    }, 90);
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

MegaData.prototype.emptySharefolderUI = tryCatch(function(lSel) {
    "use strict";

    const contentBlock = document.querySelector('.shared-folder-content');
    let selectedView = null;
    let emptyBlock = null;
    let clonedEmptyBlock = null;
    const emptyBlockFilter = mega.ui.mNodeFilter && mega.ui.mNodeFilter.selectedFilters.value
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
            this.setNodeShare({u: "EXP", r: 0, ...n}, true);
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

    M.setPitag(req, 'I');

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
MegaData.prototype.importFileLink = function importFileLink(ph, key, attr, srcNode, targetNode) {
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

            M.setPitag(req, 'I');

            api.screq(req)
                .then(resolve)
                .then(() => {
                    if (srcNode && !targetNode) {
                        mega.ui.toast.show(
                            parseHTML(
                                mega.icu.format(l.toast_import_file, 1).replace('%s', M.getNameByHandle(target))
                            ),
                            6,
                            l[16797],
                            {actionButtonCallback: () => M.openFolder(target)}
                        );
                    }
                })
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
            delete srcNode.sen;
            delete srcNode.lbl;

            n.a = ab_to_base64(crypto_makeattr(srcNode));

            const openSaveToDialog = targetNode ? (srcNode, cb) => cb(srcNode, targetNode) : window.openSaveToDialog;

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

    if (($.onImportCopyNodes || localStorage.folderLinkImport) && !folderlink) {
        loadingDialog.show('import');
        if ($.onImportCopyNodes) {
            _import($.onImportCopyNodes);
        }
        else {
            const key = `import.${localStorage.folderLinkImport}`;

            M.getPersistentData(key)
                .then((data) => {
                    _import(data);
                })
                .catch((ex) => {
                    if (ex && d) {
                        console.error(ex);
                    }
                    loadingDialog.hide('import');

                    if (ex) {
                        tell(`${l[2507]}: ${ex}`);
                    }
                })
                .finally(() => {
                    M.delPersistentData(key).dump(key);
                });
        }
        nodes = null;
        delete localStorage.folderLinkImport;
    }

    var sel = [].concat(nodes || []);

    if (sel.length) {
        var FLRootID = M.RootID;

        let pending = true;
        tSleep(0.3).then(() => pending && loadingDialog.show());

        tryCatch(() => {
            localStorage.folderLinkImport = FLRootID;
        })();

        // It is import so need to clear existing attribute for new node.
        M.getCopyNodes(sel, {clearna: true})
            .then((nodes) => {
                var data = [sel, nodes, nodes.opSize];
                const ack = () => {
                    pending = false;
                    loadingDialog.hide();
                    return mega.ui.showLoginRequiredDialog({
                        title: l.login_signup_dlg_title,
                        textContent: l.login_signup_dlg_msg,
                        showRegister: true
                    }).then(() => {
                        resetSensitives();
                        loadSubPage('fm');
                    });
                };
                var fallback = function() {
                    $.onImportCopyNodes = data;
                    return ack();
                };

                if (pfcol) {
                    this.preparePublicSetImport(pfid, data);
                    localStorage.albumLinkImport = pfid;
                }

                if (!localStorage.folderLinkImport || nodes.length > 6000) {

                    return fallback();
                }

                return M.setPersistentData(`import.${FLRootID}`, data)
                    .then(ack)
                    .catch((ex) => {
                        if (d) {
                            console.warn('Cannot import using indexedDB...', ex);
                        }
                        return fallback();
                    });
            })
            .catch((ex) => {
                // If no ex, it was canceled
                if (ex) {
                    tell(ex);
                }
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
 * Check whether we can generate thumbnails for nodes going into specific folders/sections.
 * @param {String} [target] folder node, or current folder if unspecified
 * @returns {Boolean}
 */
MegaData.prototype.shouldCreateThumbnail = function(target) {
    'use strict';

    if (self.omitthumb) {
        return false;
    }

    target = target || this.currentCustomView.nodeID || this.currentdirid || this.lastSeenCloudFolder;

    return fmconfig.s4thumbs === 1 || this.getNodeRoot(target) !== 's4';
};

/**
 * Simplified check whether a node is a S4 container or bucket node
 * @param {MegaNode|Object|String} n The object to check
 * @returns {String} Node type
 */
MegaData.prototype.getS4NodeType = function(n) {
    "use strict";

    if (typeof n === 'string') {
        n = this.getNodeByHandle(n);
    }

    if (n && crypto_keyok(n)) {

        if ('kernel' in s4) {
            if (!this.s4nt) {
                onIdle(() => {
                    // @todo what actual lifetime should this have?..
                    this.s4nt = false;
                });
                this.s4nt = Object.create(null);
            }
            if (!this.s4nt[n.h]) {
                this.s4nt[n.h] = s4.kernel.getS4NodeType(n);
            }
            return this.s4nt[n.h];
        }
        const isc = (n) => {
            if (n.s4 && n.p === this.RootID && "li" in n.s4) {

                for (const k in n.s4.k) {
                    if (k.length > 36) {
                        return !!this.getNodeShare(n).w;
                    }
                }
            }

            return false;
        };

        if (isc(n)) {
            return 'container';
        }

        if ((n = this.d[n.p]) && isc(n)) {
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
            const fmItem = document.querySelector(`[id="${handle}"] .fm-item-img i`);

            if (treeItem) {
                treeItem.className = 'nw-fm-tree-folder chat-folder';
            }

            if (fmItem) {
                const postfix = M.viewmode ? '90' : '24';
                fmItem.classList.remove(`icon-folder-${postfix}`);
                fmItem.classList.add('folder-chat', `icon-folder-chat-${postfix}`);
            }
        }
    });
});

/**
 * Set node description attribute
 * @param {MegaNode|Object|String} itemHandle node handle
 * @param {String} newItemDescription node description text
 * @returns {Promise} promise
 */
MegaData.prototype.setNodeDescription = async function(itemHandle, newItemDescription) {
    'use strict';
    const n = this.getNodeByHandle(itemHandle);

    if (d) {
        console.assert(!n || n.des !== newItemDescription, 'Unneeded set description invoked.');
    }

    if (n && n.des !== newItemDescription) {
        const prop = {des: newItemDescription};

        // TODO S4

        // Save also to other version of the node
        if (n.tvf) {
            fileversioning.descriptionVersions(n.h, newItemDescription);
        }

        return api.setNodeAttributes(n, prop);
    }
};

/**
 * Set node tags attribute
 * @param {MegaNode|Object|String} handles node handle
 * @param {String} newItemTag node tag text
 * @param {Boolean} isRemove remove tag
 * @returns {Promise} promises
 */
MegaData.prototype.setNodeTag = async function(handles, newItemTag, isRemove) {
    'use strict';

    if (typeof newItemTag !== 'string' || !newItemTag.length) {
        return;
    }

    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    const promises = [];

    for (let i = handles.length; i--;) {
        const n = this.getNodeByHandle(handles[i].h);

        if (n) {
            let prop;

            if (isRemove) {
                if (n.tags && n.tags.includes(newItemTag)) {
                    prop = 1;
                    array.remove(n.tags, newItemTag);
                }
            }
            else if (!n.tags || !n.tags.includes(newItemTag)) {
                if (!n.tags) {
                    n.tags = [];
                }
                prop = 1;
                n.tags.push(newItemTag);
            }

            if (prop) {
                prop = {tags: n.tags.length ? [...n.tags] : undefined};

                // TODO S4
                // TODO Save/Delete also to other version of the node
                if (n.tvf) {
                    fileversioning.tagVersions(n.h, prop).catch(reportError);
                }

                promises.push(api.setNodeAttributes(n, prop));
            }
        }
    }

    return Promise.all(promises);
};

/**
 * Same as is_image3(), additionally checking whether the node meet requirements for photo/media gallery.
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Boolean}
 */
MegaData.prototype.isGalleryImage = function(n, ext) {
    'use strict';

    ext = ext || fileext(n && n.name || n, true, true);
    return ext !== 'PSD' && ext !== 'SVG' && is_image3(n, ext);
};

/**
 * Checks whether the node is a video, plus checks if thumbnail is available
 * @param {Object} n ufs node
 * @returns {Object.<String, Number>|Boolean}
 */
MegaData.prototype.isGalleryVideo = function(n) {
    'use strict';

    if (!n || !n.fa || !n.fa.includes(':8*')) {
        return false;
    }

    const p = this.getMediaProperties(n);

    if (!p.showThumbnail || p.icon !== 'video') {
        return false;
    }

    const props = MediaAttribute.prototype.fromAttributeString(n.fa, n.k);

    return props && props.width && props.height ? p : false;
};

/**
 * This method works only when Devices are already loaded into the system
 * @param {String} h Node handle to check against
 * @returns {Boolean}
 */
MegaData.prototype.isInDevice = function(h) {
    'use strict';
    return !!mega.devices.ui.hasDevices && Object.values(M.dcd).some(({ folders }) => folders[h]);
};

/**
 * Checking if the file is even available for the gallery
 * @param {String|MegaNode|Object} n An ufs-node, or filename
 * @param {String} [ext] Optional filename extension
 * @returns {Number|String|Function|Boolean}
 */
MegaData.prototype.isGalleryNode = function(n, ext) {
    'use strict';

    if (!(n && n.fa)) {
        return false;
    }
    if (this.isGalleryVideo(n)) {
        return true;
    }
    ext = ext || fileext(n && n.name || n, true, true);
    return this.isGalleryImage(n, ext);
};
