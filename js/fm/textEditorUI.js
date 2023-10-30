
/**
 * UI Controller to handle operations on the UI of text Editor
 * */
mega.textEditorUI = new function TextEditorUI() {
    "use strict";
    var $editorTextarea;

    var fileHandle;
    var versionHandle;
    var fileName;
    var savedFileData;

    var editor;
    var initialized = false;

    var $containerDialog;
    var $editorContainer;
    var $menuBar;
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


    var selectedItemOpen = function(selected) {

        var openFile = function() {
            loadingDialog.show('common', l[23130]);
            var nodeHandle = ($.selected && $.selected[0]) || (selected && selected[0]);
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

    const bindEventsListner = function() {

        var changeListner = function() {
            $saveButton.removeClass('disabled');
            editor.off('change', changeListner);
        };

        editor.on('change', changeListner);

        $(window).rebind('keydown.texteditor', (e) => {
            if (e.code === 'Escape') {
                // IE not supported.
                confirmSaveOrExit();
            }
        });
    };

    var doClose = () => {
        $saveButton.addClass('disabled');
        $(window).off('keydown.texteditor');
        history.back();
        mega.textEditorUI.doClose();
    };

    var confirmSaveOrExit = () => {
        if ($saveButton.hasClass('disabled')) {
            doClose();
        }
        else {
            msgDialog(
                'save_discard_cancel',
                '',
                l.msg_dlg_modified_title,
                l.msg_dlg_modified_text,
                (e) => {
                    if (e === 1) {
                        $saveButton.trigger('click', doClose);
                    }
                    else if (e === 0) {
                        editor.focus();
                    }
                    else if (e === -1) {
                        doClose();
                    }
                }
            );
        }
    };

    var printText = function() {
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
        return true;
    };

    /** Init Controller
     * @param {jQuery} $viewerContainer  just use the plain text content block, aka viewer-mode
     *@returns {Void}       void
     */
    var init = function(txt, $viewerContainer) {
        $containerDialog = $viewerContainer || $('.text-editor-container', 'body');
        $editorContainer = $('.text-editor', $containerDialog.removeClass('hidden'));

        $editorTextarea = $('.content .txtar', $editorContainer);
        window.textEditorVisible = true;

        if (!editor) {
            editor = CodeMirror.fromTextArea($editorTextarea[0], {
                lineNumbers: !is_mobile,
                scrollbarStyle: "overlay",
                autofocus: true,
                lineWrapping: true,
                readOnly: typeof $viewerContainer !== 'undefined'
            });
        }

        savedFileData = txt;
        editor.setValue(txt);

        if (initialized) {
            // Nothing else to do.
            return;
        }
        initialized = true;

        $editorContainer.resizable({
            handles: 'e',
            resize: function() {
                if (editor) {
                    editor.setSize();
                }
            }
        });

        if ($viewerContainer) {
            // No more business here.
            return;
        }

        $menuBar = $('.text-editor-bars', $editorContainer);
        $saveButton = $('.save-btn', $editorContainer);

        const fileMenu = contextMenu.create({
            template: $('#text-editor-file-menu', $containerDialog)[0],
            sibling: $('.file-btn', $containerDialog)[0],
            animationDuration: 150,
            boundingElement: $containerDialog[0]
        });

        const formatMenu = contextMenu.create({
            template: $('#text-editor-format-menu', $containerDialog)[0],
            sibling: $('.format-btn', $containerDialog)[0],
            animationDuration: 150,
            boundingElement: $containerDialog[0]
        });

        const $saveAsBtn = $('.file-menu .save-as-f', $editorContainer);

        $('.file-btn', $menuBar).rebind(
            'click.txt-editor',
            function textEditorMenuOpen() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                contextMenu.toggle(fileMenu);
                return false;
            }
        );

        $('.format-btn', $menuBar).rebind(
            'click.txt-editor',
            function textEditorMenuOpen() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                contextMenu.toggle(formatMenu);
                return false;
            }
        );

        $editorContainer.rebind(
            'mouseup.txt-editor',
            function textEditorGlobalClick() {
                contextMenu.close(fileMenu);
                contextMenu.close(formatMenu);
                return false;
            }
        );

        $('header .close-btn, .file-menu .close-f', $editorContainer).rebind(
            'click.txt-editor',
            function textEditorCloseBtnClick() {

                if (editor) {
                    confirmSaveOrExit();
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
            function textEditorSaveBtnClick(e, cb) {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                if (editor) {
                    $saveButton.addClass('disabled');

                    const rights = M.getNodeRights(fileHandle);
                    if (rights < 1) {
                        $saveAsBtn.trigger('click');
                        $saveButton.removeClass('disabled');
                        return false;
                    }

                    loadingDialog.show('common', l[23131]);

                    const getSavedFile = function(fh) {
                        if (versionHandle) {
                            mega.fileTextEditor.removeOldVersion(versionHandle);
                            versionHandle = fh;
                        }
                        else if (M.d[fileHandle] && M.d[fileHandle].s === 0) {
                            mega.fileTextEditor.removeOldVersion(fileHandle);
                            fileHandle = fh;
                            versionHandle = '';
                        }
                        else {
                            versionHandle = fh;
                        }

                        savedFileData = editor.getValue();

                        bindEventsListner();

                        if (fh) {
                            selectionManager.resetTo(fh, true);
                            fileName = M.d[fh].name;
                            $('.text-editor-file-name span', $editorContainer).text(fileName);
                        }

                        if (M.currentrootid !== M.RubbishID) {
                            mega.ui.searchbar.recentlyOpened.files.delete(fileHandle);
                            mega.ui.searchbar.recentlyOpened.addFile(fh, true);
                        }

                        loadingDialog.hide();
                        if (cb && typeof cb === 'function') {
                            cb();
                        }
                    };

                    if (rights === 1 && M.getNodeRoot(fileHandle) === 'shares') {
                        const name = fileconflict.findNewName(M.getSafeName(M.d[fileHandle].name), M.d[fileHandle].p);
                        const val = editor.getValue();
                        (
                            val
                                ? mega.fileTextEditor.saveFileAs(name, M.d[fileHandle].p, val)
                                : M.addNewFile(name, M.d[fileHandle].p)
                        )
                            .then(getSavedFile)
                            .catch(tell)
                            .finally(() => {
                                loadingDialog.hide();
                            });
                        return;
                    }

                    M.getStorageQuota().then(data => {
                        if (data.isFull) {
                            loadingDialog.hide('common');
                            ulmanager.ulShowOverStorageQuotaDialog();
                            return false;
                        }
                        mega.fileTextEditor.setFile(versionHandle || fileHandle, editor.getValue())
                            .done(getSavedFile);
                    });
                }
            }
        );

        $('.file-menu .open-f', $menuBar).rebind(
            'click.txt-editor',
            function openFileClick() {
                M.initFileAndFolderSelectDialog('openFile', selectedItemOpen);
            }
        );

        $('.file-menu .save-f', $menuBar).rebind(
            'click.txt-editor',
            function saveFileMenuClick() {
                $saveButton.trigger('click');
            }
        );

        $('.file-menu .new-f', $menuBar).rebind(
            'click.txt-editor',
            function newFileMenuClick() {
                validateAction(
                    l[22750],
                    l[22752],
                    () => {
                        // loadingDialog.show();
                        openSaveAsDialog(
                            {name: 'New file.txt'},
                            '',
                            (handle) => {
                                M.getStorageQuota().then(data => {
                                    loadingDialog.hide();
                                    if (data.isFull) {
                                        ulmanager.ulShowOverStorageQuotaDialog();
                                        return false;
                                    }

                                    mega.textEditorUI.setupEditor(M.d[handle].name, '', handle);
                                });
                            }
                        );
                    }
                );
            }
        );

        $saveAsBtn.rebind(
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
                    (handle) => {
                        M.getStorageQuota().then(data => {
                            loadingDialog.hide();
                            if (data.isFull) {
                                ulmanager.ulShowOverStorageQuotaDialog();
                                return false;
                            }

                            mega.textEditorUI.setupEditor(M.d[handle].name, editedTxt || savedFileData, handle);
                        });
                    }
                );
            }
        );

        $('.file-menu .get-link-f', $menuBar).rebind(
            'click.txt-editor',
            function getLinkFileMenuClick() {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(versionHandle || fileHandle);
                $('.dropdown.body.context .dropdown-item.getlink-item').trigger('click');
            }
        );

        $('.file-menu .send-contact-f', $menuBar).rebind(
            'click.txt-editor',
            function sendToContactMenuClick() {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(versionHandle || fileHandle);
                $('.dropdown.body.context .dropdown-item.send-to-contact-item').trigger('click');
            }
        );

        $('.file-menu .print-f', $menuBar).rebind('click.txt-editor', printText);

        $('.format-menu .wrap-text', $editorContainer).rebind(
            'click.txt-editor',
            function wrapTextMenuClick() {
                const $tick = $('.icon-check', $(this));
                if ($tick.hasClass('hidden')) {
                    $tick.removeClass('hidden');
                    if (editor) {
                        editor.setOption('lineWrapping', true);
                    }
                }
                else {
                    $tick.addClass('hidden');
                    if (editor) {
                        editor.setOption('lineWrapping', false);
                    }
                }
            }
        );

        $('footer .download-btn', $editorContainer).rebind(
            'click.txt-editor',
            function downloadBtnClicked() {
                validateAction(
                    l[22750],
                    l[22753],
                    () => {
                        M.saveAs(savedFileData, fileName);
                    }
                );
            }
        );

        var hotkey = 'ctrlKey';
        if (ua.details.os === 'Apple') {
            $('button.open-f .shortcut', $editorContainer).text(' ');
            $('button.close-f .shortcut', $editorContainer).text(' ');
            $('button.save-f .shortcut', $editorContainer).text('\u2318 S');
            $('button.save-as-f .shortcut', $editorContainer).text('\u21E7\u2318 S');
            $('button.print-f .shortcut', $editorContainer).text('\u2318 P');
            hotkey = 'metaKey';
        }

        $editorContainer.rebind(
            'keydown.txt-editor',
            function keydownHandler(event) {
                if (event[hotkey]) {
                    switch (event.code) {
                        case 'KeyS':
                            if (event.shiftKey) {
                                $saveAsBtn.trigger('click');
                            }
                            else {
                                $saveButton.trigger('click');
                            }
                            return false;
                        case 'KeyO':
                            if (event.shiftKey) {
                                return true;
                            }
                            $('.context-menu .open-f', $editorContainer).trigger('click');
                            return false;
                        case 'KeyQ':
                            if (event.shiftKey) {
                                return true;
                            }
                            $('.context-menu .close-f', $editorContainer).trigger('click');
                            return false;
                        case 'KeyP':
                            if (event.shiftKey) {
                                return true;
                            }
                            $('.context-menu .print-f', $editorContainer).trigger('click');
                            return false;
                    }
                }
                return true;
            }
        );
    };

    this.doClose = function() {
        if (editor) {
            editor.setValue('');
        }
        if ($containerDialog) {
            $containerDialog.addClass('hidden');
            window.textEditorVisible = false;
            mBroadcaster.sendMessage('textEditor:close');
        }
        mBroadcaster.sendMessage('text-editor:close');
    };

    /**
     * Setup and init Text editor.
     * @param {String} fName        File name
     * @param {String} txt          File textual content
     * @param {String} handle       Node handle
     * @param {Boolean} isReadonly  Flag to open Editor in read-only mode
     * @param {jQuery} $viewerContainer  just use the plain text content block, aka viewer-mode
     * @returns {Void}              void
     */
    this.setupEditor = function(fName, txt, handle, isReadonly, $viewerContainer) {
        M.require('codemirror_js', 'codemirrorscroll_js').done(() => {
            if ($viewerContainer) {
                this.cleanup();
                init(txt, $viewerContainer);

                // Stop scroll event propagation when scroll inside codemirror
                $('.CodeMirror-scroll', $editorContainer).rebind('scroll.txtviewer mousewheel.txtviewer', (e) => {
                    e.stopPropagation();

                    delay('txt.viewer:scroll-info', () => {
                        const info = editor && editor.getScrollInfo() || false;
                        const scrollPos = info.height - (info.top + info.clientHeight);
                        if (scrollPos <= 20) {
                            mBroadcaster.sendMessage('txt.viewer:scroll-bottom', editor);
                        }
                    }, 60);
                });

                // For stopping showing keyboard on mobile browsers
                if (is_mobile) {
                    $('.CodeMirror-scroll', $editorContainer).rebind('click tap', () => {
                        document.activeElement.blur();
                        return false;
                    });
                }
            }
            else {
                pushHistoryState();
                init(txt);
                mBroadcaster.sendMessage('textEditor:open');

                const root = M.getNodeRoot(handle);
                const inRubbishBin = root === M.RubbishID;

                // Without parentheses && will be applied first,
                // I want JS to start from left and go in with first match
                // eslint-disable-next-line no-extra-parens
                if (isReadonly || folderlink || (M.currentrootid === 'shares' && M.getNodeRights(handle) < 1) ||
                    inRubbishBin || root === M.InboxID) {
                    editor.options.readOnly = true;

                    if (is_mobile) {
                        editor.options.readOnly = 'nocursor';
                    }

                    $('header .file-btn', $editorContainer).addClass('disabled');
                    $('.save-btn', $editorContainer).addClass('hidden');

                    if (inRubbishBin) {
                        $('footer .download-btn', $editorContainer).addClass('hidden');
                    }
                }
                else {
                    editor.options.readOnly = false;
                    $('header .file-btn', $editorContainer).removeClass('disabled');
                    $('footer .save-btn', $editorContainer).removeClass('hidden');
                    $('footer .download-btn', $editorContainer).removeClass('hidden');
                }

                bindEventsListner();
                $saveButton.addClass('disabled');
                $('.text-editor-file-name span', $editorContainer).text(fName);

                editor.focus();
            }

            if (Array.isArray(handle)) {
                handle = handle[0];
            }

            fileHandle = handle;
            versionHandle = '';
            fileName = fName;
            if (page !== 'download') {
                eventlog(99807);
                if (M.currentrootid !== M.RubbishID) {
                    mega.ui.searchbar.recentlyOpened.addFile(handle, true);
                }
            }

            const $getLink = $('.file-menu .get-link-f', $menuBar);
            if (M.currentrootid === 'shares') {
                $getLink.addClass('hidden');
            }
            else {
                $getLink.removeClass('hidden');
            }
        });
    };

    /**
     * Clear editor instance to avoid container conflicts.
     * @returns {Void} void
     */
    this.cleanup = function() {
        this.doClose();
        if (editor) {
            editor.toTextArea();
        }
        editor = undefined;
        savedFileData = undefined;
        initialized = false;
    };
};
