/**
 * UFS Size Cache handling.
 */
function UFSSizeCache() {
    'use strict';
    // handle[d, f, b, parent, td, tf, tb, tvf, tvb, fv, n{}]
    this.cache = Object.create(null);
    // version linkage.
    this.versions = new Set();
}

// add node n to the folders cache
// assumptions:
// - if n.p is set, n.t is 0 or 1
// - if n.t is 0, n.s is always set
// - if n.t is 1, n.s is never set or set and != 0
UFSSizeCache.prototype.feednode = function(n) {
    'use strict';

    if (n.p) {
        if (!this.cache[n.p]) {
            // create previously unknown parent
            this.cache[n.p] = [n.t, 1 - n.t, n.s || 0, false, 0, 0, 0, 0, 0, 0, null];
        }
        else if (n.fv || this.cache[n.p][9]) {
            if (this.cache[n.p][9]) {
                // we only need the last version.
                this.versions.delete(n.p);
            }
        }
        else {
            // update known parent
            this.cache[n.p][1 - n.t]++;
            if (n.s) {
                this.cache[n.p][2] += n.s;
            }
        }

        // record parent linkage
        if (this.cache[n.h]) {
            this.cache[n.h][10] = (n.t || n.fv) && n;
            this.cache[n.h][3] = n.p;
        }
        else {
            this.cache[n.h] = [0, 0, 0, n.p, 0, 0, 0, 0, 0, 0, (n.t || n.fv) && n];
        }

        // record file version
        if (n.fv) {
            this.cache[n.h][1] = 1;
            this.cache[n.h][2] = n.s;
            this.cache[n.h][9] = 1;

            if (!this.cache[n.p][9]) {
                // version linkage (the parent is no longer in memory or not received yet)
                this.versions.add(n.p);
            }
        }
        else if (this.versions.has(n.h)) {
            // prevent loading this version later.
            this.versions.delete(n.h);
            this.cache[n.h][10] = n;
        }
    }
};

// compute td / tf / tb for all folders
UFSSizeCache.prototype.sum = function() {
    'use strict';

    for (var h in this.cache) {
        var p = h;

        do {
            this.cache[p][4] += this.cache[h][0];

            if (this.cache[h][9]) {
                this.cache[p][7] += this.cache[h][1];
                this.cache[p][8] += this.cache[h][2];
            }
            else {
                this.cache[p][5] += this.cache[h][1];
                this.cache[p][6] += this.cache[h][2];
            }
        } while ((p = this.cache[p][3]));
    }
};

// @private
UFSSizeCache.prototype._saveNodeState = function(n, entry) {
    'use strict';

    n.td = (n.td || 0) + entry[4];
    n.tf = (n.tf || 0) + entry[5];
    n.tb = (n.tb || 0) + entry[6];
    n.tvf = (n.tvf || 0) + entry[7];
    n.tvb = (n.tvb || 0) + entry[8];
    this.addToDB(n);
};

// @private
UFSSizeCache.prototype._saveTreeState = function(n, entry) {
    'use strict';

    this._saveNodeState(n, entry);

    if (!entry[3]) {
        while ((n = M.d[n.p] || this.cache[n.p] && this.cache[n.p][10])) {
            this._saveNodeState(n, entry);
        }
    }
};

// @private
UFSSizeCache.prototype._getVersions = function(rootNode) {
    'use strict';
    const versions = [...this.versions];

    if (d && rootNode && !M.d[rootNode.h]) {
        console.error('Versions should have been loaded prior to parsing action-packets!');
    }

    for (let i = versions.length; i--;) {
        const h = versions[i];

        if (M.d[h] || !this.cache[h] || this.cache[h][10]) {
            if (d) {
                if (!M.d[h] && (!this.cache[h] || !this.cache[h][10].fv)) {
                    console.error('Bogus feednode()... fix it.', h, [...this.cache[h]]);
                }
                else if (d > 1) {
                    console.debug('Version %s already in memory.', h, [...this.cache[h]]);
                }
            }
            versions.splice(i, 1);
        }
    }

    if (versions.length) {
        if (d) {
            console.warn('Versions retrieval...', [...versions]);
        }
        return dbfetch.geta(versions);
    }
};

// Save computed td / tf / tb / tvf /tvb for all folders
// if no root node is provided, cache is a full cloud tree
UFSSizeCache.prototype.save = async function(rootNode) {
    'use strict';
    this.sum();

    if (d) {
        console.debug('ufsc.save(%s)', rootNode ? rootNode.h : 'undef', rootNode, this);
        console.time('ufsc.save');
    }

    if (this.versions.size) {
        const promise = this._getVersions(rootNode);
        if (promise) {
            await promise;
        }
    }

    for (var h in this.cache) {
        const n = M.d[h] || this.cache[h][10];
        if (n) {
            if (d > 1 && rootNode && !this.cache[h][3] && !n.su) {
                // this may happens for outgoing shares moved to the rubbish-bin
                const msg = 'Uh..oh... internal (api?) error, try menu->reload';
                console.assert(rootNode.p === h, msg, rootNode.p, h, this.cache[h]);
            }

            this._saveTreeState(n, this.cache[h]);
        }
    }

    if (d) {
        console.timeEnd('ufsc.save');
        if (d > 2) {
            this._cache = [this.cache, [...this.versions]];
        }
    }
    this.cache = null;
    this.versions.clear();
};

// Add node to indexedDB
UFSSizeCache.prototype.addToDB = function(n) {
    'use strict';

    if (fmdb) {
        fmdb.add('f', {
            h: n.h,
            p: n.p,
            s: n.s >= 0 ? n.s : -n.t,
            t: n.t ? 1262304e3 - n.ts : n.ts,
            c: n.hash || '',
            fa: n.fa || '',
            d: n
        });

        if (mega.infinity && self.currsn) {
            delay('inf(fmdb:flush)', () => !self.pfid && setsn(self.currsn));
        }
    }

    if (n.t) {
        this.addTreeNode(n);

        if (self.fminitialized) {
            // onFolderSizeChangeUIUpdate will quit if not correct path
            M.onFolderSizeChangeUIUpdate(n);
        }
    }
};

/**
 * Record folder node, populates M.tree
 * @param {Object} n The folder node to add
 * @param {Boolean} [ignoreDB] Whether updating local state only
 */
UFSSizeCache.prototype.addTreeNode = function(n, ignoreDB) {
    'use strict';
    const p = n.s4 && M.getS4NodeType(n) === 'container' || n.t & M.IS_S4CRT ? 's4' : n.su ? 'shares' : n.p;

    if (!M.tree[p]) {
        M.tree[p] = Object.create(null);
    }
    var tmp = M.tree[p][n.h] = Object.create(null);
    tmp.name = n.name;
    tmp.ts = n.ts;
    tmp.td = n.td || 0;
    tmp.tf = n.tf || 0;
    tmp.tb = n.tb || 0;
    tmp.tvf = n.tvf || 0;
    tmp.tvb = n.tvb || 0;
    tmp.h = n.h;
    tmp.p = n.p;
    tmp.t = M.IS_TREE;
    tmp.lbl = n.lbl;

    if (ignoreDB) {
        if (n.t & M.IS_TREE) tmp.t = n.t;
    }
    else {
        if (n.fav)                                                   tmp.t |= M.IS_FAV;
        if (n.sen)                                                   tmp.t |= M.IS_SEN;
        if (M.su.EXP && M.su.EXP[n.h])                               tmp.t |= M.IS_LINKED;
        if (M.getNodeShareUsers(n, 'EXP').length || M.ps[n.h])       tmp.t |= M.IS_SHARED;
        if (M.getNodeShare(n).down === 1)                            tmp.t |= M.IS_TAKENDOWN;
    }

    if (n.su || p === 's4') {
        if (n.su) {
            tmp.su = n.su;
        }
        else {
            tmp.t |= M.IS_S4CRT;
        }

        if (!M.tree[n.p]) {
            M.tree[n.p] = Object.create(null);
        }
        M.tree[n.p][n.h] = tmp;
    }

    if (fmdb && !ignoreDB) {
        fmdb.add('tree', {
            h: n.h,
            d: tmp
        });
    }
};

/**
 * Remove folder node
 * @param {String} h The ufs node's handle
 * @param {String} p The ufs parent node for h
 */
UFSSizeCache.prototype.delTreeNode = function(h, p) {
    if (M.tree[h]) {
        for (var k in M.tree[h]) {
            this.delTreeNode(k, h);
        }
        delete M.tree[h];
    }
    if (M.tree.s4 && M.tree.s4[h]) {
        delete M.tree.s4[h];
    }
    if (M.tree[p] && M.tree[p][h]) {
        delete M.tree[p][h];

        var len = 0;
        for (var j in M.tree[p]) {
            len++;
            break;
        }
        if (!len) {
            delete M.tree[p];
        }
    }

    if (fmdb) {
        fmdb.del('tree', h);
    }
};

/**
 * Compute node addition back to root
 * @param {Object} n The ufs node
 * @param {Boolean} [ignoreDB] Hint: do not set it...
 */
UFSSizeCache.prototype.addNode = function(n, ignoreDB) {
    'use strict';
    var td, tf, tb, tvf, tvb;

    if (n.t) {
        td = (n.td || 0) + 1;
        tf = (n.tf || 0);
        tb = (n.tb || 0);
        tvf = (n.tvf || 0);
        tvb = (n.tvb || 0);

        if (!ignoreDB) {
            // if a new folder was created, save it to db
            this.addToDB(n);
        }
    }
    else {
        td = 0;
        tf = (n.fv) ? 0 : 1;
        tb = (n.fv) ? 0 : n.s;
        tvf = (n.fv) ? 1 : 0;
        tvb = (n.fv) ? n.s : 0;
    }

    if (d) {
        console.debug('ufsc.add', n.h, td, tf, tb, tvf, tvb);
    }

    while ((n = M.d[n.p])) {
        n.td = (n.td || 0) + td;
        n.tf = (n.tf || 0) + tf;
        n.tb = (n.tb || 0) + tb;
        n.tvf = (n.tvf || 0) + tvf;
        n.tvb = (n.tvb || 0) + tvb;
        this.addToDB(n);
    }
};

/**
 * Compute node deletions back to root
 * @param {Object} h The ufs node's handle
 * @param {Boolean} [ignoreDB] Hint: do not set it...
 */
UFSSizeCache.prototype.delNode = function(h, ignoreDB) {
    var n = M.d[h];

    if (n) {
        var td, tf, tb, tvf, tvb;

        if (n.t) {
            td = n.td + 1;
            tf = n.tf;
            tb = n.tb;
            tvf = n.tvf || 0;
            tvb = n.tvb || 0;

            this.delTreeNode(n.h, n.p);
        }
        else {
            td = 0;
            tf = (n.fv) ? 0 : 1;
            tb = (n.fv) ? 0 : n.s;
            tvf = (n.fv) ? 1 : 0;
            tvb = (n.fv) ? n.s : 0;
        }

        if (d) {
            console.debug('ufsc.del', h, td, tf, tb, tvf, tvb);

            // if (!td && td !== 0) debugger;
        }

        while ((n = M.d[n.p])) {
            n.td -= td;
            n.tf -= tf;
            n.tb -= tb;
            n.tvf -= tvf;
            n.tvb -= tvb;
            this.addToDB(n);
        }
    }
    else if (d && ignoreDB) {
        console.error('ufsc.delNode: Node not found', h);
    }
};
