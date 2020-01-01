
/**
 * UI Controller to handle operations on the UI of text Editor
 * */
mega.textEditorUI = new function() {

    var myTextarea;

    var setFunction;
    var remFunction;
    var fileHandle;
    var versionHandle;
    var fileName;
    var savedFileData;

    var editor;
    var initialized = false;

    var $containerDialog;
    var $editorContianer;

    /** Init Controller */
    var init = function() {
        'use strict';
        if (initialized) {
            return;
        }

        $containerDialog = $('.txt-editor-frame');
        $editorContianer = $containerDialog.find('#mega-text-editor');


        $('.txt-editor-menu', $editorContianer).off('click').on('click',
            function textEditorMenuOpen() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                $('.top-menu-popup-editor', $editorContianer).removeClass('hidden').show();
                return false;
            });

        $editorContianer.off('click').on('click',
            function textEditorGlobalClick() {
                $('.top-menu-popup-editor', $editorContianer).addClass('hidden').hide();
                return false;
            });

        $('.buttons-holder .close-btn', $editorContianer).off('click').on('click',
            function textEditorCloseBtnClick() {

                if (editor) {
                    validateAction(l[22750], l[22751],
                        function() {
                            !hashLogic && history.back();
                            mega.textEditorUI.doClose();
                        });
                }
                else {
                    !hashLogic && history.back();
                    mega.textEditorUI.doClose();
                }
                return false;
            });

        $('.buttons-holder .save-btn', $editorContianer).off('click').on('click',
            function textEditorSaveBtnClick() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                if (editor) {
                    $('.buttons-holder .save-btn', $editorContianer).addClass('disabled');

                    loadingDialog.show();

                    mega.filesEditor.setFile(versionHandle || fileHandle, editor.getValue()).done(function(fh) {
                        if (versionHandle) {
                            mega.filesEditor.removeOldVersion(versionHandle);
                        }
                        versionHandle = fh;
                        savedFileData = editor.getValue();

                        bindChangeListner();

                        loadingDialog.hide();
                    });
                }
            });

        $('.editor-btn-container .open-f', $editorContianer).off('click').on('click', function openFileClick() {
            M.initFileAndFolderSelectDialog('openFile', selectedItemOpen);
        });

        $('.editor-btn-container .save-f', $editorContianer).off('click').on('click', function saveFileMenuClick() {
            $('.buttons-holder .save-btn', $editorContianer).trigger('click');
        });

        $('.editor-btn-container .new-f', $editorContianer).off('click').on('click', function newFileMenuClick() {
            validateAction(l[22750], l[22752],
                function() {
                    // loadingDialog.show();
                    openSaveAsDialog({ name: 'New file.txt' }, '', function(handle) {
                        loadingDialog.hide();
                        mega.textEditorUI.setupEditor(M.d[handle].name, '', handle);
                    });
                }
            );
        });

        $('.editor-btn-container .save-as-f', $editorContianer).off('click').on('click', function saveAsMenuClick() {
            // loadingDialog.show();
            var editedTxt = editor.getValue();
            if (editedTxt === savedFileData) {
                editedTxt = null;
            }
            openSaveAsDialog(versionHandle || fileHandle, editedTxt, function(handle) {
                loadingDialog.hide();
                mega.textEditorUI.setupEditor(M.d[handle].name, editedTxt || savedFileData, handle);
            });
        });

        $('.editor-btn-container .get-link-f', $editorContianer).off('click').on('click', function getLinkFileMenuClick() {
            $('.dropdown.body.context .dropdown-item.getlink-item').trigger('click');
        });

        $('.editor-btn-container .send-contact-f', $editorContianer).off('click').on('click', function sendToContactMenuClick() {
            $('.dropdown.body.context .dropdown-item.send-to-contact-item').trigger('click');
        });

        $('.editor-btn-container .print-f', $editorContianer).off('click').on('click', printText);

        $('.editor-btn-container .txt-editor-download-btn', $editorContianer).off('click').on('click', function downloadBtnClicked() {

            validateAction(l[22750], l[22753],
                function() {
                    M.saveAs(savedFileData, fileName);
                });
        });

        initialized = true;

    };

    var bindChangeListner = function() {
        'use strict';
        var changeListner = function() {
            $('.buttons-holder .save-btn', $editorContianer).removeClass('disabled');
            editor.off('change', changeListner);
        };

        editor.on('change', changeListner);
    };

    this.doClose = function() {
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
     */
    this.setupEditor = function(fName, txt, handle, isReadonly) {
        'use strict';
        init();
        $containerDialog.removeClass('hidden');
        addingFakeHistoryState();
        window.textEditorVisible = true;
        myTextarea = $('#txtar', $editorContianer);
        if (!editor) {
            editor = CodeMirror.fromTextArea(myTextarea[0], {
                lineNumbers: true,
                scrollbarStyle: "overlay"
            });
        }
        if (isReadonly || folderlink || (M.currentrootid === 'shares' && M.getNodeRights(id) < 2)) {
            editor.options.readOnly = true;
            $('.txt-editor-menu', $editorContianer).addClass('disabled');
        }
        else {
            editor.options.readOnly = false;
            $('.txt-editor-menu', $editorContianer).removeClass('disabled');
        }


        $('.buttons-holder .save-btn', $editorContianer).addClass('disabled');
        if (editor) {
            savedFileData = txt;
            editor.setValue(txt);
            bindChangeListner();
        }

        $('.txt-editor-opened-f-name', $editorContianer).text(fName);
        $('.top-menu-popup-editor', $editorContianer).addClass('hidden').hide();

        fileHandle = handle;
        versionHandle = '';
        fileName = fName;
    };

    /**
     * Check if the file content has been changed and show a message if so
     * @param {String} msg          Message to show if file content is changed
     * @param {String} submsg       sub-message to show if file content is changed
     * @param {Function} callback   callback function to be called if file is not changed or user ignored changes.
     */
    var validateAction = function(msg, submsg, callback) {
        'use strict';
        if (savedFileData && !$('.buttons-holder .save-btn', $editorContianer).hasClass('disabled')) {
            msgDialog('confirmation', '', msg,
                submsg,
                function(e) {
                    if (e) {
                        callback();
                    }
                });
        }
        else {
            callback();
        }
    };

    var selectedItemOpen = function () {
        'use strict';
        var openFile = function() {
            history.back();
            $('.dropdown.body.context .dropdown-item.edit-file-item').trigger('click');
        };

        validateAction(l[22750], l[22754], openFile);

    };

    var printText = function() {
        'use strict';
        var mywindow = window.open('', fileName, 'height=600,width=800');

        mywindow.document.write('<html><head><title>' + fileName + '</title>');
        mywindow.document.write('</head><body >');
        mywindow.document.write('<pre>' + editor.getValue() + '</pre>');
        mywindow.document.write('</body></html>');

        mywindow.document.close();
        mywindow.focus()
        mywindow.print();
        mywindow.close();
        return true;
    };

};
