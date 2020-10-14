/**
 * Public upload widget, widget window
 * PUF - Public Upload Folder
 * PUP - Public Upload Page
 */
mega.megadrop = (function() {
    "use strict";

    var ui = {};
    var puf = {};
    var pup = {};
    var settings = {};
    var widgetOpts = {
        msg: '',
        ownerHandle: '',
        pubk: '',
        ownerKey: '',// crypto_decodepubkey(base64urldecode(pubk)),
        pufHandle: '',
        pupHandle: '',
        pageData: {},
        dropList: [],
        fldrList: [],
        req: {
            owner: {
                a: 'uk',
                u: '',
                i: requesti
            }
        },
        ulId: 8000,
        ignoreDb: false,
        initialized: false,
        widgetParams: [
            '"width=750, height=770, resizable=no, status=no, location=no, titlebar=no, toolbar=no", ',
            'true'
        ]
    };

    /**
     * @returns {String} PUP handle
     */
    var pupHandle = function widgetPupHandle() {
        return widgetOpts.pupHandle;
    };

    /**
     * @returns {String} PUF handle
     */
    var pufHandle = function widgetPufHandle() {
        return widgetOpts.pufHandle;
    };

    var dropList = function widgetDropList() {
        return widgetOpts.dropList;
    };

    /**
     * Search for MEGAdrop's in folder tree starting from selected node
     * @param {String} selected Selected folder/s node handle
     * @returns {Array} List of items
     */
    var isDropExist = function isDropExist(selected) {
        var sel = Array.isArray(selected) ? selected.slice(0) : [selected];
        var result = [];

        while (sel.length) {
            var id = sel.shift();
            if (puf.items[id]) {
                result.push(id);
            }
            if (M.tree[id]) {
                sel = sel.concat(Object.keys(M.tree[id]));
            }
        }

        return result;
    };

    /**
     * Show user warning dialog when user's action remove public upload folder (PUF)
     * @param {Object} list MEGAdrop folders id list
     */
    var showRemoveWarning = function showRemoveWarning(list) {
        var promise = new MegaPromise();
        var fldName = list.length > 1
            ? l[17626]
            : l[17403].replace('%1', escapeHTML(M.d[list[0]].name));

        if (is_mobile) {

            mobile.messageOverlay.show(fldName, l[18229], false, ['No', 'Yes'])
                .then(function() {
                    closeDialog();
                    mega.megadrop.pufRemove(list).done(function() {
                        promise.resolve();
                    });
                })
                .catch(function() {
                    promise.reject();
                });
        }
        else {
            msgDialog(
                'confirmation',
                l[1003],
                fldName,
                l[18229],
                function(e) {
                    if (e) {
                        closeDialog();
                        mega.megadrop.pufRemove(list).done(function() {
                            promise.resolve();
                        });
                    }
                    else {
                        promise.reject();
                    }
                }
            );
        }

        return promise;
    };

    /**
     * Make sure that user knows that MEGAdrops wiil be cancelled if any
     * full shares or public links are available for target
     * @param {Array} handles Array of nodes id which will be moved
     * @param {Boolean} target Target node
     */
    var preMoveCheck = function preMoveCheck(handles, target) {
        var sel = Array.isArray(handles) ? handles : [handles];
        var count = 0;
        var list = [];
        var promise = new MegaPromise();

        // Is there any MEGAdrop active for given handles?
        // Count for precise dlg message, will loop to the
        // end in case there is not MEGAdrops or if only 1 found
        for (var i = sel.length; i--;) {
            list = list.concat(isDropExist(sel[i]));
        }
        count = list.length;
        if (count) {// MEGAdrop detected in source tree
            shared(target).done(function(res) {
                if (res) {// Full share or pub link found
                    showRemoveWarning(list).done(function() {
                        promise.resolve(sel, target);
                    }).fail(function() {
                        promise.reject();
                    });
                }
                else {
                    var share = new mega.Share({});
                    if (share.isShareExist([target], false, true)) {// Search pending shares .ps
                        showRemoveWarning(list).done(function() {
                            promise.resolve(sel, target);
                        }).fail(function() {
                            promise.reject();
                        });
                    }
                    else {
                        promise.resolve(sel, target);
                    }
                }
            });
        }
        else {// Free to move no MEGAdrop's
            promise.resolve(sel, target);
        }

        return promise;
    };

    var updatePUPUserName = function updatePUPUserName(newName) {
        for (var h in mega.megadrop.pufs) {
            if (mega.megadrop.pups[mega.megadrop.pufs[h].p]) {
                mega.megadrop.pupUpdate(h, 'name', newName);
            }
        }
    };
    
    /**
     * Public upload folder's (PUF) related methods and properties
     */
    puf = (function() {

        var pufOpts = {
            list: [],
            items: {},
            callbacks: {},      // Functions used for callbacks
            req: {
                create: {       // Create PUF
                    a: 'ul',
                    n: '',      // Folder handle
                    d: 0,       // Create public upload folder
                    i: requesti,
                    s: 2,
                    data: {
                        name: '',
                        email: '',
                        msg: ''
                    }
                },
                remove: {       // Remove PUF
                    a: 'ul',
                    n: '',      // Folder handle
                    d: 1,       // Delete public upload folder
                    i: requesti
                },
                put: {          // Upload file to PUF
                    a: 'pp',
                    t: '',      // puf handle
                    sm: 1,      // 1 for skip missing, 0 for report errors
                    n: [        // Source file, same as for "a":"p" command
                        {
                            h: '',
                            t: 0,
                            a: '',
                            k: ''// Non-symetric encryption encrypt file with owners RSA pubk
                        }
                    ],
                    i: requesti
                }
            }
        };

        /**
         *
         * @param {String} pufId
         * @param {String} pupId
         * @param {Integer} state
         */
        var onPupAdd = function pufOnPupAdd(pufId, pupId, state)  {
            var obj = pufOpts.items;
            var nodeId = '';
            var folderName = '';

            // Update puf.items with related PUP handle
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    var elem = obj[key];

                    if (elem.ph === pufId) {
                        nodeId = key;
                        pufOpts.items[key].p = pupId;
                        pufOpts.items[key].s = state;
                        folderName = puf.items[key].fn;
                        if (fmdb && !pfkey) {
                            fmdb.add('puf', { ph: pufId,
                                d: { p: pupId,
                                    h: key,
                                    fn: folderName,
                                    ph: pufId,
                                    s: state
                                }
                            });
                        }
                        break;
                    }
                }
            }

            return nodeId;
        };
        /**
         * Updates variables and indexedDb for PUF
         * @param {Object} puh 'puh' AP
         */
        var add = function pufAdd(puh) {
            if (d) {
                console.log('puf.add');
            }
            var pufId = puh.ph;
            var nodeId = puh.h;
            var folderName = '';
            var state = 2;

            var opPromise = new MegaPromise();

            if (nodeId) {
                if (!pufOpts.items[nodeId]) {
                    pufOpts.items[nodeId] = Object.create(null);
                }

                pufOpts.items[nodeId].h = nodeId;
                pufOpts.items[nodeId].ph = pufId;

                dbfetch.get(nodeId).always(function() {
                    if (M.d[nodeId] && M.d[nodeId].name) {
                        folderName = M.d[nodeId].name;
                    }
                    else {
                        if (d) {
                            console.error('Missing node info M.d ', nodeId);
                        }
                        return opPromise.reject();
                    }
                    pufOpts.items[nodeId].fn = folderName;

                    if (pufId && fmdb && !pfkey) {
                        fmdb.add('puf', { ph: pufId,
                            d: { p : '',
                                h: nodeId,
                                fn: folderName,
                                ph: pufId,
                                s: state
                            }
                        });
                    }
                    opPromise.resolve();
                });
                return opPromise;
            }
            else {
                if (d) {
                    console.error('puf.add nodeHandle is not provided.');
                }
                return opPromise.reject();
            }
        };

        /**
         * Remove variables and related indexedDb
         * @param {Object} puf Action packet
         */
        var _del = function _pufDel(puf) {
            if (d) {
                console.log('puf._del');
            }
            var nodeHandle = puf.h;
            var pufHandle = puf.ph;

            if (fmdb && !pfkey) {
                fmdb.del('puf', pufHandle);
            }

            if (pufOpts.items[nodeHandle]) {
                delete pufOpts.items[nodeHandle];
            }
        };

        /**
         * Handle API action packet PUH
         * @param {Object} ap API AP 'puh'
         */
        var processPUH = function pufProcessPUH(ap) {
            if (d) {
                console.log('puf.processPUH');
            }

            for (var i = ap.length; i--;) {
                var puh = Object.assign({}, ap[i]);

                if (puh.d) {// 'puh' AP delete
                    if (requesti === puh.i) {
                        if (!puh.p) { // Make sure that PUF is synced
                            _del(puh);
                        }
                    }
                }
                else {
                    add(puh).done(function () {
                        mBroadcaster.sendMessageAfterReady('MEGAdrop:puhProcessed_' + puh.ph);
                    });
                }
            }
        };

        /**
         * Update cache from indexedDb on page refresh PUF
         * @param {Array} data Nodes handle
         */
        var processDb = function pufProcessDb(data) {
            var puf;
            var nodeHandle = '';
            if (d) {
                console.log('puf.processDb');
            }

            for (var i in data) {
                if (data.hasOwnProperty(i)) {
                    puf = data[i];
                    nodeHandle = puf.h;

                    if (!pufOpts.items[nodeHandle]) {
                        pufOpts.items[nodeHandle] = {};
                    }

                    pufOpts.items[nodeHandle] = puf;
                }
            }
        };

        /**
         * Create public upload folder (PUF) and public upload page (PUP)
         * @param {String} handle Folder handle
         */
        var create = function pufCreateV2(handle) {
            if (d) {
                console.log('puf.create');
            }
            var req = pufOpts.req.create;

            if (handle) {

                // PUF handle is available and PUP is enabled/active
                if (puf.items[handle] && puf.items[handle].p && puf.items[handle].s !== 1) {

                    if (is_mobile) {
                        ui.mobileWidgetDialog(puf.items[handle].p);
                    }
                    else {
                        ui.widgetDialog(puf.items[handle].p);
                    }
                }
                else {// Create new PUF
                    loadingDialog.show();// .hide() is called in ui.widgetDialog() or on res != 0

                    req.data.name = u_attr.name;
                    req.data.email = u_attr.email;
                    req.data.msg = M.getNameByHandle(handle) || 'unknown'; // Folder name instead of custom msg
                    req.n = handle;

                    api_req(req, {
                        callback: function (res) {
                            if (res < 0) {
                                loadingDialog.hide();
                                msgDialog('warninga', l[135], l[47], api_strerror(res));
                                if (d) {
                                    console.error('pufCreate failed ', res);
                                }
                            }
                            else {
                                if (d) {
                                    console.log('Public upload folder handle: ', res);
                                }
                            }
                        }
                    });
                }
            }
            else {
                if (d) {
                    console.warn('Create public upload folder: Folder handle is not provided.', handle);
                }
            }
        };

        /**
         * Removes public upload folder (PUF)
         * @param {Object} list MEGAdrop folders id list
         * @param {Boolean} [quiet] No loading overlay
         * @returns {MegaPromise}
         */
        var remove = function pufRemove(list, quiet) {
            if (d) {
                console.log('puf.remove');
            }

            var len = list.length;
            var masterPromise = new MegaPromise();
            var requestPromises = [];
            var collectedData = [];
            var failedRequests = [];

            var tmpDone = function (response) {
                collectedData.push(response);
            };

            var tmpFail = function (failReason) {
                if (d) {
                    console.warn('puf.remove fail ', api_strerror(failReason));
                }
                failedRequests.push(failReason);
            };

            if (len) {
                if (!quiet) {
                    loadingDialog.show();
                }
                for (var k = len; k--;) {
                    if (!pufOpts.items[list[k]]) {
                        continue;
                    }
                    var req = Object.assign({}, pufOpts.req.remove);
                    req.n = list[k];

                    requestPromises.push(
                        asyncApiReq(req)
                            .done(tmpDone)
                            .fail(tmpFail)
                    );
                }
            }
            else {
                failedRequests.push('puf.remove handle not provided');
            }

            MegaPromise.allDone(requestPromises)
            .always(function () {
                masterPromise.resolve([collectedData, failedRequests]);
                if (!quiet && failedRequests.length) {
                    loadingDialog.hide();
                }
            });

            return masterPromise;
        };

        /**
         * Returns public upload folder handle or ''
         * @param {String} handle Folder handle
         * @returns {String} Handle or empty string
         */
        var getHandle = function pufGetHandle(handle) {
            if (d) {
                console.log('puf.getHandle');
            }
            var result = '';

            if (pufOpts.items[handle]) {
                result = pufOpts.items[handle].ph;
            }

            return result;
        };

        /**
         * Updates folder name for PUF in cache and db
         * @param {String} handle Folder id
         * @param {String} value New value
         */
        var updateFolderName = function pufUpdateFolderName(handle, value) {
            if (d) {
                console.log('puf.updateFolderName');
            }

            var param = 'fn';
            var item = pufOpts.items[handle];

            item[param] = value;
            if (fmdb && !pfkey) {
                fmdb.add('puf', { ph: item.ph,
                    d: { p: item.p,
                        h: item.h,
                        fn: value,
                        ph: item.ph
                    }
                });
            }
        };

        // PUF exports
        return {
            // variables
            items: pufOpts.items,
            callbacks: pufOpts.callbacks,

            // Functions
            add: add,
            pufDel: _del,
            getHandle: getHandle,
            create: create,
            remove: remove,
            processPUH: processPUH,
            processDb: processDb,
            onPupAdd: onPupAdd,
            updateFolderName: updateFolderName
        };

    }());// END mega.megadrop.puf


    /**
     * Public upload folder's (PUF) related methods and properties
     * @param {Object} wopts mega.widget config options
     */
    pup = (function(wopts) {

        var pupOpts = {
            items: {},
            state: ['remove', 'disable', 'enable'],
            req: {
                data: {// pup data
                    name: '',
                    email: '',
                    msg: ''
                },
                update: {// Update PUP data
                    a: 'ps',
                    p: '',// PUP id
                    d: {},// data
                    i: requesti
                },
                set: {// Create PUP
                    a: 'ps',
                    s: 2,// State i.e. ['remove', 'disable', 'enable']
                    ph: '',// puf handle
                    d: {},// Data
                    i: requesti
                },
                get: {// Get PUP data
                    a: 'pg',
                    p: '',// pup handle
                    // i: requesti
                },
                remove: {// PUP remove
                    a: 'ps',
                    s: 0,
                    p: '',
                    i: requesti
                },
                list: {// List non-deleted PUP
                    a: 'pl',
                    i: requesti
                }
            }
        };

        /**
         * Update indexedDb and pup.opts.items
         * @param {Object} pg PUP AP
         */
        var add = function pupAdd(pg) {
            if (d) {
                console.log('pup.add');
            }

            var state = pg.s;
            var pufId = pg.ph;
            var pupId = pg.p;

            // Update puf.items with related PUP handle
            var nodeId = puf.onPupAdd(pufId, pupId, state);
            if (!nodeId) {
                return;
            }
            var folderName = puf.items[nodeId].fn;

            if (pupId) {
                if (fmdb && !pfkey) {
                    fmdb.add('pup', { p: pupId,
                        d: { p: pupId,
                            ph: pufId,
                            name: u_attr.name,
                            email: u_attr.email,
                            s: state,
                            msg: '',
                            fn: folderName,
                            h: nodeId
                        }
                    });
                }

                pupOpts.items[pupId] = {};
                folderName = puf.items[nodeId].fn;
                pupOpts.items[pupId].fn = folderName;
                pupOpts.items[pupId].h = nodeId;
                pupOpts.items[pupId].msg = '';
                pupOpts.items[pupId].s = state;

                pupOpts.items[pupId].p = pupId;
                pupOpts.items[pupId].ph = pufId;
            }
        };

        /**
         * Get public upload page data
         * @param {Array} pupList PUP id list
         * @param {Boolean} isPuh Is 'puh' action packet or not
         * @param {Object} cb Callback
         */
        var get = function pupGet(pupList) {
            if (d) {
                console.log('pup.get');
            }
            var cb = function(res) {
                if (res < 0) {
                    if (d) {
                        console.warn('pup.get failed');
                    }
                }
                else {
                    add(res);
                    if (d) {
                        console.log('pup.get success ', JSON.stringify(res));
                    }
                }
            };

            for (var i = pupList.length; i--;) {
                var req = Object.assign({}, pupOpts.req.get);
                req.p = pupList[i].p;

                // Get pup data
                api_req(req, {
                    callback: cb
                });
            }
        };

        /**
         * Set public upload page data
         * @param {String} nodeId Folder id
         */
        var create = function pupCreate(nodeId) {
            if (d) {
                console.log('pup.create');
            }
            var req = Object.assign({}, pupOpts.req.set);
            var data = Object.assign({}, pupOpts.req.data);

            if (nodeId) {
                data.name = u_attr.name;
                data.email = u_attr.email;
                data.msg = puf.items[nodeId].fn;// Folder name instead of custom msg

                req.ph = puf.items[nodeId].ph;
                req.d = Object.assign({}, data);

                api_req(req, {
                    callback: function (res) {
                        if (res.length === 11) {// Length of PUP handle
                            if (d) {
                                console.log('pup created ', res);
                            }
                        }
                        else {
                            closeDialog();
                            msgDialog('warninga', l[135], l[47], api_strerror(res));
                            if (d) {
                                console.error('pupSet failed ', api_strerror(res));
                            }
                        }
                    }
                });
            }
            else {
                if (d) {
                    console.error('pup.create: Public upload page: pufHandle is not provided.');
                }
            }
        };

        /**
         * Remove from indexedDb and pup.opts.items
         * @param {String} handle PUP handle
         */
        var _del = function _pupDel(handle) {
            if (d) {
                console.log('pup._del');
            }
            var obj = puf.items;

            if (fmdb && !pfkey) {
                fmdb.del('pup', handle);
            }

            if (pupOpts.items[handle]) {
                delete pupOpts.items[handle];
            }

            // Remove from puf.items
            for (var key in obj) {
                if (obj.hasOwnProperty(key) && obj[key].p === handle) {
                    if (fmdb && !pfkey) {
                        if (puf.items[key]) {
                            if (puf.callbacks[key] && puf.callbacks[key]['del']) {
                                loadingDialog.hide();
                                puf.callbacks[key]['del']();
                                delete puf.callbacks[key]['del'];
                            }
                            fmdb.del('puf', obj[key].ph);
                            delete puf.items[key];
                        }
                    }

                    break;
                }
            }
        };

        /**
         * Remove public upload page PUP
         * @param {String} handle Public upload page handle
         */
        var remove = function pupRemove(handle) {
            if (d) {
                console.log('pup.remove');
            }

            if (handle) {
                var req = Object.assign({}, pupOpts.req.remove);
                req.p = handle;// pup handle
                api_req(req, {
                    callback: function (res) {
                        if (res < 0) {
                            msgDialog('warninga', l[135], l[47], api_strerror(res));
                            if (d) {
                                console.error('pupRemove failed ', res);
                            }
                        }
                        else {
                            if (d) {
                                console.log('pup.remove: Public upload page state change result: ', res);
                            }
                        }
                    }
                });
            }
            else {
                if (d) {
                    console.warn('Public upload page state change: Handle or state are not provided.');
                }
                loadingDialog.hide();
            }
        };

        /**
         * Lists all non-deleted user's public upload pages
         * Update PUP and PUF with received data, called wh
         * 'uph' AP is received
         * @param {Boolean} toRemove To remove or not, listed PUPs
         */
        var list = function pupList(toRemove) {
            if (d) {
                console.log('pup.list');
            }

            var promise = new MegaPromise();
            var req = pupOpts.req.list;

            api_req(req, {
                callback: function (res) {
                    if (res.length) {
                        promise.resolve(res);
                        if (toRemove) {
                            for (var i = res.length; i--;) {
                                var tmp = Object.assign({}, res[i]);
                                pup.remove(tmp.p);
                            }
                        }
                        if (d) {
                            console.table(res);
                        }
                    }
                    else {
                        promise.reject();
                        if (d) {
                            console.log('pup.list: There is no PUPs available');
                        }
                    }
                }
            });
            return promise;
        };

        /**
         * Check staus of public upload page for given handle
         * For owner will return pages with state 1 and above, disabled and enabled
         * For non-logged user will return pages with state 2 only, enabled
         * @param {String} handle Public upload page handle
         */
        var check = function pupCheck(handle) {
            if (d) {
                console.log('pup.check');
            }
            var req = pupOpts.req.get;

            loadingDialog.show();
            req.p = handle;

            api_req(req, {
                handle: handle,
                callback: function (res) {
                    if (!$.isEmptyObject(res)) {
                        wopts.pufHandle = res.ph || res[0].ph;
                        wopts.ownerHandle = res.u || res[0].u;
                        wopts.pageData = res.d || res[0].d;
                        wopts.pupHandle = handle;
                        if (d) {
                            console.log('Check is PUP active and return related handles: ', JSON.stringify(res));
                        }

                        mBroadcaster.sendMessage('MEGAdrop:checked');
                    }
                    else if (res !== EOVERQUOTA) {
                        mBroadcaster.sendMessage('MEGAdrop:disabled');
                    }
                    else {// Overquota
                        mBroadcaster.sendMessage('MEGAdrop:overquota');
                    }
                    loadingDialog.hide();
                }
            });
        };

        /**
         * Get RSA pubk for PUP owner
         * @param {String} handle Owner handle
         */
        var pubk = function pupPubk(handle) {
            if (d) {
                console.log('pup.pubk');
            }

            wopts.req.owner.u = handle;
            api_req(wopts.req.owner, {
                callback: function (res) {
                    if (res < 0) {// Get owner privk failed
                        msgDialog('warninga', l[135], l[47], api_strerror(res));
                        if (d) {
                            console.error('pubk: Failed to retreive RSA pubk for an owner - ', handle);
                        }
                    }
                    else {
                        wopts.pubk = res.pubk;
                        mBroadcaster.sendMessage('MEGAdrop:initialized');
                    }
                }
            });
        };

        /**
         * @param {Array} data Read from indexedDb PUP
         */
        var processDb = function pupProcessDb(data) {
            if (d) {
                console.log('pup.processDb');
            }
            var pup;
            var pupHandle = '';

            for (var i in data) {
                if (data.hasOwnProperty(i)) {
                    pup = data[i];
                    pupHandle = pup.p;

                    if (!pupOpts.items[pupHandle]) {
                        pupOpts.items[pupHandle] = {};
                    }

                    pupOpts.items[pupHandle] = pup;
                }
            }
        };

        /**
         * Updates folder name for PUP in cache and db
         * @param {String} handle PUP id
         * @param {String} value New value
         */
        var updateFolderName = function pupUpdateFolderName(handle, value) {
            if (d) {
                console.log('pup.updateFolderName');
            }
            var param = 'fn';
            var item = pupOpts.items[handle];
            item[param] = value;

            if (fmdb && !pfkey) {
                fmdb.add('pup', { p: item.p,
                    d: { p: item.p,
                        ph: item.ph,
                        name: item.name,
                        email: item.email,
                        s: item.s,
                        msg: item.msg,
                        fn: value,
                        h: item.h
                    }
                });
            }
        };

        /**
         * Handle API action packet 'pup'
         * @param {Object} ap 'pup' API AP
         */
        var processPUP = function pupProcessPUP(ap) {
            if (d) {
                console.log('pup.processPUP');
            }

            var state = 0;
            var folderId = '';
            var pupId = '';
            var delayHide = false;

            var pupAddAndUpdate = function _pupAddAndUpdate(item) {
                add(item);
                folderId = pupOpts.items[pupId].h;

                // In case that pup data is updated remotely
                if (item.u) {
                    onRename(folderId, M.d[folderId].name);
                }
                settings.add(pupId, folderId);
            };

            var onPuhProcessed = function _onPuhProcessed(item) {
                pupAddAndUpdate(item);

                // Show dialog if this is local packet and not update action
                if (is_mobile) {
                    ui.mobileWidgetDialog(pupId);
                }
                else {
                    ui.widgetDialog(pupId);
                }
            };

            var afterPuh =  function(item) {

                if (requesti === item.i && !item.u) {
                    onPuhProcessed(item);
                }
                else {
                    pupAddAndUpdate(item);
                }
            };

            for (var i = ap.length; i--;) {
                var item = Object.assign({}, ap[i]);
                pupId = item.p;
                pufHandle = item.ph;
                state = item.s ? item.s : 0;

                if (state === 2) { // Active PUP

                    if (item.u) {
                        pupAddAndUpdate(item);
                    }
                    else {
                        // If this is create or delete, waiting for puh to be processed
                        mBroadcaster.onceAfterReady('MEGAdrop:puhProcessed_' + pufHandle, afterPuh.bind(this, item));
                    }
                }
                else { // Inactive PUP
                    if (pupOpts.items[pupId]) {
                        folderId = pupOpts.items[pupId].h;
                        _del(pupId);
                        if (puf.callbacks[folderId] && puf.callbacks[folderId]['del']) {
                            delayHide = true;
                        }
                        settings.remove(pupId, folderId);
                    }
                }
            }
            if (!delayHide){
                loadingDialog.hide();
            }
        };

        /**
         * Update PUP data
         * @param {String} id Node id
         * @param {String} type 'msg' folder name, 'name' full name, 'email' email
         * @param {String} value
         */
        var update = function pupUpdate(id, type, value) {

            if (d) {
                console.log('pup.update');
            }

            // Same folder name, exit
            if (!fminitialized || type === 'msg' && value === puf.items[id].fn) {
                return false;
            }
            var req = Object.assign({}, pupOpts.req.update);
            var pupId = puf.items[id].p;

            req.d.msg = puf.items[id].fn;
            req.d.email = u_attr.email;
            req.d.name = u_attr.name;
            req.d[type] = value;// Update param with new value

            if (value) {
                req.p = pupId;
                api_req(req, {
                    callback: function (res) {
                        if (res < 0) {
                            msgDialog('warninga', l[135], l[47], api_strerror(res));
                            if (d) {
                                console.error('pup.update failed ', res, type, value);
                            }
                        }
                        else {
                            if (d) {
                                console.log('pup.update ', res);
                            }
                        }
                    }
                });
            }
            else {
                if (d) {
                    console.error('pup.update missing value', type, value);
                }
            }
        };

        return {
            pageReq: pupOpts.req,
            add: add,
            get: get,
            list: list,
            pubk: pubk,
            check: check,
            create: create,
            update: update,
            remove: remove,
            processPUP: processPUP,
            items: pupOpts.items,
            processDb: processDb,
            updateFolderName: updateFolderName
        };

    }(widgetOpts));// END mega.megadrop.pup

    // Main Menu -> My Account -> Widget
    settings = (function settings(wopts) {
        var settingsOpts = {
            initialized: false,
            card: {
                wrapperClass: '.grid-table.megadrop tbody',
                code: '',
                url: '',
                expanded: []// Handle of expanded card
            },
        };

        var isInit = function settingsIsInit() {
            return settingsOpts.initialized;
        };

        var setInitialized = function settingsSetInitialized(value) {
            settingsOpts.initialized = value;
        };

        var _getPath = function _settingsGetPath(nodeHandle) {
            var path = M.getPath(nodeHandle).map(function(h, k) {
                var title = h === M.RootID ? l[1687] : M.d[h].name;

                var html = title ? '<a class="fm-breadcrumbs folder ' + (k !== 0 ? 'has-next-button' : '') +
                    '" data-node="' + escapeHTML(h) + '">' +
                    '<span class="right-arrow-bg simpletip" data-simpletip="' +  escapeHTML(title) + '" ><span>' +
                    escapeHTML(title) + '</span></span></a>' : '';

                return html;

            }).reverse().join('') + '<div class="clear"></div>';

            return path;
        };

        var drawPupCard = function settingsDrawPupCard(pupHandle) {

            if (M.currentdirid !== 'account/transfers' || !pupHandle || $('#pup_' + pupHandle).length) {
                return false;
            }

            var item = pup.items[pupHandle];
            var name = item.fn;
            var nodeHandle = item.h;
            var handle = item.p;
            var pupPath = _getPath(nodeHandle);
            var $domElem = $('#megadrop-row-template').clone();
            var url = ui.generateUrl(handle);
            var code = ui.generateCode(handle);
            settingsOpts.card.code = code;
            settingsOpts.card.url = url;

            $domElem.attr('id', 'pup_' + handle);
            $domElem.removeClass('hidden');
            $domElem.find('.fm-picker-breadcrumbs').safeHTML(pupPath);
            $domElem.find('.megafolder-name').text(name);
            $domElem.find('.widget-code-wrapper.widget-url').text(url);
            $domElem.find('.embed-link .widget-code-wrapper').text(code);

            $(settingsOpts.card.wrapperClass).append($domElem);
        };

        /**
         * WS_ stands for Widget Settings
         */
        var _eventListeners = function _settingsEventListeners() {

            var $wrapper = $(settingsOpts.card.wrapperClass);

            // Click on PUP basic info, show full PUP informations
            $('.megadrop-row', $wrapper).rebind('click', function() {

                var $this = $(this);

                $this.removeClass('closed');
                $this.find('.close-icon > .tooltips').text(l[148]);

                // Waiting for css animation to be finished
                setTimeout(function() {
                    initAccountScroll();
                }, 301);
            });

            // Click on minimise of PUP expanded informations, replace it  with basic info .widget-card
            $('.close-icon', $wrapper).rebind('click', function(e) {

                e.stopPropagation();

                var $this = $(this).parents('.megadrop-row');

                if (!$this.hasClass('closed')) {
                    $this.addClass('closed');
                    $(this).find('.tooltips').text(l[20172]);
                    var $jspPane = $this.parents('.jspPane');

                    // Waiting for css animation to be finished
                    $jspPane.removeClass('shrink');
                    setTimeout(function() {
                        initAccountScroll();
                        setTimeout(function() {
                            $jspPane.removeClass('shrink');
                        }, 301);
                    }, 301);
                }
                else {
                    $this.removeClass('closed');
                    $(this).find('.tooltips').text(l[148]);
                }

                // Waiting for css animation to be finished
                setTimeout(function() {
                    initAccountScroll(1);
                }, 301);
            });

            // Remove PUP
            $('.delete-megadrop', $wrapper).rebind('click', function(e) {

                e.stopPropagation();

                var id = $(this).parents('.megadrop-row').attr('id');
                var pupHandle = id.replace('pup_', '');
                var nodeHandle = pup.items[pupHandle].h;

                puf.remove([nodeHandle]);
            });

            // Widget expanded go to folder
            $('.fm-breadcrumbs', $wrapper).rebind('click', function () {
                var nodeId = $(this).data('node');

                M.openFolder(nodeId, true);

                return false;
            });

            // Widget expanded embed link tab
            $('.tab-embed-link', $wrapper).rebind('click', function () {

                // Find first parent with id attrbute starting with ew_
                var $parent = $(this).parents('.megadrop-row');

                $parent.find('.fm-tab').removeClass('active');
                $(this).addClass('active');
                $parent.find('.embed-link').removeClass('hidden');
                $parent.find('.url-link').addClass('hidden');
            });

            // Widget expanded url tab
            $('.tab-url-link', $wrapper).rebind('click', function () {

                // Find first parent with id attrbute starting with ew_
                var $parent = $(this).parents('.megadrop-row');

                $parent.find('.fm-tab').removeClass('active');
                $(this).addClass('active');
                $parent.find('.embed-link').addClass('hidden');
                $parent.find('.url-link').removeClass('hidden');
            });

            // Widget expanded copy link
            $('.copy-url', $wrapper).rebind('click', function() {

                var url = $('.url-link .widget-url', $(this).parents('.url-link')).text();

                copyToClipboard(url, l[17619]);
            });

            // Widget expanded copy source code
            $('.copy-code', $wrapper).rebind('click', function() {

                var code = $('.embed-code .widget-code-wrapper', $(this).parents('.embed-link')).text();

                copyToClipboard(code, l[17620]);
            });

            // Widget expanded  Preview upload page
            $('.preview-widget', $wrapper).rebind('click', function () {

                var url = $('.url-link .widget-url', $(this).parents('.widget-card.expanded-widget')).text();

                window.open(url, '_blank', wopts.widgetParams[0].slice(1, -1), true);
            });
        };

        /**
         * Draw all public upload pages, show path and PUP name
         * @param {Function} cb Callback
         */
        var drawPups = function settingsDrawPups() {
            if (d) {
                console.log('settings.drawPups');
            }
            var list = Object.values(pup.items);
            var handleList = list.map(function(pup) {
                return pup.h;
            });
            var item = {};

            $(settingsOpts.card.wrapperClass).empty();

            if (!$(settingsOpts.card.wrapperClass).find('.megadrop-header').length) {
                var $headElem = $('#megadrop-header-template').clone().removeAttr('id');
                $(settingsOpts.card.wrapperClass).append($headElem);
                if (Object.keys(list).length === 0) {
                    $(settingsOpts.card.wrapperClass)
                        .append('<tr><td colspan="3" class="grid-table-empty">' + l[20139] + '</td></tr>');
                }
            }

            var promise = new MegaPromise();

            dbfetch.geta(handleList).always(function() {

                // Sort the MEGADrop folders by name alphabetically before rendering
                list.sort(function (a, b) {
                    return a.fn.localeCompare(b.fn);
                });

                for (var g = 0; g < list.length; g++) {
                    item = list[g];
                    if (item.p && item.s === 2) {
                        drawPupCard(item.p);
                    }
                    else {
                        if (d) {
                            console.warn('settings.drawPups: non-active PUP: ', item.fn);
                        }
                    }
                }
                promise.resolve();
            });

            return promise;
        };

        /**
         * Handles settings->widget elements
         */
        var widget = function settingsWidget() {
            loadingDialog.show();

            drawPups().always(_eventListeners.bind(null));
            initAccountScroll();
            setInitialized(true);

            loadingDialog.hide();
        };

        /**
         * Remove upload page card and expanded card on PUF/PUP removal
         * @param {String} pupHandle Public upload page handle
         * @param {String} nodeHandle Folder id
         */
        var remove = function settingsRemove(pupHandle, nodeHandle) {
            if (d) {
                console.log('settings.remove');
            }

            if (M.currentdirid === "account/transfers") {
                $('#pup_' + pupHandle).remove();// Remove widget-card

                // Display "No MEGAdrop folders" if the list is empty
                if ($.isEmptyObject(pup.items)) {
                    $(settingsOpts.card.wrapperClass)
                        .append('<tr><td colspan="3" class="grid-table-empty">' + l[20139] + '</td></tr>');
                }
            }
            ui.nodeIcon(nodeHandle);
        };

        /**
         * Add newly created widget to settings tab
         * @param {String} pupHandle PUP id
         * @param {String} nodeHandle Folder id
         */
        var add = function settingsAdd(pupHandle, nodeHandle) {
            if (d) {
                console.log('settings.add');
            }

            if (pupHandle && !$('#pup_' + pupHandle).length) {
                ui.nodeIcon(nodeHandle, true);
                drawPupCard(pupHandle);
                _eventListeners();

                var $emptyGrid = $('.grid-table-empty', settingsOpts.card.wrapperClass);

                if ($emptyGrid.length) {
                    $emptyGrid.parent('tr').remove();
                }
            }
        };

        var updateOnRename = function settingsUpdateOnRename(handle, name) {
            var pupHandle = puf.items[handle].p;
            var $card = $('#pup_' + pupHandle);
            var $expCard = $('#ew_' + pupHandle);
            var path = $card.find('.widget-location-url span').text();
            var newPath = path.substring(0, path.lastIndexOf('/') +  1) + name;

            // PUP name change which is the same as folder name for now
            $card.find('.widget-name span').text(name);
            $expCard.find('.widget-name span').text(name);

            // Change Cloud drive path
            $card.find('.widget-location-url span').text(newPath);
            $expCard.find('.widget-location-url span').text(newPath);
        };

        return {
            add: add,
            remove: remove,
            widget: widget,
            updateOnRename: updateOnRename,
            drawPupCard: drawPupCard
        };
    }(widgetOpts));// END mega.megadrop.settings

    /**
     * Widget UI
     * @param {Object} wopts mega.widget config options
     */
    ui = (function(wopts) {
        var uiOpts = {
            dlg: {
                initialized: false,
                cached: false,
                create: {
                    $: {},
                    skip: false,
                    visible: false,
                    class: '.fm-dialog.create-widget-info-dialog'
                },
                widget: {
                    $: {},
                    url: '',
                    code: '',
                    visible: false,
                    class: '.fm-dialog.widget-dialog'
                },
                manage: {
                    $: {},
                    visible: false,
                    class: '.fm-dialog.manage-widget'
                }
            },
            widgetLink: '',
            widgetCode: '<iframe width="%w" height="%h" frameborder="0" src="%s"></iframe>',
            window: {
                totalStat: {
                    total: 0,
                    curr: 0,
                    totalPerc: 0,
                    speed: 0
                },
                queueItems: {
                    number: 0
                },
                $: {},
                class: '.widget-upload',
                queueItemClass: '.wu-queue-item',
                queueClass: '.wu-queue',
                cached: false
            }
        };

        var _queueScroll = function _uiQueueScroll(itemsNum) {
            var SCROLL_TRIGGER = 5;
            var queueDOM = uiOpts.window.class + ' ' + uiOpts.window.queueClass;

            if (itemsNum > SCROLL_TRIGGER) {
                dialogScroll(queueDOM);
            }
            else {
                deleteScrollPanel(queueDOM, 'jsp');
            }
        };

        var generateCode = function uiGenerateCode(pupHandle) {
            var code = uiOpts.widgetCode;
            var width = 0;
            var height = 0;
            var theme = $('#rad22_div').hasClass('radioOn') ? 'l' : 'd';
            var link = getBaseUrl() + '/drop#!' + pupHandle + '!' + theme + '!' + lang;

            var source = code
                .replace('%w', width > 0 ? width : 250)
                .replace('%h', height > 0 ? height : 54)
                .replace('%s', link);
            source = source.replace('/[\t\n\s]+/g', '');// Minimize

            return source;
        };

        var _dlgEventListeners = function _uiDlgEventListeners() {

            // Create info widget dialog 'x'
            $(uiOpts.dlg.create.class + ' .fm-dialog-close').rebind('click.CWD_close', function () {
                closeDialog();
            });

            /*** '.create-info-widget-dialog */
            // Create info widget dialog checkbox
            $(uiOpts.dlg.create.class + ' .CWD_cb').rebind('click.CWD_cb', function () {
                if (uiOpts.dlg.create.$.checkboxDiv.hasClass('checkboxOn')
                    || uiOpts.dlg.create.$.checkboxInput.hasClass('checkboxOn')) {
                    uiOpts.dlg.create.$.checkboxDiv.removeClass('checkboxOn').addClass('checkboxOff');
                    uiOpts.dlg.create.$.checkboxInput.removeClass('checkboxOn').addClass('checkboxOff');
                }
                else {
                    uiOpts.dlg.create.$.checkboxDiv.removeClass('checkboxOff').addClass('checkboxOn');
                    uiOpts.dlg.create.$.checkboxInput.removeClass('checkboxOff').addClass('checkboxOn');
                }
            });

            // Create info widget create button
            $(uiOpts.dlg.create.class + ' .widget-create-button').rebind('click.CWD_create', function () {
                if (uiOpts.dlg.create.$.checkboxDiv.hasClass('checkboxOn')
                    || uiOpts.dlg.create.$.checkboxInput.hasClass('checkboxOn')) {
                    uiOpts.dlg.create.skip = true;
                    localStorage.skipPUFCreationInfo = true;
                }
                closeDialog();

                puf.create($.selected[0]);
            });
            /*** END '.create-info-widget-dialog */

            /*** '.widget-dialog' */
            // Widget dialog close
            $([
                uiOpts.dlg.widget.class + ' .fm-dialog-close',
                uiOpts.dlg.widget.class + ' .close-button'
            ]).rebind('click.WD_close', function () {
                closeDialog();
            });

            // Widget dialog embed link tab
            $(uiOpts.dlg.widget.class + ' .tab-embed-link').rebind('click.WD_embed_tab', function () {
                uiOpts.dlg.widget.$.tabEmbed.addClass('active');
                uiOpts.dlg.widget.$.tabUrl.removeClass('active');
                uiOpts.dlg.widget.$.cpBtn
                    .removeClass('code url')
                    .addClass('code')
                    .find('span').safeHTML(l[17408]);
                uiOpts.dlg.widget.$.embedForm.removeClass('hidden');
                uiOpts.dlg.widget.$.urlForm.addClass('hidden');
                dialogPositioning('.widget-dialog');
            });

            // Widget dialog url tab
            $(uiOpts.dlg.widget.class + ' .tab-url-link').rebind('click.WD_url_tab', function () {
                uiOpts.dlg.widget.$.tabEmbed.removeClass('active');
                uiOpts.dlg.widget.$.tabUrl.addClass('active');
                uiOpts.dlg.widget.$.cpBtn
                    .removeClass('code url')
                    .addClass('url')
                    .find('span').safeHTML(l[17835]);
                uiOpts.dlg.widget.$.embedForm.addClass('hidden');
                uiOpts.dlg.widget.$.urlForm.removeClass('hidden');
                dialogPositioning('.widget-dialog');
            });

            // Widget dialog light theme
            $('.left-button').rebind('click', function () {
                $('#rad23_div').removeClass('radioOn').addClass('radioOff');
                $('#rad22_div').addClass('radioOn');
                $('.right-button').removeClass('active');
                $(this).addClass('active');
                _widgetDlgContent(pup.items[uiOpts.dlg.widget.url.substr(-11)].h);
            });

            // Widget dialog dark theme
            $('.right-button').rebind('click', function () {
                $('#rad22_div').removeClass('radioOn').addClass('radioOff');
                $('#rad23_div').addClass('radioOn');
                $('.left-button').removeClass('active');
                $(this).addClass('active');
                _widgetDlgContent(pup.items[uiOpts.dlg.widget.url.substr(-11)].h);
            });

            // Widget dialog copy url
            // NOTE: document.execCommand('copy') calls must take place as a direct result of a user action
            $(uiOpts.dlg.widget.class + ' .copy-widget-code').rebind('click.WD_copy', function() {
                if ($(this).hasClass('code')) {
                    copyToClipboard(uiOpts.dlg.widget.code, l[17620]);
                }
                else {
                    copyToClipboard(uiOpts.dlg.widget.url2 || uiOpts.dlg.widget.url, l[17619]);
                }
            });

            // Dialog Preview upload page
            $(uiOpts.dlg.widget.class + ' .preview-widget').rebind('click.WD_preview', function () {
                window.open(uiOpts.dlg.widget.url, '_blank', wopts.widgetParams[0].slice(1, -1), true);
            });
            /*** END '.widget-dialog' ***/
        };

        var initDialogs = function uiInitDialogs() {

            // Widget Info Dialog
            uiOpts.dlg.create.$ = $(uiOpts.dlg.create.class);
            uiOpts.dlg.create.$.title = uiOpts.dlg.create.$.find('.fm-dialog-title');
            uiOpts.dlg.create.$.checkboxDiv = uiOpts.dlg.create.$.find('.CWD_cb');
            uiOpts.dlg.create.$.checkboxInput = uiOpts.dlg.create.$.find('.CWD_cb input');
            uiOpts.dlg.create.$.createButton = uiOpts.dlg.create.$.find('.widget-create-button');
            uiOpts.dlg.create.$.createMsg = uiOpts.dlg.create.$.find('.fm-widget-introduction');
            uiOpts.dlg.create.$.manageMsg = uiOpts.dlg.create.$.find('.fm-widget-manage');
            uiOpts.dlg.create.skip = localStorage.skipPUFCreationInfo;

            // Widget Dialog
            uiOpts.dlg.widget.$ = $(uiOpts.dlg.widget.class);
            uiOpts.dlg.widget.$.title = uiOpts.dlg.widget.$.find('.fm-dialog-title');
            uiOpts.dlg.widget.$.closeButton = uiOpts.dlg.widget.$.find('.close-button');
            uiOpts.dlg.widget.$.url = uiOpts.dlg.widget.$.find('.widget-url');
            uiOpts.dlg.widget.$.code = uiOpts.dlg.widget.$.find('.embed-link .widget-code-wrapper');
            uiOpts.dlg.widget.$.tabEmbed = uiOpts.dlg.widget.$.find('.tab-embed-link');
            uiOpts.dlg.widget.$.cpBtn = uiOpts.dlg.widget.$.find('.copy-widget-code');
            uiOpts.dlg.widget.$.tabUrl = uiOpts.dlg.widget.$.find('.tab-url-link');
            uiOpts.dlg.widget.$.embedForm = uiOpts.dlg.widget.$.find('.embed-link');
            uiOpts.dlg.widget.$.urlForm = uiOpts.dlg.widget.$.find('.url-link');

            uiOpts.dlg.cached = true;

            _dlgEventListeners();
        };

        var infoDialog = function uiInfoDialog(handle, creation) {
            var name = M.d[handle].name;

            uiOpts.dlg.create.$.title.text(name);
            uiOpts.dlg.create.$.checkboxDiv.removeClass('checkboxOn').addClass('checkboxOff');
            uiOpts.dlg.create.$.checkboxInput.removeClass('checkboxOn').addClass('checkboxOff');

            if (creation) {
                uiOpts.dlg.create.$.createMsg.removeClass('hidden');
                uiOpts.dlg.create.$.manageMsg.addClass('hidden');
                uiOpts.dlg.create.$.createButton.find('span').text(l[158]);
            }
            else {
                uiOpts.dlg.create.$.createMsg.addClass('hidden');
                uiOpts.dlg.create.$.manageMsg.removeClass('hidden');
                uiOpts.dlg.create.$.createButton.find('span').text(l[17490]);
            }

            M.safeShowDialog('megadrop.info-dialog', uiOpts.dlg.create.$[0]);
        };

        var mobileInfoDialog = function uiMobileInfoDialog(handle, creation) {

            var name = M.d[handle].name;
            var $overlay = $('#mobile-ui-megadrop-info');

            $('.wu-folder-name-text', $overlay).text(name);

            if (creation) {
                $('.wu-title-text', $overlay).text(l[17412]);
                $('.default-green-button.wu-btn span', $overlay).text(l[158]);
            }
            else {
                $('.wu-title-text', $overlay).text(l[17399]);
                $('.default-green-button.wu-btn span', $overlay).text(l[17490]);
            }

            $overlay.removeClass('hidden');

            mobile.initOverlayPopstateHandler($overlay);

            $('.wu-btn').rebind('tap', function() {
                puf.create(handle);
                $overlay.addClass('hidden');
            });

            $('.cancel.text-button').rebind('tap', function() {
                $overlay.addClass('hidden');
            });
        };

        var generateUrl = function uiGenerateUrl(pupHandle) {
            return getAppBaseUrl() + (is_extension ? '#' : '/') + 'megadrop/' + pupHandle;
        };

        var _widgetDlgContent = function _uiWidgetDlgContent(handle) {
            var pupHandle = puf.items[handle].p;

            if (pupHandle) {
                uiOpts.dlg.widget.url = generateUrl(pupHandle);
                uiOpts.dlg.widget.url2 = getBaseUrl() + '/megadrop/' + pupHandle;
                uiOpts.dlg.widget.code = generateCode(pupHandle);
                uiOpts.dlg.widget.$.url.text(uiOpts.dlg.widget.url2);
                uiOpts.dlg.widget.$.code.text(uiOpts.dlg.widget.code);
            }

        };

        var widgetDialog = function uiWidgetDialog(pupHandle) {
            var handle = pup.items[pupHandle].h;

            // Is there a related public upload page handle
            if (puf.items[handle] && puf.items[handle].p) {
                _widgetDlgContent(handle);

                // Reset active tab
                uiOpts.dlg.widget.$.find('.tab-url-link').click();
                M.safeShowDialog('megadrop-dialog', uiOpts.dlg.widget.$[0]);
            }
            loadingDialog.hide();
        };

        var mobileWidgetDialog = function uiMobileWidgetDialog(pupHandle) {

            var nodeHandle = pup.items[pupHandle].h;

            // Is there a related public upload page handle
            if (puf.items[nodeHandle] && puf.items[nodeHandle].p) {

                // Lets borrow link from public link ui as it is using same structure
                var $overlay = mobile.linkOverlay.$overlay = $('#mobile-ui-copy-link').addClass('megadrop');

                // Get initial overlay details
                var node = M.d[nodeHandle];
                var fileName = node.name;
                var fileIconName = fileIcon(node);
                var fileIconPath = mobile.imagePath + fileIconName + '.png';

                // Set file name, size and image
                $('.filename', $overlay).text(fileName);
                $('.filesize', $overlay).text(l[17410]);
                $('.filetype-img', $overlay).attr('src', fileIconPath);

                mobile.initOverlayPopstateHandler($overlay);

                var $linkField = $('#mobile-public-link', $overlay);

                $linkField.val(getBaseUrl() + '/megadrop/' + pupHandle);
                $linkField.css('height', '48px');

                // Initialise the buttons
                mobile.linkOverlay.initCloseButton();

                $('.copy', $overlay).rebind('tap', function() {

                    mobile.linkOverlay.copyPublicLink(nodeHandle);

                    return false;
                });

                $('.copy', $overlay).removeClass('disabled');

                var removeMDClass = function() {

                    $overlay.removeClass('megadrop');
                    $linkField.val('');
                    $('.fm-dialog-close', $overlay).off('tap.removeMDClass');
                    $('.text-button', $overlay).off('tap.removeMDClass');
                };

                // Some extra binding for Megadrop
                $('.fm-dialog-close', $overlay).rebind('tap.removeMDClass', removeMDClass);
                $('.text-button', $overlay).rebind('tap.removeMDClass', removeMDClass);

                // Disable scrolling of the file manager in the background to fix a bug on iOS Safari
                $('.mobile.file-manager-block').addClass('disable-scroll');

                // Show the overlay
                $overlay.removeClass('hidden').addClass('overlay');
            }

            loadingDialog.hide();
        };

        var nodeIconMobile = function uiNodeIconMobile(nodeHandle, render) {

            var $node = $('.mobile.file-manager-block #' + nodeHandle);

            $('.fm-item-img img', $node).addClass('hidden');

            if (render) {
                $('.megadrop-folder', $node).removeClass('hidden');
            }
            else {
                $('.regular-folder', $node).removeClass('hidden');
            }
        };

        /**
         * Check is widget exists for folder and render or remove appropriate icon
         * @param {String} nodeHandle Folder handle
         * @param {Boolean} render To draw or to delete
         */
        var nodeIcon = function uiNodeIcon(nodeHandle, render) {

            if (is_mobile) {

                nodeIconMobile(nodeHandle, render);
                return false;
            }

            var icon = 'puf-folder';

            if (render) {

                // Update right panel selected node with appropriate icon for list view
                $('.grid-table.fm #' + nodeHandle + ' .transfer-filetype-icon').addClass(icon);

                // Update right panel selected node with appropriate icon for block view
                $('#' + nodeHandle + ' .block-view-file-type').addClass(icon);

                // Left panel
                $('#treea_' + nodeHandle + ' .nw-fm-tree-folder').addClass(icon);
            }
            else {
                // Update right panel selected node with appropriate icon for list view
                $('.grid-table.fm #' + nodeHandle + ' .transfer-filetype-icon').removeClass(icon);

                // Update right panel selected node with appropriate icon for block view
                $('#' + nodeHandle + ' .block-view-file-type').removeClass(icon);

                // Left panel
                $('#treea_' + nodeHandle + ' .nw-fm-tree-folder').removeClass(icon);
            }
        };

        /**
         * Should create widget info dialog be skipped
         */
        var skip = function uiSkip() {
            return uiOpts.dlg.create.skip;
        };

        var _addToTotalStat = function _uiAddToTotalStat(size) {
            var $totStat = uiOpts.window.$;
            var tStat = uiOpts.window.totalStat;
            var sData = {};

            tStat.total += size;
            sData = numOfBytes(tStat.total, 1);
            $totStat.total.text(sData.size + ' ' + sData.unit);
        };

        /**
         * Caching dom item
         * @param {Stringf} id Upload queue item id e.g. '#md_ul_8001'
         */
        var _cacheUploadItem = function _uiCacheUploadItem(id) {
            var item = uiOpts.window.queueItems[id];

            // Cache DOM elements for item
            if (!item) {
                var $tmp = $(id);
                item = uiOpts.window.queueItems[id] = {};
                item.$ = {};
                item.$.name = $tmp.find('.wu-queue-item-name');
                item.$.size = $tmp.find('.wu-queue-item-size');
                item.$.curr = $tmp.find('.wu-queue-item-curr');
                item.$.status = $tmp.find('.wu-queue-item-status');
                item.ulSize = 0;// Amount of uploaded data
            }

            return item;
        };

        /**
         * Inserts new upload item into queue list
         * @param {String} id Upload item id
         * @param {String} name File name with extension
         * @param {String} status Item upload status
         * @param {integer} size File size in bytes
         */
        var addItem = function uiAddItem(id, name, status, size) {
            var sData = numOfBytes(size, 1);
            var itemsNum = uiOpts.window.queueItems.number += 1;
            var prefix = is_mobile ? 'md_ul_' : 'ul_';
            var $tmpl = $('#md_ultmpl').clone().removeClass('hidden').attr('id', prefix + id);
            $tmpl.find('.wu-queue-item-name').text(str_mtrunc(name, 37));
            $tmpl.find('.wu-queue-item-size').text(' | ' + sData.size + ' ' + sData.unit);
            $tmpl.find('.wu-queue-item-status').text(status);

            // When scroll is added add items inside it
            if (itemsNum > 6 && !is_mobile) {
                $(uiOpts.window.queueClass + ' .jspPane').prepend($tmpl);
            }
            else {
                $(uiOpts.window.queueClass).prepend($tmpl);
            }

            $('.widget-upload .wu-upload-form').removeClass('hidden');
            $('.widget-upload .wu-empty-upload').addClass('hidden');

            _cacheUploadItem('#' + prefix + id);

            if (!is_mobile) {
                _addToTotalStat(size);
                _queueScroll(itemsNum);
            }
        };

        var updateItem = function uiUpdateItem(id, bps, time, perc, bl) {
            var retime = secondsToTimeShort(time);
            var speed = numOfBytes(bps, 1, true);
            var prefix = is_mobile ? 'md_ul_' : 'ul_';
            var ulSize = uiOpts.window.queueItems['#' + prefix + id].ulSize;
            var $item = _cacheUploadItem('#' + prefix + id);

            // Update specific upload item
            if (retime) {
                $item.$.status.text(retime);
            }
            else {
                $item.$.status.text('-');
            }
            ulSize = bl;
            $item.$.curr.text(numOfBytes(ulSize, 1).size);

            $item.$.curr.removeClass('hidden');
            $item.$.size.removeClass('hidden');

            if (parseFloat(speed.size)) {
                uiOpts.window.$.totalSpeed.text(speed.size + ' ' + speed.unit);
            }
        };

        /**
         * Updates widget upload window data
         */
        var updateData = function uiUpdateData() {
            var data = wopts.pageData;

            // Widget upload window
            uiOpts.window.$ = $(uiOpts.window.class);

            // .wu-data
            uiOpts.window.$.find('.wu-name-text').text(data.name);
            uiOpts.window.$.find('.wu-folder-name-text').text(data.msg);
        };

        // Widget upload window event listeners
        var _winEventListeners = function _uiWinEventListeners() {

            if (is_mobile) {

                var $mobiledrop = $('.megadrop-upload');

                $('.widget-upload .wu-items, .widget-upload .wu-btn', $mobiledrop)
                    .rebind('tap.widget_upload', function() {
                    $('#fileselect5').click();
                });

                $('.fm-dialog-overlay', $mobiledrop).rebind('tap.widget_window', function(e) {
                    closeDialog(e);
                });
            }
            else {
                $('.widget-upload .wu-items,.widget-upload .wu-btn').rebind('click.widget_upload', function() {
                    $('#fileselect5').click();
                });

                $('.wu-lang').rebind('click.widget_change_lang', function() {
                    langDialog.show();
                });

                $('.fm-dialog-overlay').rebind('click.widget_window', function(e) {
                    closeDialog(e);
                });

                $(window).rebind('keyup.widget_esc', function(e) {
                    if (e.keyCode === 27) {// ESC key pressed
                        closeDialog(e);
                    }
                });
            }
        };

        var cacheWindowDOM = function uiCacheWindowDOM() {
            // Widget upload window
            uiOpts.window.$ = $(uiOpts.window.class);

            // .wu-data
            uiOpts.window.$.name = uiOpts.window.$.find('.wu-name');
            uiOpts.window.$.email = uiOpts.window.$.find('.wu-email');
            uiOpts.window.$.msg = uiOpts.window.$.find('.wu-msg');

            // .wu-total-stat
            uiOpts.window.$.total = uiOpts.window.$.find('.wu-total-value');
            uiOpts.window.$.curr = uiOpts.window.$.find('.wu-curr-value');
            uiOpts.window.$.totalPerc = uiOpts.window.$.find('.wu-total-perc-value');
            uiOpts.window.$.totalSpeed = uiOpts.window.$.find('.wu-total-speed-value');

            uiOpts.window.cached = true;

            _winEventListeners();
            $('.wu-change-lang').text(lang);
        };

        var updateTotalProgress = function uiUpdateTotalProgress(transfered) {
            var $totStat = uiOpts.window.$;// cached DOM elements
            var tillNow = uiOpts.window.totalStat.curr;
            var curr = numOfBytes(transfered + tillNow, 1);
            var tot = numOfBytes(uiOpts.window.totalStat.total, 1);
            var perc = Math.floor((transfered + tillNow) / uiOpts.window.totalStat.total * 100);

            if (curr.unit === tot.unit) {
                $totStat.curr.text(curr.size);
            }
            else {
                $totStat.curr.text(curr.size + ' ' + curr.unit);
            }

            $totStat.totalPerc.text(perc + ' %');
        };

        var onCompletion = function uiOnCompletion() {
            uiOpts.window.totalStat.curr = uiOpts.window.totalStat.total;
            var size = numOfBytes(uiOpts.window.totalStat.curr, 1).size;

            uiOpts.window.$.curr.text(size);
            uiOpts.window.$.totalSpeed.text('-');
        };

        var onItemCompletion = function uiOnItemCompletion(id) {
            var $item = uiOpts.window.queueItems[id].$;

            $item.status.text(l[554]);
        };

        var isDlgInit = function uiIsDlgInit() {
            return uiOpts.dlg.initialized;
        };

        var setDlgInit = function uiSetDlgInit(value) {
            uiOpts.dlg.initialized = value;
        };

        return {
            addItem: addItem,
            skipInfoDlg: skip,
            nodeIcon: nodeIcon,
            isDlgInit: isDlgInit,
            setDlgInit: setDlgInit,
            updateData: updateData,
            updateItem: updateItem,
            infoDialog: infoDialog,
            mobileInfoDialog: mobileInfoDialog,
            generateUrl: generateUrl,
            initDialogs: initDialogs,
            generateCode: generateCode,
            onCompletion: onCompletion,
            widgetDialog: widgetDialog,
            mobileWidgetDialog: mobileWidgetDialog,
            cacheWindowDOM: cacheWindowDOM,
            onItemCompletion: onItemCompletion,
            updateTotalProgress: updateTotalProgress,
        };
    }(widgetOpts));// END mega.megadrop.ui

    mBroadcaster.addListener('fm:initialized', function () {

        if (is_mobile) {
            return false;
        }

        // Prevent multiple initializations
        if (!ui.isDlgInit()) {
            ui.initDialogs();
            ui.setDlgInit(true);
        }

        // Context menu create widget
        $('.dropdown.body.context .dropdown-item.createwidget-item').rebind('click.create_widget', function () {

            if (M.isInvalidUserStatus()) {
                return;
            }

            // Go to widget creation directly don't display PUF info dialog
            if (ui.skipInfoDlg()) {
                puf.create($.selected[0]);
            }
            else {// Display PUF info dialog
                ui.infoDialog($.selected[0], true);
            }
        });

        // Context menu manage widget
        $('.dropdown.body.context .dropdown-item.managewidget-item').rebind('click.manage_widget', function() {

            if (M.isInvalidUserStatus()) {
                return;
            }

            // Go to widget creation directly don't display PUF info dialog
            if (ui.skipInfoDlg()) {
                puf.create($.selected[0]);
            }
            else {// Display PUF info dialog
                ui.infoDialog($.selected[0], false);
            }
        });

        // Context menu Remove upload page
        $('.dropdown.body.context .dropdown-item.removewidget-item').rebind('click.remove_widget', function() {

            if (M.isInvalidUserStatus()) {
                return;
            }

            puf.remove($.selected);
        });
    });

    mBroadcaster.addListener('MEGAdrop:checked', function() {
        parsepage(pages[is_mobile ? 'mobile-megadrop' : 'megadrop']);
        pup.pubk(widgetOpts.ownerHandle);
        ui.updateData();
    });

    mBroadcaster.addListener('MEGAdrop:disabled', function() {
        parsepage(pages[is_mobile ? 'mobile-nomegadrop' : 'nomegadrop']);
        mega.megadrop.disableDragDrop();
        $('.wu-change-lang').text(lang);
        $('.wu-lang').rebind('click.widget_change_lang', function() {
            langDialog.show();
        });
    });

    mBroadcaster.addListener('MEGAdrop:overquota', function() {
        parsepage(pages[is_mobile ? 'mobile-nomegadrop' : 'nomegadrop']);
        $('.wu-name-text').text(widgetOpts.pageData.name);
        $('.widget-upload .wu-folder-name-text')
            .text(l[16302]);
        $('.widget-upload .wu-upload-text')
            .text(l[17537]);
        mega.megadrop.disableDragDrop();
        $('.wu-change-lang').text(lang);
        $('.wu-lang').rebind('click.widget_change_lang', function() {
            langDialog.show();
        });
    });

    /**
     * init is called when URL contains widget/<pup_handle>
     * Configure module with data necessary for file encryption
     * Add event listeners and cache widget upload windows DOM elements
     */
    var init = function widgetInit() {
        if (d) {
            console.log('init MEGAdrop');
        }

        api_create_u_k();// Creates global var u_k
        u_k_aes = new sjcl.cipher.aes(u_k);
        u_pubkeys[widgetOpts.ownerHandle] = widgetOpts.ownerKey;

        InitFileDrag();
        ui.cacheWindowDOM();

        if (is_mobile) {

            // initialise upload overlay
            mobile.uploadOverlay.init();
            $('.fm-header .fm-icon.mega').off('tap');
        }
    };

    mBroadcaster.addListener('MEGAdrop:initialized', function() {
        widgetOpts.ownerKey = crypto_decodepubkey(base64urldecode(widgetOpts.pubk));
        widgetOpts.initialized = true;
        init();
    });

    /**
     * Prepare file properties and add to upload queue
     * @param {Object} event On change event
     */
    /* jshint -W074 */
    var put = function widgetPut(event) {
        if (d) {
            console.log('widget.put');
        }

        // Stop bubbling, e.g. prevent Save File dialog
        if (event.stopPropagation) {
            event.stopPropagation();
        }
        if (event.preventDefault) {
            event.preventDefault();
        }

        var file;
        var filesize = 0;
        var targetId = widgetOpts.pufHandle;
        var dataTransfer = Object(event.dataTransfer);
        var files = event.target.files || dataTransfer.files;
        var gecko = dataTransfer && ("mozItemCount" in dataTransfer
            || browserdetails(ua).browser === 'Firefox');

        if (!files || files.length === 0) {
            if (!is_chrome_firefox || !dataTransfer.mozItemCount) {
                return false;
            }
        }

        if (M.checkFolderDrop(event)) {
            // Hide Drop to Upload dialog and show warning notification
            $('.drag-n-drop.overlay').addClass('hidden');
            $('body').removeClass('overlayed');
            msgDialog('warninga', l[135], l[19179], false, false, false);
            return false;
        }

        for (var i = 0; files[i]; i++) {
            file = files[i];
            if (file.webkitRelativePath) {
                file.path = String(file.webkitRelativePath).replace(RegExp("[\\/]"
                        + String(file.name).replace(/([^\w])/g, '\\$1') + "$"), '');
            }
            if (gecko) {
                file.gecko = true;
            }
            if (file.name !== '.') {

                try {

                    // this could throw NS_ERROR_FILE_NOT_FOUND
                    filesize = file.size;
                    file.target = targetId;
                    file.flashid = false;
                    file.id = widgetOpts.ulId++;
                    file.ownerId = widgetOpts.ownerHandle;

                    ul_queue.push(file);
                    var status = l[7227];
                    ui.addItem(file.id, file.name, status, filesize);

                    if (is_mobile) {
                        M.addToTransferTable('ul_' + file.id, file);
                    }
                }
                catch (ex) {
                    if (d) {
                        console.error(file.name, ex);
                    }
                    continue;
                }
            }
        }
        ulmanager.isUploading = Boolean(ul_queue.length);

        // Hide Drop to Upload dialog, no need to call InitFileDrag on every upload
        $('.drag-n-drop.overlay').addClass('hidden');
        $('body').removeClass('overlayed');
    };/* jshint +W074 */

    var isInit = function widgetIsInit() {
        return widgetOpts.initialized;
    };

    /**
     * @returns {String} PUP owners handle
     */
    var ownersHandle = function widgetOwnersHandle() {
        return widgetOpts.ownerHandle;
    };

    /**
     * Process 'uph' object from gettree reply, db and cached data structures will be recreated
     * and updated with active PUP informations. We are taking
     * enabled and disabled PUPs into account
     * @param {Object} ap 'uph' action packet {ph: puhId, h : nodeId}
     */
    var processUPH = function widgetProcessUPH(ap) {
        if (d) {
            console.log('processUPH', ap);
        }

        for (var i = ap.length; i--;) {
            var n = clone(ap[i]);

            n.p = '';
            n.fn = M.getNameByHandle(n.h) || 'unknown';

            if (n.ph && fmdb && !pfkey) {
                fmdb.add('puf', {
                    ph: n.ph,
                    d: n
                });
            }

            puf.items[n.h] = n;
        }

        return MegaPromise.resolve();
    };

    var processUPHAP = function processUPHAP(ap) {
        processUPH(ap).done(function() {
            pup.list().done(function(pupList) {
                pup.get(pupList);
            });
        });
    };

    /**
     * Update cache, db and DOM elements when folder name is changed
     * @param {String} handle Folder id
     * @param {String} name New folder name
     */
    var onRename = function widgetOnRename(handle, name) {
        if (d) {
            console.log('widget.onRename');
        }

        if (puf.items[handle]) {
            var pupHandle = puf.items[handle].p;

            // Update cache and db with new folder name
            pup.update(handle, 'msg', name);
            puf.updateFolderName(handle, name);
            pup.updateFolderName(pupHandle, name);

            // Update accout -> settings -> public upload folder DOM
            settings.updateOnRename(handle, name);
        }
        else {
            if (d) {
                console.log('widget.onRename, was not able to find puf for given handle: ', handle);
            }
        }
    };

    /**
     * Called when widget is disabled or url is wrong uploading
     * is not possible remove drag&drop event handlers
     * This nagates event handlers from InitFileDrag function
     */
    var disableDragDrop = function disableDragDrop() {
        $(window)
            .on('dragover', false)
            .on('dragleave', false)
            .on('drop', function() {
                return false;
            });
    };

    /**
     * Show storage overquota dialog in MEGAdrop window
     */
    var showMEGAdropOverQuota = function showMEGAdropOverQuota() {

        var promise = new MegaPromise();
        var prevState = $('.fm-main').is('.almost-full, .full');
        $('.fm-main').removeClass('almost-full full');

        if (this.showMEGAdropOverQuotaPromise) {
            promise = this.showMEGAdropOverQuotaPromise;
        }
        this.showMEGAdropOverQuotaPromise = promise;

        $('.fm-main').addClass('full');
        var $strgdlg = $('.fm-dialog.storage-dialog').removeClass('almost-full');

        $strgdlg.addClass('full')
            .find('.default-red-button').addClass('hidden')
            .end()
            .find('.fm-dialog-body.full .fm-dialog-title').text(l[16302])
            .end()
            .find('.body-header').text(l[17535])
            .end()
            .find('.body-p.long')
            .text(l[17536])
            .end()
            .find('.storage-dialog.divider-txt').addClass('hidden')
            .end()
            .find('.storage-dialog.no-achievements-bl').addClass('hidden');

        $('.fm-dialog-close, .button.skip', $strgdlg).rebind('click', closeDialog);

        // if another dialog wasn't opened previously
        if (!prevState) {
            M.safeShowDialog('megadrop-over-quota', $strgdlg);
            $('.fm-dialog:visible, .overlay:visible').addClass('arrange-to-back');
        }
        else {
            promise.reject();
        }

        return promise;
    };

    return {
        init: init,
        upload: put,
        isInit: isInit,
        onRename: onRename,
        getDropList: dropList,
        getPufHandle: pufHandle,
        isDropExist: isDropExist,
        preMoveCheck: preMoveCheck,
        showRemoveWarning: showRemoveWarning,
        processUPHAP: processUPHAP,
        getOwnersHandle: ownersHandle,
        disableDragDrop: disableDragDrop,
        overQuota: showMEGAdropOverQuota,
        updatePUPUserName: updatePUPUserName,

        // PUF
        pufs: puf.items,
        pufCallbacks: puf.callbacks,
        pufCreate: puf.create,
        pufRemove: puf.remove,
        pufHandle: puf.getHandle,
        pufProcessDb: puf.processDb,
        pufProcessPUH: puf.processPUH,

        // PUP
        pupGet: pup.get,
        pups: pup.items,
        pupList: pup.list,
        pupCheck: pup.check,
        pupUpdate: pup.update,
        pupProcessPUP: pup.processPUP,
        pupProcessDb: pup.processDb,

        // UI
        uiUpdateItem: ui.updateItem,
        onCompletion: ui.onCompletion,
        onItemCompletion: ui.onItemCompletion,
        uiUpdateTotalProgress: ui.updateTotalProgress,
        uiMobileInfoDialog: ui.mobileInfoDialog,
        uiSkipDialog: ui.skipInfoDlg,

        // Settings
        stngsDraw: settings.widget
    };

}());// END mega.widget
