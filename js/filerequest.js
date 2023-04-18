/* eslint-disable max-classes-per-file */
lazy(mega, 'fileRequest', () => {
    'use strict';

    const cssMarginBottom = 'margin-bottom';
    const megaInputSelector = '.mega-input';
    const activeClass = 'active';

    const logger = MegaLogger.getLogger('FileRequest');

    const refreshFileRequestPageList = () => {
        if (fminitialized && M.currentdirid === 'file-requests') {
            M.openFolder(M.currentdirid, true);
        }
    };

    const openCreateDialogFromSelect = (selectedNodeHandle) => {
        mega.fileRequest.dialogs.createDialog.init(selectedNodeHandle);
    };

    const openNewDialogHandler = () => {
        if (M.currentrootid === 'file-requests') {
            // We clear the selection as its useless on file requests list page
            // and will default to M.RootID once dialog is opened
            selectionManager.clear_selection();
        }

        openNewFileRequestDialog({
            post: openCreateDialogFromSelect
        });
        return false;
    };

    class BaseDialog {
        setShareLink() {
            if (!this.$shareLink) {
                return;
            }

            this.$shareLink.update({
                puPagePublicHandle: this.puPagePublicHandle
            });
        }
    }
    class CommonDialog extends BaseDialog {
        constructor() {
            super();

            // Fixed properties
            this.namespace = 'fr';

            // Changeable properties
            this.dialogClass = null;
            this.dialogTitle = null;
            this.dialogCaption = null;
            this.selectFolder = false;
            this.closeWarning = false;
            this.close = null;
            this.closePositive = false;
            this.sectionPrimary = false;
            this.sectionSecondary = false;
            this.save = null;
            this.savePositive = false;

            this.previewButtonPrimary = false;
            this.previewButtonFooter = false;

            this.stop = false;
            this.puPagePublicHandle = null;

            this.$dialog = $('.file-request', document.body);
            this.dialogClassBackup = this.$dialog.prop('class');

            this.$sectionDivider = $('.divider', this.$dialog);
            this.$sectionPrimary = $('.content-block.primary', this.$dialog);
            this.$sectionSecondary = $('.content-block.secondary', this.$dialog);
            this.$scrollableContent = $('.content .scrollable', this.$dialog);

            // Header
            this.$headerTitle = $('header .dialog-title', this.$dialog);
            this.$headerCaption = $('header .dialog-caption', this.$dialog);

            // Primary
            this.$selectFolderContainer = $('.form-row.select-folder', this.$sectionPrimary);
            this.$selectFolder = new mega.fileRequestUI.SelectFolderComponent(this.$dialog);

            this.$previewButtonContainer = $('.footer-container.preview', this.$sectionPrimary);
            this.$previewButton = new mega.fileRequestUI.PreviewButtonComponent(
                $('.file-request-preview-button', this.$dialog)
            );

            this.$inputTitle = new mega.fileRequestUI.ValidatableInputComponent(
                $('.file-request-title', this.$sectionPrimary), {
                    validations: {
                        limit: {
                            max: 80,
                            message: l.file_request_dialog_label_title_invalid
                        },
                        postValidation: ($input, result) => {
                            const $formRow = $input.closest('.form-row');
                            if ($formRow.length) {
                                if (result) {
                                    $formRow.css(cssMarginBottom, '0');
                                    return;
                                }
                                $formRow.css(cssMarginBottom, '');
                            }
                        }
                    },
                    namespace: this.namespace
                }
            );

            this.$inputDescription = new mega.fileRequestUI.ValidatableInputComponent(
                $('.file-request-description', this.$sectionPrimary), {
                    validations: {
                        limit: {
                            max: 250,
                            message: l.file_request_dialog_label_desc_invalid
                        },
                    },
                    namespace: this.namespace
                }
            );

            // Secondary
            this.themeButtonSelector = '.embed-button-theme-input';
            this.$themeButton = new mega.fileRequestUI.RadioComponent(
                $(this.themeButtonSelector, this.$dialog), { namespace: 'frm' }
            );
            this.themeButtonWrapper = '.embed-button-select';
            this.$themeButtonWrapper = new mega.fileRequestUI.ButtonComponent(
                $(this.themeButtonWrapper, this.$dialog), { namespace: 'frm' }
            );

            this.$embedCode = new mega.fileRequestUI.EmbedCodeInputComponent(
                $('.file-request-embed-code', this.$dialog)
            );
            this.$shareLink = new mega.fileRequestUI.ShareLinkInputComponent(
                $('.file-request-share-link', this.$dialog)
            );
            this.$copyButton = new mega.fileRequestUI.ClassCopyButtonComponent(this.$dialog, {
                copy: {
                    'file-request-embed-code': {
                        content: () => {
                            console.log('content this', this);
                            return this.$embedCode.getContent();
                        },
                        toastText: l.file_request_action_copy_code,
                        className: 'clipboard-embed-code'
                    },
                    'file-request-share-link': {
                        content: () => {
                            console.log('content this share', this);
                            return this.$shareLink.getContent();
                        },
                        toastText: l.file_request_action_copy_link
                    },
                },
                namespace: this.namespace
            });

            // Footer
            this.$removeButton = new mega.fileRequestUI.ButtonComponent($('.file-request-remove-button', this.$dialog));
            this.$saveButton = new mega.fileRequestUI.ButtonComponent($('.file-request-save-button', this.$dialog));
            this.$closeButton = new mega.fileRequestUI.CloseButtonComponent(
                $('button.close, .file-request-close-button', this.$dialog),
                {
                    warning: this.closeWarning
                }
            );
            this.$closeButtonFooter = $('.file-request-close-button', this.$dialog);

            // Handler section
            // Primary
            this.$selectFolder.addEventHandlers({
                namespace: this.namespace,
                post: openCreateDialogFromSelect
            });

            const titleDescInputPostCallback = function(selfObject, options) {
                const $formRow = selfObject.getInput().closest('.form-row');
                const $charCount = $('.char-count', $formRow);
                const limit = options &&
                    options.validations &&
                    options.validations.limit ||
                    0;

                if (selfObject.getValue()) {
                    if ($charCount.length && limit && limit.max) {
                        const charLength = selfObject.getValue().length;
                        $charCount.text(`(${charLength}/${limit.max})`);
                    }

                    selfObject
                        .getInput()
                        .closest(megaInputSelector)
                        .addClass(activeClass);
                    return;
                }

                $charCount.text(``);
                selfObject
                    .getInput()
                    .closest(megaInputSelector)
                    .removeClass(activeClass);
            };

            this.$inputTitle.setOptions({
                post: titleDescInputPostCallback
            });

            this.$inputDescription.setOptions({
                post: titleDescInputPostCallback
            });

            // Secondary
            this.$previewButton.setOptions({
                namespace: this.namespace,
                callback: () => {
                    const title = this.$inputTitle.getValue();
                    const description = this.$inputDescription.getValue();

                    return {
                        name: u_attr.name,
                        title,
                        description,
                        theme: u_attr && u_attr['^!webtheme'] !== undefined ? u_attr['^!webtheme'] : '',
                        pupHandle: this.puPagePublicHandle || null
                    };
                }
            });

            this.$themeButton.eventOnChange(($input) => {
                this.setEmbedCode();
                this.$themeButton.getInput().closest('.embed-block').removeClass(activeClass);
                $input.closest('.embed-block').addClass(activeClass);
                return false;
            });

            this.$themeButtonWrapper.eventOnClick(($input) => {
                if ($input.is(this.themeButtonSelector)) {
                    return;
                }

                let $parentElement = $input;
                if ($input.not(this.themeButtonWrapper)) {
                    $parentElement = $input.parent();
                }

                $(this.themeButtonSelector, $parentElement).trigger('click');
                return false;
            });

            this.$copyButton.addEventHandlers();
        }

        reset() {
            this.dialogClass = null;
            this.dialogTitle = null;
            this.dialogCaption = null;
            this.selectFolder = false;
            this.closeWarning = false;
            this.close = null;
            this.closePositive = false;
            this.sectionPrimary = false;
            this.sectionSecondary = false;

            this.save = null;
            this.savePositive = false;

            this.preview = false;
            this.previewButtonPrimary = false;
            this.previewButtonFooter = false;

            this.stop = false;
            this.puPagePublicHandle = null;

            // Reset section header
            this.$dialog.prop('class', this.dialogClassBackup);
            this.$headerTitle.text('');
            this.$headerCaption.text('').addClass('hidden');

            // Reset section primary
            this.$sectionPrimary.addClass('hidden');
            this.$selectFolderContainer.addClass('hidden');
            this.$selectFolder.init();
            this.$inputTitle.reset();
            this.$inputDescription.reset();
            this.$previewButtonContainer.addClass('hidden');

            // Reset Divider
            this.$sectionDivider.addClass('hidden');

            // Reset section
            this.$sectionSecondary.addClass('hidden');

            // Footer
            this.$previewButton.getInput().addClass('hidden');
            this.$removeButton.getInput().addClass('hidden');
            this.$closeButtonFooter.addClass('hidden').removeClass('positive');
            this.$saveButton.getInput().addClass('hidden').removeClass('positive');

            // dialog
            this.$dialog.off('dialog-closed');
        }

        initScrollbar(options) {
            initPerfectScrollbar(this.$scrollableContent, options || {});
            this.triggerClickOnRail(this.$scrollableContent);
        }

        init() {
            this.setDialogHeader();

            if (this.sectionPrimary) {
                this.setSectionPrimary();
            }

            if (this.sectionDivider) {
                this.$sectionDivider.removeClass('hidden');
            }

            if (this.sectionSecondary) {
                this.setSectionSecondary();
            }

            this.setFooter();
        }

        setFooter() {
            if (this.previewButtonFooter) {
                this.$previewButton.getInput().removeClass('hidden');
            }

            if (this.close) {
                this.$closeButtonFooter.removeClass('hidden');
                if (this.closePositive) {
                    this.$closeButtonFooter.addClass('positive');
                }
                $('span', this.$closeButtonFooter).text(this.close);

                this.$closeButton.setOptions({
                    warning: this.closeWarning
                });
            }

            if (this.save) {
                const $saveButton = this.$saveButton.getInput();
                $saveButton.removeClass('hidden');
                if (this.savePositive) {
                    $saveButton.addClass('positive');
                }
                $('span', $saveButton).text(this.save);
            }

            if (this.stop) {
                this.$removeButton.getInput().removeClass('hidden');
            }
        }

        setSectionPrimary() {
            this.$sectionPrimary.removeClass('hidden');

            if (this.selectFolder) {
                this.$selectFolderContainer.removeClass('hidden');
            }

            if (this.previewButtonPrimary) {
                this.$previewButtonContainer.removeClass('hidden');
            }
        }

        setSectionSecondary() {
            this.$sectionSecondary.removeClass('hidden');
        }

        setDialogHeader() {
            if (this.dialogClass) {
                this.$dialog.addClass(this.dialogClass);
            }
            if (this.dialogTitle) {
                this.$headerTitle.text(this.dialogTitle);
            }
            if (this.dialogCaption) {
                this.$headerCaption.text(this.dialogCaption).removeClass('hidden');
            }
        }

        isLightTheme() {
            if (!this.$themeButton) {
                return true;
            }

            const selectedValue = this.$themeButton.getValue();

            if (!selectedValue) {
                return true;
            }

            return selectedValue === "0";
        }

        setEmbedCode() {
            if (!this.$embedCode) {
                return;
            }

            this.$embedCode.update({
                puPagePublicHandle: this.puPagePublicHandle,
                lightTheme: this.isLightTheme()
            });
        }

        triggerClickOnRail($scrollableContent) {
            onIdle(() => {
                if (!$scrollableContent) {
                    return;
                }

                const $scrollableYRail = $('.ps__scrollbar-y-rail', $scrollableContent);
                if ($scrollableYRail.length) {
                    $('.ps__scrollbar-y-rail', $scrollableContent).trigger('click');
                    $scrollableContent.scrollTop(0);
                }
            });
        }
    }

    class CommonMobileDialog extends BaseDialog {
        createTitleDescInput(options) {
            const namespace = options && options.namespace || '';
            this.$inputTitle = new mega.fileRequestUI.ValidatableMobileComponent(
                $('.file-request-title', this.$dialog), {
                    validations: {
                        limit: {
                            max: 80,
                            message: l.file_request_dialog_label_title_invalid
                        }
                    },
                    namespace: namespace,
                    selector: '.input'
                }
            );

            this.$inputDescription = new mega.fileRequestUI.ValidatableMobileComponent(
                $('.file-request-description', this.$dialog), {
                    validations: {
                        limit: {
                            max: 250,
                            message: l.file_request_dialog_label_desc_invalid
                        },
                    },
                    namespace: namespace,
                    selector: '.input'
                }
            );
        }

        initTitleDescInput() {
            if (!this.$inputTitle || !this.$inputDescription) {
                return;
            }

            this.$inputTitle.setValue('');
            this.$inputTitle.resetErrorMessage();

            this.$inputDescription.setValue('');
            this.$inputDescription.resetErrorMessage();
        }
    }

    // Dialogs start
    class CreateDialog {
        constructor() {
            this.commonDialog = mega.fileRequest.commonDialog;
            this.context = null;
            this.fileObject = null;
            this.fileHandle = null;
            this.folderName = null;
        }

        init(selectedHandle) {
            // Reset fields
            this.commonDialog.reset();
            this.setDialog();
            this.commonDialog.init();
            this.addEventHandlers();

            // Reset error messages
            this.setContext({
                nodeHandle: selectedHandle
            });

            this.fileObject = M.d[selectedHandle];
            this.fileHandle = selectedHandle;
            this.folderName = this.fileObject && this.fileObject.name || null;
            if (this.folderName) {
                this.commonDialog.$selectFolder.setFolder(this.folderName);
                this.commonDialog.$selectFolder.setNodeHandle(selectedHandle);
            }

            M.safeShowDialog('file-request-create-dialog', this.commonDialog.$dialog);
            this.commonDialog.initScrollbar();
        }

        setContext(context) {
            this.context = context;
        }

        setDialog() {
            this.commonDialog.dialogClass = 'file-request-create-dialog';
            this.commonDialog.dialogTitle = l.file_request_dialog_create_title;
            this.commonDialog.dialogCaption = l.file_request_dialog_create_desc;
            this.commonDialog.closeWarning = true;
            this.commonDialog.selectFolder = true;
            this.commonDialog.sectionPrimary = true;
            this.commonDialog.close = l[82];
            this.commonDialog.save = l[158];
            this.commonDialog.savePositive = true;
            this.commonDialog.preview = true;
            this.commonDialog.previewButtonFooter = true;
        }

        addEventHandlers() {
            this.commonDialog.$saveButton.eventOnClick(() => {
                if (!this.commonDialog.$inputTitle.validate()) {
                    return;
                }

                if (!this.commonDialog.$inputDescription.validate()) {
                    return;
                }

                closeDialog();

                mega.fileRequest.create(
                    this.context.nodeHandle,
                    this.commonDialog.$inputTitle.getValue(),
                    this.commonDialog.$inputDescription.getValue()
                );
            });
        }

        checkLoseChangesWarning() {
            if (this.commonDialog.$inputTitle.getValue().length ||
                this.commonDialog.$inputDescription.getValue().length) {
                return true;
            }
        }
    }

    class CreateSuccessDialog {
        constructor() {
            this.commonDialog = mega.fileRequest.commonDialog;
            this.context = null;
            this.puHandleObject = null;
            this.puPagePublicHandle = null;
        }

        init(context) {
            if (context) {
                this.setContext(context);
            }

            this.puHandleObject = mega.fileRequest.storage.getPuHandleByPublicHandle(context.ph);
            if (!this.puHandleObject) {
                if (d) {
                    logger.info('CreateSuccessDialog.init - No puHandleObject found', context);
                }
                loadingDialog.hide();
                return;
            }

            if (d) {
                logger.info('CreateSuccessDialog.init - puHandleObject found', this.puHandleObject);
            }

            this.puPagePublicHandle = this.puHandleObject.p;

            // Reset fields
            this.commonDialog.reset();
            this.setDialog();
            this.commonDialog.init();

            M.safeShowDialog('file-request-create-success-dialog', () => {
                this.commonDialog.setShareLink();
                this.commonDialog.setEmbedCode();
                this.commonDialog.initScrollbar({
                    scrollYMarginOffset: 20
                });

                this.commonDialog.$dialog.rebind('dialog-closed', () => {
                    this.commonDialog.$dialog.off('dialog-closed');
                    mega.fileRequest.storage.removePuMessage(context.ph);
                });

                return this.commonDialog.$dialog;
            });
        }

        setContext(context) {
            this.context = context;
        }

        setDialog() {
            this.commonDialog.dialogClass = 'file-request-create-success-dialog';
            this.commonDialog.dialogTitle = l.file_request_dialog_create_success_title;
            this.commonDialog.dialogCaption = l.file_request_dialog_create_success_desc;
            this.commonDialog.sectionSecondary = true;
            this.commonDialog.close = l[81];
            this.commonDialog.closePositive = true;
            this.commonDialog.puPagePublicHandle = this.puPagePublicHandle;
        }
    }

    class ManageDialog {
        constructor() {
            this.context = null;
            this.puHandleObject = null;
            this.puPagePublicHandle = null;
            this.commonDialog = mega.fileRequest.commonDialog;
        }

        init(context) {
            if (context) {
                this.setContext(context);
            }

            this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(context.h);
            if (!this.puHandleObject) {
                if (d) {
                    logger.info('ManageDialog.init - No puHandleObject found', context);
                }
                loadingDialog.hide();
                return;
            }

            if (d) {
                logger.info('ManageDialog.init - puHandleObject found', this.puHandleObject);
            }
            this.puPagePublicHandle = this.puHandleObject.p;

            // Reset fields
            this.commonDialog.reset();
            this.setDialog();
            this.commonDialog.init();
            this.addEventHandlers();

            this.commonDialog.setShareLink();
            this.commonDialog.setEmbedCode();

            // Reset fields
            const puHandleObjectData = this.puHandleObject.d;
            if (puHandleObjectData) {
                this.commonDialog.$inputTitle.setValue(puHandleObjectData.t);
                this.commonDialog.$inputDescription.setValue(puHandleObjectData.d);
            }
            else {
                const message = this.puHandleObject.fn || '';
                this.commonDialog.$inputTitle.setValue(message);
                this.commonDialog.$inputDescription.setValue('');
            }

            delay('filerequest.log', eventlog.bind(null, 99774)); // manage event
            M.safeShowDialog('file-request-manage-dialog', this.commonDialog.$dialog);
            this.commonDialog.initScrollbar();
            loadingDialog.hide();
        }

        setDialog() {
            this.commonDialog.dialogClass = 'file-request-manage-dialog';
            this.commonDialog.dialogTitle = l.file_request_dialog_manage_title;

            this.commonDialog.closeWarning = true;
            this.commonDialog.sectionPrimary = true;
            this.commonDialog.close = l[82];
            this.commonDialog.save = l.msg_dlg_save;
            this.commonDialog.savePositive = true;
            this.commonDialog.preview = true;
            this.commonDialog.previewButtonPrimary = true;
            this.commonDialog.stop = true;

            this.commonDialog.sectionDivider = true;

            this.commonDialog.sectionSecondary = true;
            this.commonDialog.puPagePublicHandle = this.puPagePublicHandle;
        }

        setContext(context) {
            this.context = context;
        }

        addEventHandlers() {
            this.commonDialog.$saveButton.eventOnClick(async() => {
                if (!this.commonDialog.$inputTitle.validate()) {
                    return;
                }

                if (!this.commonDialog.$inputDescription.validate()) {
                    return;
                }

                this.commonDialog.$saveButton.disable();
                await mega.fileRequest.update(
                    this.puHandleObject.h,
                    this.commonDialog.$inputTitle.getValue(),
                    this.commonDialog.$inputDescription.getValue()
                );
                this.commonDialog.$saveButton.enable();

                closeDialog();
            });

            this.commonDialog.$removeButton.eventOnClick(() => {
                const title = l.file_request_dropdown_remove;
                const message = l.file_request_action_remove_prompt_title;
                const description = l.file_request_action_remove_prompt_desc;

                const removeDialogCallback = (res) => {
                    if (!res) {
                        return;
                    }
                    this.commonDialog.$removeButton.disable();

                    mega.fileRequest.remove(this.puHandleObject.h)
                        .catch(dump)
                        .finally(() => {
                            closeDialog();
                            this.commonDialog.$removeButton.enable();
                            showToast('warning2', l.file_request_action_remove);
                            selectionManager.clear_selection();
                        });
                };

                msgDialog(
                    `confirmation:!^${l.file_request_action_remove_prompt_button}!${l[82]}`,
                    title,
                    message,
                    description,
                    removeDialogCallback,
                    1
                );
            });
        }

        checkLoseChangesWarning() {
            let title = '';
            let description = '';

            const puHandleObjectData = this.puHandleObject.d;
            if (puHandleObjectData) {
                title = puHandleObjectData.t;
                description = puHandleObjectData.d;
            }
            else {
                const message = this.puHandleObject.fn || '';
                title = message;
                description = '';
            }

            if (this.commonDialog.$inputTitle.getValue() !== title ||
                this.commonDialog.$inputDescription.getValue() !== description) {
                return true;
            }
        }
    }

    class FileRequestContextMenu {
        constructor() {
            this.$contextMenu = null;
            this.$createButton = null;
            this.$manageButton = null;
            this.$copyLinkButton = null;
            this.$removeButton = null;

            this.$contextMenu = $('.dropdown.body.context', document.body);
            this.$createButton = new mega.fileRequestUI.ButtonComponent(
                $('.dropdown-item.file-request-create', this.$contextMenu), {
                    namespace: 'frcm'
                }
            );
            this.$manageButton = new mega.fileRequestUI.ButtonComponent(
                $('.dropdown-item.file-request-manage', this.$contextMenu), {
                    namespace: 'frcm'
                }
            );

            this.$copyLinkButton = new mega.fileRequestUI.CopyButtonComponent(
                $('.dropdown-item.file-request-copy-link', this.$contextMenu), {
                    namespace: 'frcm',
                    toastText: l.file_request_action_copy_link
                }
            );

            this.$removeButton = new mega.fileRequestUI.ButtonComponent(
                $('.dropdown-item.file-request-remove', this.$contextMenu), {
                    namespace: 'frcm'
                }
            );

            this.addEventHandlers();
        }

        addEventHandlers() {
            if (d) {
                logger.info(
                    '#file-request #context-menu - Add Folder context menu event handlers',
                    this.$createButton.length
                );
            }

            this.$createButton.eventOnClick(() => {
                if (M.isInvalidUserStatus()) {
                    return;
                }

                const selectedNodeHandle = $.selected[0];
                mega.fileRequest.dialogs.createDialog.init(selectedNodeHandle);
            });

            this.$manageButton.eventOnClick(() => {
                if (M.isInvalidUserStatus()) {
                    return;
                }

                const selectedNodeHandle = $.selected[0];
                mega.fileRequest.dialogs.manageDialog.init({
                    h: selectedNodeHandle
                });
            });

            this.$copyLinkButton.setOptions({
                callback: () => {
                    const selectedNodeHandle = $.selected[0];
                    const puPagePublicHandle = mega.fileRequest
                        .storage
                        .getPuHandleByNodeHandle(selectedNodeHandle);

                    if (puPagePublicHandle) {
                        return mega.fileRequest
                            .generator
                            .generateUrl(puPagePublicHandle.p);
                    }

                    return null;
                }
            });

            const showRemoveDialog = (selectedNodeHandle, title, message, description) => {
                msgDialog(
                    `confirmation:!^${l.file_request_action_remove_prompt_button}!${l[82]}`,
                    title,
                    message,
                    description,
                    (res) => {
                        if (!res) {
                            return;
                        }

                        loadingDialog.show();
                        mega.fileRequest.remove(selectedNodeHandle)
                            .catch((ex) => {
                                if (typeof ex !== 'number' || ex && ex !== ENOENT) {
                                    return;
                                }

                                mega.fileRequest.storage.removePuPageByNodeHandle(selectedNodeHandle);

                                refreshFileRequestPageList();
                            })
                            .finally(() => {
                                showToast('warning2', l.file_request_action_remove);
                                selectionManager.clear_selection();
                            });
                    },
                    1
                );
            };

            this.$removeButton.eventOnClick(() => {
                if (M.isInvalidUserStatus()) {
                    return;
                }

                const selectedNodeHandle = $.selected[0];
                if (!selectedNodeHandle) {
                    return;
                }

                const title = l.file_request_dropdown_remove;
                const message = l.file_request_action_remove_prompt_title;
                const description = l.file_request_action_remove_prompt_desc;

                showRemoveDialog(selectedNodeHandle, title, message, description);
            });
        }
    }

    class MobileContextMenu {
        constructor() {
            this.$contextMenu = null;
            this.$createButton = null;
            this.$manageButton = null;
            this.$copyLinkButton = null;
            this.$removeButton = null;
            this.nodeHandle = null;
        }

        init($contextMenu, nodeHandle) {
            this.nodeHandle = nodeHandle;
            this.$contextMenu = $contextMenu;

            this.reset();

            this.$createButton = new mega.fileRequestUI.ButtonComponent(
                $('.create-file-request', this.$contextMenu), {
                    namespace: 'frcmm',
                    propagate: false,
                    onOff: true
                }
            );

            this.$manageButton = new mega.fileRequestUI.ButtonComponent(
                $('.manage-file-request', this.$contextMenu), {
                    namespace: 'frcmm',
                    propagate: false,
                    onOff: true
                }
            );

            this.$copyLinkButton = new mega.fileRequestUI.CopyButtonComponent(
                $('.copy-file-request', this.$contextMenu), {
                    namespace: 'frcm',
                    toastText: l.file_request_action_copy_link,
                    propagate: false,
                    onOff: true
                }
            );

            this.$removeButton = new mega.fileRequestUI.ButtonComponent(
                $('.cancel-file-request', this.$contextMenu), {
                    namespace: 'frcmm',
                    propagate: false,
                    onOff: true
                }
            );

            this.addEventHandlers();
        }

        reset() {
            if (this.$createButton) {
                this.$createButton.off();
                delete this.$createButton;
            }
            if (this.$manageButton) {
                this.$manageButton.off();
                delete this.$manageButton;
            }
            if (this.$copyLinkButton) {
                this.$copyLinkButton.off();
                delete this.$copyLinkButton;
            }
            if (this.$removeButton) {
                this.$removeButton.off();
                delete this.$removeButton;
            }
        }

        addEventHandlers() {
            this.$createButton.eventOnClick(() => {
                if (!validateUserAction()) {
                    return false;
                }

                mobile.cloud.contextMenu.hide();
                mega.fileRequest.showCreateMobileDialog(this.nodeHandle);

                return false;
            });

            this.$manageButton.eventOnClick(() => {
                if (!validateUserAction()) {
                    return false;
                }

                mobile.cloud.contextMenu.hide();
                mega.fileRequest.showManageMobileDialog(this.nodeHandle);

                return false;
            });

            this.$copyLinkButton.setOptions({
                callback: () => {
                    const selectedNodeHandle = this.nodeHandle;
                    const puPagePublicHandle = mega.fileRequest.storage
                        .getPuHandleByNodeHandle(selectedNodeHandle);

                    mobile.cloud.contextMenu.hide();

                    if (puPagePublicHandle) {
                        return mega.fileRequest.generator
                            .generateUrl(puPagePublicHandle.p);
                    }

                    return null;
                }
            });

            this.$removeButton.eventOnClick(() => {
                if (!validateUserAction()) {
                    return false;
                }

                const selectedNodeHandle = this.nodeHandle;
                if (!selectedNodeHandle) {
                    return false;
                }

                mobile.cloud.contextMenu.hide();
                mega.fileRequest.dialogs.removeWarningMobileDialog.init({
                    h: selectedNodeHandle
                });

                return false;
            });
        }
    }

    class CreateMobileDialog extends CommonMobileDialog {
        constructor() {
            super();

            this.$dialog = $('#mobile-ui-file-request-create', document.body);
            this.$createButton = $('.file-request-create-button', this.$dialog);
            this.$closeButton = new mega.fileRequestUI.CloseMobileComponent(
                $('.cancel.text-button, .fm-dialog-close',this.$dialog),
                {
                    $dialog: this.$dialog,
                    propagate: false
                }
            );

            this.createTitleDescInput({
                namespace: 'frcm'
            });

            this.context = null;
            this.fileObject = null;
            this.fileHandle = null;
            this.folderName = null;
            this.addEventHandlers();
        }

        setContext(context) {
            this.context = context;
        }

        addEventHandlers() {
            this.$createButton.rebind('click.frcm, tap.frcm', (evt) => {
                evt.stopPropagation();

                if (!this.$inputTitle.validate()) {
                    return;
                }

                if (!this.$inputDescription.validate()) {
                    return;
                }

                this.$closeButton.closeDialog();

                mega.fileRequest.create(
                    this.context.nodeHandle,
                    this.$inputTitle.getValue(),
                    this.$inputDescription.getValue()
                );

                return false;
            });
        }

        init(selectedHandle) {
            // Reset fields
            this.initTitleDescInput();

            // Reset error messages
            this.setContext({
                nodeHandle: selectedHandle
            });

            this.fileObject = M.d[selectedHandle];
            this.fileHandle = selectedHandle;

            this.$dialog.removeClass('hidden').addClass('overlay');

            mobile.initOverlayPopstateHandler(this.$dialog);
        }
    }

    class ManageMobileDialog extends CommonMobileDialog {
        constructor() {
            super();

            this.$dialog = $('#mobile-ui-file-request-manage', document.body);
            this.$updateButton = new mega.fileRequestUI.ButtonComponent(
                $('.file-request-update-button', this.$dialog),
                {
                    namespace: 'frmm',
                    propagate: false
                }
            );
            this.$removeButton = new mega.fileRequestUI.ButtonComponent(
                $('.file-request-remove-button', this.$dialog),
                {
                    namespace: 'frmm',
                    propagate: false
                }
            );
            this.$closeButton = new mega.fileRequestUI.CloseMobileComponent(
                $('.cancel.text-button, .fm-dialog-close',this.$dialog),
                {
                    $dialog: this.$dialog,
                    propagate: false
                }
            );

            this.createTitleDescInput({
                namespace: 'frcm'
            });

            this.addEventHandlers();
            this.context = null;
            this.puHandleObject = null;
            this.puPagePublicHandle = null;
        }

        setContext(context) {
            this.context = context;
        }

        addEventHandlers() {
            this.$updateButton.eventOnClick(async() => {
                if (!this.$inputTitle.validate()) {
                    return;
                }

                if (!this.$inputDescription.validate()) {
                    return;
                }

                this.$closeButton.closeDialog();
                if (!this.hasChanges()) {
                    mega.fileRequest.dialogs.successMobileDialog.init({
                        ph: this.puHandleObject.ph,
                        p: this.puHandleObject.p,
                        h: this.puHandleObject.h
                    }, true);

                    return false;
                }

                this.$updateButton.disable();
                await mega.fileRequest.update(
                    this.puHandleObject.h,
                    this.$inputTitle.getValue(),
                    this.$inputDescription.getValue()
                );
                this.$updateButton.enable();

                return false;
            });

            this.$removeButton.eventOnClick(() => {
                this.$closeButton.closeDialog();

                mega.fileRequest.dialogs.removeWarningMobileDialog.init({
                    h: this.puHandleObject.h,
                    title: this.$inputTitle.getValue(),
                    description: this.$inputDescription.getValue(),
                    fromManage: true
                });
            });
        }

        init(context) {
            if (context) {
                this.setContext(context);
            }

            this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(context.h);
            if (!this.puHandleObject) {
                if (d) {
                    logger.info('ManageMobileDialog.init - No puHandleObject found', context);
                }
                loadingDialog.hide();
                return;
            }

            if (d) {
                logger.info('ManageMobileDialog.init - puHandleObject found', this.puHandleObject);
            }
            this.puPagePublicHandle = this.puHandleObject.p;

            this.initTitleDescInput();
            this.setShareLink();

            // Reset fields
            const puHandleObjectData = this.puHandleObject.d;
            if (puHandleObjectData) {
                this.$inputTitle.setValue(puHandleObjectData.t);
                this.$inputDescription.setValue(puHandleObjectData.d);
            }
            else {
                const message = this.puHandleObject.fn || '';
                this.$inputTitle.setValue(message);
                this.$inputDescription.setValue('');
            }

            if (this.context.title) {
                this.$inputTitle.setValue(this.context.title);
            }

            if (this.context.description) {
                this.$inputDescription.setValue(this.context.description);
            }

            this.$dialog.removeClass('hidden').addClass('overlay');
            mobile.initOverlayPopstateHandler(this.$dialog);

            loadingDialog.hide();
        }

        hasChanges() {
            let title = '';
            let description = '';

            const puHandleObjectData = this.puHandleObject.d;
            if (puHandleObjectData) {
                title = puHandleObjectData.t;
                description = puHandleObjectData.d;
            }
            else {
                const message = this.puHandleObject.fn || '';
                title = message;
                description = '';
            }

            return this.$inputTitle.getValue() !== title || this.$inputDescription.getValue() !== description;
        }
    }

    class SuccessMobileDialog extends CommonMobileDialog {
        constructor() {
            super();

            this.$dialog = $('#mobile-ui-file-request-create-success', document.body);
            this.$closeButton = new mega.fileRequestUI.CloseMobileComponent(
                $('.close.text-button, .fm-dialog-close',this.$dialog),
                {
                    $dialog: this.$dialog,
                    post: () => {
                        mega.fileRequest.storage.removePuMessage(this.context.ph);
                        $('.mobile.file-manager-block').removeClass('disable-scroll');
                    },
                    propagate: false
                }
            );
            this.$shareLink = new mega.fileRequestUI.ShareLinkInputComponent(
                $('.file-request-share-link', this.$dialog),
                {
                    propagate: false
                }
            );
            this.$copyButton = new mega.fileRequestUI.CopyButtonComponent($('.file-request-copy-link', this.$dialog), {
                callback: () => {
                    return {
                        content: () => this.$shareLink.getContent(),
                        toastText: l.file_request_action_copy_link
                    };
                },
                namespace: 'frcsm',
                propagate: false
            });

            this.$dialogTitle = $('.dialog-heading-text', this.$dialog);

            this.addEventHandlers();
            this.context = null;
            this.puHandleObject = null;
            this.puPagePublicHandle = null;
        }

        init(context, update) {
            if (context) {
                this.setContext(context);
            }

            let dialogTitle = l.file_request_dialog_create_success_title;
            if (update) {
                dialogTitle = l.file_request_dialog_update_success_title;
            }

            this.$dialogTitle.text(dialogTitle);

            this.puHandleObject = mega.fileRequest.storage.getPuHandleByPublicHandle(context.ph);
            if (!this.puHandleObject) {
                if (d) {
                    logger.info('SuccessMobileDialog.init - No puHandleObject found', context);
                }
                loadingDialog.hide();
                return;
            }

            if (d) {
                logger.info('SuccessMobileDialog.init - puHandleObject found', this.puHandleObject);
            }

            this.puPagePublicHandle = this.puHandleObject.p;

            this.setShareLink();

            $('.mobile.file-manager-block').addClass('disable-scroll');

            // Show the overlay
            this.$dialog.removeClass('hidden').addClass('overlay');
            loadingDialog.hide();
        }

        setContext(context) {
            this.context = context;
        }

        addEventHandlers() {
            this.$copyButton.addEventHandlers();
            this.$closeButton.eventOnClick(async() => {
                this.$closeButton.closeDialog();
            });
        }
    }

    class RemoveWarningMobileDialog extends CommonMobileDialog {
        constructor() {
            super();

            this.$dialog = $('#mobile-ui-file-request-remove-warning', document.body);
            this.$closeButton = new mega.fileRequestUI.CloseMobileComponent(
                $('.close.text-button, .fm-dialog-close',this.$dialog),
                {
                    $dialog: this.$dialog,
                    post: () => {
                        if (this.context.fromManage) {
                            mega.fileRequest.dialogs.manageMobileDialog.init({
                                h: this.context.h,
                                title: this.context.title || null,
                                description: this.context.description || null,
                            });
                        }
                        $('.mobile.file-manager-block').removeClass('disable-scroll');
                    },
                    propagate: false
                }
            );
            this.$removeButton = new mega.fileRequestUI.ButtonComponent($('.file-request-remove', this.$dialog));

            this.addEventHandlers();
            this.context = null;
        }

        init(context) {
            if (context) {
                this.setContext(context);
            }

            $('.mobile.file-manager-block').addClass('disable-scroll');

            // Show the overlay
            this.$dialog.removeClass('hidden').addClass('overlay');
        }

        setContext(context) {
            this.context = context;
        }

        addEventHandlers() {
            this.$removeButton.eventOnClick(() => {
                this.$removeButton.disable();

                mega.fileRequest.remove(this.context.h)
                    .catch(dump)
                    .finally(() => {
                        this.$removeButton.enable();
                        showToast('warning2', l.file_request_action_remove);
                        this.$closeButton.closeDialog();
                    });
            });
        }
    }

    return new class FileRequest {
        constructor() {
            this.contextMenu = new FileRequestContextMenu();

            lazy(this, 'mobileContextMenu', () => new MobileContextMenu());
            lazy(this, 'actionHandler', () => mega.fileRequestCommon.actionHandler);
            lazy(this, 'storage', () => mega.fileRequestCommon.storage);
            lazy(this, 'api', () =>  mega.fileRequestCommon.api);
            lazy(this, 'generator', () =>  mega.fileRequestCommon.generator);

            this.dialogs = {};

            lazy(this, 'commonDialog', () => new CommonDialog);
            lazy(this.dialogs, 'createDialog', () => new CreateDialog);
            lazy(this.dialogs, 'createSuccessDialog', () => new CreateSuccessDialog);
            lazy(this.dialogs, 'manageDialog', () => new ManageDialog);
            lazy(this.dialogs, 'createMobileDialog', () => new CreateMobileDialog);
            lazy(this.dialogs, 'manageMobileDialog', () => new ManageMobileDialog);
            lazy(this.dialogs, 'successMobileDialog', () => new SuccessMobileDialog);
            lazy(this.dialogs, 'removeWarningMobileDialog', () => new RemoveWarningMobileDialog);

            // To be removed on mobile FileRequest revamp
            this.skipDialog = mega.config.get('sdss');
        }

        async create(handle, title, description) {
            const puHandleObject = this.storage.getPuHandleByNodeHandle(handle);

            if (puHandleObject) {
                if (is_mobile) {
                    mega.fileRequest.dialogs.SuccessMobileDialog.init({
                        ph: puHandleObject.ph,
                        p: puHandleObject.p,
                        h: puHandleObject.h
                    });
                    return;
                }

                mega.fileRequest.dialogs.createSuccessDialog.init({
                    ph: puHandleObject.ph,
                    p: puHandleObject.p,
                    h: puHandleObject.h
                });
                return;
            }

            loadingDialog.show();

            delay('filerequest.log', eventlog.bind(null, 99773)); // create event
            const response = await this
                .api
                .create(handle, title, description)
                .catch((ex) => {
                    dump(ex);
                    loadingDialog.hide();
                    msgDialog('warninga', l[135], l[47], api_strerror(ex));
                });

            if (!Array.isArray(response)) {
                // Page is already existing but the local data was not updated
                // or maybe encountered an error
                const publicHandle = response;
                await this.api
                    .remove(handle)
                    .catch(dump);

                await this.storage.addPuHandle(
                    handle,
                    publicHandle, {
                        msg: title,
                        description: description
                    },
                    null,
                    requesti
                ).catch(dump);
                return;
            }

            const publicHandle = response[0];
            const pagePublicHandle = response[1];

            await this.storage.addPuHandle(
                handle,
                publicHandle, {
                    msg: title,
                    description: description
                },
                pagePublicHandle,
                requesti
            ).catch(dump);
        }

        async update(handle, title, description) {
            const puHandleObject = this.storage.getPuHandleByNodeHandle(handle);

            if (!puHandleObject || puHandleObject && !puHandleObject.p) {
                return;
            }

            loadingDialog.show(); // Show dialog
            await this.api
                .update(puHandleObject.p, title, description)
                .catch(dump);

            this.storage
                .updatePuHandle(
                    handle,
                    title,
                    description
                );

            this.storage
                .updatePuPage(
                    puHandleObject.p,
                    title,
                    description
                );

            if (is_mobile) {
                this.dialogs.successMobileDialog.init({
                    ph: puHandleObject.ph,
                    p: puHandleObject.p,
                    h: puHandleObject.h
                }, true);
            }

            loadingDialog.hide();
        }

        publicFolderExists(h, p = false) {
            const e = this.storage.cache.puHandle[h];

            return e && e.s !== 1 && (!p || e.p);
        }

        removeList(handles, quiet) {
            if (typeof handles === 'string') {
                handles = [handles];
            }

            if (!Array.isArray(handles)) {
                handles = [];
            }

            const promises = [];
            const responses = {
                error: 0,
                success: 0,
                items: Object.create(null)
            };

            if (handles.length && !quiet) {
                loadingDialog.show();
            }

            for (let index = handles.length; index--;) {
                const puHandleNodeHandle = handles[index];

                const puHandleObject = this.storage.getPuHandleByNodeHandle(puHandleNodeHandle);

                const promise = puHandleObject ?
                    new Promise((resolve, reject) => {
                        this.api
                            .remove(puHandleNodeHandle)
                            .then((res) => {
                                responses.success++;
                                responses.items[puHandleNodeHandle] = {
                                    response: res
                                };
                                resolve(res);
                            })
                            .catch((ex) => {
                                responses.error++;
                                responses[puHandleNodeHandle] = {
                                    error: ex
                                };
                                reject(ex);
                            });
                    }) :
                    Promise.reject(new MEGAException(`Public Handle Object not found Node: ${puHandleNodeHandle}`));

                promises.push(promise);
            }

            if (promises.length) {
                return Promise.allSettled(promises)
                    .finally(() => {
                        if (!quiet && responses.error) {
                            if (d) {
                                logger.error('PUF Remove List Error', responses);
                            }
                            loadingDialog.hide();
                        }
                        return responses.items;
                    });
            }
        }

        async remove(handle, quiet) {
            const puHandleObject = this.storage.getPuHandleByNodeHandle(handle);

            if (!puHandleObject) {
                return;
            }

            if (!quiet) {
                loadingDialog.show(); // Show dialog
            }

            return this.api
                .remove(handle)
                .catch((ex) => {
                    if (!quiet) {
                        loadingDialog.hide(); // Hide dialog
                    }
                    dump(ex);
                    throw ex;
                });
        }

        removePuPage(publicUploadPage) {
            const nodeHandle = this
                .storage
                .removePuPage(publicUploadPage.p, publicUploadPage.ph);

            if (nodeHandle) {
                mBroadcaster
                    .sendMessage(`FileRequest:pufRemoved_${nodeHandle}`);
            }
        }

        processPuPageFromDB(dbData) {
            return this.storage.processPuPageFromDB(dbData);
        }

        processPuHandleFromDB(dbData) {
            return this.storage.processPuHandleFromDB(dbData);
        }

        async refreshPuPageList() {
            const puPageList = await this.api.getPuPageList().catch(dump);

            const errorNonExistent = ENOENT;
            const isDebug = d;
            const fileRequestCommonObject = mega.fileRequestCommon;

            for (let index = puPageList.length; index--;) {
                const puPageId = puPageList[index].p;
                const puHandleId = puPageList[index].ph;
                const puHandleState = puPageList[index].s;

                if (!puPageId) {
                    if (isDebug) {
                        logger.error(
                            'FileRequest.refreshPuPageList - Abnormal state - no puPageId',
                            puPageList[index]
                        );
                    }

                    return;
                }

                this.storage.saveOrUpdatePuHandle(
                    {
                        state: puHandleState,
                        publicHandle: puHandleId,
                        pagePublicHandle: puPageId
                    }
                );

                this.api.getPuPage(puPageId)
                    .then((puPage) => {
                        this.storage.addPuPage(puPage);

                        const currentPuPage = this.storage.getPuPageByPageId(puPage.p);
                        if (currentPuPage && puPage.d) {
                            this.storage
                                .updatePuHandle(
                                    currentPuPage.h,
                                    puPage.d.msg,
                                    puPage.d.description
                                );
                        }

                        fileRequestCommonObject.addFileRequestIcon(puHandleId);
                    })
                    .catch(
                        (ex) => {
                            if (ex === errorNonExistent) {
                                this.storage.removePuPage(puPageId, puHandleId);

                                if (isDebug) {
                                    logger.warn(
                                        'FileRequest.refreshPuPageList - Api.getPuPage - Page does not exist',
                                        puHandleId,
                                        puPageId,
                                        ex
                                    );
                                }
                                return;
                            }

                            if (isDebug) {
                                logger.warn(
                                    'FileRequest.refreshPuPageList - Api.getPuPage - Something went wrong',
                                    puHandleId,
                                    puPageId,
                                    ex
                                );
                            }
                        }
                    );
            }
        }

        async processUploadedPuHandles(actionPacket) {
            await this.actionHandler
                .processUploadedPuHandles(actionPacket);

            this.refreshPuPageList();
        }

        getPuHandleList() {
            return this.storage.getPuHandleList();
        }

        rebindListManageIcon(options) {
            const iconHandler = options && options.iconHandler || null;
            if (!iconHandler) {
                return;
            }

            $('.grid-scrolling-table .grid-file-request-manage', document)
                .rebind('click.frlm', function(ev) {
                    return iconHandler.call(this, true, 'tr', ev, {
                        post: (selected) => {
                            if (M.isInvalidUserStatus()) {
                                return;
                            }

                            mega.fileRequest.dialogs.manageDialog.init({
                                h: selected
                            });
                        }
                    });
                });
        }

        rebindTopMenuCreateIcon() {
            $('.fm-header-buttons .fm-new-file-request', document)
                .rebind('click.frtmc', openNewDialogHandler);
        }

        rebindPageEmptyCreateButton() {
            $('.fm-empty-file-requests .fm-new-file-request', document)
                .rebind('click.frpec', openNewDialogHandler);
        }

        showRemoveWarning(list) {
            return new Promise((resolve, reject) => {
                const fldName = list.length > 1
                    ? l[17626]
                    : l[17403].replace('%1', escapeHTML(M.d[list[0]].name));

                const ack = () => {
                    onIdle(closeDialog);
                    mega.fileRequest.removeList(list).always(dump).finally(resolve);
                };

                if (is_mobile) {
                    mobile.messageOverlay.show(fldName, l[18229], false, ['No', 'Yes']).then(ack).catch(reject);
                }
                else {
                    msgDialog('confirmation', l[1003], fldName, l[18229], (result) => {
                        if (result) {
                            return ack();
                        }
                        reject();
                    });
                }


            });
        }

        showCreateMobileDialog(nodeHandle) {
            mega.fileRequest.dialogs.createMobileDialog.init(nodeHandle);
        }

        showManageMobileDialog(nodeHandle) {
            mega.fileRequest.dialogs.manageMobileDialog.init({
                h: nodeHandle
            });
        }

        /**
         * Make sure that user knows that FileRequest wiil be cancelled if any
         * full shares or public links are available for target
         * @param {Array} handles Array of nodes id which will be moved
         * @param {Boolean} target Target node
         *
         * @returns {Promise} returns premove check promise
         */
        async preMoveCheck(handles, target) {
            const selected = Array.isArray(handles) ? handles : [handles];
            let list = [];

            // Is there any FileRequest active for given handles?
            // Count for precise dlg message, will loop to the
            // end in case there is not FileRequest or if only 1 found
            for (let i = selected.length; i--;) {
                list = list.concat(mega.fileRequestCommon.storage.isDropExist(selected[i]));
            }

            if (!list.length) {
                return [selected, target];
            }

            const isShared = await shared(target);
            if (!isShared) {
                const share = new mega.Share({});
                if (!share.isShareExist([target], false, true)) { // Search pending shares .ps
                    return [selected, target];
                }
            }

            await this.showRemoveWarning(list);
            return [selected, target];
        }

        /**
         * Update PUH data
         * @param {String} id Node id
         * @param {String} type 'msg' folder name, 'name' full name, 'email' email
         * @param {String} value
         *
         * @returns {Promise} update result
         */
        async updatePuHandleAttribute(nodeHandle, type, value) {
            if (!fminitialized) {
                return false;
            }

            const puHandleObject = this.storage.getPuHandleByNodeHandle(nodeHandle);
            if (!puHandleObject || type === 'msg' && value === puHandleObject.fn) {
                return false;
            }

            let name = u_attr.name;
            const puPageObject = this.storage.getPuPageByPageId(puHandleObject.p);
            if (puPageObject) {
                name = puPageObject.name;
            }

            let { t: msg, d: description } = puHandleObject.d;

            switch (type) {
                case 'name':
                    name = value;
                    break;
                case 'msg':
                    msg = value;
                    break;
                case 'description':
                    description = value;
                    break;
            }

            await this.api
                .update(
                    puHandleObject.p,
                    msg,
                    description,
                    name
                )
                .catch((ex) => {
                    dump(ex);
                    msgDialog('warninga', l[135], l[47], api_strerror(ex));
                });
        }

        async onRename(nodeHandle, newName) {
            const puHandleObject = this.storage.cache.puHandle[nodeHandle];
            if (!puHandleObject) {
                return false;
            }

            this.updatePuHandleAttribute(nodeHandle, 'msg', newName);

            this.storage.updatePuHandleFolderName(nodeHandle, newName);
            this.storage.updatePuPageFolderName(puHandleObject.p, newName);
        }

        async onUpdateUserName(newName) {
            const puHandleObjects = this.storage.cache.puHandle;
            if (!Object.keys(puHandleObjects).length) {
                return false;
            }

            for (const key in puHandleObjects) {
                if (Object.hasOwnProperty.call(puHandleObjects, key)) {
                    const puHandle = puHandleObjects[key];
                    if (puHandle.p) {
                        this.updatePuHandleAttribute(puHandle.h, 'name', newName);
                    }
                }
            }

            return true;
        }
    };
});
