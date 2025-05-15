
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
            const nodeHandle = selected && selected[0];
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

        if (is_mobile) {
            return;
        }

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
                lineNumbers: true,
                scrollbarStyle: "overlay",
                autofocus: true,
                lineWrapping: true,
                readOnly: typeof $viewerContainer !== 'undefined'
            });
        }

        if (is_mobile) {
            editor.options.readOnly = editor.options.readOnly && 'nocursor';
        }

        savedFileData = txt;
        editor.setValue(txt);

        if (initialized || is_mobile) {
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

                    const getSavedFile = fh => {

                        if (!fh) {
                            $saveButton.removeClass('disabled');
                        }

                        mega.textEditorUI.getVersionedHandle(fh);

                        bindEventsListner();

                        if (fh) {
                            selectionManager.wantResetTo(fh, true);
                            fileName = M.d[fh].name;
                            $('.text-editor-file-name span', $editorContainer).text(fileName);
                        }

                        if (M.currentrootid !== M.RubbishID) {
                            mega.ui.searchbar.recentlyOpened.files.delete(fileHandle);
                            mega.ui.searchbar.recentlyOpened.addFile(fh, true);
                        }

                        if (cb && typeof cb === 'function') {
                            cb();
                        }
                    };

                    mega.textEditorUI.save(fileHandle, versionHandle, editor.getValue())
                        .then(getSavedFile)
                        .catch(tell)
                        .finally(() => {
                            loadingDialog.hide('common');
                        });
                }
            }
        );

        $('.file-menu .open-f', $menuBar).rebind(
            'click.txt-editor',
            function openFileClick() {
                M.initFileAndFolderSelectDialog('open-file').then(selectedItemOpen).catch(tell);
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
                    mega.textEditorUI.saveAs.bind(mega.textEditorUI, true)
                );
            }
        );

        $saveAsBtn.rebind('click.txt-editor', mega.textEditorUI.saveAs.bind(mega.textEditorUI, false));

        $('.file-menu .get-link-f', $menuBar).rebind(
            'click.txt-editor',
            function getLinkFileMenuClick() {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(versionHandle || fileHandle);
                M.getLinkAction();
            }
        );

        $('.file-menu .send-contact-f', $menuBar).rebind(
            'click.txt-editor',
            function sendToContactMenuClick() {
                selectionManager.clear_selection();
                selectionManager.add_to_selection(versionHandle || fileHandle);
                openCopyDialog('conversations');
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

    this.save = async(fh, vh, val) => {
        const rights = M.getNodeRights(fh);
        let res;
        if (rights < 1) {
            this.saveAs(fh);
            return false;
        }

        loadingDialog.show('common', l[23131]);

        if (rights === 1 && M.getNodeRoot(fh) === 'shares') {
            const name = fileconflict.findNewName(M.getSafeName(M.d[fh].name), M.d[fh].p);
            res = await Promise.resolve(
                val
                    ? mega.fileTextEditor.saveFileAs(name, M.d[fileHandle].p, val)
                    : M.addNewFile(name, M.d[fileHandle].p)
            ).catch(dump);

            return res;
        }

        const data = await M.getStorageQuota();

        if (data.isFull) {
            loadingDialog.hide('common');
            ulmanager.ulShowOverStorageQuotaDialog();
            return false;
        }
        res = await Promise.resolve(mega.fileTextEditor.setFile(vh || fh, val)).catch(dump);
        return res;
    };

    this.saveAs = n => {
        // loadingDialog.show();
        let node = {name: 'New file.txt'};
        let contents = '';
        let editedTxt;

        if (typeof n === 'object') {
            node = n;
        }
        else if (!n) {
            editedTxt = editor.getValue();
            if (editedTxt === savedFileData) {
                editedTxt = null;
            }

            node = versionHandle || fileHandle;
            contents = editedTxt;
        }

        openSaveAsDialog(
            node,
            contents,
            async h => {

                $.selected = Array.isArray(h) ? h : [h];
                h = $.selected[0];
                const data = await M.getStorageQuota().catch(dump);

                loadingDialog.hide();

                if (data.isFull) {
                    ulmanager.ulShowOverStorageQuotaDialog();
                    return false;
                }

                if (is_mobile) {
                    mega.ui.viewerOverlay.show(h);
                }
                else {
                    mega.textEditorUI.setupEditor(M.d[h].name, editedTxt || savedFileData, h);
                }
                return h;
            }
        );
    };

    this.getVersionedHandle = function(fh) {
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

        return [fileHandle, versionHandle];
    };

    this.doClose = function() {
        if (editor) {
            editor.setValue('');
        }
        if (window.selectionManager) {

            selectionManager.restoreResetTo();
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
        return Promise.resolve(M.require('codemirror_js', 'codemirrorscroll_js')).then(() => {
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

                if (!is_mobile) {
                    bindEventsListner();
                    $saveButton.addClass('disabled');
                    $('.text-editor-file-name span', $editorContainer).text(fName);
                }

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

            this.editor = editor;
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
