/** This class is the core of text file editor.
 * It will handle uploading/downloading of data
 * and performs memory/bandwidth optimization.
*/

mega.fileTextEditor = new function FileTextEditor() {
    "use strict";
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
     * @returns {Void}              void
     */
    var storeFileData = function(handle, data) {

        // store the data in memory
        filesDataMap[handle] = data;

        if (slotsMap[slotIndex]) {
            filesDataMap[slotsMap[slotIndex]] = null;
            delete filesDataMap[slotsMap[slotIndex]];
        }
        // reserve the slot
        slotsMap[slotIndex++] = handle;

        var slots = maxFilesInMemory - 1;

        // round-robin
        if (slotIndex > slots) {
            slotIndex = 0;
        }
    };

    /**
     * Get file data
     * @param {String} handle       Node handle
     * @returns {MegaPromise}       Promise of the operation
     */
    this.getFile = function(handle) {

        // eslint-disable-next-line local-rules/hints
        var operationPromise = new MegaPromise();
        var node = M.getNodeByHandle(handle);
        handle = node.link || node.h;

        // if called with no handle or invalid one, exit
        if (!handle) {
            if (d) {
                console.error('Handle rejected in getFile ' + handle);
            }
            return operationPromise.reject();
        }

        // if we have the data cached, return it.
        if (filesDataMap[handle]) {
            return operationPromise.resolve(filesDataMap[handle]);
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
            var bData = new Blob([data.buffer], { type: "text/plain" });
            var binaryReader = new FileReader();


            binaryReader.addEventListener('loadend', function(e) {
                var text = e.srcElement.result;
                storeFileData(handle, text);
                operationPromise.resolve(filesDataMap[handle]);
            });
            binaryReader.readAsText(bData);

        }).fail(function(ev) {
            if (ev === EOVERQUOTA || Object(ev.target).status === 509) {
                dlmanager.setUserFlags();
                dlmanager.showOverQuotaDialog();
            }
            operationPromise.reject();
        });

        return operationPromise;
    };

    /**
     * Set file's data (save it)
     * @param {String} handle           Node's handle
     * @param {String} content          Text content to be saved
     * @returns {MegaPromise}           Operation Promise
     */
    this.setFile = function(handle, content) {
        // eslint-disable-next-line local-rules/hints
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

    /**
     * Save text file As
     * @param {String} newName          New name
     * @param {String} directory        Destination handle
     * @param {String} content          Text content to be saved
     * @param {String} nodeToSaveAs     Original node's handle
     * @returns {MegaPromise}           Operation Promise
     */
    this.saveFileAs = function(newName, directory, content, nodeToSaveAs) {
        // eslint-disable-next-line local-rules/hints
        var operationPromise = new MegaPromise();

        if (!newName || !directory || !(nodeToSaveAs || content)) {
            if (d) {
                console.error('saveFileAs is called incorrectly newName=' + newName +
                    ' dir=' + directory + ' !content=' + !content + ' nodetoSave=' + nodeToSaveAs);
            }
            return operationPromise.reject();
        }

        loadingDialog.show();
        // if content is not changed, then do a copy operation with new name
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
        // if content changed then do upload operation
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

    /**
     * Remove previously created version, this is used when users do multiple saves to the same file.
     * @param {String} handle       Node's handle
     * @returns {Void}              void
     */
    this.removeOldVersion = function(handle) {
        api_req({ a: 'd', n: handle, v: 1 });
    };

    this.clearCachedFileData = function(handle) {
        if (filesDataMap[handle]) {
            filesDataMap[handle] = null;
            delete filesDataMap[handle];
        }
    };
};

