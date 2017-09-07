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

            // Update M.v it's used for at least preview slideshow
            for (var k = this.v.length; k--;) {
                if (this.v[k].h === h) {
                    this.v.splice(k, 1);
                    break;
                }
            }
        }

        // remove ufssizecache records
        ufsc.delNode(h, ignoreDB);

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
        n = this.u[n.h];
    }

    this.d[n.h] = n;

    if (fminitialized) {

        // Handle Inbox/RubbishBin UI changes
        if (!is_mobile) {
            delay('fmtopUI', fmtopUI);
        }
        else {
            mobile.cloud.countAndUpdateSubFolderTotals();
        }

        newnodes.push(n);
    }

    // $(window).trigger("megaNodeAdded", [n]);
};

MegaData.prototype.delHash = function(n) {
    "use strict";

    if (this.h[n.hash]) {
        var p = this.h[n.hash].indexOf(n.h);

        if (p >= 0) {
            this.h[n.hash] = this.h[n.hash].substr(0, p) + this.h[n.hash].substr(p+9);

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

    var selids;
    var success = 0;
    var idtag = mRandomToken('cr');
    var promise = new MegaPromise();

    var apiReq = function apiReq(handle) {
        api_req({a: 'd', n: handle, i: idtag}, {
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

                    if (t === M.RubbishID) {
                        return MegaPromise.resolve(null, cn);
                    }
                    var promise = new MegaPromise();

                    // 2. check for conflicts
                    fileconflict.check(cn, t, 'copy')
                        .always(function(files) {
                            var handles = [];
                            var names = Object.create(null);
                            for (var i = files.length; i--;) {
                                var n = files[i];

                                names[n.h] = n.name;
                                handles.push(n.h);

                                if (n._replaces) {
                                    todel.push(n._replaces);
                                }
                            }

                            // 3. in case of new names, provide them back to getCopyNodes
                            promise.resolve(names, handles);
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
    var sconly = importNodes > 10;   // true -> new nodes delivered via SC `t` command only
    var ops = {a: 'p', t: t, n: a}; // FIXME: deploy API-side sn check

    var reportError = function copyNodesError(ex) {
        console.error(ex);
        loadingDialog.phide();

        // warn the user about something went wrong...
        msgDialog('warninga', l[135], l[47], String(ex), promise && function() {
                promise.reject(EINTERNAL);
            });
    };

    var onCopyNodesDone = function() {
        if (todel && todel.length) {
            M.moveNodes(todel, M.RubbishID, true);
        }

        loadingDialog.phide();
        if (promise) {
            promise.resolve(0);
        }
        if (!sconly) {
            M.updFileManagerUI();
        }

        if (importNodes && nodesCount < importNodes) {
            msgDialog('warninga', l[882],
                (nodesCount ? l[8683] : l[2507])
                    .replace('%1', nodesCount)
                    .replace('%2', importNodes)
            );
        }
    };

    if (sconly) {
        ops.v = 3;
        ops.i = mRandomToken('pn');
        this.scAckQueue[ops.i] = onCopyNodesDone;
    }
    else {
        // ops.v = 2;
        ops.i = requesti;
    }

    var s = this.getShareNodesSync(t);

    if (s.length) {
        ops.cr = crypto_makecr(a, s, false);
    }

    if (importNodes) {
        // #4290 'strict mode'
        ops.sm = 1;
    }

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
        sconly: sconly,
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
                    if (!ctx.sconly || !res[i]) {
                        api_req({a: 'd', n: cn[i]/*, i: requesti*/});
                    }
                }
            }

            if (ctx.sconly) {
                nodesCount = importNodes - Object.keys(res).length;

                // accelerate arrival of SC-conveyed new nodes by directly
                // issuing a fetch
                // (instead of waiting for waitxhr's connection to drop)
                getsc();
            }
            else {
                newnodes = [];

                if (res.u) {
                    process_u(res.u, true);
                }

                if (res.f) {
                    nodesCount = Object(res.f).length;
                    process_f(res.f, onCopyNodesDone);
                }
                else {
                    onCopyNodesDone();
                }
            }
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
    var promise = new MegaPromise();

    if (!quiet) {
        loadingDialog.pshow();
    }
    dbfetch.coll(n.concat(t))
        .always(function() {
            newnodes = [];
            var todel = [];
            var pending = {value: 0, cnt: 0};
            var names = Object.create(null);
            var apiReq = function(apireq, h) {
                pending.cnt++;
                pending.value++;

                api_req(apireq, {
                    handle: h,
                    target: t,
                    pending: pending,
                    callback: function(res, ctx) {
                        // if the move operation succeed (res == 0), perform the actual move locally
                        if (!res) {
                            var node = M.getNodeByHandle(ctx.handle);

                            if (node && node.p) {
                                var h = ctx.handle;
                                var t = ctx.target;
                                var parent = node.p;
                                var tn = [];

                                // Update M.v it's used for slideshow preview at least
                                for (var k = M.v.length; k--;) {
                                    if (M.v[k].h === h) {
                                        M.v.splice(k, 1);
                                        break;
                                    }
                                }

                                if (M.c[parent] && M.c[parent][h]) {
                                    delete M.c[parent][h];
                                }
                                if (typeof M.c[t] === 'undefined') {
                                    M.c[t] = Object.create(null);
                                }
                                if (node.t) {
                                    (function _(h) {
                                        if (M.tree[h]) {
                                            var k = Object.keys(M.tree[h]);
                                            tn = tn.concat(k);
                                            for (var i = k.length; i--;) _(k[i]);
                                        }
                                    })(h);

                                    if (M.tree[parent]) {
                                        delete M.tree[parent][h];

                                        if (!$.len(M.tree[parent])) {
                                            delete M.tree[parent];
                                        }
                                    }
                                }
                                M.c[t][h] = 1;
                                ufsc.delNode(h);
                                node.p = t;
                                ufsc.addNode(node);
                                for (var i = tn.length; i--;) {
                                    var n = M.d[tn[i]];
                                    if (n) {
                                        ufsc.addTreeNode(n);
                                    }
                                }
                                removeUInode(h, parent);
                                M.nodeUpdated(node);
                                newnodes.push(node);

                                if (names[h]) {
                                    M.rename(h, names[h]);
                                }
                            }
                        }

                        if (!--ctx.pending.value) {
                            var renderPromise = MegaPromise.resolve();

                            if (newnodes.length) {
                                // force fmdb flush by writing the sn, so that we don't have to
                                // wait for the packet to do so if the operation succeed here.
                                setsn(currsn);

                                if (is_mobile) {
                                    // A hook for the mobile web to remove the node from the view and close the dialog
                                    mobile.deleteOverlay.completeDeletionProcess(ctx.handle);
                                }
                                else {
                                    renderPromise = M.updFileManagerUI();
                                }
                            }

                            renderPromise.always(function() {
                                Soon(fmtopUI);
                                $.tresizer();

                                if (!quiet) {
                                    loadingDialog.phide();
                                }
                                if (todel && todel.length) {
                                    M.moveNodes(todel, M.RubbishID, true);
                                }
                                promise.resolve(ctx.pending.cnt);
                            });
                        }
                    }
                });
            };

            var foreach = function(handles) {
                for (var i = handles.length; i--;) {
                    var h = handles[i];

                    var apireq = {
                        a: 'm',
                        n: h,
                        t: t,
                        i: requesti
                    };
                    processmove(apireq);
                    apiReq(apireq, h);
                }

                if (!pending.value) {
                    assert(!handles.length, 'Hmmm....');

                    if (!quiet) {
                        loadingDialog.phide();
                    }

                    promise.resolve(0);
                }
            };

            if (t !== M.RubbishID) {
                fileconflict.check(n, t, 'move')
                    .always(function(files) {
                        var handles = files.map(function(n) {
                            names[n.h] = n.name;
                            if (n._replaces) {
                                todel.push(n._replaces);
                            }
                            return n.h;
                        });
                        foreach(handles);
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

    dbfetch.coll(nodes.concat(target))
        .always(function() {
            var copy = [];
            var move = [];
            var promises = [];

            var totype = treetype(target);

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
                promises.push(M.copyNodes(copy, target, true, new MegaPromise()));
            }
            if (move.length) {
                promises.push(M.moveNodes(move, target));
            }

            promise.linkDoneAndFailTo(MegaPromise.allDone(promises));
        });

    return promise;
};

MegaData.prototype.nodeUpdated = function(n, ignoreDB) {
    if (n.h && n.h.length == 8) {
        if (fmdb) {
            fmdb.add('f', {
                h: n.h,
                p: n.p,
                s: n.s >= 0 ? n.s : -n.t,
                c: n.hash || '',
                d: n
            });
        }

        if (n.t) {
            ufsc.addTreeNode(n);
        }

        if (this.nn && n.name) {
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

                this.c.shares[n.h] = {su: n.su, r: n.r, t: n.h};

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

    }
};


/**
 * Fire DOM updating when a node gets a new name
 * @param {String} itemHandle  node's handle
 * @param {String} newItemName the new name
 */
MegaData.prototype.onRenameUIUpdate = function(itemHandle, newItemName) {
    if (fminitialized) {

        // DOM update, left and right panel in 'Cloud Drive' tab
        $('.grid-table.fm #' + itemHandle + ' .tranfer-filetype-txt').text(newItemName);
        $('#' + itemHandle + '.data-block-view .file-block-title').text(newItemName);

        // DOM update, left and right panel in "Shared with me' tab
        $('#treea_' + itemHandle + ' span:nth-child(2)').text(newItemName);
        $('#' + itemHandle + ' .shared-folder-info-block .shared-folder-name').text(newItemName);

        // DOM update, right panel view during browsing shared content
        $('.shared-details-block .shared-details-pad .shared-details-folder-name').text(newItemName);

        // DOM update, breadcrumbs in 'Shared with me' tab
        if ($('#path_' + itemHandle).length > 0) {
            if (this.onRenameUIUpdate.tick) {
                clearTimeout(this.onRenameUIUpdate.tick);
            }
            this.onRenameUIUpdate.tick = setTimeout(function() {
                M.renderPath();
            }, 90);
        }

        $(document).trigger('MegaNodeRename', [itemHandle, newItemName]);
    }
};

MegaData.prototype.rename = function(itemHandle, newItemName) {
    var n = this.d[itemHandle];
    if (n) {
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
            var node = M.d[handle];

            if (node && !exportLink.isTakenDown(handle)) {
                node.fav = newFavState;
                api_setattr(node, mRandomToken('fav'));
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

MegaData.prototype.getNode = function(idOrObj) {
    if (isString(idOrObj) === true && this.d[idOrObj]) {
        return this.d[idOrObj];
    }
    else if (idOrObj && typeof(idOrObj.t) !== 'undefined') {
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
 * @returns {MegaPromise}
 */
MegaData.prototype.getNodes = function fm_getnodes(root, includeroot, excludebad) {
    var promise = new MegaPromise();

    dbfetch.coll([root])
        .always(function() {
            var result = M.getNodesSync(root, includeroot, excludebad);
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
 * @returns {Array}
 */
MegaData.prototype.getNodesSync = function fm_getnodessync(root, includeroot, excludebad) {
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
                if (this.c[parents[i]]) {
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
    var hs = handles.concat(hadd || []);

    for (var i = hs.length; i--;) {
        var h = hs[i];

        if (M.d[h] && !M.d[h].t) {
            hs.splice(i, 1);
        }
    }

    dbfetch.coll(hs)
        .wait(function() {
            var sync = function(names, handles) {
                var result = M.getCopyNodesSync(handles, names);
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
MegaData.prototype.getCopyNodesSync = function fm_getcopynodesync(handles, names) {
    var a = [];
    var r = [];
    var i, j;
    var opSize = 0;

    // add all subtrees under handles[], including the roots
    for (i = 0; i < handles.length; i++) {
        r = r.concat(this.getNodesSync(handles[i], true, true));
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

        var n = {name: name};
        var attr = ab_to_base64(crypto_makeattr(n));
        var key = a32_to_base64(encrypt_key(u_k_aes, n.k));
        var req = {a: 'p', t: toid, n: [{h: 'xxxxxxxx', t: 1, a: attr, k: key}], i: requesti};
        var sn = M.getShareNodesSync(toid);

        if (sn.length) {
            req.cr = crypto_makecr([n], sn, false);
            req.cr[1][0] = 'xxxxxxxx';
        }

        if (!ulparams) {
            loadingDialog.show();
        }

        api_req(req, {
            callback: function(res) {
                if (typeof res !== 'number') {
                    $('.fm-new-folder').removeClass('active');
                    $('.create-new-folder').addClass('hidden');
                    $('.create-new-folder input').val('');
                    newnodes = [];

                    // this is only safe once sn enforcement has been deployed
                    M.addNode(res.f[0]);
                    ufsc.addNode(res.f[0]);

                    M.updFileManagerUI()
                        .always(function() {
                            refreshDialogContent();
                            loadingDialog.hide();

                            resolve(res.f[0].h);
                        });
                }
                else {
                    loadingDialog.hide();
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
        api_req({a: 'd', n: h, i: idtag});

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
            fmdb.add('s', {o_t: h + '*' + s.u, d: s});

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

    res.files = {cnt: s[this.RootID].files, size: s[this.RootID].bytes};
    res.folders = {cnt: s[this.RootID].folders, size: s[this.RootID].fsize};
    res.rubbish = {cnt: s[this.RubbishID].files, size: s[this.RubbishID].bytes};
    res.ishares = {cnt: s.inshares.items, size: s.inshares.bytes, xfiles: s.inshares.files};
    res.oshares = {cnt: s.outshares.items, size: s.outshares.bytes};
    res.links = {cnt: s.links.files, size: s.links.bytes};

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
    var folders = [];
    for (var i in this.c[id]) {
        if (this.d[i] && this.d[i].t === 1 && this.d[i].name) {
            folders.push(this.d[i]);
        }
    }
    for (var i in folders) {
        var sub = false;
        var fid = folders[i].h;

        for (var h in this.c[fid]) {
            if (this.d[h] && this.d[h].t) {
                sub = true;
                break;
            }
        }
        $(pref + fid).addClass('disabled');
        if (sub) {
            this.disableDescendantFolders(fid, pref);
        }
    }

    return true;
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
