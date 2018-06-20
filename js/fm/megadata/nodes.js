(function(global) {
    "use strict";
    var delInShareQueue = Object.create(null);

    MegaData.prototype.delNodeIterator = function(h, delInShareQ) {
        if (fminitialized) {
            removeUInode(h);
        }

        if (this.c[h] && h.length < 11) {
            for (var h2 in this.c[h]) {
                this.delNodeIterator(h2, delInShareQ);
            }
            delete this.c[h];
        }

        if (fmdb) {
            fmdb.del('f', h);

            if (!this.d[h] || this.d[h].ph) {
                fmdb.del('ph', h);
            }
        }

        if (this.nn) {
            delete this.nn[h];
        }

        if (this.d[h]) {
            if (this.d[h].su) {
                // this is an inbound share
                delete this.c.shares[h];
                if (this.tree.shares) {
                    delete this.tree.shares[h];
                }
                delete u_sharekeys[h];
                delInShareQ.push(this.d[h].su + '*' + h);
                this.delIndex(this.d[h].su, h);
            }

            this.delIndex(this.d[h].p, h);
            this.delHash(this.d[h]);
            delete this.d[h];
        }

        if (typeof this.u[h] === 'object') {
            this.u[h].c = 0;
        }

        if (this.su.EXP) {
            delete this.su.EXP[h];
        }
    };

    MegaData.prototype.delNode = function(h, ignoreDB) {
        var delInShareQ = delInShareQueue[h] = delInShareQueue[h] || [];

        if (fminitialized) {
            // Handle Inbox/RubbishBin UI changes
            delay(fmtopUI);
        }

        if (this.d[h] && !this.d[h].t && this.d[h].tvf) {
            var versions = fileversioning.getAllVersionsSync(h);
            for (var i = versions.length; i--;) {
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
        this.delNodeIterator(h, delInShareQ);

        if (fmdb && !ignoreDB) {
            // Perform DB deletions once we got acknowledge from API (action-packets)
            // which we can't do above because M.d[h] might be already deleted.
            for (var i = delInShareQ.length; i--;) {
                fmdb.del('s', delInShareQ[i]);
            }
            delete delInShareQueue[h];
        }
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
    if (this.u[n.h] && this.u[n.h] !== n) {
        for (var k in n) {
            // merge changes from n->M.u[n.h]
            if (n.hasOwnProperty(k) && k !== 'name') {
                this.u[n.h][k] = n[k];
            }
        }
        this.d[n.h] = this.u[n.h];
    }

    if (fminitialized) {
        newnodes.push(n);

        // Handle Inbox/RubbishBin UI changes
        delay(fmtopUI);
    }
};

MegaData.prototype.delHash = function(n) {
    "use strict";

    if (this.h[n.hash]) {
        var p = this.h[n.hash].indexOf(n.h);

        if (p >= 0) {
            this.h[n.hash] = this.h[n.hash].substr(0, p) + this.h[n.hash].substr(p + 9);

            if (!this.h[n.hash]) {
                delete this.h[n.hash];
            }
        }
    }
};

MegaData.prototype.delIndex = function(p, h) {
    "use strict";

    if (this.c[p] && this.c[p][h]) {
        delete this.c[p][h];
    }
    var a = 0;
    for (var i in this.c[p]) {
        a++;
        break;
    }
    if (!a) {
        delete this.c[p];
        if (fminitialized) {
            $('#treea_' + p).removeClass('contains-folders');
        }
    }
};

MegaData.prototype.getPath = function(id) {

    var result = [];
    var loop = true;
    var inshare;

    while (loop) {
        if ((id === 'contacts') && (result.length > 1)) {
            id = 'shares';
        }

        if (inshare && !this.d[id]) {
            // we reached the inshare root, use the owner next
            id = inshare;
        }

        if (
            this.d[id]
            || (id === 'contacts')
            || (id === 'messages')
            || (id === 'shares')
            || (id === this.InboxID)
            || (id === 'opc')
            || (id === 'ipc')
        ) {
            result.push(id);
        }
        else if (!id || (id.length !== 11)) {
            return [];
        }

        if (
            (id === this.RootID)
            || (id === 'contacts')
            || (id === 'shares')
            || (id === 'messages')
            || (id === this.RubbishID)
            || (id === this.InboxID)
            || (id === 'opc')
            || (id === 'ipc')
        ) {
            loop = false;
        }

        if (loop) {
            if (!(this.d[id] && this.d[id].p)) {
                break;
            }

            inshare = this.d[id].su;
            id = this.d[id].p;
        }
    }

    return result;
};

/**
 * Handle rubbish bin permanent items removal
 * How this works?
 * In case that param 'all' is true, then all items from rubbish are removed
 * In case that param 'all' is false, then selected nodes/items are removed and all child nodes/items if any
 * @param {Boolean} all To remove all or just selected nodes/items
 */
MegaData.prototype.clearRubbish = function(all) {
    "use strict";

    if (M.account) {
        // reset cached account data
        M.account.lastupdate = 0;
    }

    if (all) {
        loadingDialog.show();
        return M.req('dr').finally(loadingDialog.hide.bind(loadingDialog));
    }

    var selids;
    var success = 0;
    var idtag = mRandomToken('cr');
    var promise = new MegaPromise();

    var apiReq = function apiReq(handle) {
        api_req({ a: 'd', n: handle, i: idtag }, {
            callback: function(res) {
                if (res !== 0) {
                    console.warn('Failed to delete node with handle: ' + handle + ' Result: ' + res);
                }
                else {
                    success++;
                }
            }
        });
    };

    if (all) {
        // Completely empty rubbish
        selids = Object.keys(this.c[M.RubbishID] || {});
    }
    else {
        // Remove only selected items, not all at once
        selids = $.selected || [];
    }

    if (selids.length) {
        loadingDialog.show();

        M.scAckQueue[idtag] = function() {
            loadingDialog.hide();

            if (success === selids.length) {
                promise.resolve();
            }
            else {
                promise.reject(selids.length - success);
            }
        };
        selids.forEach(apiReq);
    }
    else {
        promise.reject(EINCOMPLETE);
    }

    return promise;
};

// This function has a special hacky purpose, don't use it if you don't know what it does, use M.copyNodes instead.
MegaData.prototype.injectNodes = function(nodes, target, callback) {
    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }

    var sane = nodes.filter(function(node) {
        return M.isFileNode(node);
    });

    if (sane.length !== nodes.length) {
        console.warn('injectNodes: Found invalid nodes.');
    }

    if (!sane.length) {
        return false;
    }

    nodes = [];

    sane = sane.map(function(node) {
        if (!M.d[node.h]) {
            nodes.push(node.h);
            M.d[node.h] = node;
        }
        return node.h;
    });

    this.copyNodes(sane, target, false, new MegaPromise())
        .always(function(res) {

            nodes.forEach(function(handle) {
                delete M.d[handle];
            });

            callback(res);
        });

    return nodes.length;
};

/**
 * @param {Array}       cn            Array of nodes that needs to be copied
 * @param {String}      t             Destination node
 * @param {Boolean}     [del]         Should we delete the node after copying? (Like a move operation)
 * @param {MegaPromise} [promise]     promise to notify completion on (Optional)
 * @param {Array}       [tree]        optional tree from M.getCopyNodes
 */
MegaData.prototype.copyNodes = function copynodes(cn, t, del, promise, tree) {
    var todel = [];

    if (typeof promise === 'function') {
        var tmp = promise;
        promise = new MegaPromise();
        promise.always(tmp);
    }

    loadingDialog.pshow();

    if (t.length === 11 && !u_pubkeys[t]) {
        var keyCachePromise = api_cachepubkeys([t]);
        keyCachePromise.always(function _cachepubkeyscomplete() {
            loadingDialog.phide();

            if (u_pubkeys[t]) {
                M.copyNodes(cn, t, del, promise, tree);
            }
            else {
                alert(l[200]);

                // XXX: remove above alert() if promise is set?
                if (promise) {
                    promise.reject(EKEY);
                }
            }
        });

        return promise;
    }

    if (!tree) {
        if (this.isFileNode(cn)) {
            tree = [cn];
        }
        else if ($.onImportCopyNodes) {
            tree = $.onImportCopyNodes;
        }
        else {
            // 1. get all nodes into memory
            this.getCopyNodes(cn, t, function() {
                var promise = new MegaPromise();

                if (t === M.RubbishID) {
                    var promises = [];

                    // allow to revert nodes sent to the rubbish bin
                    for (var i = cn.length; i--;) {
                        var h = cn[i];
                        var n = M.getNodeByHandle(h);

                        if (M.getNodeRoot(h) !== M.RubbishID) {
                            if (window.d) {
                                console.debug('Adding rr attribute...', n.rr, n.p);
                            }
                            if (!n.rr || n.rr !== n.p) {
                                n.rr = n.p;
                                promises.push(api_setattr(n, mRandomToken('rrc')));
                            }
                        }
                    }

                    MegaPromise.allDone(promises)
                        .always(function() {
                            promise.resolve(null, cn);
                        });

                    return promise;
                }

                // 2. check for conflicts
                fileconflict.check(cn, t, 'copy')
                    .always(function(files) {
                        var handles = [];
                        var parentsToKeep = Object.create(null);
                        var names = Object.create(null);

                        for (var i = files.length; i--;) {
                            var n = files[i];

                            names[n.h] = n.name;
                            handles.push(n.h);

                            if (n._replaces) {
                                todel.push(n._replaces);
                            }
                            if (n.keepParent) {
                                parentsToKeep[n.h] = n.keepParent;
                                del = false;
                                // it's complicated. For now if merging involved we wont delete
                                // as move to/from inshare is excuted as copy + del
                                // ---> here i am stopping 'del'
                            }
                        }

                        // 3. in case of new names, provide them back to getCopyNodes
                        promise.resolve(names, handles, parentsToKeep);
                    });

                return promise;
            })
                .always(function _(tree) {
                    assert(tree, 'No tree provided...');

                    loadingDialog.phide();

                    // 4. Store those nodes the user want to replace
                    tree.todel = todel.length && todel;

                    // 5. Provide the final tree back to copyNodes() and continue
                    M.copyNodes(cn, t, del, promise, tree);
                });

            return promise;
        }
    }

    if (!Object(tree).length) {
        // we may receive an empty array, for example if the user cancelled the fileconflict dialog
        loadingDialog.phide();

        if (promise) {
            promise.reject(EINCOMPLETE);
        }
        return promise;
    }

    if (tree.opSize) {
        loadingDialog.phide();

        M.checkGoingOverStorageQuota(tree.opSize)
            .fail(function() {
                if (promise) {
                    promise.reject(EGOINGOVERQUOTA);
                }
            })
            .done(function() {
                // Not going overquota, provide the final tree back to copyNodes() and continue
                M.copyNodes(cn, t, del, promise, tree);
            });

        delete tree.opSize;
        return promise;
    }
    todel = tree.todel;

    var a = tree;
    var nodesCount;
    var importNodes = Object(a).length;
    var result = []; // copied nodes to fulfill promise
    var ops = []; // FIXME: deploy API-side sn check
    var opsArr = Object.create(null);

    for (var e = 0; e < a.length; e++) {
        var dst = a[e].newTarget || t;

        if (opsArr[dst]) {
            opsArr[dst].push(a[e]);
        }
        else {
            opsArr[dst] = [a[e]];
        }
        delete a[e].newTarget;
    }

    var reportError = function copyNodesError(ex) {
        console.error(ex);
        loadingDialog.phide();

        // warn the user about something went wrong...
        msgDialog('warninga', l[135], l[47], String(ex), promise && function() {
            promise.reject(EINTERNAL);
        });
    };

    var onCopyNodesDone = function() {
        M.safeRemoveNodes(todel).always(function() {
            loadingDialog.phide();

            if (importNodes && nodesCount < importNodes) {
                msgDialog('warninga', l[882],
                    (nodesCount ? l[8683] : l[2507])
                        .replace('%1', nodesCount)
                        .replace('%2', importNodes)
                );
            }

            if (promise) {
                promise.resolve(result);
            }
        });
    };

    var promiseResolves;
    var onScDone = function(packet, nodes) {
        for (var i = nodes.length; i--;) {
            result.push(nodes[i].h);
        }

        if (--promiseResolves < 1) {
            onCopyNodesDone();
        }
    };

    for (var d in opsArr) {
        var objj = { a: 'p', t: d, n: opsArr[d] };
        objj.v = 3;
        objj.i = mRandomToken('pn');
        this.scAckQueue[objj.i] = onScDone;
        var s = this.getShareNodesSync(d);
        if (s && s.length) {
            objj.cr = crypto_makecr(opsArr[d], s, false);
        }
        objj.sm = 1;
        ops.push(objj);
    }
    promiseResolves = ops.length;

    // encrypt nodekeys, either by RSA or by AES, depending on whether
    // we're sending them to a contact's inbox or not
    // FIXME: do this in a worker
    var c = (t || "").length == 11;
    for (var i = a.length; i--;) {
        try {
            a[i].k = c
                ? base64urlencode(encryptto(t, a32_to_str(a[i].k)))
                : a32_to_base64(encrypt_key(u_k_aes, a[i].k));
        }
        catch (ex) {
            reportError(ex);
            return promise;
        }
    }

    api_req(ops, {
        cn: cn,
        del: del,
        t: t,
        callback: function(res, ctx) {

            if (typeof res === 'number' && res < 0) {
                loadingDialog.phide();
                if (promise) {
                    return promise.reject(res);
                }
                return M.ulerror(null, res);
            }

            if (ctx.del) {
                for (var i in ctx.cn) {
                    M.delNode(ctx.cn[i], true); // must not update DB pre-API
                    if (!res[i]) {
                        api_req({ a: 'd', n: cn[i]/*, i: requesti*/ });
                    }
                }
            }

            nodesCount = importNodes - Object.keys(res).length;

            // accelerate arrival of SC-conveyed new nodes by directly
            // issuing a fetch
            // (instead of waiting for waitxhr's connection to drop)
            getsc();
        }
    });

    return promise;
};

/**
 * Move nodes.
 * @param {Array}   n       Array of node handles
 * @param {String}  t       Target folder node handle
 * @param {Boolean} [quiet] omit loading overlay
 * @returns {MegaPromise} Resolves with the number of moves
 */
MegaData.prototype.moveNodes = function moveNodes(n, t, quiet) {
    'use strict'; /* jshint -W089, -W074 */
    var promise = new MegaPromise();

    if (!quiet) {
        loadingDialog.pshow();
    }

    this.collectNodes(n, t).always(function() {
        newnodes = [];
        var todel = [];
        var parentsToKeep = Object.create(null);
        var mergedFolder = Object.create(null);
        var pending = {value: 0, cnt: 0};
        var names = Object.create(null);

        var cleanEmptyMergedFolders = function _cleanEmptyMergedFolders() {
            if (Object.keys(mergedFolder).length) {
                // cleaning empty folders (moved).
                // during merging folders may still have some items (user chose dont move for
                // one or more files).
                // therefore, we check folders in src, if found empty --> clean.
                var recursiveFolderCheck = function _recursiveFolderCheck(fHandle) {
                    var cleanMe = true;
                    var tempDeleted = [];

                    for (var ha in M.c[fHandle]) {
                        if (!M.d[ha].t) {
                            return false;
                        }

                        var res = _recursiveFolderCheck(ha);
                        if (!res) {
                            cleanMe = false;
                        }
                        else {
                            tempDeleted.push(ha);
                        }
                    }

                    if (cleanMe) {
                        for (var le = 0; le < tempDeleted.length; le++) {
                            var loc = todel.indexOf(tempDeleted[le]);
                            if (loc >= 0) {
                                todel.splice(loc, 1);
                            }
                        }

                        todel.push(fHandle);
                        return true;
                    }
                };

                for (var kh = 0; kh < n.length; kh++) {
                    if (mergedFolder[n[kh]]) {
                        recursiveFolderCheck(n[kh]);
                    }
                }
            }
        };

        // Invoked when the move-nodes operation finished as a whole.
        var onMoveNodesDone = function(result) {

            // clean merged empty folders if any
            cleanEmptyMergedFolders();

            // finish operation removing dangling nodes, if any
            M.safeRemoveNodes(todel).always(function() {
                if (!quiet) {
                    loadingDialog.phide();
                }
                promise.resolve(result);
            });
        };

        // Invoked when all api requests finished.
        var apiReqCompletion = function(ctx) {
            var renderPromise = MegaPromise.resolve();

            if (newnodes.length) {
                // force fmdb flush by writing the sn, so that we don't have to
                // wait for the packet to do so if the operation succeed here.
                setsn(currsn);

                if (is_mobile) {
                    // In Mobile we can currently only move/delete one file/folder to one destination
                    var keys = Object.keys(ctx.handle);
                    var targetHandle = keys[0];
                    var nodeHandle = ctx.handle[targetHandle][0];

                    // A hook for the mobile web to remove the node from the view and close the dialog
                    mobile.deleteOverlay.completeDeletionProcess(nodeHandle);
                }
                else {
                    renderPromise = M.updFileManagerUI();
                }
            }

            renderPromise.always(function() {
                Soon(fmtopUI);
                $.tresizer();

                onMoveNodesDone(ctx.pending.cnt);
            });
        };

        // Helper to move a single node to an specific location.
        var moveNode = function(n, t, versions) {
            var i;
            var h = n.h;
            var p = n.p;
            var tn = [];

            // allow to revert nodes sent to the rubbish bin
            if (t === M.RubbishID && M.getNodeRoot(h) !== M.RubbishID) {
                if (d) {
                    console.debug('Adding rr attribute...', n.rr, p);
                }
                if (!n.rr || n.rr !== p) {
                    n.rr = p;
                    api_setattr(n, mRandomToken('rrm'));
                }
            }

            if (M.c[p] && M.c[p][h]) {
                delete M.c[p][h];
            }
            if (typeof M.c[t] === 'undefined') {
                M.c[t] = Object.create(null);
            }

            if (n.t) {
                (function _(h) {
                    if (M.tree[h]) {
                        var k = Object.keys(M.tree[h]);
                        tn = tn.concat(k);
                        for (var i = k.length; i--;) {
                            _(k[i]);
                        }
                    }
                })(h);

                if (M.tree[p]) {
                    delete M.tree[p][h];

                    if (!$.len(M.tree[p])) {
                        delete M.tree[p];
                    }
                }
            }
            M.c[t][h] = 1;

            if (versions) {
                if (d) {
                    console.assert(versions.length, 'Empty versions array?!');
                }
                for (i = versions.length; i--;) {
                    ufsc.delNode(versions[i].h);
                }
                for (i = 0; i < versions.length; i++) {
                    if (i === 0) {
                        versions[i].p = t;
                    }
                    ufsc.addNode(versions[i]);
                }
            }
            else {
                ufsc.delNode(h);
                n.p = t;
                ufsc.addNode(n);
            }

            for (i = tn.length; i--;) {
                var y = M.d[tn[i]];
                if (y) {
                    ufsc.addTreeNode(y);
                }
            }

            removeUInode(h, p);
            M.nodeUpdated(n);
            newnodes.push(n);

            if (names[h]) {
                if (names[h] === n.name) {
                    console.debug('fixme: caught invalid rename attempt.', h);
                }
                else {
                    M.rename(h, names[h]);
                }
            }
        };

        // Invoked for each api request that succeed. (Server gave an OK, i.e. Zero result)
        var apiReqSuccess = function(ctx) {
            var promises = [];
            var versions = Object.create(null);

            var getVersions = function(h) {
                var promise = fileversioning.getAllVersions(h);
                promise.done(function(v) {
                    versions[h] = v;
                });
                return promise;
            };

            var getNodes = function(callback) {
                var result = [];
                var handles = Object.keys(ctx.handle);

                for (var x = 0; x < handles.length; x++) {
                    var t = handles[x];
                    if (t !== 'NodesToClear') {
                        var nodes = ctx.handle[t];
                        for (var i = 0; i < nodes.length; i++) {
                            callback(M.d[nodes[i]], t);
                        }
                    }
                }

                return result;
            };

            getNodes(function(n) {
                if (n && !n.t && n.tvf) {
                    if (d > 1) {
                        console.debug('Retrieving versions for "%s"...', n.h, n);
                    }
                    promises.push(getVersions(n.h));
                }
            });

            var promise = new MegaPromise();
            MegaPromise.allDone(promises).finally(function() {
                if (d && promises.length) {
                    console.log('Versions loaded into memory.', versions);
                }

                getNodes(function(n, t) {
                    if (n && n.p) {
                        if (d > 1) {
                            console.debug('Moving node "%s" into "%s"...', n.h, t, n);
                        }
                        moveNode(n, t, versions[n.h]);
                    }
                });

                promise.resolve();
            });

            return promise;
        };

        // Fire an api request to move a node or a group of them to an specific location.
        var apiReq = function(apireq, h) {
            pending.cnt++;
            pending.value++;
            api_req(apireq, {
                handle: h,
                target: t,
                pending: pending,
                callback: function(res, ctx) {
                    var promise = MegaPromise.resolve();

                    if (!res) {
                        // if the move operation succeed (res == 0), perform the actual move locally
                        promise = apiReqSuccess(ctx);
                    }

                    promise.always(function() {
                        if (!--ctx.pending.value) {
                            apiReqCompletion(ctx);
                        }
                    });
                }
            });
        };

        // Perform node collection to initiate the move operation.
        var foreach = function(handles) {
            var ops = [];
            var opsArr = Object.create(null);

            for (var hh = 0; hh < handles.length; hh++) {
                var dst = parentsToKeep[handles[hh]] || t;

                if (opsArr[dst]) {
                    opsArr[dst].push(handles[hh]);
                }
                else {
                    opsArr[dst] = [handles[hh]];
                }
            }

            for (var dd in opsArr) {
                for (var nn = 0; nn < opsArr[dd].length; nn++) {
                    var objj = {a: 'm', t: dd, n: opsArr[dd][nn], i: requesti};
                    processmove(objj);
                    ops.push(objj);
                }
            }

            if (ops.length) {
                apiReq(ops, opsArr);
            }

            if (!pending.value) {
                console.assert(!handles.length, 'Hmmm....');
                onMoveNodesDone(0);
            }
        };

        // If the target folder is not the Rubbish, check whether we have to handle conflicts.
        if (t !== M.RubbishID) {
            mega.megadrop.preMoveCheck(n, t).done(function(n, t) {
                fileconflict.check(n, t, 'move')
                    .always(function(files) {
                        if (!quiet) { // closing conflict dialogs is hiding the loading
                            loadingDialog.phide(); // making sure it's not visible.
                            loadingDialog.pshow();
                        }
                        var handles = [];
                        var sharingIssueBetweenMerged = false;
                        for (var k = 0; k < files.length; k++) {
                            var n = files[k];
                            if (n._mergedFolderWith) {
                                mergedFolder[n.h] = n._mergedFolderWith;
                                // per specs, if one of merged folders [src or dest] has sharing --> stop
                                var s = M.getShareNodesSync(n.h);
                                if (s && s.length) {
                                    sharingIssueBetweenMerged = true;
                                    break;
                                }
                                s = M.getShareNodesSync(n._mergedFolderWith);
                                if (s && s.length) {
                                    sharingIssueBetweenMerged = true;
                                    break;
                                }
                                continue; // igonre this node, nothing to do
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
                        if (!sharingIssueBetweenMerged) {
                            foreach(handles);
                        }
                        else {
                            msgDialog('warninga', 'Moving Error',
                                l[17739],
                                'Error in Merging');
                            if (!quiet) {
                                loadingDialog.phide();
                            }
                            promise.reject(ECIRCULAR);
                        }
                    });
            }).fail(function() {
                loadingDialog.hide();
                // The user didn't want to disable MEGAdrop folders
                promise.reject(EBLOCKED);
            });
        }
        else {
            foreach(n);
        }
    });

    return promise;
};

/**
 * Helper function to move nodes falling back to copy+delete under inshares.
 *
 * @param {String} target  The handle for the target folder to move nodes into
 * @param {Array} [nodes]  Array of nodes to move, $.selected if none provided
 * @returns {MegaPromise}
 */
MegaData.prototype.safeMoveNodes = function safeMoveNodes(target, nodes) {
    var promise = new MegaPromise();

    nodes = nodes || $.selected || [];

    this.collectNodes(nodes, target)
        .always(function() {
            var copy = [];
            var move = [];
            var promises = [];
            var totype = treetype(target);

            if (d) {
                console.group('safeMoveNodes for %s nodes to target %s (%s)', nodes.length, target, totype, nodes);
            }

            for (var i = nodes.length; i--;) {
                var node = nodes[i];

                var fromtype = treetype(node);

                if (fromtype == totype) {
                    if (!M.isCircular(node, target)) {
                        if (totype != 'shares' || sharer(node) === sharer(target)) {
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
                if (d) {
                    console.debug('Performing %s copy+del operations...', copy.length);
                }
                promises.push(M.copyNodes(copy, target, true, new MegaPromise()));
            }
            if (move.length) {
                if (d) {
                    console.debug('Performing %s move operations...', move.length);
                }
                promises.push(M.moveNodes(move, target));
            }

            // TODO: we need an allDone() variant that does signal rejections back!...
            promise.linkDoneAndFailTo(MegaPromise.allDone(promises).always(console.groupEnd.bind(console)));
        });

    return promise;
};

/**
 * Helper function to remove nodes, either sending them to Rubbish or permanently.
 * @param {String|Array} handles The handle(s) to remove
 * @returns {MegaPromise}
 */
MegaData.prototype.safeRemoveNodes = function(handles) {
    'use strict';
    var masterPromise = new MegaPromise();

    handles = handles || [];

    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    handles = handles.concat();

    // Load required nodes into memory.
    dbfetch.geta(handles).always(function() {
        var i;
        var toDel = [];
        var toMove = [];
        var promises = [];

        for (i = handles.length; i--;) {
            var h = handles[i];
            var n = M.getNodeByHandle(h);

            if (treetype(h) === 'shares' || n.p === M.RubbishID) {
                toDel.push(h);
            }
            else {
                toMove.push(h);
            }
        }

        if (toMove.length) {
            promises.push(M.moveNodes(toMove, M.RubbishID, true));
        }

        if (toDel.length) {
            var idtag = mRandomToken('srn');
            var delPromise = new MegaPromise();

            for (i = toDel.length; i--;) {
                promises.push(M.req({a: 'd', n: toDel[i], i: idtag}));
            }

            M.scAckQueue[idtag] = function() {
                delPromise.resolve.apply(delPromise, arguments);
            };
            promises.push(delPromise);
        }

        masterPromise.linkDoneAndFailTo(MegaPromise.allDone(promises));
    });

    return masterPromise;
};

/**
 * Revert nodes sent to the rubbish, i.e. they must have `rr` attributes
 * @param {String|Array} handles The handle(s) to revert
 * @returns {MegaPromise}
 */
MegaData.prototype.revertRubbishNodes = function(handles) {
    'use strict'; /* jshint -W089 */
    var masterPromise = new MegaPromise();

    handles = handles || [];

    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    handles = handles.concat();

    if (d) {
        console.group('revertRubbishNodes for %s nodes...', handles.length, handles);

        masterPromise.always(console.groupEnd.bind(console));
    }

    // Main reverting logic
    var revertNodes = function() {
        var targets = Object.create(null);
        var promise = MegaPromise.resolve();

        var moveNode = function(h, t) {
            promise.pipe(function() {
                if (d) {
                    console.debug('Reverting %s into %s...', String(h), t);
                }
                return M.safeMoveNodes(t, h);
            });
        };

        for (var i = handles.length; i--;) {
            var h = handles[i];
            var n = M.getNodeByHandle(h);
            var t = n.rr;

            if (!t || !M.d[t] || M.getNodeRoot(t) === M.RubbishID) {
                if (d) {
                    console.warn('Reverting falling back to cloud root for %s.', h, t, n);
                }
                t = M.RootID;
            }

            if (targets[t]) {
                targets[t].push(h);
            }
            else {
                targets[t] = [h];
            }
        }

        if ($.len(targets)) {
            var target;

            for (var k in targets) {
                moveNode(targets[k], k);
                target = [k, targets[k]];
            }

            promise.unpack(function(newNodes) {
                var error = false;

                if (!Array.isArray(newNodes)) {
                    newNodes = [newNodes];
                }

                // we will only get new nodes if a copy+del was invoked.
                newNodes = newNodes.filter(function(h) {
                    if (typeof h === 'number' && h < 0) {
                        if (d) {
                            console.warn('Caught error in operation.', h);
                        }
                        error = h;
                    }
                    return M.d[h];
                });

                // removeUInode may queued another `delay('openfolder', ...)`, let's overwrite it.
                delay('openfolder', function() {
                    if (error) {
                        // Caught error found, copyNodes/moveNodes should have shown a msgDialog() to the user.
                        loadingDialog.hide();
                        masterPromise.reject(error);
                        return;
                    }

                    M.openFolder(target[0])
                        .finally(function() {
                            $.selected = newNodes.length && newNodes || target[1];
                            reselect(1);

                            masterPromise.resolve(targets);
                        });
                }, 90);
            });
        }
        else {
            masterPromise.reject(ENOENT);
        }
    };

    // Load required nodes into memory.
    dbfetch.geta(handles).always(function() {
        var to = Object.create(null);

        for (var i = handles.length; i--;) {
            var h = handles[i];
            var n = M.getNodeByHandle(h);

            if (!n) {
                if (d) {
                    console.debug('revertRubbishNodes: node not found.', h);
                }
            }
            else if (n.rr) {
                to[n.rr] = 1;
            }
        }

        dbfetch.geta(Object.keys(to)).always(revertNodes);
    });

    return masterPromise;
};

/**
 * Helper to move nodes to the rubbish bin
 * @param {String|Array} handles The handle(s) to move
 * @returns {MegaPromise}
 */
MegaData.prototype.moveToRubbish = function(handles) {
    'use strict';
    var masterPromise = new MegaPromise();

    if (!Array.isArray(handles)) {
        handles = [handles];
    }

    if (d) {
        console.group('moveToRubbish %s nodes...', handles.length, handles);
        console.time('moveToRubbish');
    }

    // always revoke any sharing status recursively across the affected nodes
    this.revokeShares(handles)
        .always(function() {
            var promise = M.safeMoveNodes(M.RubbishID, handles);

            if (d) {
                promise.always(function() {
                    console.timeEnd('moveToRubbish');
                    console.groupEnd();
                });
            }
            masterPromise.linkDoneAndFailTo(promise);
        });

    return masterPromise;
};

/**
 * Stop sharing nodes recursively across provided handles.
 * @param {String|Array} handles The root node handle(s) to stop sharing
 * @returns {MegaPromise}
 */
MegaData.prototype.revokeShares = function(handles) {
    'use strict'; /* jshint -W089, -W074 */
    var promise = new MegaPromise();

    if (!Array.isArray(handles)) {
        handles = [handles];
    }

    if (d) {
        console.group('revokeShares for %s nodes...', handles.length, handles);
    }

    this.collectNodes(handles)
        .tryCatch(function() {
            var i;
            var tree = [];
            var links = [];
            var folders = [];
            var promises = [];

            for (i = handles.length; i--;) {
                var n = M.d[handles[i]];

                if (!n) {
                    console.warn('revokeShares: node not found.', handles[i]);
                }
                else {
                    if (n.t) {
                        folders.push(n.h);
                    }
                    if (n.ph) {
                        links.push(n.h);
                    }
                    tree = tree.concat(M.getNodesSync(n.h, true));
                }
            }

            var widgets = mega.megadrop.isDropExist(folders);

            if (widgets.length) {
                if (d) {
                    console.debug('Revoking %s MEGAdrop folders...', widgets.length);
                }
                promises.push(mega.megadrop.pufRemove(widgets, true));
            }

            for (i = tree.length; i--;) {
                var h = tree[i];

                for (var share in Object(M.d[h]).shares) {
                    var user = M.d[h].shares[share].u;

                    if (user === 'EXP') {
                        links.push(h);
                    }
                    else {
                        if (d) {
                            console.debug('Revoking shared folder %s with user %s...', h, user);
                        }
                        promises.push(M.revokeFolderShare(h, user));
                    }
                }

                for (var u in M.ps[h]) {
                    if (d) {
                        console.debug('Revoking pending shared folder %s with user %s...', h, u);
                    }
                    promises.push(M.revokeFolderShare(h, u, true));
                }
            }

            if (links.length) {
                links = array.unique(links);

                if (d) {
                    console.debug('Revoking %s public links...', links.length);
                }

                var exportLink = new mega.Share.ExportLink({'updateUI': true, 'nodesToProcess': links});
                promises.push(exportLink.removeExportLink(true));
            }

            if (d) {
                console.debug('revokeShares: awaiting for %s promises...', promises.length);
            }

            MegaPromise.allDone(promises)
                .always(function() {
                    console.groupEnd();
                    promise.resolve();
                });

        }, function() {
            console.groupEnd();
            promise.reject.apply(promise, arguments);
        });

    return promise;
};

/**
 * Revoke folder share by invoking an s2 request.
 * @param {String} h The ufs-node handle
 * @param {String} usr The user-handle this node is shared with, or pcr id
 * @param {Boolean} [isps] Whether we're revoking a pending share
 * @returns {MegaPromise}
 */
MegaData.prototype.revokeFolderShare = function(h, usr, isps) {
    'use strict';
    var promise = new MegaPromise();

    if (String(h).length !== 8 || String(usr).length !== 11) {
        if (d) {
            console.warn('revokeFolderShare: Invalid arguments...', h, usr);
        }
        return MegaPromise.reject(EARGS);
    }

    api_req({a: 's2', n: h, s: [{u: Object(M.opc[usr]).m || usr, r: ''}], ha: '', i: requesti}, {
        callback: function(res) {
            if (typeof res === 'object') {
                // FIXME: verify error codes in res.r

                if (isps) {
                    M.deletePendingShare(h, usr);
                }
                else {
                    M.delNodeShare(h, usr);
                    setLastInteractionWith(usr, "0:" + unixtime());
                }

                promise.resolve(res);
            }
            else {
                if (d) {
                    console.warn('revokeFolderShare failed.', res, h, usr);
                }
                promise.reject(res);
            }
        }
    });

    return promise;
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
        if (n.rr && n.p !== M.RubbishID) {
            if (d) {
                console.debug('Removing rr attribute...', n.rr, n.p, n);
            }
            delete n.rr;
            api_setattr(n, mRandomToken('rru'));
        }
        ufsc.addToDB(n);

        if (this.nn && n.name && !n.fv) {
            this.nn[n.h] = n.name;
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
                        o_t: n.su + '*' + n.h,
                        d: this.c.shares[n.h]
                    });
                }
            }
        }
        // Update versioning dialog if it is open and the folder is its parent folder,
        // the purpose of the following code is to update permisions of historical files.
        if ($.selected
            && ($.selected.length > 0)
            && !$('.fm-versioning').hasClass('hidden')) {
            var parentNode = M.d[$.selected[0]] ? M.d[$.selected[0]].p : null;
            while (parentNode) {
                if (parentNode === n.h) {
                    fileversioning.updateFileVersioningDialog();
                    break;
                }
                parentNode = M.d[parentNode] ? M.d[parentNode].p : null;
            }
        }
    }
};


/**
 * Fire DOM updating when a node gets a new name
 * @param {String} itemHandle  node's handle
 * @param {String} newItemName the new name
 */
MegaData.prototype.onRenameUIUpdate = function(itemHandle, newItemName) {
    if (fminitialized) {
        var n = M.d[itemHandle] || false;

        // DOM update, left and right panel in 'Cloud Drive' tab
        $('.grid-table.fm #' + itemHandle + ' .tranfer-filetype-txt').text(newItemName);
        $('#' + itemHandle + '.data-block-view .file-block-title').text(newItemName);

        // DOM update, left and right panel in "Shared with me' tab
        $('#treea_' + itemHandle + ' span:nth-child(2)').text(newItemName);
        $('#' + itemHandle + ' .shared-folder-info-block .shared-folder-name').text(newItemName);

        // DOM update, right panel view during browsing shared content
        if (M.currentdirid === itemHandle) {
            $('.shared-details-block .shared-details-pad .shared-details-folder-name').text(newItemName);
        }

        // DOM update, breadcrumbs in 'Shared with me' tab
        if ($('#path_' + itemHandle).length > 0) {
            if (this.onRenameUIUpdate.tick) {
                clearTimeout(this.onRenameUIUpdate.tick);
            }
            this.onRenameUIUpdate.tick = setTimeout(function() {
                M.renderPath();
            }, 90);
        }

        mega.megadrop.onRename(itemHandle, newItemName);

        // update file versioning dialog if the name of the versioned file changes.
        if (!n.t && n.tvf > 0) {
            fileversioning.updateFileVersioningDialog(itemHandle);
        }

        if (n.p === M.currentdirid) {
            delay('onRenameUIUpdate:' + n.p, function() {
                if (n.p === M.currentdirid) {
                    M.openFolder(n.p, true).done(reselect);
                }
            }, 50);
        }
    }
};

MegaData.prototype.rename = function(itemHandle, newItemName) {
    var n = this.d[itemHandle];

    if (d) {
        console.assert(!n || n.name !== newItemName, 'Unneeded rename invoked.');
    }

    if (n && n.name !== newItemName) {
        n.name = newItemName;
        api_setattr(n, mRandomToken('mv'));
        this.onRenameUIUpdate(itemHandle, newItemName);
    }
};


/* Colour Label context menu update
 *
 * @param {String} node Selected Node
 */
MegaData.prototype.colourLabelcmUpdate = function(node) {

    var $items = $('.files-menu .dropdown-colour-item');
    var value;

    value = node.lbl;

    // Reset label submenu
    $items.removeClass('active');

    // Add active state label`
    if (value) {
        $items.filter('[data-label-id=' + value + ']').addClass('active');
    }
};

MegaData.prototype.getColourClassFromId = function(id) {

    return ({
        '1': 'red', '2': 'orange', '3': 'yellow',
        '4': 'green', '5': 'blue', '6': 'purple', '7': 'grey'
    })[id] || '';
};

/**
 * colourLabelDomUpdate
 *
 * @param {String} handle
 * @param {Number} value Current labelId
 */
MegaData.prototype.colourLabelDomUpdate = function(handle, value) {

    if (fminitialized) {
        var labelId = parseInt(value);
        var removeClasses = 'colour-label red orange yellow blue green grey purple';

        // Remove all colour label classes
        $('#' + handle).removeClass(removeClasses);
        $('#' + handle + ' a').removeClass(removeClasses);

        if (labelId) {
            // Add colour label classes.
            var colourClass = 'colour-label ' + this.getColourClassFromId(labelId);

            $('#' + handle).addClass(colourClass);
            $('#' + handle + ' a').addClass(colourClass);
        }
    }
};

/*
 * colourLabeling Handles colour labeling of nodes updates DOM and API
 *
 * @param {Array | string} handles Selected nodes handles
 * @param {Integer} labelId Numeric value of label
 */
MegaData.prototype.colourLabeling = function(handles, labelId) {

    var newLabelState = 0;

    if (fminitialized && handles) {
        if (!Array.isArray(handles)) {
            handles = [handles];
        }

        $.each(handles, function(index, handle) {

            var node = M.d[handle];
            newLabelState = labelId;

            if (node.lbl === labelId) {
                newLabelState = 0;
            }
            node.lbl = newLabelState;
            if (node.tvf) {
                fileversioning.labelVersions(handle, newLabelState);
            }
            api_setattr(node, mRandomToken('lbl'));
            M.colourLabelDomUpdate(handle, newLabelState);
        });
    }
};

/**
 * favouriteDomUpdate
 *
 * @param {Object} node      Node object
 * @param {Number} favState  Favourites state 0 or 1
 */
MegaData.prototype.favouriteDomUpdate = function(node, favState) {
    var $gridView = $('#' + node.h + ' .grid-status-icon');
    var $blockView = $('#' + node.h + '.data-block-view .file-status-icon');

    if (favState) {// Add favourite
        $gridView.addClass('star');
        $blockView.addClass('star');
    }
    else {// Remove from favourites
        $gridView.removeClass('star');
        $blockView.removeClass('star');
    }
};

/**
 * Change node favourite state.
 * @param {Array}   handles     An array containing node handles
 * @param {Number}  newFavState Favourites state 0 or 1
 */
MegaData.prototype.favourite = function(handles, newFavState) {
    var exportLink = new mega.Share.ExportLink({});

    if (fminitialized) {
        if (!Array.isArray(handles)) {
            handles = [handles];
        }

        $.each(handles, function(index, handle) {
            var node = M.getNodeByHandle(handle);

            if (node && !exportLink.isTakenDown(handle)) {
                node.fav = newFavState;
                api_setattr(node, mRandomToken('fav'));
                if (node.tvf) {
                    fileversioning.favouriteVersions(handle, newFavState);
                }
                M.favouriteDomUpdate(node, newFavState);
            }
        });
    }
};

/**
 * isFavourite
 *
 * Search throught items via nodesId and report about fav attribute
 * @param {Array} nodesId Array of nodes Id
 * @returns {Boolean}
 */
MegaData.prototype.isFavourite = function(nodesId) {

    var result = false;
    var nodes = nodesId;

    if (!Array.isArray(nodesId)) {
        nodes = [nodesId];
    }

    // On first favourite found break the loop
    $.each(nodes, function(index, value) {
        if (M.d[value] && M.d[value].fav) {
            result = true;
            return false;// Break the loop
        }
    });

    return result;
};

/**
 * versioningDomUpdate
 *
 * @param {Handle} fh      Node handle
 * @param {Number} versionsNumber  Number of previous versions.
 */
MegaData.prototype.versioningDomUpdate = function(fh) {
    var $nodeView = $('#' + fh);

    if (M.d[fh] && M.d[fh].tvf) {// Add versioning
        $nodeView.addClass('versioning');
    }
    else {// Remove versioning
        $nodeView.removeClass('versioning');
    }
};

MegaData.prototype.getNode = function(idOrObj) {
    if (isString(idOrObj) === true && this.d[idOrObj]) {
        return this.d[idOrObj];
    }
    else if (idOrObj && typeof (idOrObj.t) !== 'undefined') {
        return idOrObj;
    }
    else {
        return false;
    }
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
 * @returns {MegaPromise}
 */
MegaData.prototype.getNodes = function fm_getnodes(root, includeroot, excludebad, excludeverions) {
    var promise = new MegaPromise();

    dbfetch.coll([root])
        .always(function() {
            var result = M.getNodesSync(root, includeroot, excludebad, excludeverions);
            promise.resolve(result);
        });

    return promise;
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

    while (i = parents.length) {
        newparents = [];

        while (i--) {
            // must exist and optionally be fully decrypted to qualify
            if (this.d[parents[i]] && (!excludebad || !this.d[parents[i]].a)) {
                nodes.push(parents[i]);
                if (this.c[parents[i]] &&
                    ((excludeverions && this.d[parents[i]].t) || (!excludeverions))) {
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
 * @returns {MegaPromise}
 */
MegaData.prototype.collectNodes = function(handles, targets) {
    'use strict';

    var promise = new MegaPromise();
    var promises = [];

    if (targets) {
        if (!Array.isArray(targets)) {
            targets = [targets];
        }
        targets = targets.concat();

        for (var t = targets.length; t--;) {
            if (M.c[targets[t]]) {
                targets.splice(t, 1);
            }
        }

        if (targets.length) {
            promises.push(dbfetch.geta(targets));
        }
    }

    if (!Array.isArray(handles)) {
        handles = [handles];
    }
    handles = handles.concat();

    for (var i = handles.length; i--;) {
        var h = handles[i];

        if (M.d[h] && !M.d[h].t) {
            handles.splice(i, 1);
        }
    }

    if (handles.length) {
        promises.push(dbfetch.coll(handles));
    }

    if (d) {
        console.log('collectNodes', handles, targets);
    }

    promise.linkDoneAndFailTo(MegaPromise.allDone(promises));

    return promise;
};

/**
 * Get all clean (decrypted) subtrees under cn
 * FIXME: return total number of nodes omitted because of decryption issues
 *
 * @param {Array}           handles Node handles
 * @param {Array|String}    [hadd]  Additional node handles to fetch, not included in the result
 * @param {Object|Function} [names] Object containing handle:name to perform renaming over these nodes,
 *                                  or a function returning a promise which will be fulfilled with them.
 * @returns {MegaPromise}
 */
MegaData.prototype.getCopyNodes = function fm_getcopynodes(handles, hadd, names) {
    var promise = new MegaPromise();

    this.collectNodes(handles, hadd)
        .finally(function() {
            var sync = function(names, handles, presevedParents) {
                var result = M.getCopyNodesSync(handles, names, presevedParents);
                promise.resolve(result);
            };

            if (typeof names === 'function') {
                names(handles).done(sync);
            }
            else {
                sync(names, handles);
            }
        });

    return promise;
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
    var a = [];
    var r = [];
    var i, j;
    var opSize = 0;

    // add all subtrees under handles[], including the roots
    for (i = 0; i < handles.length; i++) {
        var tempR = this.getNodesSync(handles[i], true, true);
        if (presevedParents && presevedParents[handles[i]]) {
            for (var kh = 0; kh < tempR.length; kh++) {
                if (!presevedParents[tempR[kh]]) {
                    presevedParents[tempR[kh]] = presevedParents[handles[i]];
                }
            }
        }
        r = r.concat(tempR);
    }

    for (i = 0; i < r.length; i++) {
        var n = this.d[r[i]];

        if (!n) {
            if (d) {
                console.warn('Node not found', r[i]);
            }
            continue;
        }

        // repackage/-encrypt n for processing by the `p` API
        var nn = {};

        // copied folders receive a new random key
        // copied files must retain their existing key
        if (!n.t) {
            nn.k = n.k;
        }

        // check if renaming should be done
        if (names && names[n.h]) {
            n = clone(n);
            n.name = M.getSafeName(names[n.h]);
        }

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
        for (j = 0; j < handles.length; j++) {
            if (handles[j] === nn.h) {
                delete nn.p;
                break;
            }
        }

        // count total size
        if (!n.t) {
            opSize += n.s || 0;
        }

        a.push(nn);
    }

    a.opSize = opSize;

    return a;
};

/**
 * Get all parent nodes having a u_sharekey
 *
 * @param {String} h       Node handle
 * @param {Object} [root]  output object to get the path root
 * @returns {MegaPromise}
 */
MegaData.prototype.getShareNodes = function fm_getsharenodes(h, root) {
    var promise = new MegaPromise();

    dbfetch.get(h)
        .always(function() {
            var out = {};
            var result = M.getShareNodesSync(h, out);
            promise.resolve(result, out.handle);
        });

    return promise;
};

/**
 * Get all parent nodes having a u_sharekey
 *
 * @param {String} h       Node handle
 * @param {Object} [root]  output object to get the path root
 * @returns {Array}
 */
MegaData.prototype.getShareNodesSync = function fm_getsharenodessync(h, root) {
    var sn = [];
    var n = this.d[h];

    while (n && n.p) {
        if (u_sharekeys[n.h]) {
            sn.push(n.h);
        }
        n = this.d[n.p];
    }

    if (root) {
        root.handle = n && n.h;
    }

    return sn;
};

/**
 * Retrieve node rights.
 * @details Former rightsById()
 * @param {String} id The node handle
 * @returns {Number} 0: read-only, 1: read-and-write, 2: full-access
 */
MegaData.prototype.getNodeRights = function(id) {
    "use strict";

    if (folderlink || (id && id.length > 8)) {
        return false;
    }

    while (this.d[id] && this.d[id].p) {
        if (this.d[id].r >= 0) {
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

    if (id) {
        id = id.replace('chat/', '');
    }
    var p = this.getPath(id);
    return p[p.length - 1];
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
 * @param {String} toid The handle where the folder will be created.
 * @param {String|Array} name Either a string with the folder name to create, or an array of them.
 * @param {Object|MegaPromise} ulparams Either an old-fashion object with a `callback` function or a MegaPromise.
 * @return {Object} The `ulparams`, whatever it is.
 */
MegaData.prototype.createFolder = function(toid, name, ulparams) {
    "use strict";

    // This will be called when the folder creation succeed, pointing
    // the caller with the handle of the deeper created folder.
    var resolve = function(folderHandle) {
        if (ulparams) {
            if (ulparams instanceof MegaPromise) {
                ulparams.resolve(folderHandle);
            }
            else {
                ulparams.callback(ulparams, folderHandle);
            }
        }
        return ulparams;
    };

    // This will be called when the operation failed.
    var reject = function(error) {
        if (ulparams instanceof MegaPromise) {
            ulparams.reject(error);
        }
        else {
            msgDialog('warninga', l[135], l[47], api_strerror(error));
        }
        return ulparams;
    };

    toid = toid || M.RootID;

    // Prevent unneeded API calls if toid is not a valid handle
    if ([8, 11].indexOf(String(toid).length) === -1) {
        return reject(EACCESS);
    }

    if (Array.isArray(name)) {
        name = name.map(String.trim).filter(String).slice(0);

        if (!name.length) {
            name = undefined;
        }
        else {
            // Iterate through the array of folder names, creating one at a time
            var next = function(target, folderName) {
                M.createFolder(target, folderName, new MegaPromise())
                    .done(function(folderHandle) {
                        if (!name.length) {
                            resolve(folderHandle);
                        }
                        else {
                            next(folderHandle, name.shift());
                        }
                    })
                    .fail(function(error) {
                        reject(error);
                    });
            };
            next(toid, name.shift());
            return ulparams;
        }
    }

    if (!name) {
        return resolve(toid);
    }

    var _done = function cfDone() {

        if (M.c[toid]) {
            // Check if a folder with the same name already exists.
            for (var handle in M.c[toid]) {
                if (M.d[handle] && M.d[handle].t && M.d[handle].name === name) {
                    return resolve(M.d[handle].h);
                }
            }
        }

        var n = { name: name };
        var attr = ab_to_base64(crypto_makeattr(n));
        var key = a32_to_base64(encrypt_key(u_k_aes, n.k));
        var req = { a: 'p', t: toid, n: [{ h: 'xxxxxxxx', t: 1, a: attr, k: key }], i: requesti };
        var sn = M.getShareNodesSync(toid);

        if (sn.length) {
            req.cr = crypto_makecr([n], sn, false);
            req.cr[1][0] = 'xxxxxxxx';
        }

        if (!ulparams) {
            loadingDialog.pshow();
        }
        var hideOverlay = function() {
            if (!ulparams) {
                loadingDialog.phide();
            }
        };

        api_req(req, {
            callback: function(res) {
                if (d) {
                    console.log('Create folder result...', res);
                }
                if (res && typeof res === 'object') {
                    // Let's be paranoid ensuring we got a proper result
                    // since this could trash the whole ufs-size-cache..
                    var n = Array.isArray(res.f) && res.f[0];

                    if (typeof n !== 'object' || typeof n.h !== 'string' || n.h.length !== 8) {
                        hideOverlay();
                        return reject(EINTERNAL);
                    }

                    $('.fm-new-folder').removeClass('active');
                    $('.create-new-folder').addClass('hidden');
                    $('.create-new-folder input').val('');
                    newnodes = [];

                    // this is only safe once sn enforcement has been deployed
                    M.addNode(n);
                    ufsc.addNode(n);

                    M.updFileManagerUI()
                        .always(function() {
                            if ($.copyDialog || $.moveDialog) {
                                refreshDialogContent();
                            }
                            hideOverlay();

                            resolve(n.h);
                        });
                }
                else {
                    hideOverlay();
                    reject(res);
                }
            }
        });
    };

    if (M.c[toid]) {
        _done();
    }
    else {
        dbfetch.get(toid, new MegaPromise()).always(_done);
    }

    return ulparams;
};

// leave incoming share h
// FIXME: implement sn tagging to prevent race condition
MegaData.prototype.leaveShare = function(h) {
    "use strict";

    var promise = new MegaPromise();

    if (d) {
        console.log('leaveShare', h);
    }

    // leaving inner nested shares is not allowed: walk to the share root
    while (this.d[h] && this.d[this.d[h].p]) {
        h = this.d[h].p;
    }

    if (this.d[h] && this.d[h].su) {
        loadingDialog.show();

        var idtag = mRandomToken('ls');
        api_req({ a: 'd', n: h, i: idtag });

        this.scAckQueue[idtag] = function() {
            loadingDialog.hide();
            promise.resolve(h);
        };
    }
    else {
        if (d) {
            console.warn('Cannot leaveShare', h);
        }
        promise.reject();
    }

    return promise;
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

            users = users.filter(function(user) {
                return exclude.indexOf(user) === -1;
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
        users = users.map(function(h) {
            return M.getUserByHandle(h);
        });
    }

    return users;
};

MegaData.prototype.nodeShare = function(h, s, ignoreDB) {
    "use strict";

    // TODO: having moved to promises, ensure all calls are safe...
    if (!this.d[h]) {
        return dbfetch.get(h)
            .always(function() {
                if (M.d[h]) {
                    M.nodeShare(h, s, ignoreDB);
                }
                else {
                    console.warn('nodeShare failed for node:', h, s, ignoreDB);
                }
            });
    }

    if (this.d[h]) {
        if (typeof this.d[h].shares === 'undefined') {
            this.d[h].shares = Object.create(null);
        }
        this.d[h].shares[s.u] = s;

        // Maintain special outgoing shares index by user
        if (!this.su[s.u]) {
            this.su[s.u] = Object.create(null);
        }
        this.su[s.u][h] = 1;

        if (this.d[h].t) {
            // update tree node flags
            ufsc.addTreeNode(this.d[h]);
        }

        if (fmdb && !ignoreDB && !pfkey) {
            fmdb.add('s', { o_t: h + '*' + s.u, d: s });

            if (!u_sharekeys[h]) {
                if (d && !this.getNodeShare(h)) {
                    console.warn('No share key for node ' + h);
                }
            }
            else {
                fmdb.add('ok', {
                    h: h,
                    d: {
                        k: a32_to_base64(encrypt_key(u_k_aes, u_sharekeys[h][0])),
                        ha: crypto_handleauth(h)
                    }
                });
            }
        }

        if (fminitialized) {
            sharedUInode(h);
        }
    }
    else if (d) {
        console.warn('nodeShare failed for node:', h, s, ignoreDB);
    }

    return MegaPromise.resolve();
};

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
            fmdb.del('s', h + '*' + u);
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
            if (this.d[h].shares[i]) {
                a = true;
                break;
            }
        }

        if (!a) {
            delete this.d[h].shares;
            updnode = true;
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
        var users = this.getNodeShareUsers(h, 'EXP');

        if (users.length) {
            console.warn('The node ' + h + ' still has shares on it!', users);

            users.forEach(function(user) {
                M.delNodeShare(h, user);
            });
        }

        delete u_sharekeys[h];
        if (fmdb) {
            fmdb.del('ok', h);
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

    M.u.every(function(contact, u) {
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

        if (user) {
            // XXX: fallback to email
            result = user.name && $.trim(user.name) || user.m;
        }
    }
    else if (handle.length === 8) {
        var node = this.getNodeByHandle(handle);

        if (node) {
            result = node.name;
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

    for (var i = this.v.length; i--;) {
        if (this.v[i].h === handle) {
            return this.v[i];
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
    res.links = { cnt: s.links.files, size: s.links.bytes };
    res.versions = { cnt: s[this.RootID].vfiles, size: s[this.RootID].vbytes };

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
        }
    }
};

MegaData.prototype.emptySharefolderUI = function(lSel) {
    "use strict";

    if (!lSel) {
        lSel = this.fsViewSel;
    }

    $(lSel).before($('.fm-empty-folder .fm-empty-pad:first').clone().removeClass('hidden').addClass('fm-empty-sharef'));
    $(lSel).hide().parent().children('table').hide();

    $('.files-grid-view.fm.shared-folder-content').addClass('hidden');

    $.tresizer();
};


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
            }
            else if (d && node.t < 2 && (node.h !== M.RootID /*folderlink*/)) {
                console.error('M.disableCircularTargets: parent-less node!', handle, pref);
            }
        }
        else if (d) {
            console.error('M.disableCircularTargets: Invalid node', handle, pref);
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
            var h = folders[i].h;

            if (this.tree[h]) {
                this.disableDescendantFolders(h, pref);
            }
            $(pref + h).addClass('disabled');
        }
    }
};

/**
 * Import welcome pdf into the current account.
 * @returns {MegaPromise}
 */
MegaData.prototype.importWelcomePDF = function() {
    'use strict';
    var promise = new MegaPromise();

    M.req('wpdf').done(function(res) {
        if (typeof res === 'object') {
            var ph = res.ph;
            var key = res.k;
            M.req({a: 'g', p: ph}).done(function(res) {
                if (typeof res.at === 'string') {
                    M.onFileManagerReady(function() {
                        var doit = true;
                        for (var i = M.v.length; i--;) {
                            if (fileext(M.v[i].name) === 'pdf') {
                                doit = false;
                                break;
                            }
                        }

                        if (doit) {
                            if (d) {
                                console.log('Importing Welcome PDF (%s)', ph, res.at);
                            }
                            promise.linkDoneAndFailTo(M.importFileLink(ph, key, res.at));
                        }
                        else {
                            promise.reject(EEXIST);
                        }
                    });
                }
                else {
                    promise.reject(res);
                }
            });
        }
        else {
            promise.reject(res);
        }
    });

    return promise;
};

/**
 * Import file link
 * @param {String} ph  Public handle
 * @param {String} key  Node key
 * @param {String} attr Node attributes
 * @returns {MegaPromise}
 */
MegaData.prototype.importFileLink = function importFileLink(ph, key, attr) {
    'use strict';
    return new MegaPromise(function(resolve, reject) {
        api_req({
            a: 'p',
            t: M.RootID,
            n: [{
                ph: ph,
                t: 0,
                a: attr,
                k: a32_to_base64(encrypt_key(u_k_aes, base64_to_a32(key).slice(0, 8)))
            }]
        }, {
            callback: function(r) {
                    if (typeof r === 'object') {
                        $.onRenderNewSelectNode = r.f[0].h;
                        resolve(r.f[0].h);
                    }
                    else {
                        M.ulerror(null, r);
                        reject(r);
                    }
                }
            });
    });
};

/**
 * Import folderlink nodes
 * @param {Array} nodes The array of nodes to import
 */
MegaData.prototype.importFolderLinkNodes = function importFolderLinkNodes(nodes) {
    "use strict";

    var _import = function(data) {
        $.mcImport = true;
        $.selected = data[0];
        $.onImportCopyNodes = data[1];
        $.onImportCopyNodes.opSize = data[2];

        if (d) {
            console.log('Importing Nodes...', $.selected, $.onImportCopyNodes, data[2]);
        }
        $('.dropdown-item.copy-item').click();
    };

    if (localStorage.folderLinkImport && !folderlink) {

        if ($.onImportCopyNodes) {
            _import($.onImportCopyNodes);
        }
        else {
            var kv = StorageDB(u_handle);
            var key = 'import.' + localStorage.folderLinkImport;

            kv.get(key)
                .done(function(data) {
                    _import(data);
                    kv.rem(key);
                })
                .fail(function(e) {
                    if (d) {
                        console.error(e);
                    }
                    msgDialog('warninga', l[135], l[47]);
                });
        }
        nodes = null;
        delete localStorage.folderLinkImport;
    }

    var sel = [].concat(nodes || []);
    if (sel.length) {
        var FLRootID = M.RootID;

        mega.ui.showLoginRequiredDialog().done(function() {
            loadingDialog.show();
            localStorage.folderLinkImport = FLRootID;

            M.getCopyNodes(sel)
                .done(function(nodes) {
                    var data = [sel, nodes, nodes.opSize];
                    var fallback = function() {
                        $.onImportCopyNodes = data;
                        loadSubPage('fm');
                    };

                    if (nodes.length > 6000) {
                        fallback();
                    }
                    else {
                        StorageDB(u_handle)
                            .set('import.' + FLRootID, data)
                            .done(function() {

                                loadSubPage('fm');
                            })
                            .fail(function(e) {
                                if (d) {
                                    console.warn('Cannot import using indexedDB...', e);
                                }
                                fallback();
                            });
                    }
                });
        }).fail(function(aError) {
            // If no aError, it was canceled
            if (aError) {
                alert(aError);
            }
        });
    }
};
