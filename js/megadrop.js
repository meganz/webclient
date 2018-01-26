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
            '"width=750, height=738, resizable=no, status=no, location=no, titlebar=no, toolbar=no", ',
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
     * Copy to clipboard
     * Put the link/s in an invisible div, highlight the link/s then copy to clipboard using HTML5
     * @param {String} value Value to copy, URL or HTML embeddable code
     * @param {Integer} index Index of DOM element
     * @return {Boolean} true/false Returns false if the command is not supported or enabled
     */
    var _clipboardCopy = function clipboardCopy(value, index) {
        var id = 'chromeclipboard' + index;
        var success = false;

        $('#' + id).text(value);
        selectText(id);

        try {
            success = document.execCommand('copy');
        }
        catch (e) {
            console.error(e);
        }

        return success;
    };

    /**
     * Search for MEGAdrop's in folder tree starting from rootNode
     * @param {String} rootNodeId Folder node handle
     * @param {Boolean} reset Perform new search
     * @returns {String} True if MEGAdrop exists
     */
    var isDropExist = function isDropExist(rootNodeId, reset) {
        var list = widgetOpts.fldrList;// MEGAdrop folders id list
        var currNodeId = rootNodeId;

        if (reset) {
            widgetOpts.dropList = [];
            widgetOpts.fldrList = [];
        }

        $.each(M.tree[currNodeId], function(nodeId) {
                list.push(nodeId);
        });

        if (mega.megadrop.pufs[currNodeId]) {
            widgetOpts.dropList.push(currNodeId);
        }

        currNodeId = list.shift();
        if (currNodeId) {
            isDropExist(currNodeId);
        }

        return widgetOpts.dropList.length;
    };

    /**
     * Public upload folder's (PUF) related methods and properties
     */
    puf = (function() {

        var pufOpts = {
            list: [],
            items: {},
            req: {
                create: {       // Create PUF
                    a: 'ul',
                    n: '',      // Folder handle
                    d: 0,       // Create public upload folder
                    i: requesti
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

        var onPupAdd = function pufOnPupAdd(pufHandle, pupHandle, state, ignoreDb)  {
            var obj = pufOpts.items;
            var nodeHandle = '';
            var folderName = '';

            // Update puf.items with related PUP handle
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    var elem = obj[key];

                    if (elem.ph === pufHandle) {
                        nodeHandle = key;
                        puf.items[key].p = pupHandle;
                        folderName = puf.items[key].fn;
                        if (fmdb && !ignoreDb && !pfkey) {
                            if (!pupHandle) {
                                pupHandle = '';
                            }
                            fmdb.add('puf', { ph: pufHandle,
                                d: { p: pupHandle,
                                    h: nodeHandle,
                                    fn: folderName,
                                    ph: pufHandle,
                                    s: state
                                }
                            });
                            pufOpts.items[nodeHandle].s = state;
                        }
                        break;
                    }
                }
            }

            return nodeHandle;
        };
        /**
         * Updates variables and indexedDb for PUF
         * @param {Object} puf Action packet
         * @param {Boolean} ignoreDb Do/Not write to indexedDb i.e. [true, false]
         */
        var _add = function _pufAdd(puf, ignoreDb) {
            if (d) {
                console.log('puf._add');
            }
            var pufHandle = puf.ph;
            var nodeHandle = puf.h;
            var pupHandle = puf.p;
            var folderName = '';
            var state = 2;

            if (nodeHandle) {
                if (!pufOpts.items[nodeHandle]) {
                    pufOpts.items[nodeHandle] = {};
                }

                pufOpts.items[nodeHandle].h = nodeHandle;
                pufOpts.items[nodeHandle].ph = pufHandle;
                pufOpts.items[nodeHandle].p = pupHandle;

                if (M.d[nodeHandle] && M.d[nodeHandle].name) {
                    folderName = M.d[nodeHandle].name;
                }
                pufOpts.items[nodeHandle].fn = folderName;

                if (pufHandle && fmdb && !ignoreDb && !pfkey) {
                    fmdb.add('puf', { ph: pufHandle,
                        d: { p : pupHandle,
                            h: nodeHandle,
                            fn: folderName,
                            ph: pufHandle,
                            s: state
                        }
                    });
                }
            }
            else {
                if (d) {
                    console.error('puf._add nodeHandle is not provided.');
                }
            }
        };

        /**
         * Remove variables and related indexedDb
         * @param {Object} puf Action packet
         * @param {Boolean} ignoreDb Do/Not remove to indexedDb i.e. [true, false]
         */
        var _del = function _pufDel(puf, ignoreDb) {
            if (d) {
                console.log('puf._del');
            }
            var nodeHandle = puf.h;
            var pufHandle = puf.ph;

            if (fmdb && !ignoreDb && !pfkey) {
                fmdb.del('puf', pufHandle);
            }

            if (pufOpts.items[nodeHandle]) {
                delete pufOpts.items[nodeHandle];
            }
        };

        /**
         * Handle API action packets PUH
         * @param {Array} publicUploadFolders Array of nodes, array of JSON objects
         * @param {Boolean} ignoreDb i.e [true, false]
         * @param {Boolean} isPuh Is this 'puh' action packet or not i.e [true, false]
         */
        // ToDo: remove isPuh parameter now when uphProcess function is used
        var processPUH = function pufProcessPUH(publicUploadFolders, ignoreDb, isPuh) {
            var puf;
            var pupHandle = '';
            if (d) {
                console.log('puf.processPUH');
            }

            for (var i in publicUploadFolders) {
                if (publicUploadFolders.hasOwnProperty(i)) {
                    puf = publicUploadFolders[i];

                    if (puf.d) {// PUF AP delete
                        pupHandle = pufOpts.items[puf.h].p;
                        _del(puf, ignoreDb);
                        if (requesti === puf.i) {
                            mBroadcaster.sendMessage('MEGAdrop:puf:deleted', pupHandle, ignoreDb, puf.i);
                        }
                        else {
                            pup.remove(pupHandle, false, puf.i);
                        }
                    }
                    else {
                        _add(puf, ignoreDb);
                        if (requesti === puf.i) {
                            mBroadcaster.sendMessage('MEGAdrop:puf:created', isPuh, puf.ph, puf.h, ignoreDb, puf.i);
                        }
                    }
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
         * Create public upload folder (PUF)
         * @param {String} handle Node handle
         */
        var create = function pufCreate(handle) {
            if (d) {
                console.log('puf.create');
            }
            var req = {// Create PUF
                    a: 'ul',
                    n: '',// Folder handle
                    d: 0,// Create public upload folder
                    i: requesti
                };

            if (handle) {

                // PUF handle is available and PUP is enabled/active
                if (puf.items[handle] && puf.items[handle].p && puf.items[handle].s !== 1) {
                    ui.widgetDialog(puf.items[handle].p);
                }
                else {// Create new PUF
                    loadingDialog.show();// .hide() is called in ui.widgetDialog() or on res != 0
                    req.n = handle;
                    api_req(req, {
                        handle: handle,
                        callback: function (res) {
                            if (res < 0) {
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
         * @param {String} selection Selected folders id
         * @param {String} cb Callback function
         */
        var remove = function pufRemove(list, selection, cb, cbParam1, cbParam2) {
            if (d) {
                console.log('puf.remove');
            }

            var len = list.length;
            var end = 0;
            if (len) {

                loadingDialog.show();
                for (var k = len; k--;) {

                    var req = {// Remove PUF
                        a: 'ul',
                        n: list[k],// Folder handle
                        d: 1,// Delete public upload folder
                        i: requesti
                    };

                    api_req(req, {
                        callback: function (res) {
                            if (res < 0) {
                                 msgDialog('warninga', l[135], l[47], api_strerror(res));
                            if (d) {
                                console.error('pufRemove failed ', res);
                            }
                        }
                        else {
                            end++;
                            if (cb && len === end) {
                                if (cbParam1 && cbParam2) {
                                    cb(cbParam1, cbParam2);
                                }
                                else {
                                    cb(selection);
                                }
                            }
                            if (d) {
                                console.log('Removal of public upload folder: ', res);
                            }
                        }
                    }});
                }
            }
            else {
                if (d) {
                    console.warn('Removal of public upload folder: Folder handle is not provided.');
                }
            }
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

            var req = {// Update pup data
                a: 'ps',
                p: '',// pup handle
                d: {},// Data
                i: requesti
            };
            var param = 'fn';
            var item = pufOpts.items[handle];
            var pupHandle = puf.items[handle].p;

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

            if (handle && value) {
                req.d.msg = value;
                req.d.email = u_attr.email;
                req.d.name = u_attr.name;
                req.p = pupHandle;
                api_req(req, {
                    callback: function (res) {
                        if (res < 0) {
                            msgDialog('warninga', l[135], l[47], api_strerror(res));
                            if (d) {
                                console.error('pufUpdateFolderName failed ', res);
                            }
                        }
                        else {
                            if (d) {
                                console.log('Public upload page %s update result: ', res);
                            }
                        }
                    }
                });
            }
            else {
                if (d) {
                    console.error('Public upload page update: Handle is not provided.');
                }
                return EARGS;
            }
        };

        // PUF exports
        return {
            // variables
            items: pufOpts.items,

            // Functions
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
                }
            }
        };

        /**
         * Update indexedDb and pup.opts.items
         * @param {Object} pup
         * @param {String} pupHandle PUP handle
         * @param {Boolean} ignoreDb
         * @param {Boolean} isPuh Is 'puh' action packet or not
         * @param {Object} cb callback
         */
        var _add = function _pupAdd(pup, pupHandle, ignoreDb, isPuh, cb) {
            if (d) {
                console.log('pup._add');
            }
            var msg = '';
            var name = u_attr.name;
            var email = u_attr.email;
            var state = pup.s;// state i.e. ['remove', 'disable', 'enable']
            var folderName = '';
            var pufHandle = pup.ph;
            var nodeHandle = '';

            // Update puf.items with related PUP handle
            nodeHandle = puf.onPupAdd(pufHandle, pupHandle, state, ignoreDb);
            folderName = puf.items[nodeHandle].fn;

            if (pupHandle) {

                if (fmdb && !ignoreDb && !pfkey) {
                    fmdb.add('pup', { p: pupHandle,
                        d: { p: pupHandle,
                            ph: pufHandle,
                            name: name,
                            email: email,
                            s: state,
                            msg: msg,
                            fn: folderName,
                            h: nodeHandle
                        }
                    });
                }

                if (!pupOpts.items[pupHandle]) {
                    pupOpts.items[pupHandle] = {};
                }

                pupOpts.items[pupHandle] = {};
                folderName = puf.items[nodeHandle].fn;
                pupOpts.items[pupHandle].fn = folderName;
                pupOpts.items[pupHandle].h = nodeHandle;
                pupOpts.items[pupHandle].msg = msg;
                pupOpts.items[pupHandle].s = state;

                pupOpts.items[pupHandle].p = pupHandle;
                pupOpts.items[pupHandle].ph = pufHandle;

                // Add new widget card to settings
                settings.add(pupHandle);
            }

            // Add widget->settings DOM
            if (cb) {
                cb(pupHandle, isPuh);
            }
        };

        /**
         * Get public upload page data
         * @param {String} handle Public upload page handle
         * @param {Boolean} ignoreDb To ignore indexedDb or not
         * @param {Boolean} isPuh Is 'puh' action packet or not
         * @param {Object} cb Callback
         */
        var get = function pupGet(handle, ignoreDb, isPuh, cb) {
            if (d) {
                console.log('pup.get');
            }
            var req = {// Get pup data
                a: 'pg',
                p: '',// pup handle
                i: requesti
            };

            if (handle) {
                req.p = handle;// pup handle

                // Get pup data
                api_req(req, {
                    handle: handle,
                    isPuh: isPuh,
                    cb: cb,
                    callback: function (res) {
                        if (res < 0) {
                            if (d) {
                                console.warn('pupGet, no associated data to ', handle);
                            }
                        }
                        else {
                            if (d) {
                                console.log('pup.get: Pup %s get result: %s', handle, JSON.stringify(res));
                            }
                            _add(res, handle, ignoreDb, isPuh, cb);
                        }
                    }
                });
            }
            else {
                if (d) {
                    console.error('pup Get: Page handle is not provided.');
                }
            }
        };

        /**
         * Set public upload page data, link PUP with PUF
         * it's executed only on puf:created, for PUP page date
         * update update function is used
         * @param {String} pufHandle Public upload folder handle
         * @param {Number} state State i.e. [delete, disable, enable]
         * @param {Boolean} ignoreDb i.e [true, false]
         * @param {Boolean} isPuh Is this 'puh' AP or not i.e [true, false]
         * @param {String} nodeHandle PUF related node handle
         */
        var set = function pupSet(pufHandle, state, ignoreDb, isPuh, nodeHandle) {
            if (d) {
                console.log('pup.set');
            }
            var req = {// Create pup
                a: 'ps',
                s: 2,// State i.e. ['remove', 'disable', 'enable']
                ph: '',// puf handle
                d: {},// Data
                i: requesti
            };
            var data = {// pup data
                name: '',
                email: '',
                msg: ''
            };

            if (pufHandle) {
                data.name = u_attr.name;
                data.email = u_attr.email;
                data.msg = puf.items[nodeHandle].fn;// Folder name instead of custom msg

                req.ph = pufHandle;
                req.d = data;

                api_req(req, {
                    handle: pufHandle,
                    nodeHandle: nodeHandle,
                    callback: function (res) {

                        if (res.length === 11) {// Length of PUP handle
                            get(res, ignoreDb, isPuh, function(pupHandle, isPuh) {
                                if (isPuh) {
                                    ui.widgetDialog(pupHandle);
                                }
                            });

                            if (d) {
                                console.log('pup.set: Public upload page %s set result: ', res);
                            }
                        }
                        else {
                            loadingDialog.hide();
                            closeDialog();
                            msgDialog('warninga', l[135], l[47], api_strerror(res));
                            if (d) {
                                console.error('pupSet failed ', res);
                            }
                        }
                    }
                });
            }
            else {
                if (d) {
                    console.error('pup.set: Public upload page: pufHandle is not provided.');
                }
            }
        };

        /**
         * Remove from indexedDb and pup.opts.items
         * @param {String} handle PUP handle
         * @param {Boolean} ignoreDb
         */
        var _del = function _pupDel(handle, ignoreDb) {
            if (d) {
                console.log('pup._del');
            }
            var obj = puf.items;

            if (fmdb && !ignoreDb && !pfkey) {
                fmdb.del('pup', handle);
            }

            if (pupOpts.items[handle]) {
                delete pupOpts.items[handle];
            }

            // Remove from puf.items
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    var elem = obj[key];

                    if (elem.p === handle) {
                        if (fmdb && !ignoreDb && !pfkey) {
                            if (puf.items[key]) {
                                delete puf.items[key];
                            }
                            fmdb.del('puf', elem.ph);
                        }

                        break;
                    }
                }
            }
        };

        /**
         * Remove public upload page PUP
         * @param {String} handle Public upload page handle
         * @param {Boolean} ignoreDb
         */
        var remove = function pupRemove(handle, ignoreDb, sourceId) {
            if (d) {
                console.log('pup.remove');
            }
            var req = {
                a: 'ps',
                s: 0,
                p: '',
                i: requesti
            };

            if (handle) {
                if (requesti === sourceId) {
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
                                settings.remove(handle);
                                _del(res, ignoreDb);
                            }
                            loadingDialog.hide();
                        }
                    });
                }
                else {
                    if (d) {
                        console.log('pup.remove: PUP local vars and idxDb items remove, handle: ', handle);
                    }
                    settings.remove(handle);
                    _del(handle, ignoreDb);
                    loadingDialog.hide();
                }
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

            var req = {// List non-deleted user's pups
                a: 'pl',
                i: requesti
            };

            api_req(req, {
                callback: function (res) {
                    if (res.length) {
                        if (d) {
                            console.table(res);
                        }
                        for (var i in res) {
                            if (res.hasOwnProperty(i)) {
                                var item = res[i];
                                var pupHandle = item.p;

                                if (toRemove) {
                                    pup.remove(pupHandle, true, requesti);
                                }
                                else {
                                    pup.get(pupHandle, false, false);
                                }
                            }
                        }
                    }
                    else {
                        if (d) {
                            console.log('pup.list: There is no PUPs available');
                        }
                    }
                }
            });
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
            var req = {// Get pup data
                a: 'pg',
                p: '',// pup handle
                i: requesti
            };

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
         * Create PUP and link it with PUF
         * @param {String} handle PUF handle
         * @param {Boolean} ignoreDb i.e [true, false]
         * @param {Boolean} isPuh Is this 'puh' action packet or not i.e [true, false]
         * @param {String} folderHandle PUF related node handle
         */
        var create = function pupCreate(handle, ignoreDb, isPuh, folderHandle, sourceId) {
            if (d) {
                console.log('pup.create');
            }
            var state = 'enable';

            set(handle, state, ignoreDb, isPuh, folderHandle, sourceId);
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

        var adjustReq = function pupAdjustReq(args) {
            var req = {
                a: 'ps',
                s: 0,
                p: '',
                i: requesti
            };

            for (var key in args) {
                if (args.hasOwnProperty(key)) {
                    req[key] = args[key];
                }
            }

            return req;
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
         */
        var processPUP = function pupProcessPUP(ap, ignoreDb) {
            if (d) {
                console.log('pup.processPUP');
            }
            var item = {};
            var state = 0;

            for (var i in ap) {
                if (ap.hasOwnProperty(i)) {
                    item = ap[i];
                    pupHandle = item.p;
                    pufHandle = item.ph;
                    state = item.s ? item.s : 0;
                    if (state) {
                        _add(item, pupHandle, ignoreDb, true, settings.drawPupCard);
                        $('.fm-account-button.megadrop').removeClass('hidden');
                    }
                    else {
                        _del(pupHandle, ignoreDb);
                    }

                }
                else {
                    if (d) {
                        console.warn('Public upload page disabled: Handle or state are not provided.', i);
                    }
                }
            }
        };

        return {
            get: get,
            set: set,
            list: list,
            pubk: pubk,
            check: check,
            create: create,
            remove: remove,
            processPUP: processPUP,
            items: pupOpts.items,
            adjustReq: adjustReq,
            processDb: processDb,
            updateFolderName: updateFolderName
        };

    }(widgetOpts));// END mega.megadrop.pup

    // Main Menu -> My Account -> Widget
    settings = (function settings(wopts) {
        var settingsOpts = {
            initialized: false,
            card: {
                wrapperClass: '.fm-account-widget .widget-container',
                cardClass: '.widget-card',
                expandedClass: '.expanded-widget',
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

        var setExpanded = function settingsSetExpanded(handle) {
            settingsOpts.card.expanded.push(handle);
        };

        var delExpanded = function settingsDelExpanded(handle) {
            var index = settingsOpts.card.expanded.indexOf(handle);

            if (index !== -1) {
                settingsOpts.card.expanded.splice(index, 1);
            }
        };

        var _getPath = function _settingsGetPath(nodeHandle) {
            var path = M.getPath(nodeHandle).map(function(h) {
                    return M.d[h].name || '';
                }).reverse().join('/');

            return path;
        };

        var drawPupCard = function settingsDrawPupCard(pupHandle) {
            var item = {};
            var name = '';
            var nodeHandle = '';
            var handle = '';
            var pupPath = l[1687];
            var $domElem = $('#stngs_pup_tmpl').clone();

            if (!$('#pup_' + pupHandle).length) {
                item = pup.items[pupHandle];
                name = item.fn;
                nodeHandle = item.h;
                handle = item.p;
                pupPath += _getPath(nodeHandle);

                $domElem.attr('id', 'pup_' + handle);
                $domElem.removeClass('hidden');
                $domElem.find('.widget-location-url').attr('data-node', nodeHandle);
                $domElem.find('.widget-location-url span').text(pupPath);
                $domElem.find('.widget-card-left span').text(name);

                $(settingsOpts.card.wrapperClass).append($domElem);
            }
        };

        /**
         *
         * @param {String} handle PUP handle
         * @param {Object} elem After this DOM element .expanded-widget will be inserted
         */
        var drawExpandedCard = function settingsDrawExpandedCard(handle, elem) {
            var nodeHandle = pup.items[handle].h;
            var name = pup.items[handle].fn;
            var path = l[1687];
            path += _getPath(nodeHandle);
            var url = ui.generateUrl(handle);
            var code = ui.generateCode(handle);
            settingsOpts.card.code = code;
            settingsOpts.card.url = url;
            var $domElem = $('#stngs_pupexp_tmpl').clone();

            $domElem.attr('id', 'ew_' + handle);
            $domElem.removeClass('hidden');
            $domElem.find('.fm-dialog-chrome-clipboard div').attr('id', 'chromeclipboard3');
            $domElem.find('.widget-location-url').attr('data-node', nodeHandle);
            $domElem.find('.widget-card-left span').text(name);
            $domElem.find('.widget-location-url span').text(path);
            $domElem.find('.widget-code-wrapper.widget-url').text(url);

            $(elem).after($domElem);

            ui.fillForm($('#ew_' + handle), handle);
        };

        /**
         * WS_ stands for Widget Settings
         */
        var _eventListeners = function _settingsEventListeners() {

            // Click on PUP basic info, show full PUP informations .expanded-widget
            $('.widget-container').on('click.WS_clickcard', '.widget-maximise', function() {
                var $this = $(this).closest('div[id^=pup_]');
                var pupHandle = $this.attr('id').replace('pup_', '');
                var expHandle = $('div[id^=ew_]').attr('id');

                // Close expanded PUP
                if (expHandle) {
                    $('#' + expHandle).addClass('hidden').remove();
                    $('#pup_' + expHandle.replace('ew_', '')).removeClass('hidden');
                    delExpanded(expHandle);
                }

                drawExpandedCard(pupHandle, $this);
                $this.addClass('hidden');
                $('#ew_' + pupHandle).removeClass('hidden');
                setExpanded(pupHandle);
                initAccountScroll();
                $(window).trigger('resize');
            });

            // Click on minimise of PUP expanded informations, replace it  with basic info .widget-card
            $('.widget-container').on('click.WS_minimise', 'div.widget-minimise', function() {

                // Find first parent with id attrbute starting with ew_
                var id = $(this).closest('div[id^=ew_]').attr('id');
                var pupHandle = id.replace('ew_', '');

                // un-bind all events related to .expanded-widget
                $('.widget-container .expanded-widget').off();

                $('#' + id).addClass('hidden').remove();
                $('#pup_' + pupHandle).removeClass('hidden');
                delExpanded(pupHandle);
            });

            // Remove PUP
            $('.widget-container').on('click.WS_remove', '.delete-widget-dialog.button', function() {

                // Find first parent with id attrbute starting with ew_
                var id = $(this).closest('div[id^=ew_]').attr('id');
                var pupHandle = id.replace('ew_', '');
                var nodeHandle = pup.items[pupHandle].h;

                puf.remove([nodeHandle]);
            });

            // Widget expanded go to folder
            $('.widget-container').on('click.WS_folder', '.widget-location-url span', function () {
                var nodeId = $(this).parent().data('node');

                M.openFolder(nodeId, true);

                return false;
            });

            // Widget expanded embed link tab
            $('.widget-container').on('click.WS_embedTab', 'div.tab-embed-link', function () {

                // Find first parent with id attrbute starting with ew_
                var id = $(this).closest('div[id^=ew_]').attr('id');
                var $tmp = $('#' + id);

                $tmp.find('.tab-embed-link').addClass('active');
                $tmp.find('.tab-url-link').removeClass('active');
                $tmp.find('.embed-link').removeClass('hidden');
                $tmp.find('.url-link').addClass('hidden');
                $(window).trigger('resize');
            });

            // Widget expanded url tab
            $('.widget-container').on('click.WS_urlTab', 'div.tab-url-link', function () {

                // Find first parent with id attrbute starting with ew_
                var id = $(this).closest('div[id^=ew_]').attr('id');
                var $tmp = $('#' + id);

                $tmp.find('.tab-embed-link').removeClass('active');
                $tmp.find('.tab-url-link').addClass('active');
                $tmp.find('.embed-link').addClass('hidden');
                $tmp.find('.url-link').removeClass('hidden');
            });

            // Widget expanded copy link
            $('.widget-container').on('click.WS_copyUrl', '.url-link .copy-widget-dialog.button', function () {
                var toastText = l[17619];
                var success = false;

                // If extension, use the native extension method
                if (is_chrome_firefox) {
                    mozSetClipboard(settingsOpts.card.url);
                }
                else {
                    success = _clipboardCopy(settingsOpts.card.url, 3);
                }

                if (success) {
                    showToast('clipboard', toastText);
                }
            });

            // Widget expanded copy source code
            $('.widget-container').on('click.WS_copyCode', '.embed-link .copy-widget-dialog.button', function () {
                var toastText = l[17620];
                var success = false;

                // If extension, use the native extension method
                if (is_chrome_firefox) {
                    mozSetClipboard(settingsOpts.card.code);
                }
                else {
                    success = _clipboardCopy(settingsOpts.card.code, 3);
                }

                if (success) {
                    showToast('clipboard', toastText);
                }
            });

            // Widget expanded  Preview upload page
            $('.widget-container').on('click.WS_preview', '.expanded-widget .preview-widget.button', function () {
                window.open(settingsOpts.card.url, '_blank', wopts.widgetParams[0].slice(1, -1), true);
            });
        };

        /**
         * Draw all public upload pages, show path and PUP name
         * @param {Function} cb Callback
         */
        var drawPups = function settingsDrawPups(cb) {
            if (d) {
                console.log('settings.drawPups');
            }
            var list = pup.items;
            var item = {};

            if (cb) {
                for (var key in list) {
                    if (list.hasOwnProperty(key)) {
                        item = list[key];
                        if (item.p) {
                            cb(item.p);
                        }
                        else {
                            if (d) {
                                console.error('settings.drawPups: Missing pupHandle for folder: ', item.fn);
                            }
                        }
                    }
                }
            }
        };

        /**
         * Handles settings->widget elements
         */
        var widget = function settingsWidget() {

            if (!isInit()) {
                loadingDialog.show();

                drawPups(drawPupCard);
                initAccountScroll();
                _eventListeners();
                setInitialized(true);

                loadingDialog.hide();
            }
        };

        /**
         * Remove upload page card and expanded card on PUF/PUP removal
         * @param {String} pupHandle Public upload page handle
         */
        var remove = function settingsRemove(pupHandle) {
            var nodeHandle = '';

            if (pup.items[pupHandle]) {

                nodeHandle = pup.items[pupHandle].h;

                // un-bind all events related to .expanded-widget
                $('.widget-container .expanded-widget').off();

                $('#ew_' + pupHandle).remove();// Remove expanded-card
                $('#pup_' + pupHandle).remove();// Remove widget-card
                delExpanded(pupHandle);
                ui.nodeIcon(nodeHandle);

                if (!Object.keys(puf.items).length && M.currentdirid === 'account/megadrop') {
                    M.openFolder(M.RootID);
                }
            }
        };

        /**
         * Add newly created widget to settings tab
         * @param {Object} pupHandle Cacheck PUP
         */
        var add = function settingsAdd(pupHandle) {
            var nodeHandle = '';

            // Draw only enabled PUP, disregard disabled
            if (!$('#pup_' + pupHandle).length) {
                drawPupCard(pupHandle);
                nodeHandle = pup.items[pupHandle].h;
                ui.nodeIcon(nodeHandle);
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
            widgetCode: [
                '<script type="text/javascript">',
                'function MEGAdrop() {',
                '   window.open("',
                '       ","_blank",',
                '   );',
                '}',
                '</script>',
                '<a href="javascript:MEGAdrop();">MEGAdrop</a>'
            ],
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

        var _widgetLink = function _uiWidgetLink() {
            var url = is_extension ? getBaseUrl() : getAppBaseUrl();
            return url + '/megadrop/';
        };

        var _queueScroll = function _uiQueueScroll(itemsNum) {
            var SCROLL_TRIGGER = 6;
            var queueDOM = uiOpts.window.class + ' ' + uiOpts.window.queueClass;

            if (itemsNum > SCROLL_TRIGGER) {// Adapt scroll to new height
                jScrollReinitialize(queueDOM);
            }
            else if (itemsNum === SCROLL_TRIGGER) {// Add scroll
                dialogScroll(queueDOM);
            }
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
                uiOpts.dlg.widget.$.clipboard.addClass('hidden');
                closeDialog();
            });

            // Widget dialog embed link tab
            $(uiOpts.dlg.widget.class + ' .tab-embed-link').rebind('click.WD_embed_tab', function () {
                uiOpts.dlg.widget.$.tabEmbed.addClass('active');
                uiOpts.dlg.widget.$.tabUrl.removeClass('active');
                uiOpts.dlg.widget.$.embedForm.removeClass('hidden');
                uiOpts.dlg.widget.$.urlForm.addClass('hidden');

            });

            // Widget dialog url tab
            $(uiOpts.dlg.widget.class + ' .tab-url-link').rebind('click.WD_url_tab', function () {
                uiOpts.dlg.widget.$.tabEmbed.removeClass('active');
                uiOpts.dlg.widget.$.tabUrl.addClass('active');
                uiOpts.dlg.widget.$.embedForm.addClass('hidden');
                uiOpts.dlg.widget.$.urlForm.removeClass('hidden');
            });

            // Widget dialog copy url
            // NOTE: document.execCommand('copy') calls must take place as a direct result of a user action
            $(uiOpts.dlg.widget.class + ' .copy-widget-code').rebind('click.WD_copy_code', function () {
                var toastText = l[17620];
                var success = false;

                // If extension, use the native extension method
                if (is_chrome_firefox) {
                    mozSetClipboard(uiOpts.dlg.widget.code);
                }
                else {
                    success = _clipboardCopy(uiOpts.dlg.widget.code, 2);
                }

                if (success) {
                    showToast('clipboard', toastText);
                }
            });

            // Widget dialog copy source code
            // NOTE: document.execCommand('copy') calls must take place as a direct result of a user action
            $(uiOpts.dlg.widget.class + ' .copy-widget-url').rebind('click.WD_copy_url', function () {
                var toastText = l[17619];
                var success = false;

                // If extension, use the native extension method
                if (is_chrome_firefox) {
                    mozSetClipboard(uiOpts.dlg.widget.url);
                }
                else {
                    success = _clipboardCopy(uiOpts.dlg.widget.url, 2);
                }

                if (success) {
                    showToast('clipboard', toastText);
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
            uiOpts.dlg.widget.$.clipboard = uiOpts.dlg.widget.$.find('.fm-dialog-chrome-clipboard');
            uiOpts.dlg.widget.$.closeButton = uiOpts.dlg.widget.$.find('.close-button');
            uiOpts.dlg.widget.$.url = uiOpts.dlg.widget.$.find('.widget-url');
            uiOpts.dlg.widget.$.code = uiOpts.dlg.widget.$.find('.embed-link .widget-code');
            uiOpts.dlg.widget.$.tabEmbed = uiOpts.dlg.widget.$.find('.tab-embed-link');
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

        var generateUrl = function uiGenerateUrl(pupHandle) {
            return _widgetLink() + pupHandle;
        };

        var fillForm = function uiFillForm($elem, pupHandle) {
            var code = uiOpts.widgetCode;
            var params = wopts.widgetParams;
            var url = generateUrl(pupHandle);

            $elem.find('.l1').text(code[0]);
            $elem.find('.l2').text(code[1]);
            $elem.find('.l3').text(code[2]);
            $elem.find('.l4').text(url);
            $elem.find('.l5').text(code[3]);
            $elem.find('.l6').text(params[0]);
            $elem.find('.l7').text(params[1]);
            $elem.find('.l8').text(code[4]);
            $elem.find('.l9').text(code[5]);
            $elem.find('.l10').text(code[6]);
            $elem.find('.l11').text(code[7]);
        };

        var generateCode = function uiGenerateCode(pupHandle) {
            var code = uiOpts.widgetCode;
            var params = wopts.widgetParams;
            var url = generateUrl(pupHandle);

            var source = code[0] + code[1] + code[2] + url + code[3] + params[0];
            source += params[1] + code[4] + code[5] + code[6] + code[7];
            source = source.replace('/[\t\n\s]+/g', '');// Minimize

            return source;
        };

        var _widgetDlgContent = function _uiWidgetDlgContent(handle) {
            var url = '';
            var $source = uiOpts.dlg.widget.$.code;
            var pupHandle = puf.items[handle].p;

            if (pupHandle) {
                url = generateUrl(pupHandle);
                uiOpts.dlg.widget.url = url;
                uiOpts.dlg.widget.$.url.text(url);
                uiOpts.dlg.widget.code = generateCode(pupHandle);

                fillForm($source, pupHandle);
            }
        };

        var widgetDialog = function uiWidgetDialog(pupHandle) {
            var handle = pup.items[pupHandle].h;

            // Is there a related public upload page handle
            loadingDialog.hide();
            if (puf.items[handle] && puf.items[handle].p) {
                _widgetDlgContent(handle);
                M.safeShowDialog('megadrop-dialog', uiOpts.dlg.widget.$[0]);
                uiOpts.dlg.widget.$.clipboard.removeClass('hidden');
            }
        };

        /**
         * Check is widget exists for folder and render or remove appropriate icon
         * @param {String} nodeHandle Folder handle
         */
        var nodeIcon = function uiNodeIcon(nodeHandle) {
            var icon = 'puf-folder';

            if (puf.items[nodeHandle] && puf.items[nodeHandle].s !== 1) {

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
         *
         * @param {Stringf} id Upload queue item id e.g. '#ul_8001'
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

            var $tmpl = $('#md_ultmpl').clone().removeClass('hidden').attr('id', 'ul_' + id);
            $tmpl.find('.wu-queue-item-name').text(str_mtrunc(name, 37));
            $tmpl.find('.wu-queue-item-size').text(' | ' + sData.size + ' ' + sData.unit);
            $tmpl.find('.wu-queue-item-status').text(status);

            // When scroll is added add items inside it
            if (itemsNum > 6) {
                $(uiOpts.window.queueClass + ' .jspPane').prepend($tmpl);
            }
            else {
                $(uiOpts.window.queueClass).prepend($tmpl);
            }

            $('.widget-upload .wu-upload-form').removeClass('hidden');
            $('.widget-upload .wu-empty-upload').addClass('hidden');

            _cacheUploadItem('#ul_' + id);
            _addToTotalStat(size);
            _queueScroll(itemsNum);
        };

        var updateItem = function uiUpdateItem(id, bps, time, perc, bl) {
            var retime = secondsToTimeShort(time);
            var speed = numOfBytes(bps, 1);
            var ulSize = uiOpts.window.queueItems['#ul_' + id].ulSize;
            var $item = _cacheUploadItem('#ul_' + id);

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
                uiOpts.window.$.totalSpeed.text(speed.size + ' ' + speed.unit + '/s');
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
            $('.widget-upload .wu-empty-upload,.widget-upload .wu-btn').rebind('click.widget_upload', function() {
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

            $item.status.text('Complete');// l[554]
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
            fillForm: fillForm,
            nodeIcon: nodeIcon,
            isDlgInit: isDlgInit,
            setDlgInit: setDlgInit,
            updateData: updateData,
            updateItem: updateItem,
            infoDialog: infoDialog,
            generateUrl: generateUrl,
            initDialogs: initDialogs,
            generateCode: generateCode,
            onCompletion: onCompletion,
            widgetDialog: widgetDialog,
            cacheWindowDOM: cacheWindowDOM,
            onItemCompletion: onItemCompletion,
            updateTotalProgress: updateTotalProgress
        };
    }(widgetOpts));// END mega.megadrop.ui

    mBroadcaster.addListener('fm:initialized', function () {

        // Prevent multiple initializations
        if (!ui.isDlgInit()) {
            ui.initDialogs();
            ui.setDlgInit(true);
        }

        // Context menu create widget
        $('.dropdown.body.context .dropdown-item.createwidget-item').rebind('click.create_widget', function (event) {

            // Go to widget creation directly don't display PUF info dialog
            if (ui.skipInfoDlg()) {
                puf.create($.selected[0]);
            }
            else {// Display PUF info dialog
                ui.infoDialog($.selected[0], true);
            }
        });

        // Context menu manage widget
        $('.dropdown.body.context .dropdown-item.managewidget-item').rebind('click.manage_widget', function (event) {

            // Go to widget creation directly don't display PUF info dialog
            if (ui.skipInfoDlg()) {
                puf.create($.selected[0]);
            }
            else {// Display PUF info dialog
                ui.infoDialog($.selected[0], false);
            }
        });

        // Context menu Remove upload page
        $('.dropdown.body.context .dropdown-item.removewidget-item').rebind('click.remove_widget', function (event) {
            puf.remove($.selected);
        });
    });

    mBroadcaster.addListener('MEGAdrop:checked', function() {
        parsepage(pages['megadrop']);
        pup.pubk(widgetOpts.ownerHandle);
        ui.updateData();
    });

    mBroadcaster.addListener('MEGAdrop:disabled', function() {
        parsepage(pages['nomegadrop']);
        mega.megadrop.disableDragDrop();
        $('.wu-change-lang').text(lang);
        $('.wu-lang').rebind('click.widget_change_lang', function() {
            langDialog.show();
        });
    });

    mBroadcaster.addListener('MEGAdrop:overquota', function() {
        parsepage(pages['nomegadrop']);
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
    };

    mBroadcaster.addListener('MEGAdrop:initialized', function() {
        widgetOpts.ownerKey = crypto_decodepubkey(base64urldecode(widgetOpts.pubk));
        widgetOpts.initialized = true;
        init();
    });

    /**
     * @param {Boolean} isPuh 'puh' AP or not
     */
    mBroadcaster.addListener('MEGAdrop:puf:created', function(isPuh, pufHandle, nodeHandle, ignoreDb, sourceId) {
        if (d) {
            console.log('MEGAdrop:puf:created');
        }

        if (nodeHandle && puf.items[nodeHandle]) {
            pup.create(pufHandle, ignoreDb, isPuh, nodeHandle, sourceId);
        }
        else {
            if (d) {
                console.error('MEGAdrop:puf:created nodeHandle is not provided.');
            }
        }
    });

    mBroadcaster.addListener('MEGAdrop:puf:deleted', function(handle, ignoreDb, sourceId) {
        pup.remove(handle, ignoreDb, sourceId);
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
        InitFileDrag();
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
     * Process 'uph' action packet which is received on hard refresh
     * From this AP, db and cached data structures will be recreated
     * and updated with active PUP informations. We are taking
     * enabled and disabled PUPs into account
     * @param {Object} ap 'uph' action packet
     */
    var processUPH = function widgetProcessUPH(ap, ignoreDb) {

        // Use data from AP
        // Get folder name from 'h' attribute
        for (var i in ap) {
            if (ap.hasOwnProperty(i)) {
                var item = ap[i];
                var pufHandle = item.ph;
                var nodeHandle = item.h;
                var nodeName = '';

                if (M.d[nodeHandle]) {
                    nodeName = M.d[nodeHandle].name;

                    if (pufHandle && fmdb && !ignoreDb && !pfkey) {
                        fmdb.add('puf', { ph: pufHandle,
                            d: { h: nodeHandle,
                                fn: nodeName,
                                ph: pufHandle,
                            }
                        });
                    }

                    puf.items[nodeHandle] = {};
                    puf.items[nodeHandle].h = nodeHandle;
                    puf.items[nodeHandle].ph = pufHandle;
                    puf.items[nodeHandle].fn = nodeName;
                }
                else {
                    if (d) {
                        console.warn('widget.processUph Missing M.d for handle: ', nodeHandle);
                    }
                }
            }
        }

        pup.list();
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
            puf.updateFolderName(handle, name);
            pup.updateFolderName(pupHandle, name);

            // Update accout -> settings -> public upload folder DOM
            settings.updateOnRename(handle, name);
        }
        else {
            if (d) {
                console.warn('widget.onRename, was not able to find puf for given handle: ', handle);
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
        processUPH: processUPH,
        getPufHandle: pufHandle,
        getDropList: dropList,
        isDropExist: isDropExist,
        getOwnersHandle: ownersHandle,
        disableDragDrop: disableDragDrop,
        overQuota: showMEGAdropOverQuota,

        // PUF
        pufs: puf.items,
        pufProcessPUH: puf.processPUH,
        pufHandle: puf.getHandle,
        pufProcessDb: puf.processDb,
        pufRemove: puf.remove,

        // PUP
        pups: pup.items,
        pupInfo: pup.get,
        pupList: pup.list,
        pupCheck: pup.check,
        pupProcessPUP: pup.processPUP,
        pupProcessDb: pup.processDb,

        // UI
        uiUpdateItem: ui.updateItem,
        onCompletion: ui.onCompletion,
        onItemCompletion: ui.onItemCompletion,
        uiUpdateTotalProgress: ui.updateTotalProgress,

        // Settings
        stngsAdd: settings.add,
        stngsDraw: settings.widget
    };

}());// END mega.widget
