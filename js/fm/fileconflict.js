(function _fileconflict(global) {
    'use strict';

    var keepBothState = Object.create(null);
    var saveKeepBothState = function(target, node, name) {
        if (!keepBothState[target]) {
            keepBothState[target] = Object.create(null);
        }
        keepBothState[target][name] = node;
    };
    var usedNames = Object.create(null);

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
        check: function (files, target, op, defaultAction, defaultActionFolders) {
            var noFileConflicts = !!localStorage.noFileConflicts;
            var promise = new MegaPromise();
            var conflicts = [];
            var result = [];
            var merges = [];
            usedNames = Object.create(null);
            var foldersRepeatAction = null;
            var mySelf = this;
            var breakOP = false;

            var setName = function(file, name) {
                try {
                    Object.defineProperty(file, 'name', {
                        writable: true,
                        configurable: true,
                        value: M.getSafeName(name)
                    });
                }
                catch (e) {}
            };

            // this is special if for copying from chat
            // 1- must be 1 item
            // 2- must be to 1 target.
            // --> no need to consider in all logical space of file/folder conflicts
            if (M.d[target] && M.d[target].name === 'My chat files') {
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

                if (M.c[nodeTarget] && !file.t) {
                    found = this.getNodeByName(nodeTarget, nodeName, false);
                }
                else if (M.c[nodeTarget] && file.t && file.t === 1) {
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
                    result.push(file);
                }
            }

            var resolve = function() {
                keepBothState = Object.create(null);
                result.fileConflictChecked = true;
                promise.resolve(result);
            };

            if (conflicts.length) {
                var repeat;
                var self = this;
                var save = function(file, name, action, node) {
                    var stop = false;
                    if (file) {
                        setName(file, name);
                        var isAddNode = true;

                        if (action === ns.REPLACE) {
                            if (!file.t) {
                                file._replaces = node.h;
                            }
                            else if (file.t && file.t === 1) {
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
                    saveKeepBothState(target, node, name);
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

                            var currRepeat = (file.t && file.t === 1) ? foldersRepeatAction : repeat;

                            if (currRepeat && currRepeat !== null) {
                                var name = file.name;

                                switch (currRepeat) {
                                    case ns.DONTCOPY:
                                        break;
                                    case ns.KEEPBOTH:
                                        name = self.findNewName(name, (node.p) ? node.p : target);
                                    /* fallthrough */
                                    case ns.REPLACE:
                                        save(file, name, currRepeat, node);
                                        break;
                                }
                                promptRecursion(a);
                            }
                            else {
                                self.prompt(op, file, node, a.length, (node.p) ? node.p : target)
                                    .always(function (file, name, action, checked) {
                                        if (file === -0xBADF) {
                                            result = [];
                                            resolve();
                                        }
                                        else {
                                            if (checked) {
                                                if (file.t && file.t === 1) {
                                                    foldersRepeatAction = action;
                                                }
                                                else {
                                                    repeat = action;
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
                            conflictedNodes = conflictedNodes.concat(res.confilicts);
                            okNodes = okNodes.concat(res.okNodes);
                        }
                        result = result.concat(okNodes);
                        foldersRepeatAction = ns.REPLACE; // per specifications, merge all internal folders
                        applyCheck(conflictedNodes).always(function _endingRecursion() {
                            resolve();
                        });

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
            var noConflicts = localStorage.noFileConflicts ? localStorage.noFileConflicts : false;
            var setName = function (node, name) {
                try {
                    Object.defineProperty(node, 'name', {
                        writable: true,
                        configurable: true,
                        value: name
                    });
                }
                catch (e) { }
            };
            if (!nodesToCopy || nodesToCopy.length === 0) {
                return [];
            }
            if (!target || target === null) {
                return [];
            }
            if (!Array.isArray(nodesToCopy)) {
                nodesToCopy = Object.keys(nodesToCopy);
            }
            var conflictedNodes = [];
            var okNodes = [];
            var folderFound = false;
            for (var k = 0; k < nodesToCopy.length; k++) {
                var currNode = nodesToCopy[k];

                if (typeof currNode === 'string') {
                    currNode = clone(M.d[currNode] || false);
                }
                if (!currNode) {
                    console.warn('Got invalid node (file|folder)...');
                    continue;
                }
                var isFile = !currNode.t;
                var isFolder = (!isFile && currNode.t === 1);
                if (isFile) {
                    try {
                        // this could throw NS_ERROR_FILE_NOT_FOUND
                        var test = currNode.size;
                    }
                    catch (ex) {
                        ulmanager.logger.warn(currNode.name, ex);
                        continue;
                    }
                }
                var found = null;

                var nodeTarget = currNode.target || target;
                var nodeName = M.getSafeName(currNode.name);
                if (M.c[nodeTarget]) {
                    if (isFile) {
                        found = this.getNodeByName(nodeTarget, nodeName, false);
                    }
                    else if (isFolder) {
                        found = this.getNodeByName(nodeTarget, nodeName, false);
                    }
                    else {
                        console.warn('Got not (file|folder) node, type=' + currNode.t);
                        continue;
                    }
                }
                currNode.keepParent = nodeTarget;
                if (!found || found === null) {
                    found = this.locateFileInUploadQueue(nodeTarget, nodeName);
                }
                if (found && !noConflicts) {
                    if (!folderFound && isFolder) {
                        folderFound = true;
                    }
                    conflictedNodes.push([currNode, found]);
                }
                else {
                    setName(currNode, nodeName);
                    okNodes.push(currNode);
                }
            }
            if (!folderFound) {
                return {
                    confilicts: conflictedNodes,
                    okNodes: okNodes
                };
            }
            else {
                var newConflictedNodes = [];
                var newOkNodes = [];
                for (var k2 = 0; k2 < conflictedNodes.length; k2++) {
                    if (conflictedNodes[k2][0].t) { // array contains either files or folders only
                        var res = this.filesFolderConfilicts(M.c[conflictedNodes[k2][0].h], conflictedNodes[k2][1].h);
                        newConflictedNodes = newConflictedNodes.concat(res.confilicts);
                        newOkNodes = newOkNodes.concat(res.okNodes);
                    }
                }
                return {
                    confilicts: conflictedNodes.concat(newConflictedNodes),
                    okNodes: okNodes.concat(newOkNodes)
                };
            }
        },

        /**
         * Prompt duplicates/fileconflict dialog.
         * @param {String} op Operation, one of copy, move, or upload
         * @param {Object} file The source file
         * @param {Object} node The existing node
         * @param {Number} remaining The remaining conflicts
         * @returns {MegaPromise}
         */
        prompt: function(op, file, node, remaining, target) {
            var promise = new MegaPromise();
            var $dialog = $('.fm-dialog.duplicate-conflict');
            var name = M.getSafeName(file.name);
            var $a1 = $('.action-block.a1', $dialog);
            var $a2 = $('.action-block.a2', $dialog);
            var $a3 = $('.action-block.a3', $dialog);
            var icons = $('.export-icon', $dialog);
            var classes = icons.attr('class').split(' ');
            icons.removeClass(classes[classes.length - 1]); // remove last class
            var fIcon;
            if (!file.t) {
                $a3.removeClass('hidden');
                $('.info-txt-fn', $dialog).safeHTML(escapeHTML(l[16486]).replace('%1', '<strong>' + name
                    + '</strong>'));
                $('.info-txt.light-grey', $dialog).text(l[16487]);
                fIcon = fileIcon(node);
            }
            else if (file.t && file.t === 1) {
                $a3.addClass('hidden');
                $('.info-txt-fn', $dialog).safeHTML(escapeHTML(l[17550]).replace('%1', '<strong>' + name
                    + '</strong>'));
                $('.info-txt.light-grey', $dialog).text(l[17556]);
                fIcon = 'folderConflict';
            }
            icons.addClass(fIcon);

            switch (op) {
                case 'copy':
                    if (!file.t) {
                        $('.red-header', $a1).text(l[16496]);
                        $('.red-header', $a2).text(l[16500]);
                        $('.red-header', $a3).text(l[17095]);
                        $('.light-grey', $a1).text(l[16498]);
                        $('.light-grey', $a3).text(l[16515]);
                    }
                    else if (file.t && file.t === 1) {
                        $('.red-header', $a1).text(l[17551]);
                        $('.red-header', $a2).text(l[16500]);
                        $('.light-grey', $a1).text(l[17552]);
                    }
                    break;
                case 'move':
                    if (!file.t) {
                        $('.red-header', $a1).text(l[16495]);
                        $('.red-header', $a2).text(l[16499]);
                        $('.red-header', $a3).text(l[17096]);
                        $('.light-grey', $a1).text(l[16497]);
                        $('.light-grey', $a3).text(l[16514]);
                    }
                    else {
                        $('.red-header', $a1).text(l[17553]);
                        $('.red-header', $a2).text(l[16499]);
                        $('.light-grey', $a1).text(l[17554]);
                    }
                    break;
                case 'upload':
                    if (!file.t) {
                        $('.red-header', $a1).text(l[17093]);
                        $('.red-header', $a2).text(l[16490]);
                        $('.red-header', $a3).text(l[17094]);

                        var link = 'https://mega.nz/help/client/webclient/cloud-drive/59f13b42f1b7093a7f8b4589';
                        var linkHtml = l[17097];
                        if (linkHtml.indexOf('<') < 0 || linkHtml.indexOf('>') < 0) { // html embed
                            linkHtml = escapeHTML(l[17097])
                                .replace(
                                '[A]', '<a id = "versionhelp"\n' +
                                'href="' + link + '" target="_blank" class="red">')
                                .replace('[/A]', '</a>');
                        }
                        $('.light-grey', $a1).html(linkHtml);
                        $('.light-grey', $a3).text(l[16493]);
                    }
                    else {
                        $('.red-header', $a1).text(l[17555]);
                        $('.red-header', $a2).text(l[16490]);
                        $('.light-grey', $a2).text('Skip this folder:');
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
                    $('.light-grey', $a1).html(l[17097]);
                    $('.light-grey', $a3).text(l[17561]);
                    break;
            }

            $('.file-name', $a1).text(name);
            if (!file.t) {
                $('.file-size', $a1).text(bytesToSize(file.size || file.s || ''));
                $('.file-name', $a3).text(this.findNewName(file.name, target));
                $('.file-size', $a2).text(bytesToSize(node.size || node.s));
            }
            else {
                $('.file-size', $a1).text('');
                $('.file-size', $a2).text('');
            }
            var myTime = file.mtime || file.ts || (file.lastModified / 1000);
            $('.file-date', $a1).text(myTime ? time2date(myTime, 2) : '');
            $('.file-name', $a2).text(node.name);
            myTime = node.mtime || node.ts;
            $('.file-date', $a2).text(myTime ? time2date(myTime, 2) : '');

            var done = function(file, name, action) {
                closeDialog();
                promise.resolve(file, name, action, $('#duplicates-checkbox').attr('checked'));
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
                ev.stopPropagation();
                ev.preventDefault();
                window.open(this.href, '_blank');
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
            } while (this.getNodeByName(target, newName) || this.locateFileInUploadQueue(target, newName)
                || (usedNames[target] && usedNames[target].indexOf(newName) > -1));
            if (usedNames[target]) {
                usedNames[target].push(newName);
            }
            else {
                usedNames[target] = [newName];
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
            for (var i = 0; i < ul_queue.length; i++) {
                var q = ul_queue[i] || false;

                if (q.target === target && q.name === name) {
                    return q;
                }
            }
        },

        REPLACE: 1,
        DONTCOPY: 2,
        KEEPBOTH: 3
    };

    Object.defineProperty(global, 'fileconflict', {value: ns});

})(this);
