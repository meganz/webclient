(function _fileconflict(global) {
    'use strict'; /* jshint -W074 */

    var keepBothState = Object.create(null);
    var saveKeepBothState = function(target, node, name) {
        if (!keepBothState[target]) {
            keepBothState[target] = Object.create(null);
        }
        keepBothState[target][name] = node;
    };

    var setName = function(file, name) {
        try {
            Object.defineProperty(file, 'name', {
                writable: true,
                configurable: true,
                value: M.getSafeName(name)
            });
        }
        catch (e) {
        }
    };

    var ns = {
        /**
         * Check files against conflicts
         * @param {Array} files An array of files to check for conflicts
         * @param {String} target The target node handle
         * @param {String} op Operation, one of copy, move, or upload
         * @param {Number} [defaultAction] The optional default action to perform
         * @returns {MegaPromise} Resolves with a non-conflicting array
         * @memberof fileconflict
         */
        check: function(files, target, op, defaultAction, defaultActionFolders) {
            var noFileConflicts = !!localStorage.noFileConflicts;
            var promise = new MegaPromise();
            var conflicts = [];
            var result = [];
            var merges = [];
            var mySelf = this;
            var breakOP = false;
            var foldersRepeatAction = null;

            // this is special if for copying from chat
            // 1- must be 1 item
            // 2- must be to 1 target.
            // --> no need to consider in all logical space of file/folder conflicts
            if (M.d[target] && M.d[target].name === M.myChatFilesFolder.name) {
                defaultAction = ns.KEEPBOTH;
            }

            for (var i = files.length; i--;) {
                var file = files[i];

                if (typeof file === 'string') {
                    file = clone(M.d[file] || false);
                }

                if (!file) {
                    console.warn('Got invalid file...');
                    continue;
                }

                if (missingkeys[file.h]) {
                    result.push(file);
                    continue;
                }

                try {
                    // this could throw NS_ERROR_FILE_NOT_FOUND
                    var test = file.size;
                }
                catch (ex) {
                    ulmanager.logger.warn(file.name, ex);
                    continue;
                }

                var found = null;
                var nodeTarget = file.target || target;
                var nodeName = M.getSafeName(file.name);

                if (M.c[nodeTarget]) {
                    found = this.getNodeByName(nodeTarget, nodeName, false);
                }

                if (!found) {
                    found = this.locateFileInUploadQueue(nodeTarget, nodeName);
                }

                if (found && !noFileConflicts) {
                    conflicts.push([file, found]);
                }
                else {
                    setName(file, nodeName);
                    saveKeepBothState(nodeTarget, file, nodeName);
                    result.push(file);
                }
            }

            var resolve = function() {
                keepBothState = Object.create(null);
                result.fileConflictChecked = true;
                promise.resolve(result);
            };

            if (conflicts.length) {
                var repeat = null;
                var self = this;
                var save = function(file, name, action, node) {
                    var stop = false;
                    if (file) {
                        setName(file, name);
                        var isAddNode = true;

                        if (action === ns.REPLACE) {
                            if (!file.t) {
                                // node.id if it's for an upload queue entry
                                file._replaces = node.h || node.id;
                            }
                            else {
                                merges.push([file, node]);
                                isAddNode = false;
                                if (op === 'move') {
                                    // in move i need to propograte mergered folders
                                    // in order to remove.
                                    isAddNode = true;
                                    file._mergedFolderWith = node.h;
                                    if (M.getShareNodesSync(file.h).length || M.getShareNodesSync(node.h).length) {
                                        stop = true;
                                    }
                                }
                            }
                        }
                        if (isAddNode) {
                            result.push(file);
                        }
                    }
                    saveKeepBothState(node.p || target, node, name);
                    if (stop) {
                        resolve();
                        breakOP = true;
                        return false;
                    }
                    return true;
                };

                switch (defaultAction) {
                    case ns.REPLACE:
                    case ns.DONTCOPY:
                    case ns.KEEPBOTH:
                        repeat = defaultAction;
                }
                switch (defaultActionFolders) {
                    case ns.REPLACE:
                    case ns.DONTCOPY:
                    case ns.KEEPBOTH:
                        foldersRepeatAction = defaultActionFolders;
                }

                var applyCheck = function _prompt(a) {
                    var promptPromise = new MegaPromise();

                    var promptRecursion = function (a) {
                        var file = a.pop();

                        if (file) {
                            var node = file[1];
                            file = file[0];

                            var action = (file.t && file.t === 1) ? foldersRepeatAction : repeat;

                            if (action) {
                                var name = file.name;

                                switch (action) {
                                    case ns.DONTCOPY:
                                        break;
                                    case ns.KEEPBOTH:
                                        name = self.findNewName(name, node.p || target);
                                        /* falls through */
                                    case ns.REPLACE:
                                        save(file, name, action, node);
                                        break;
                                }
                                promptRecursion(a);
                            }
                            else {
                                self.prompt(op, file, node, a.length, node.p || target)
                                    .always(function(file, name, action, checked) {
                                        if (file === -0xBADF) {
                                            result = [];
                                            resolve();
                                        }
                                        else {
                                            if (checked) {
                                                if (!file.t) {
                                                    repeat = action;
                                                }
                                                else {
                                                    foldersRepeatAction = action;
                                                }
                                            }
                                            if (action !== ns.DONTCOPY) {
                                                if (!save(file, name, action, node)) {
                                                    promptPromise.resolve();
                                                    return;
                                                }
                                            }

                                            promptRecursion(a);
                                        }
                                    });
                            }
                        }
                        else {
                            promptPromise.resolve();
                        }
                    };
                    promptRecursion(a);
                    return promptPromise;
                };

                applyCheck(conflicts).always(function _traversTree() {
                    if (merges && merges.length && !breakOP) { // merge mode ! --> checking everything
                        var conflictedNodes = [];
                        var okNodes = [];
                        for (var k = 0; k < merges.length; k++) {
                            var res = mySelf.filesFolderConfilicts(M.c[merges[k][0].h], merges[k][1].h);
                            conflictedNodes = conflictedNodes.concat(res.conflicts);
                            okNodes = okNodes.concat(res.okNodes);
                        }
                        result = result.concat(okNodes);

                        foldersRepeatAction = ns.REPLACE; // per specifications, merge all internal folders
                        applyCheck(conflictedNodes).always(resolve);
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }

            return promise;
        },

        filesFolderConfilicts: function _filesFolderConfilicts(nodesToCopy, target) {
            var okNodes = [];
            var folderFound = false;
            var conflictedNodes = [];

            if (!nodesToCopy || !target) {
                return [];
            }
            if (!Array.isArray(nodesToCopy)) {
                nodesToCopy = Object.keys(nodesToCopy);
            }


            for (var k = 0; k < nodesToCopy.length; k++) {
                var currNode = clone(M.d[nodesToCopy[k]] || false);

                if (!currNode) {
                    console.warn('Got invalid node (file|folder)...');
                    continue;
                }
                currNode.keepParent = target;

                var found = null;

                var nodeName = M.getSafeName(currNode.name);
                if (M.c[target]) {
                    found = this.getNodeByName(target, nodeName, false);
                }

                if (!found) {
                    found = this.locateFileInUploadQueue(target, nodeName);
                }

                if (found) {
                    if (!folderFound) {
                        folderFound = currNode.t;
                    }
                    conflictedNodes.push([currNode, found]);
                }
                else {
                    setName(currNode, nodeName);
                    saveKeepBothState(target, currNode, nodeName);
                    okNodes.push(currNode);
                }
            }

            if (folderFound) {
                var newConflictedNodes = [];
                var newOkNodes = [];
                for (var k2 = 0; k2 < conflictedNodes.length; k2++) {
                    if (conflictedNodes[k2][0].t) { // array contains either files or folders only
                        var res = this.filesFolderConfilicts(M.c[conflictedNodes[k2][0].h], conflictedNodes[k2][1].h);
                        newConflictedNodes = newConflictedNodes.concat(res.conflicts);
                        newOkNodes = newOkNodes.concat(res.okNodes);
                    }
                }

                okNodes = okNodes.concat(newOkNodes);
                conflictedNodes = conflictedNodes.concat(newConflictedNodes);
            }

            return {
                okNodes: okNodes,
                conflicts: conflictedNodes
            };
        },

        /**
         * Prompt duplicates/fileconflict dialog.
         * @param {String} op Operation, one of copy, move, or upload
         * @param {Object} file The source file
         * @param {Object} node The existing node
         * @param {Number} remaining The remaining conflicts
         * @param {String} target Location where the new file(s) will be placed
         * @param {Number} dupsNB {optional} in case of duplications, total number
         * @returns {MegaPromise}
         */
        prompt: function(op, file, node, remaining, target, dupsNB) {
            var promise = new MegaPromise();
            var $dialog = $('.fm-dialog.duplicate-conflict');
            var name = M.getSafeName(file.name);
            var $a1 = $('.action-block.a1', $dialog).removeClass('hidden');
            var $a2 = $('.action-block.a2', $dialog).removeClass('hidden');
            var $a3 = $('.action-block.a3', $dialog).removeClass('hidden');
            var icons = $('.export-icon', $dialog);
            var classes = icons.attr('class').split(' ');
            icons.removeClass(classes[classes.length - 1]); // remove last class

            if (file.t) {
                $a3.addClass('hidden');
                icons.addClass('folderConflict');
                $('.info-txt.light-grey', $dialog).text(l[17556]);
                $('.info-txt-fn', $dialog)
                    .safeHTML(escapeHTML(l[17550]).replace('%1', '<strong>' + name + '</strong>'));
            }
            else {
                icons.addClass(fileIcon(node));

                // Check whether the user have full-access to the target, required to replace or create versions
                if (M.getNodeRights(target) < 2) {
                    $a1.addClass('hidden');
                }

                $('.info-txt.light-grey', $dialog).text(l[16487]);
                $('.info-txt-fn', $dialog)
                    .safeHTML(escapeHTML(l[16486]).replace('%1', '<strong>' + name + '</strong>'));
            }

            switch (op) {
                case 'dups':
                    if (file.t) {
                        // $a2.addClass('hidden');
                        $a3.addClass('hidden');
                        $('.info-txt.light-grey', $dialog).text('Please select what you want to do:');
                        $('.info-txt-fn', $dialog)
                            .safeHTML('Multiple folders with the same name <strong>' + name + '</strong> exist in this location.');

                        $('.red-header', $a1).text('Rename duplicates');
                        $('.light-grey', $a1).text('The newest folder will keep its name, older folders will be renamed with suffixes (1), (2) ...');

                        $('.red-header', $a2).text('Merge duplicates');
                        $('.light-grey', $a2).text('Duplicated folders will be merged into a single folder');
                    }
                    else {
                        $a3.addClass('hidden');
                        $('.info-txt.light-grey', $dialog).text('Please select what you want to do:');

                        $('.red-header', $a1).text('Rename duplicates');
                        $('.red-header', $a2).text('Keep the newest');
                        $('.light-grey', $a1).text('The newest file will keep its name, older files will be renamed with suffixes (1), (2) ...');
                        $('.light-grey', $a2).text('The newest file will be kept, all older files will be removed');

                        $('.info-txt-fn', $dialog)
                            .safeHTML('Multiple files with the same name <strong>' + name + '</strong> exist in this location.');

                    }
                    break;
                case 'copy':
                    if (file.t) {
                        $('.red-header', $a1).text(l[17551]);
                        $('.red-header', $a2).text(l[16500]);
                        $('.light-grey', $a1).text(l[17552]);
                    }
                    else {
                        $('.red-header', $a1).text(l[16496]);
                        $('.red-header', $a2).text(l[16500]);
                        $('.red-header', $a3).text(l[17095]);
                        $('.light-grey', $a1).text(l[16498]);
                        $('.light-grey', $a3).text(l[16515]);
                    }
                    break;
                case 'move':
                    if (file.t) {
                        $('.red-header', $a1).text(l[17553]);
                        $('.red-header', $a2).text(l[16499]);
                        $('.light-grey', $a1).text(l[17554]);
                    }
                    else {
                        $('.red-header', $a1).text(l[16495]);
                        $('.red-header', $a2).text(l[16499]);
                        $('.red-header', $a3).text(l[17096]);
                        $('.light-grey', $a1).text(l[16497]);
                        $('.light-grey', $a3).text(l[16514]);
                    }
                    break;
                case 'upload':
                    if (file.t) {
                        $('.red-header', $a1).text(l[17555]);
                        $('.red-header', $a2).text(l[16490]);
                        $('.light-grey', $a2).text(l[19598]);
                    }
                    else {
                        $('.red-header', $a1).text(l[17093]);
                        $('.red-header', $a2).text(l[16490]);
                        $('.red-header', $a3).text(l[17094]);
                        $('.light-grey', $a3).text(l[16493]);
                        $('.light-grey', $a1).safeHTML(l[17097]);
                    }
                    break;
                case 'replace':
                    $('.red-header', $a1).text(l[16488]);
                    $('.red-header', $a2).text(l[16490]);
                    $('.red-header', $a3).text(l[17094]);
                    $('.light-grey', $a1).text(l[17602]);
                    $('.light-grey', $a3).text(l[16493]);
                    break;
                case 'import':
                    $('.red-header', $a1).text(l[17558]);
                    $('.red-header', $a2).text(l[17559]);
                    $('.red-header', $a3).text(l[17560]);
                    $('.light-grey', $a3).text(l[17561]);
                    $('.light-grey', $a1).safeHTML(l[17097]);
                    break;
            }

            $('.file-name', $a1).text(name);
            if (file.t) {
                $('.file-size', $a1).text('');
                $('.file-size', $a2).text('');
                if (op === 'dups') {
                    $('.file-name', $a1).text(this.findNewName(file.name, target));
                    $('.file-name', $a2).text(name);
                    $('.file-date', $a1).text('');
                    $('.file-date', $a2).text('');
                }
            }
            else {
                $('.file-size', $a1).text(bytesToSize(file.size || file.s || ''));
                $('.file-name', $a3).text(this.findNewName(file.name, target));
                $('.file-size', $a2).text(bytesToSize(node.size || node.s));
                if (op === 'dups') {
                    $('.file-name', $a1).text(this.findNewName(file.name, target));
                    $('.file-name', $a2).text(name);
                    $('.file-name', $a3).text(name);
                    $('.file-size', $a2).text((dupsNB - 1) + ' files will be removed');
                    $('.file-date', $a1).text('');
                    $('.file-date', $a2).text('');

                }
            }
            if (op !== 'dups') {
                var myTime = file.mtime || file.ts || (file.lastModified / 1000);
                $('.file-date', $a1).text(myTime ? time2date(myTime, 2) : '');
                $('.file-name', $a2).text(node.name);
                myTime = node.mtime || node.ts;
                $('.file-date', $a2).text(myTime ? time2date(myTime, 2) : '');
            }

            var done = function(file, name, action) {
                closeDialog();
                var checked = $('#duplicates-checkbox').prop('checked');
                if (checked) {
                    // Show loading while process multiple files
                    loadingDialog.show();
                    promise.always(function() {
                        loadingDialog.hide();
                    });
                }
                // Make sure browser is not freeze and show loading dialog
                onIdle(function() {
                    promise.resolve(file, name, action, checked);
                })
            };

            $a1.rebind('click', function() {
                done(file, $('.file-name', this).text(), ns.REPLACE);
            });
            $a2.rebind('click', function() {
                done(file, 0, ns.DONTCOPY);
            });
            $a3.rebind('click', function() {
                done(file, $('.file-name', this).text(), ns.KEEPBOTH);
            });

            $('#versionhelp').rebind('click', function(ev) {
                window.open(this.href, '_blank');
                return false;
            });
            $('.skip-button', $dialog).rebind('click', function() {
                done(null, 0, ns.DONTCOPY);
            });
            $('.cancel-button, .fm-dialog-close', $dialog).rebind('click', function() {
                done(-0xBADF);
            });

            $('#duplicates-checkbox', $dialog)
                .switchClass('checkboxOn', 'checkboxOff')
                .parent()
                .switchClass('checkboxOn', 'checkboxOff');

            var $chk = $('.bottom-checkbox', $dialog).addClass('hidden');

            if (remaining) {
                $chk.removeClass('hidden')
                    .find('.radio-txt')
                    .safeHTML(escapeHTML(l[16494]).replace('[S]2[/S]', '<span>' + remaining + '</span>'));
            }

            uiCheckboxes($dialog);
            M.safeShowDialog('fileconflict-dialog', $dialog);

            return promise;
        },

        /**
         * Given a filename, create a new one appending (1)..(n) as needed.
         * @param {String} oldName The old file name
         * @returns {String}
         */
        getNewName: function(oldName) {
            var newName;
            var idx = oldName.match(/\((\d+)\)(?:\..*?)?$/);

            if (idx) {
                idx = idx[1] | 0;

                newName = oldName.replace('(' + (idx++) + ')', '(' + idx + ')');
            }
            else {
                newName = oldName.split('.');

                if (newName.length > 1) {
                    var ext = newName.pop();
                    newName = newName.join('.') + ' (1).' + ext;
                }
                else {
                    newName += ' (1)';
                }
            }

            return newName;
        },

        /**
         * Find new name
         * @param {String} name The old file name
         * @param {String} target The target to lookup at
         * @returns {String}
         */
        findNewName: function(name, target) {
            var newName = name;

            do {
                newName = this.getNewName(newName);
            } while (this.getNodeByName(target, newName) || this.locateFileInUploadQueue(target, newName));

            return newName;
        },

        /**
         * Find node by name.
         * @param {String} target The target to lookup at
         * @param {String} name The name to check against
         * @param {Boolean} [matchSingle] only return a single matching node
         * @returns {Object} The found node
         */
        getNodeByName: function(target, name, matchSingle) {
            var res;

            if (keepBothState[target] && keepBothState[target][name]) {
                return keepBothState[target][name];
            }

            for (var h in M.c[target]) {
                var n = M.d[h] || false;

                if (n.name === name) {

                    if (!matchSingle) {
                        return n;
                    }

                    if (res) {
                        return null;
                    }
                    res = n;
                }
            }

            return res;
        },

        /**
         * Locate file in the upload queue
         * @param {String} target The target to lookup at
         * @param {String} name The name to check against
         * @returns {Object} The queue entry found
         */
        locateFileInUploadQueue: function(target, name) {
            for (var i = ul_queue.length; i--;) {
                var q = ul_queue[i] || false;

                if (q.target === target && q.name === name) {
                    var r = Object.create(null);
                    r.id = q.id;
                    r.name = q.name;
                    r.size = q.size;
                    r.target = r.p = q.target;
                    r.ts = Math.floor(q.lastModified / 1e3);
                    return r;
                }
            }
        },

        resolveExistedDuplication: function(dups, target) {
            if (!dups || (!dups.files && !dups.folders) || !Object.keys(dups).length) {
                return;
            }

            var dupsKeys = Object.keys(dups.files);
            var allDups = dupsKeys.length;
            var operationsOrderPromise = new MegaPromise();

            var resolveDup = function(duplicateEntries, keys, kIndex,type) {
                if (kIndex >= keys.length) {
                    operationsOrderPromise.resolve();
                    return;
                }

                var name = keys[kIndex];

                fileconflict.prompt('dups', M.d[duplicateEntries[type][name][0]],
                    M.d[duplicateEntries[type][name][1]], allDups - 1, target,
                    duplicateEntries[type][name].length).always(
                        function contuineResolving(file, fname, action, checked) {

                            var olderNode = null;
                            var newestTS = -1;
                            var newestIndex = -1;

                            if (duplicateEntries[type][name].length == 2) {
                                olderNode = duplicateEntries[type][name][0];
                                if (M.d[duplicateEntries[type][name][1]].ts < M.d[olderNode].ts) {
                                    olderNode = duplicateEntries[type][name][1];
                                }
                            }
                            else {
                                for (var k = 0; k < duplicateEntries[type][name].length; k++) {
                                    if (M.d[duplicateEntries[type][name][k]].ts > newestTS) {
                                        newestTS = M.d[duplicateEntries[type][name][k]].ts;
                                        newestIndex = k;
                                    }
                                }
                            }

                            switch (action) {
                                case ns.REPLACE:
                                    // rename old files

                                    var newName;
                                    if (olderNode) {
                                        newName = fileconflict.findNewName(name, target);
                                        M.rename(olderNode, newName);
                                    }
                                    else {
                                        for (var h = 0; h < duplicateEntries[type][name].length; h++) {
                                            if (h === newestIndex) {
                                                continue;
                                            }
                                            newName = fileconflict.findNewName(name, target);
                                            M.rename(duplicateEntries[type][name][h], newName);
                                        }
                                    }
                                    break;
                                case ns.KEEPBOTH:
                                    // merge

                                    break;
                                case ns.DONTCOPY:
                                    // keep the newest
                                    if (type === 'files') {
                                        if (olderNode) {
                                            M.safeRemoveNodes(olderNode);
                                        }
                                        else {
                                            var nodeToRemove = duplicateEntries[type][name].splice(newestIndex, 1);
                                            M.safeRemoveNodes(nodeToRemove);
                                        }
                                    }
                                    else {
                                        // merge
                                        if (olderNode) {
                                            // 2 items
                                            fileconflict.check([M.d[olderNode]], M.d[olderNode].p, 'move', null, fileconflict.REPLACE);
                                        }
                                    }
                                    break;
                            }

                            resolveDup(duplicateEntries, keys, ++kIndex, 'files');
                        }
                    );
            };

            resolveDup(dups, dupsKeys, 0, 'files');

            operationsOrderPromise.done(function() {
                dupsKeys = Object.keys(dups.folders);
                allDups = dupsKeys.length;

                resolveDup(dups, dupsKeys, 0, 'folders');
            });

        },

        REPLACE: 1,
        DONTCOPY: 2,
        KEEPBOTH: 3
    };

    Object.defineProperty(global, 'fileconflict', {value: ns});

})(this);
