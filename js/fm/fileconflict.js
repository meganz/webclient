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
         * @returns {Promise} Resolves with a non-conflicting array
         * @memberof fileconflict
         */
        check: function(files, target, op, defaultAction, defaultActionFolders) {
            var noFileConflicts = !!localStorage.noFileConflicts;
            const {promise} = mega;
            var conflicts = [];
            var result = [];
            var merges = [];
            var mySelf = this;
            var breakOP = false;
            var foldersRepeatAction = null;

            /**
             * Special case 1: Copying from chat
             *
             * 1. must be 1 item
             * 2. must be to 1 target.
             * --> no need to consider in all logical space of file/folder conflicts
             */
            const copyingFromChat = M.d[target] && M.d[target].name === M.myChatFilesFolder.name;

            /**
             * Special case 2: "Moving" stopped backups to inshares requires a copy + remove
             *
             * The copy could prompt a fileconflict dialog, the resolution of which
             * we keep consistent with that of the 'move stopped backup to CD' action
             */
            const copyingBackupToInshares =
                files.length && M.getNodeRoot(files[0]) === M.InboxID && !!sharer(target)
                && mega.devices.ui && typeof mega.devices.ui.getFolderInPath === 'function'
                && mega.devices.ui.getFolderInPath(M.getPath(files[0])).h === files[0];

            if (copyingFromChat || copyingBackupToInshares) {
                defaultAction = ns.KEEPBOTH;

                if (copyingBackupToInshares) {
                    defaultActionFolders = ns.KEEPBOTH;
                }
            }

            for (var i = files.length; i--;) {
                var file = files[i];

                if (typeof file === 'string') {
                    file = clone(M.getNodeByHandle(file) || false);
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

                            if (mega.ui.searchbar && mega.ui.searchbar.recentlyOpened) {
                                mega.ui.searchbar.recentlyOpened.files.delete(file._replaces);
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

                    let tick = 0;
                    (function promptRecursion(a) {
                        var file = a.pop();

                        if (file) {
                            var node = file[1];
                            file = file[0];

                            var action = (file.t && file.t === 1) ? foldersRepeatAction : repeat;

                            if (action) {
                                var name = file.name;
                                var proceed = true;
                                switch (action) {
                                    case ns.DONTCOPY:
                                        break;
                                    case ns.KEEPBOTH:
                                        name = self.findNewName(name, node.p || target);
                                        /* falls through */
                                    case ns.REPLACE:
                                        proceed = save(file, name, action, node);
                                        break;
                                }
                                if (proceed) {
                                    if (++tick % 200) {
                                        promptRecursion(a);
                                    }
                                    else {
                                        onIdle(() => promptRecursion(a));
                                    }
                                }
                                else {
                                    promptPromise.resolve();
                                }
                            }
                            else {
                                const remaining = file.t === 1 ?
                                    a.filter(n => n[1].t === 1).length :
                                    a.filter(n => n[1].t === 0).length;
                                self.prompt(op, file, node, remaining, node.p || target)
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
                    })(a);

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

        async checkImport(tree, t) {
            const conflictRoots = [];
            const decrNodes = Object.create(null);
            const nodeMap = Object.create(null);
            await dbfetch.get(t);
            for (let i = tree.length; i--;) {
                const n = tree[i];
                const tmp = {...n};
                crypto_procattr(tmp, tmp.k);
                if (n.p) {
                    if (!decrNodes[n.p]) {
                        decrNodes[n.p] = [];
                    }
                    decrNodes[n.p].push(tmp);
                }
                else {
                    const exist = this.getNodeByName(t, M.getSafeName(tmp.name));
                    if (exist) {
                        conflictRoots.push([tmp, exist]);
                    }
                }
                nodeMap[n.h] = n;
            }
            let remain = conflictRoots.length;
            eventlog(500886, JSON.stringify([1, tree.length, remain]));
            let repeatAction = false;

            const promptProc = async(impNode, exist, t, remain, skipRepeat) => {
                let res;
                if (!skipRepeat && repeatAction) {
                    res = {
                        name: repeatAction === ns.KEEPBOTH ? this.findNewName(impNode.name, t) : impNode.name,
                        action: repeatAction,
                        checked: true,
                    };
                }
                else {
                    const { promise } = mega;
                    this.prompt('import', impNode, exist, Math.max(remain || 0, 0), t)
                        .always((file, name, action, checked) => {
                            promise.resolve({ name, action, file, checked });
                        });
                    res = await promise;
                }
                const { name, action, checked, file } = res;
                if (file === -0xBADF) {
                    return false;
                }
                if (!skipRepeat && checked) {
                    repeatAction = action;
                }
                if (action === ns.REPLACE) {
                    nodeMap[impNode.h]._replaces = exist.h;
                }
                else if (action === ns.KEEPBOTH) {
                    impNode.name = name;
                    nodeMap[impNode.h].a = ab_to_base64(crypto_makeattr(impNode));
                }
                else {
                    delete nodeMap[impNode.h];
                    if (decrNodes[impNode.h]) {
                        const stack = [...decrNodes[impNode.h]];
                        while (stack.length) {
                            const n = stack.pop();
                            delete nodeMap[n.h];
                            if (decrNodes[n.h]) {
                                stack.push(...decrNodes[n.h]);
                            }
                        }
                    }
                }
                return action;
            };
            const newCopy = Object.create(null);
            const processFolderMerge = async(stack) => {
                while (stack.length) {
                    const { exist, node } = stack.pop();
                    if (decrNodes[node.h]) {
                        if (!newCopy[exist.h]) {
                            newCopy[exist.h] = [];
                        }
                        await dbfetch.get(exist.h);
                        for (let i = decrNodes[node.h].length; i--;) {
                            const next = decrNodes[node.h][i];
                            const match = this.getNodeByName(exist.h, next.name);
                            if (match && match.t) {
                                stack.push({ exist: match, node: next });
                            }
                            else if (match) {
                                const res = await promptProc(next, match, exist.h, 0, true);
                                if (res === false) {
                                    return [];
                                }
                                if (res !== ns.DONTCOPY) {
                                    delete nodeMap[next.h].p;
                                    newCopy[exist.h].push(nodeMap[next.h]);
                                    delete nodeMap[next.h];
                                }
                            }
                            else {
                                delete nodeMap[next.h].p;
                                newCopy[exist.h].push(nodeMap[next.h]);
                                delete nodeMap[next.h];
                            }
                        }
                    }
                    delete nodeMap[node.h];
                }
            };
            for (let i = conflictRoots.length; i--;) {
                const [root, exist] = conflictRoots[i];
                const action = await promptProc(root, exist, t, --remain);
                if (!action) {
                    throw EBLOCKED;
                }
                if (exist.t) {
                    if (action === ns.REPLACE) {
                        const stack = [{ exist, node: root }];
                        await processFolderMerge(stack);
                    }
                    else {
                        delete decrNodes[root.h];
                    }
                }
            }
            // Process merges
            for (const [t, tree] of Object.entries(newCopy)) {
                tree._importPart = true;
                await M.copyNodes(tree.map(n => n.h), t, false, tree);
            }
            // Pass back rest to caller to finish copying.
            const res = Object.values(nodeMap).reverse();
            res._importPart = true;
            return res;
        },

        filesFolderConfilicts: function _filesFolderConfilicts(nodesToCopy, target) {
            var okNodes = [];
            var folderFound = false;
            var conflictedNodes = [];

            if (!nodesToCopy || !target) {
                return {
                    okNodes: [],
                    conflicts: []
                };
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
            var $dialog = this.getDialog();
            var name = M.getSafeName(file.name);
            var $a1 = $('.action-block.a1', $dialog).removeClass('hidden');
            var $a2 = $('.action-block.a2', $dialog).removeClass('hidden');
            var $a3 = $('.action-block.a3', $dialog).removeClass('hidden');
            var $icons = $('.item-type-icon-90', $dialog);
            var classes = $icons.attr('class').split(' ');
            $icons.removeClass(classes[classes.length - 1]); // remove last class

            // Hide the loading spinner, it will be shown again when the conflict is being resolved
            loadingDialog.phide();

            if (file.t) {
                $a3.addClass('hidden');
                $icons.addClass(`icon-${folderIcon(node)}-90`);
                $('.info-txt.light-grey', $dialog).text(l[17556]);
                $('.info-txt-fn', $dialog)
                    .safeHTML(escapeHTML(l[17550]).replace('%1', '<strong>' + name + '</strong>'));
            }
            else {
                $icons.addClass(`icon-${fileIcon(node)}-90`);

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
                    $a3.addClass('hidden');
                    $('.info-txt.light-grey', $dialog).text(l[22103]);
                    if (file.t) {
                        $('.info-txt-fn', $dialog)
                            .safeHTML(l[22104].replace('{0}', '<strong>' + name + '</strong>'));

                        $('.red-header', $a1).text(l[22105]);
                        $('.light-grey', $a1).text(l[22110]);

                        $('.red-header', $a2).text(l[22111]);
                        $('.light-grey', $a2).text(l[22112]);
                    }
                    else {
                        $('.red-header', $a1).text(l[22105]);
                        $('.red-header', $a2).text(l[22106]);
                        $('.light-grey', $a1).text(l[22107]);
                        $('.light-grey', $a2).text(l[22108]);

                        $('.info-txt-fn', $dialog)
                            .safeHTML(l[22109].replace('{0}', '<strong>' + name + '</strong>'));

                    }
                    break;
                case 'copy':
                    if (file.t) {
                        $('.red-header', $a1).text(l[17551]);
                        $('.red-header', $a2).text(l[16500]);
                        $('.light-grey', $a1).text(l[17552]);
                        $('.light-grey', $a2).text(l[19598]);
                    }
                    else {
                        $('.red-header', $a1).text(l[16496]);
                        $('.red-header', $a2).text(l[16500]);
                        $('.red-header', $a3).text(l[17095]);
                        $('.light-grey', $a1).text(l[16498]);
                        $('.light-grey', $a2).text(l[16491]);
                        $('.light-grey', $a3).text(l[16515]);
                    }
                    break;
                case 'move':
                    if (file.t) {
                        $('.red-header', $a1).text(l[17553]);
                        $('.red-header', $a2).text(l[16499]);
                        $('.light-grey', $a1).text(l[17554]);
                        $('.light-grey', $a2).text(l[19598]);
                    }
                    else {
                        $('.red-header', $a1).text(l[16495]);
                        $('.red-header', $a2).text(l[16499]);
                        $('.red-header', $a3).text(l[17096]);
                        $('.light-grey', $a1).text(l[16497]);
                        $('.light-grey', $a2).text(l[16491]);
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
                        $('.light-grey', $a1).safeHTML(l[17097]);
                        $('.light-grey', $a2).text(l[16491]);
                        $('.light-grey', $a3).text(l[16493]);
                    }
                    break;
                case 'replace':
                    $('.red-header', $a1).text(l[16488]);
                    $('.red-header', $a2).text(l[16490]);
                    $('.red-header', $a3).text(l[17094]);
                    $('.light-grey', $a1).text(l[17602]);
                    $('.light-grey', $a2).text(l[16491]);
                    $('.light-grey', $a3).text(l[16493]);
                    break;
                case 'import':
                    $('.red-header', $a2).text(l[17559]);
                    $('.red-header', $a3).text(l[17560]);
                    if (file.t) {
                        $('.red-header', $a1).text(l.conflict_import_merge);
                        $('.light-grey', $a1).text(l.conflict_import_merge_note);
                        $('.light-grey', $a2).text(l[19598]);
                        $('.light-grey', $a3).text(l.conflict_import_rename_folder);
                        $a3.removeClass('hidden');
                    }
                    else {
                        $('.red-header', $a1).text(l[17558]);
                        $('.light-grey', $a3).text(l[17561]);
                        $('.light-grey', $a1).safeHTML(l[17097]);
                    }
                    break;
            }

            $('.file-name', $a1).text(name);
            if (file.t) {
                $('.file-size', $a1).text('');
                $('.file-size', $a2).text('');
                $('.file-size', $a3).text('');
                if (op === 'dups') {
                    $('.file-name', $a1).text(this.findNewName(file.name, target));
                    $('.file-name', $a2).text(name);
                    $('.file-date', $a1).text('');
                    $('.file-date', $a2).text('');
                    $('.file-date', $a3).text('');
                    if (dupsNB > 2 || M.currentrootid === 'shares') {
                        $a2.addClass('hidden');
                    }
                }
                else if (op === 'import') {
                    $('.file-name', $a3).text(this.findNewName(file.name, target));
                }
            }
            else {
                $('.file-size', $a1).text(bytesToSize(file.size || file.s || ''));
                $('.file-name', $a3).text(this.findNewName(file.name, target));
                $('.file-size', $a2).text(bytesToSize(node.size || node.s));
                $('.file-size', $a3).text(bytesToSize(file.size || file.s || ''));
                if (op === 'dups') {
                    $('.file-name', $a1).text(this.findNewName(file.name, target));
                    $('.file-name', $a2).text(name);
                    $('.file-name', $a3).text(name);
                    $('.file-size', $a2).text(mega.icu.format(l[22113], dupsNB - 1));
                    $('.file-date', $a1).text('');
                    $('.file-date', $a2).text('');
                    $('.file-date', $a3).text('');

                }
            }
            if (op !== 'dups') {
                var myTime = file.mtime || file.ts || (file.lastModified / 1000);
                $('.file-date', $a1).text(myTime ? time2date(myTime, is_mobile ? 0 : 2) : '');
                $('.file-date', $a3).text(myTime ? time2date(myTime, is_mobile ? 0 : 2) : '');
                $('.file-name', $a2).text(node.name);
                myTime = node.mtime || node.ts;
                $('.file-date', $a2).text(myTime ? time2date(myTime, 2) : '');
            }

            this.customNames($dialog);

            var done = function(file, name, action) {
                fileconflict.hideDialog();
                var checked = fileconflict.isChecked($dialog, action, ns.DONTCOPY);
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

            $('#versionhelp', $dialog).rebind('click.versionhelp', function() {
                window.open(this.href, '_blank');
                return false;
            });
            // $('.skip-button', $dialog).rebind('click', function() {
            //     done(null, 0, ns.DONTCOPY);
            // });
            this.getCloseButton($dialog).rebind('click', () => {
                done(-0xBADF);
            });

            $('#duplicates-checkbox', $dialog)
                .removeClass('checkboxOn').addClass('checkboxOff')
                .parent()
                .removeClass('checkboxOn').addClass('checkboxOff');

            let $node = $('aside', $dialog).addClass('hidden');

            if (remaining) {
                var remainingConflictText = remaining > 1 ?
                    escapeHTML(l[16494]).replace('%1', '<span>' + remaining + '</span>') :
                    l[23294];
                $node.removeClass('hidden');
                $('label', $node).safeHTML(remainingConflictText);
                this.customRemaining($dialog);
            }

            const content = $('.content', $dialog)[0];
            if (content) {
                $node = new PerfectScrollbar(content);
            }
            loadingDialog.phide();
            uiCheckboxes($dialog);
            this.showDialog($dialog);

            return promise;
        },

        /**
         * Get node from file conflict dialog.
         * @returns {Object} Dialog
         */
        getDialog: function() {
            return $('.mega-dialog.duplicate-conflict', document.body);
        },

        /**
         * Show dialog using M.safeShowDialog functionality.
         * @param {Object} $dialog Dialog
         * @returns {void}
         */
        showDialog: function($dialog) {
            M.safeShowDialog('fileconflict-dialog', $dialog);
        },

        /**
         * Hide dialog using M.safeShowDialog functionality.
         * @returns {void}
         */
        hideDialog: function() {
            closeDialog();
        },

        /**
         * Get close button from file conflict dialog.
         * @param {Object} $dialog Dialog
         * @returns {Object} Close button
         */
        getCloseButton: function($dialog) {
            return $('button.js-close, button.cancel-button', $dialog);
        },

        /**
         * Check if the multiple conflict resolution option is checked
         * @param {Object} $dialog Dialog
         * @returns {Boolean} True if is checked
         */
        isChecked: function($dialog) {
            return $('#duplicates-checkbox', $dialog).prop('checked');
        },

        customNames: function() {
            return nop;
        },

        customRemaining: function() {
            return nop;
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

            if (keepBothState[target]) {
                delete keepBothState[target]['~/.names.db'];
            }

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

            if (!matchSingle && M.c[target]) {
                if (!keepBothState[target]) {
                    keepBothState[target] = Object.create(null);
                }
                if (!keepBothState[target]['~/.names.db']) {
                    const store = keepBothState[target]['~/.names.db'] = Object.create(null);
                    const handles = Object.keys(M.c[target]);

                    for (let i = handles.length; i--;) {
                        let n = M.d[handles[i]];
                        if (n && n.name) {
                            store[n.name] = n;
                        }
                    }
                }
                return keepBothState[target]['~/.names.db'][name];
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
         * Find folder node by name.
         * @param {String} target The target to lookup at
         * @param {String} name The folder name to check against
         * @returns {Object} The found node
         */
        getFolderByName(target, name) {
            const t = M.c[target];

            if (t) {
                if (!keepBothState[target]) {
                    keepBothState[target] = Object.create(null);
                }
                if (!keepBothState[target]['~/.folders.db']) {
                    const store = keepBothState[target]['~/.folders.db'] = Object.create(null);

                    for (const h in t) {
                        if (t[h] > 1) {
                            const n = M.d[h];
                            if (n && n.name) {
                                store[n.name] = n;
                            }
                        }
                    }

                    queueMicrotask(() => {
                        if (keepBothState[target]) {
                            delete keepBothState[target]['~/.folders.db'];
                        }
                    });
                }
                return keepBothState[target]['~/.folders.db'][name];
            }

            return false;
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

            loadingDialog.pshow();

            var resolveDup = function(duplicateEntries, keys, kIndex, type, applyToAll) {
                if (kIndex >= keys.length) {
                    operationsOrderPromise.resolve();
                    loadingDialog.phide();
                    return;
                }

                var name = keys[kIndex];


                var contuineResolving = function(file, fname, action, checked) {

                    var olderNode = null;
                    var newestTS = -1;
                    var newestIndex = -1;
                    var pauseRecusrion = false;

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
                                M.rename(olderNode, newName).catch(dump);
                            }
                            else {
                                for (var h = 0; h < duplicateEntries[type][name].length; h++) {
                                    if (h === newestIndex) {
                                        continue;
                                    }
                                    newName = fileconflict.findNewName(name, target);
                                    M.rename(duplicateEntries[type][name][h], newName).catch(dump);
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
                                    M.moveToRubbish(olderNode).catch(dump);
                                }
                                else {
                                    var nodeToRemove = duplicateEntries[type][name];
                                    nodeToRemove.splice(newestIndex, 1);
                                    M.moveToRubbish(nodeToRemove).catch(dump);
                                }
                                // hide bar
                                $('.fm-notification-block.duplicated-items-found').removeClass('visible');
                            }
                            else {
                                // merge
                                if (olderNode) {
                                    // 2 items
                                    pauseRecusrion = true;

                                    var originalParent = M.d[olderNode].p;

                                    var f1 = M.getShareNodesSync(duplicateEntries[type][name][0]);
                                    var f2 = M.getShareNodesSync(duplicateEntries[type][name][1]);

                                    if ((f1 && f1.length) || (f2 && f2.length)) {
                                        loadingDialog.phide();
                                        msgDialog('warninga', 'Moving Error', l[17739], 'Error in Merging');
                                    }
                                    else {
                                        M.moveNodes([olderNode], M.RubbishID)
                                            .then(() => M.moveNodes([olderNode], originalParent, fileconflict.REPLACE))
                                            .then(() => {
                                                // no need to updateUI,
                                                // for optimization we will only hide the bar
                                                $('.fm-notification-block.duplicated-items-found')
                                                    .removeClass('visible');

                                                const ata = checked ? action : null;
                                                resolveDup(duplicateEntries, keys, ++kIndex, type, ata);
                                            })
                                            .catch(tell);
                                    }

                                }
                                else {
                                    // coming from apply to all
                                    for (var z = 0; z < duplicateEntries[type][name].length; z++) {
                                        if (z === newestIndex) {
                                            continue;
                                        }
                                        var newFolderName = fileconflict.findNewName(name, target);
                                        M.rename(duplicateEntries[type][name][z], newFolderName).catch(dump);
                                    }
                                }
                            }
                            break;
                    }

                    !pauseRecusrion && resolveDup(duplicateEntries, keys, ++kIndex, type, (checked) ? action : null);
                };

                if (applyToAll) {
                    contuineResolving(null, null, applyToAll, applyToAll);
                }
                else {
                    fileconflict.prompt('dups', M.d[duplicateEntries[type][name][0]],
                        M.d[duplicateEntries[type][name][1]], allDups - 1, target,
                        duplicateEntries[type][name].length).always(
                            contuineResolving
                        );
                }
            };

            resolveDup(dups, dupsKeys, 0, 'files');

            operationsOrderPromise.done(function() {
                dupsKeys = Object.keys(dups.folders);
                allDups = dupsKeys.length;

                loadingDialog.pshow();

                resolveDup(dups, dupsKeys, 0, 'folders');
            });

        },

        REPLACE: 1,
        DONTCOPY: 2,
        KEEPBOTH: 3
    };

    Object.defineProperty(global, 'fileconflict', {value: ns});

})(this);
