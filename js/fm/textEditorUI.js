
/**
 * UI Controller to handle operations on the UI of text Editor
 * */
mega.textEditorUI = new function TextEditorUI() {
    "use strict";
    var $myTextarea;

    var fileHandle;
    var versionHandle;
    var fileName;
    var savedFileData;

    var editor;
    var initialized = false;

    var $containerDialog;
    var $editorContianer;
    var $saveButton;


    /**
     * Check if the file content has been changed and show a message if so
     * @param {String} msg          Message to show if file content is changed
     * @param {String} submsg       sub-message to show if file content is changed
     * @param {Function} callback   callback function to be called if file is not changed or user ignored changes.
     * @returns {Void}              void
     */
    var validateAction = function(msg, submsg, callback) {
        if (!$saveButton.hasClass('disabled')) {
            msgDialog(
                'confirmation',
                '',
                msg,
                submsg,
                function(e) {
                    if (e) {
                        callback();
                    }
                    else {
                        editor.focus();
                    }
                }
            );
        }
        else {
            callback();
        }
    };


    var selectedItemOpen = function() {

        var openFile = function() {
            loadingDialog.show('common', l[23130]);
            var nodeHandle = $.selected && $.selected[0];
            if (!nodeHandle) {
                loadingDialog.hide();
                return;
            }

            mega.fileTextEditor.getFile(nodeHandle).done(
                function(data) {
                    loadingDialog.hide();
                    mega.textEditorUI.setupEditor(M.d[nodeHandle].name, data, nodeHandle);
                }
            ).fail(function() {
                loadingDialog.hide();
            });
        };

        validateAction(l[22750], l[22754], openFile);

    };

    var bindChangeListner = function() {

        var changeListner = function() {
            $saveButton.removeClass('disabled');
            editor.off('change', changeListner);
        };

        editor.on('change', changeListner);
    };

    var printText = function() {
        /* eslint-disable no-unsanitized/method */

        // Everything is sanitized.

        var mywindow = window.open('', escapeHTML(fileName), 'height=600,width=800');

        mywindow.document.write('<html><head><title>' + escapeHTML(fileName) + '</title>');
        mywindow.document.write('</head><body >');
        var textContent = mywindow.document.createElement('pre');
        textContent.textContent = editor.getValue();
        // eslint-disable-next-line no-restricted-properties
        mywindow.document.write(textContent.outerHTML);
        mywindow.document.write('</body></html>');

        mywindow.document.close();
        mywindow.focus();
        mywindow.print();
        mywindow.close();
        /* eslint-enable no-unsanitized/method */
        return true;
    };



    /** Init Controller
     *@returns {Void}       void
     */
    var init = function() {
        if (initialized) {
            return;
        }

        // there's no jquery parent for this container.
        // eslint-disable-next-line local-rules/jquery-scopes
        $containerDialog = $('.txt-editor-frame');
        $editorContianer = $('#mega-text-editor', $containerDialog);
        $saveButton = $('.buttons-holder .save-btn', $editorContianer);

        $('.editor-textarea-container', $editorContianer).resizable({
            handles: 'e',
            resize: function() {
                var cm = $('.editor-textarea-container .CodeMirror', $editorContianer)[0];
                if (cm) {
                    cm = cm.CodeMirror;
                    if (cm) {
                        cm.setSize();
                    }
                }
            }
        });

        /* eslint-disable sonarjs/no-duplicate-string */
        $('.txt-editor-menu', $editorContianer).rebind(
            'click.txt-editor',
            function textEditorMenuOpen() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                // eslint-disable-next-line local-rules/jquery-replacements
                $('.top-menu-popup-editor', $editorContianer).removeClass('hidden').show();
                return false;
            }
        );

        $editorContianer.rebind(
            'click.txt-editor',
            function textEditorGlobalClick() {
                // eslint-disable-next-line local-rules/jquery-replacements
                $('.top-menu-popup-editor', $editorContianer).addClass('hidden').hide();
                return false;
            }
        );

        $('.buttons-holder .close-btn, .editor-btn-container .close-f', $editorContianer).rebind(
            'click.txt-editor',
            function textEditorCloseBtnClick() {

                if (editor) {
                    validateAction(
                        l[22750],
                        l[22751],
                        function() {
                            history.back();
                            mega.textEditorUI.doClose();
                        }
                    );
                }
                else {
                    history.back();
                    mega.textEditorUI.doClose();
                }
                return false;
            }
        );

        $saveButton.rebind(
            'click.txt-editor',
            function textEditorSaveBtnClick() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                if (editor) {
                    $saveButton.addClass('disabled');

                    loadingDialog.show('common', l[23131]);

                    mega.fileTextEditor.setFile(versionHandle || fileHandle, editor.getValue()).done(function(fh) {
                        if (versionHandle) {
                            mega.fileTextEditor.removeOldVersion(versionHandle);
                        }
                        else if (M.d[fileHandle] && M.d[fileHandle].s === 0) {
                            mega.fileTextEditor.removeOldVersion(fileHandle);
                            fileHandle = fh;
                            fh = '';
                        }
                        versionHandle = fh;
                        savedFileData = editor.getValue();

                        bindChangeListner();

                        loadingDialog.hide();
                    });
                }
            }
        );

        $('.editor-btn-container .open-f', $editorContianer).rebind(
            'click.txt-editor',
            function openFileClick() {
                M.initFileAndFolderSelectDialog('openFile', selectedItemOpen);
            }
        );

        $('.editor-btn-container .save-f', $editorContianer).rebind(
            'click.txt-editor',
            function saveFileMenuClick() {
                $saveButton.trigger('click');
            }
        );

        $('.editor-btn-container .new-f', $editorContianer).rebind(
            'click.txt-editor',
            function newFileMenuClick() {
                validateAction(
                    l[22750],
                    l[22752],
                    function() {
                        // loadingDialog.show();
                        openSaveAsDialog(
                            { name: 'New file.txt' },
                            '',
                            function(handle) {
                                loadingDialog.hide();
                                mega.textEditorUI.setupEditor(M.d[handle].name, '', handle);
                            }
                        );
                    }
                );
            }
        );

        $('.editor-btn-container .save-as-f', $editorContianer).rebind(
            'click.txt-editor',
            function saveAsMenuClick() {
                // loadingDialog.show();
                var editedTxt = editor.getValue();
                if (editedTxt === savedFileData) {
                    editedTxt = null;
                }
                openSaveAsDialog(
                    versionHandle || fileHandle,
                    editedTxt,
                    function(handle) {
                        loadingDialog.hide();
                        mega.textEditorUI.setupEditor(M.d[handle].name, editedTxt || savedFileData, handle);
                    }
                );
            }
        );

        $('.editor-btn-container .get-link-f', $editorContianer).rebind(
            'click.txt-editor',
            function getLinkFileMenuClick() {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(versionHandle || fileHandle);

                // there's no jquery parent for this container.
                // eslint-disable-next-line local-rules/jquery-scopes
                $('.dropdown.body.context .dropdown-item.getlink-item').trigger('click');
            }
        );

        $('.editor-btn-container .send-contact-f', $editorContianer).rebind(
            'click.txt-editor',
            function sendToContactMenuClick() {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(versionHandle || fileHandle);

                // there's no jquery parent for this container.
                // eslint-disable-next-line local-rules/jquery-scopes
                $('.dropdown.body.context .dropdown-item.send-to-contact-item').trigger('click');
            }
        );

        $('.editor-btn-container .print-f', $editorContianer).rebind('click.txt-editor', printText);

        $('.editor-btn-container .txt-editor-download-btn', $editorContianer).rebind(
            'click.txt-editor',
            function downloadBtnClicked() {
                validateAction(
                    l[22750],
                    l[22753],
                    function() {
                        M.saveAs(savedFileData, fileName);
                    }
                );
            }
        );

        var hotkey = 'ctrlKey';
        if (ua.details.os === 'Apple') {
            $('.open-f .menu-item-shortcut', $editorContianer).text(' ');
            $('.close-f .menu-item-shortcut', $editorContianer).text(' ');
            $('.save-f .menu-item-shortcut', $editorContianer).text('\u2318 S');
            $('.save-as-f .menu-item-shortcut', $editorContianer).text('\u21E7\u2318 S');
            $('.print-f .menu-item-shortcut', $editorContianer).text('\u2318 P');
            hotkey = 'metaKey';
        }

        $editorContianer.rebind(
            'keydown.txt-editor',
            function keydownHandler(event) {
                if (event[hotkey]) {
                    switch (event.code) {
                        case 'KeyS':
                            if (event.shiftKey) {
                                $('.editor-btn-container .save-as-f', $editorContianer).trigger('click');
                            }
                            else {
                                $saveButton.trigger('click');
                            }
                            return false;
                        case 'KeyO':
                            if (event.shiftKey) {
                                return true;
                            }
                            $('.editor-btn-container .open-f', $editorContianer).trigger('click');
                            return false;
                        case 'KeyQ':
                            if (event.shiftKey) {
                                return true;
                            }
                            $('.editor-btn-container .close-f', $editorContianer).trigger('click');
                            return false;
                        case 'KeyP':
                            if (event.shiftKey) {
                                return true;
                            }
                            $('.editor-btn-container .print-f', $editorContianer).trigger('click');
                            return false;
                    }
                }
                return true;
            }
        );

        initialized = true;
        /* eslint-enable sonarjs/no-duplicate-string */
    };

    this.doClose = function() {
        // eslint-disable-next-line no-unused-expressions
        editor && editor.setValue('');
        if ($containerDialog) {
            $containerDialog.addClass('hidden');
            window.textEditorVisible = false;
        }
    };

    /**
     * Setup and init Text editor.
     * @param {String} fName        File name
     * @param {String} txt          File textual content
     * @param {String} handle       Node handle
     * @param {Boolean} isReadonly  Flag to open Editor in read-only mode
     * @returns {Void}              void
     */
    this.setupEditor = function(fName, txt, handle, isReadonly) {
        M.require('codemirror_js', 'codemirrorscroll_js').done(function() {
            init();
            pushHistoryState();
            $containerDialog.removeClass('hidden');
            window.textEditorVisible = true;
            $myTextarea = $('#txtar', $editorContianer);
            if (!editor) {
                editor = CodeMirror.fromTextArea($myTextarea[0], {
                    lineNumbers: true,
                    scrollbarStyle: "overlay",
                    autofocus: true,
                    lineWrapping: true
                });
            }
            // Without parentheses && will be applied first,
            // I want JS to start from left and go in with first match
            // eslint-disable-next-line no-extra-parens
            if (isReadonly || folderlink || (M.currentrootid === 'shares' && M.getNodeRights(handle) < 1)) {
                editor.options.readOnly = true;
                $('.txt-editor-menu', $editorContianer).addClass('disabled');
                $('.txt-editor-btn.save-btn', $editorContianer).addClass('hidden');
            }
            else {
                editor.options.readOnly = false;
                $('.txt-editor-menu', $editorContianer).removeClass('disabled');
                $('.txt-editor-btn.save-btn', $editorContianer).removeClass('hidden');
            }

            if (editor) {
                savedFileData = txt;
                editor.setValue(txt);
                bindChangeListner();
            }
            $saveButton.addClass('disabled');

            $('.txt-editor-opened-f-name', $editorContianer).text(fName);
            // eslint-disable-next-line local-rules/jquery-replacements
            $('.top-menu-popup-editor', $editorContianer).addClass('hidden').hide();

            if (Array.isArray(handle)) {
                handle = handle[0];
            }
            editor.focus();

            fileHandle = handle;
            versionHandle = '';
            fileName = fName;
            api_req({ a: 'log', e: 99807, m: 'File Text Editor opened' });
        });
    };

};
