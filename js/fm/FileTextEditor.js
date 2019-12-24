/** This class is the core of text file editor.
 * It will handle uploading/downloading of data
 * and performs memory/bandwidth optimization.
*/

mega.filesEditor = new function FileTextEditor() {
    // the maximum slots in memory for edited files
    // we have the maximum editable file size = 20MB --> max Total = 100MB
    var maxFilesInMemory = 5;

    var filesDataMap = Object.create(null);
    var slotIndex = 0;
    var slotsMap = [null, null, null, null, null];


    /**
     * store data in memory
     * @param {String} handle       Node handle
     * @param {String} data         File data
     */
    var storeFileData = function(handle,data) {

        // store the data in memory
        filesDataMap[handle] = data;

        if (slotsMap[slotIndex]) {
            filesDataMap[slotsMap[slotIndex]] = null;
            delete filesDataMap[slotsMap[slotIndex]];
        }
        // reserve the slot
        slotsMap[slotIndex++] = handle;

        // round-robin 
        if (slotIndex > 4) {
            slotIndex = 0;
        }
    };




    /**
     * Get file data
     * @param {String} handle       Node handle
     * @param {Boolean} isPublic    flag to isPublic link
     */
    this.getFile = function(handle, isPublic) {

        var operationPromise = new MegaPromise();

        // if called with no handle or invalid one, exit
        if (!handle || (!M.d[handle] && !isPublic)) {
            if (d) {
                console.error('Handle rejected in getFile ' + handle);
            }
            return operationPromise.reject();
        }

        // if we have the data cached, return it.
        if (filesDataMap[handle]) {
            return operationPromise.resolve(filesDataMap[handle]);
        }

        var node;

        if (isPublic && dl_node) {
            node = dl_node;
        }
        else {
            node = M.d[handle];
        }

        // this is empty file, no need to bother Data Servers + API
        if (node.s <= 0) {
            storeFileData(handle, '');
            return operationPromise.resolve(filesDataMap[handle]);
        }

        // get the data
        M.gfsfetch(handle, 0, -1).done(function(data) {

            if (data.buffer === null) {
                return operationPromise.reject();
            }

            storeFileData(handle, ab_to_str(data.buffer));

            operationPromise.resolve(filesDataMap[handle]);
        }).fail(function(ev) {
            if (ev === EOVERQUOTA || Object(ev.target).status === 509) {
                dlmanager.setUserFlags();
                dlmanager.showOverQuotaDialog();
            }
            operationPromise.reject();
        });

        return operationPromise;
    };


    this.setFile = function(handle, content) {
        var operationPromise = new MegaPromise();

        // if called with no handle or invalid one, exit
        if (!handle || !M.d[handle]) {
            return operationPromise.reject();
        }

        var fileNode = M.d[handle];
        var fileType = filemime(fileNode);

        var nFile = new File([content], fileNode.name, { type: fileType });
        nFile.target = fileNode.p;
        nFile.id = ++__ul_id;
        nFile.path = '';
        nFile.isCreateFile = true;
        nFile._replaces = handle;
        nFile.promiseToInvoke = operationPromise;

        operationPromise.done(function(vHandle) {
            // no need to clear here, since we are adding + removing
            filesDataMap[handle] = null;
            delete filesDataMap[handle];
            filesDataMap[vHandle] = content;
        });

        ul_queue.push(nFile);
        return operationPromise;
    };


    this.saveFileAs = function(newName, directory, content, nodeToSaveAs) {
        var operationPromise = new MegaPromise();

        if (!newName || !directory || (!nodeToSaveAs && !content)) {
            return operationPromise.reject();
        }
        
        loadingDialog.show();
        if (typeof content === 'undefined' || content === null) {
            if (typeof nodeToSaveAs === 'string') {
                nodeToSaveAs = M.d[nodeToSaveAs];
            }
            var nNode = Object.create(null);
            var node = clone(nodeToSaveAs);

            node.name = M.getSafeName(newName);
            nNode.k = node.k;
            node.lbl = 0;
            node.fav = 0;
            delete node.rr;
            nNode.a = ab_to_base64(crypto_makeattr(node, nNode));
            nNode.h = node.h;
            nNode.t = node.t;

            var opTree = [nNode];
            opTree.opSize = node.s || 0;

            M.copyNodes([nodeToSaveAs], directory, null, operationPromise, opTree);
        }
        else {
            var fType = filemime(newName);
            var nFile = new File([content], newName, { type: fType });
            nFile.target = directory;
            nFile.id = ++__ul_id;
            nFile.path = '';
            nFile.isCreateFile = true;
            nFile.promiseToInvoke = operationPromise;

            operationPromise.done(function(nHandle) {
                storeFileData(nHandle, content);
            });

            ul_queue.push(nFile);
        }


        return operationPromise;
    };


    this.removeOldVersion = function(handle) {
        api_req({ a: 'd', n: handle, v: 1 });
    };

    this.clearCachedFileData = function(handle) {
        if (filesDataMap[handle]) {
            filesDataMap[handle] = null;
            delete filesDataMap[handle];
        }
    };

    this.prepareTextEditoFrame = function(iframe) {
        var iframeHtml = window['txtEditor'];
    }


    /**
     * Check if the node is for a textual file
     * @param {MegaData} node       The node to check
     */
    window.isTextual = function(node) {
        var fType = filetype(node, true)[0];
        if (fType === 'text' || fType === 'web-data' || fType === 'web-lang') {
            return true;
        }
        return false;
    };
};
