(function(global) {
    var delInShareQueue = Object.create(null);

    MegaData.prototype.delNode = function(h, ignoreDB) {
        function ds(h) {

            if (fminitialized) {
                removeUInode(h);
            }

            if (M.c[h] && h.length < 11) {
                for (var h2 in M.c[h]) {
                    ds(h2);
                }
                delete M.c[h];
            }

            if (fmdb) {
                fmdb.del('f', h);
                fmdb.del('nn', h);
                fmdb.del('ph', h);
            }

            if (M.nn) {
                delete M.nn[h];
            }

            if (M.d[h]) {
                if (M.d[h].su) {
                    // this is an inbound share
                    delete M.c.shares[h];
                    if (M.tree.shares) {
                        delete M.tree.shares[h];
                    }
                    delete u_sharekeys[h];
                    delInShareQ.push(M.d[h].su + '*' + h);
                    M.delIndex(M.d[h].su, h);
                }

                M.delIndex(M.d[h].p, h);
                M.delHash(M.d[h]);
                delete M.d[h];
            }

            if (typeof M.u[h] === 'object') {
                M.u[h].c = 0;
            }
        }

        var delInShareQ = delInShareQueue[h] = delInShareQueue[h] || [];

        // remove ufssizecache records
        ufsc.delNode(h, ignoreDB);

        // node deletion traversal
        ds(h);

        if (fmdb && !ignoreDB) {
            // Perform DB deletions once we got acknowledge from API (action-packets)
            // which we can't do above because M.d[h] might be already deleted.
            for (var i = delInShareQ.length; i--;) {
                fmdb.del('s', delInShareQ[i]);
            }
            delete delInShareQueue[h];
        }

        if (fminitialized) {
            // Handle Inbox/RubbishBin UI changes
            delay('fmtopUI', fmtopUI);

            // Update M.v it's used for at least preview slideshow
            for (var k = M.v.length; k--;) {
                if (M.v[k].h === h) {
                    M.v.splice(k, 1);
                    break;
                }
            }
        }
    };
})(this);

MegaData.prototype.addNode = function(n, ignoreDB) {
    if (n.su) {
        var u = this.u[n.su];
        if (u) {
            u.h = u.u;
            u.t = 1;
            u.p = 'contacts';
            M.addNode(u);
        }
        else if (d) {
            console.warn('No user record for incoming share', n.su);
        }
    }

    if (n.t < 2) {
        crypto_decryptnode(n);
        M.nodeUpdated(n, ignoreDB);
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
    if (this.h[n.hash]) {
        delete this.h[n.hash][n.h];
        if (!this.h[n.hash].length) {
            delete this.h[n.hash];
        }
    }
    if (fmdb) {
        fmdb.del('h', n.h);
    }
};

MegaData.prototype.delIndex = function(p, h) {
    if (M.c[p] && M.c[p][h]) {
        delete M.c[p][h];
    }
    var a = 0;
    for (var i in M.c[p]) {
        a++;
        break;
    }
    if (a == 0) {
        delete M.c[p];
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

        if (inshare && !M.d[id]) {
            // we reached the inshare root, use the owner next
            id = inshare;
        }

        if (
            M.d[id]
            || (id === 'contacts')
            || (id === 'messages')
            || (id === 'shares')
            || (id === M.InboxID)
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

            inshare = M.d[id].su;
            id = this.d[id].p;
        }
    }

    return result;
};


MegaData.prototype.clearRubbish = function(sel) {
    if (d) {
        console.log('clearRubbish', sel);
        console.time('clearRubbish');
    }
    var selids = Object.create(null);
    var c = this.c[sel === false ? M.RubbishID : M.currentdirid];
    var reqs = 0;

    if (sel && $.selected) {
        for (var i in $.selected) {
            if ($.selected.hasOwnProperty(i)) {
                selids[$.selected[i]] = 1;
            }
        }
    }

    loadingDialog.show();

    var done = function() {
        if (d) {
            console.timeEnd('clearRubbish');
        }
        loadingDialog.hide();

        var hasItems = false;
        if (sel) {
            for (var h in c) {
                hasItems = true;
                break;
            }
        }

        if (!hasItems) {
            $('#treesub_' + M.RubbishID).remove();
            $('.fm-tree-header.recycle-item').removeClass('contains-subfolders expanded recycle-notification');

            if (M.RubbishID === M.currentdirid) {
                $('.grid-table.fm tr').remove();
                $('.file-block').remove();
                $('.fm-empty-trashbin').removeClass('hidden');
            }
        }

        if (M.RubbishID === M.currentrootid) {
            if (M.viewmode) {
                iconUI();
            }
            else {
                gridUI();
            }
        }
        fmtopUI();
        onIdle(treeUI);
    };

    var apiReq = function(handle) {
        api_req({
            a: 'd',
            n: handle
            //, i: requesti - DB update only upon receipt of actionpacket!
        }, {
            callback: function(res, ctx) {
                if (res !== 0) {
                    console.error('Failed to delete node from rubbish bin', handle, res);
                }
                else {
                    var h = handle;

                    M.delNode(h, true);

                    if (sel) {
                        $('.grid-table.fm#' + h).remove();
                        $('#' + h + '.file-block').remove();
                    }
                }

                if (!--reqs) {
                    done();
                }
            }
        });
    };

    for (var h in c) {
        if (!sel || selids[h]) {
            reqs++;
            apiReq(h);
        }
    }

    if (!reqs) {
        done();
    }
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
 * @param {Boolean}     del           Should we delete the node after copying? (Like a move operation)
 * @param {MegaPromise} [promise]     promise to notify completion on (Optional)
 * @param {Array}       [tree]        optional tree from M.getCopyNodes
 */
MegaData.prototype.copyNodes = function copynodes(cn, t, del, promise, tree) {
    if (typeof promise === 'function') {
        var tmp = promise;
        promise = new MegaPromise();
        promise.always(tmp);
    }

    if ($.onImportCopyNodes && t.length === 11) {
        msgDialog('warninga', l[135], 'Operation not permitted.');
        promise.reject(EARGS);
        return promise;
    }

    loadingDialog.pshow();

    if (t.length === 11 && !u_pubkeys[t]) {
        var keyCachePromise = api_cachepubkeys([t]);
        keyCachePromise.always(function _cachepubkeyscomplete() {
            loadingDialog.phide();

            if (u_pubkeys[t]) {
                M.copyNodes(cn, t, del, promise);
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
            M.getCopyNodes(cn, t)
                .always(function _(tree) {
                    assert(tree, 'No tree provided...');
                    loadingDialog.phide();
                    M.copyNodes(cn, t, del, promise, tree);
                });

            return promise;
        }
    }

    var a = tree;
    var importNodes = Object(a).length;
    var nodesCount;
    var sconly = importNodes > 10;   // true -> new nodes delivered via SC `t` command only
    var ops = {a: 'p', t: t, n: a}; // FIXME: deploy API-side sn check

    var onCopyNodesDone = function() {
        loadingDialog.phide();
        if (promise) {
            promise.resolve(0);
        }
        if (!sconly) {
            renderNew();
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
        M.scAckQueue[ops.i] = onCopyNodesDone;
    }
    else {
        // ops.v = 2;
        ops.i = requesti;
    }

    var s = M.getShareNodesSync(t);

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
        a[i].k = c ? base64urlencode(encryptto(t, a32_to_str(a[i].k)))
            : a32_to_base64(encrypt_key(u_k_aes, a[i].k));
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
                if (res == EOVERQUOTA) {
                    return mega.showOverStorageQuota(100);
                }
                return msgDialog('warninga', l[135], l[47], api_strerror(res));
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
 * @param {Array} n   Array of node handles
 * @param {String} t  Target folder node handle
 * @returns {MegaPromise}
 */
MegaData.prototype.moveNodes = function moveNodes(n, t) {
    var promise = new MegaPromise();

    loadingDialog.pshow();
    dbfetch.coll(n.concat(t))
        .always(function() {
            var pending = {value: 0};
            var apiReq = function(apireq, h) {
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
                                M.c[t][h] = 1;
                                ufsc.delNode(h);
                                node.p = t;
                                ufsc.addNode(node);
                                removeUInode(h, parent);
                                M.nodeUpdated(node);
                                newnodes.push(node);
                            }
                        }

                        if (!--ctx.pending.value) {
                            var renderPromise = MegaPromise.resolve();

                            if (newnodes.length) {
                                // force fmdb flush by writing the sn, so that we don't have to
                                // wait for the packet to do so if the operation succeed here.
                                setsn(currsn);

                                renderPromise = renderNew();
                            }

                            renderPromise.always(function() {
                                Soon(fmtopUI);
                                $.tresizer();

                                loadingDialog.phide();
                                promise.resolve();
                            });
                        }
                    }
                });
            };

            for (var i = 0; i < n.length; i++) {
                var h = n[i];

                var apireq = {
                    a: 'm',
                    n: h,
                    t: t,
                    i: requesti
                };
                processmove(apireq);
                apiReq(apireq, h);
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
                    if (!isCircular(node, target)) {
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
                d: n
            });

            if (n.hash) {
                fmdb.add('h', {h: n.h, c: n.hash});
            }

            if (n.name) {
                fmdb.add('nn', {
                    h: n.h,
                    d: {h: n.h, n: n.name}
                });
            }

            if (n.t) {
                ufsc.addTreeNode(n);
            }
        }

        if (M.nn && n.name) {
            M.nn[n.h] = n.name;
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
            if (!M.c[n.su]) {
                M.c[n.su] = [];
            }
            M.c[n.su][n.h] = n.t + 1;

            if (!M.c.shares[n.h]) {
                if (n.sk && !u_sharekeys[n.h]) {
                    // extract sharekey from node's sk property
                    var k = crypto_process_sharekey(n.h, n.sk);
                    if (k !== false) {
                        crypto_setsharekey(n.h, k, ignoreDB);
                    }
                }

                M.c.shares[n.h] = {su: n.su, r: n.r, t: n.h};

                if (u_sharekeys[n.h]) {
                    M.c.shares[n.h].sk = a32_to_base64(u_sharekeys[n.h][0]);
                }

                if (fmdb && !ignoreDB) {
                    fmdb.add('s', {
                        o_t: n.su + '*' + n.h,
                        d: M.c.shares[n.h]
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
        $('#' + itemHandle + '.file-block .file-block-title').text(newItemName);

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
    var n = M.d[itemHandle];
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
            var colourClass = 'colour-label ' + M.getColourClassFromId(labelId);

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
    var $blockView = $('#' + node.h + '.file-block .file-status-icon');

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
    if (isString(idOrObj) === true && M.d[idOrObj]) {
        return M.d[idOrObj];
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
            if (M.d[parents[i]] && (!excludebad || !M.d[parents[i]].a)) {
                nodes.push(parents[i]);
                if (M.c[parents[i]]) {
                    newparents = newparents.concat(Object.keys(M.c[parents[i]]));
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
 * @param {Array}        handles  Node handles
 * @param {Array|String} [hadd]   Additional node handles to fetch, not included in the result
 * @returns {MegaPromise}
 */
MegaData.prototype.getCopyNodes = function fm_getcopynodes(handles, hadd) {
    var promise = new MegaPromise();

    dbfetch.coll(handles.concat(hadd || []))
        .always(function() {
            var result = M.getCopyNodesSync(handles);
            promise.resolve(result);
        });

    return promise;
};

/**
 * Get all clean (decrypted) subtrees under cn
 * FIXME: return total number of nodes omitted because of decryption issues
 *
 * @param handles
 * @returns {Array}
 */
MegaData.prototype.getCopyNodesSync = function fm_getcopynodesync(handles) {
    var a = [];
    var r = [];
    var i, j;

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

        a.push(nn);
    }

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
    var n = M.d[h];

    while (n && n.p) {
        if (u_sharekeys[n.h]) {
            sn.push(n.h);
        }
        n = M.d[n.p];
    }

    if (root) {
        root.handle = n && n.h;
    }

    return sn;
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
    var node = M.getNode(element);
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
    var node = M.getNode(element);
    return node && node.t === 1;
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

    return nodes.every(this._everyTypeFile);
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

    return nodes.every(this._everyTypeFolder);
};

/**
 * Retrieve node share.
 * @param {String|Object} node cloud node or handle
 * @param {String} user The user's handle
 * @return {Object} the share object, or false if not found.
 */
MegaData.prototype.getNodeShare = function(node, user) {
    user = user || 'EXP';

    if (typeof node != 'object') {
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

MegaData.prototype.nodeShare = function(h, s, ignoreDB) {
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
        if (typeof this.d[h].shares == 'undefined') {
            this.d[h].shares = [];
        }
        this.d[h].shares[s.u] = s;

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

        // maintain special outgoing shares index by user:
        if (!this.su[s.u]) {
            this.su[s.u] = Object.create(null);
        }
        this.su[s.u][h] = 1;
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
    if (this.d[h] && typeof this.d[h].shares != 'undefined') {
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
            M.nodeUpdated(this.d[h]);

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
    var user = false;

    if (Object(M.u).hasOwnProperty(handle)) {
        user = M.u[handle];

        if (user instanceof MegaDataObject) {
            user = user._data;
        }
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
    if (Object(M.d).hasOwnProperty(handle)) {
        return M.d[handle];
    }

    for (var i = M.v.length; i--;) {
        if (M.v[i].h === handle) {
            return M.v[i];
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
    if (typeof node === 'string') {
        node = this.getNodeByHandle(node);
    }

    if (node && node.su) {
        // This might be a nested inshare, only return the parent as long it does exists.
        return M.d[node.p] ? node.p : 'shares';
    }

    return node && node.p || false;
};

/**
 * Retrieve dashboard statistics data
 */
MegaData.prototype.getDashboardData = function() {
    var res = Object.create(null);
    var s = M.account.stats;

    res.files = {cnt: s[M.RootID].files, size: s[M.RootID].bytes};
    res.folders = {cnt: s[M.RootID].folders, size: s[M.RootID].fsize};
    res.rubbish = {cnt: s[M.RubbishID].files, size: s[M.RubbishID].bytes};
    res.ishares = {cnt: s.inshares.items, size: s.inshares.bytes};
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
    if (this.d[nodeHandle]) {

        if (this.ps[nodeHandle] && this.ps[nodeHandle][pendingContactId]) {
            M.delPS(pendingContactId, nodeHandle);
        }
    }
};

MegaData.prototype.emptySharefolderUI = function(lSel) {
    if (!lSel) {
        lSel = this.fsViewSel;
    }

    $(lSel).before($('.fm-empty-folder .fm-empty-pad:first').clone().removeClass('hidden').addClass('fm-empty-sharef'));
    $(lSel).hide().parent().children('table').hide();

    $('.files-grid-view.fm.shared-folder-content').addClass('hidden');

    $.tresizer();
};

