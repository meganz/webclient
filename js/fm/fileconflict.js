(function _fileconflict(global) {

    var ns = {
        /**
         * Check files against conflicts
         * @param {Array} files An array of files to check for conflicts
         * @param {String} target The target node handle
         * @param {String} op Operation, one of copy, move, or upload
         * @returns {MegaPromise} Resolves with a non-conflicting array
         * @memberof fileconflict
         */
        check: function(files, target, op) {
            var promise = new MegaPromise();
            var conflicts = [];
            var result = [];

            for (var i = files.length; i--;) {
                var file = files[i];

                if (typeof file === 'string') {
                    file = clone(M.d[file] || false);
                }

                try {
                    // this could throw NS_ERROR_FILE_NOT_FOUND
                    var test = file.size;
                }
                catch (ex) {
                    ulmanager.logger.warn(file.name, ex);
                    continue;
                }

                if (M.c[target] && !file.path) {
                    var found = this.getNodeByName(target, fm_safename(file.name), true);

                    if (found) {
                        conflicts.push([file, found]);
                        continue;
                    }
                }

                result.push(file);
            }

            var resolve = function() {
                result.fileConflictChecked = true;
                promise.resolve(result);
            };

            if (conflicts.length) {
                var repeat;
                var self = this;
                var save = function(file, name, action, node) {
                    if (file) {
                        try {
                            Object.defineProperty(file, 'name', {value: fm_safename(name)});
                        }
                        catch (e) {
                        }

                        result.push(file);

                        if (action === 1) {
                            file._replaces = node.h;
                        }
                    }
                };

                (function _prompt(a) {
                    var file = a.pop();

                    if (file) {
                        var node = file[1];
                        file = file[0];

                        if (repeat) {
                            var name = file.name;

                            switch (repeat) {
                                case 2:
                                    break;
                                case 3:
                                    name = self.findNewName(name, target);
                                /* fallthrough */
                                case 1:
                                    save(file, name, repeat, node);
                                    break;
                            }
                            _prompt(a);
                        }
                        else {
                            self.prompt(op, file, node, a.length, target)
                                .always(function(file, name, action, checked) {
                                    if (file === -0xBADF) {
                                        result = [];
                                        resolve();
                                    }
                                    else {
                                        if (checked) {
                                            repeat = action;
                                        }
                                        save(file, name, action, node);

                                        _prompt(a);
                                    }
                                });
                        }
                    }
                    else {
                        resolve();
                    }

                })(conflicts);
            }
            else {
                resolve();
            }

            return promise;
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
            var name = fm_safename(file.name);

            $('.info-txt-fn', $dialog).safeHTML(escapeHTML(l[16486]).replace('%1', '<strong>' + name + '</strong>'));

            var $a1 = $('.action-block.a1', $dialog);
            var $a2 = $('.action-block.a2', $dialog);
            var $a3 = $('.action-block.a3', $dialog);

            switch (op) {
                case 'copy':
                    $('.red-header', $a1).text(l[16496]);
                    $('.red-header', $a2).text(l[16500]);
                    $('.light-grey', $a1).text(l[16498]);
                    $('.light-grey', $a3).text(l[16515]);
                    break;
                case 'move':
                    $('.red-header', $a1).text(l[16495]);
                    $('.red-header', $a2).text(l[16499]);
                    $('.light-grey', $a1).text(l[16497]);
                    $('.light-grey', $a3).text(l[16514]);
                    break;
                case 'upload':
                    $('.red-header', $a1).text(l[16488]);
                    $('.red-header', $a2).text(l[16490]);
                    $('.light-grey', $a1).text(l[16489]);
                    $('.light-grey', $a3).text(l[16493]);
                    break;
            }

            $('.file-name', $a1).text(name);
            $('.file-size', $a1).text(bytesToSize(file.size || file.s));
            $('.file-date', $a1).text(time2date(file.mtime || file.ts || (file.lastModified / 1000), 2));

            $('.file-name', $a2).text(node.name);
            $('.file-size', $a2).text(bytesToSize(node.size || node.s));
            $('.file-date', $a2).text(time2date(node.mtime || node.ts, 2));

            $('.file-name', $a3).text(this.findNewName(file.name, target));

            var done = function(file, name, action) {
                fm_hideoverlay();
                $dialog.addClass('hidden');
                promise.resolve(file, name, action, $('#duplicates-checkbox').attr('checked'));
            };

            $a1.rebind('click', function() {
                done(file, $('.file-name', this).text(), 1);
            });
            $a2.rebind('click', function() {
                done(null, 0, 2);
            });
            $a3.rebind('click', function() {
                done(file, $('.file-name', this).text(), 3);
            });

            $('.skip-button', $dialog).rebind('click', function() {
                done(null, 0, 2);
            });
            $('.cancel-button', $dialog).rebind('click', function() {
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
            $dialog.removeClass('hidden');
            fm_showoverlay();

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
            } while (this.getNodeByName(target, newName));

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

            for (var h in M.c[target]) {
                var n = M.d[h];

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
        }
    };

    Object.defineProperty(global, 'fileconflict', {value: ns});
    ns = undefined;

})(this);
