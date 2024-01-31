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
        if (selectedNodeHandle) {
            mega.fileRequest.dialogs.createDialog.init(selectedNodeHandle);
        }
    };

    const openNewDialogHandler = () => {
        openNewFileRequestDialog()
            .then(openCreateDialogFromSelect)
            .catch(dump);
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
            this.$previewButtonFooter = new mega.fileRequestUI.PreviewButtonComponent(
                $('footer .file-request-preview-button', this.$dialog)
            );
            this.$previewButtons = new mega.fileRequestUI.PreviewButtonComponent(
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
                            max: 500,
                            message: l.file_request_dialog_label_desc_invalid,
                            formatMessage: true
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
            this.$previewButtons.setOptions({
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
            this.$previewButtonFooter.getInput().addClass('hidden');
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
                this.$previewButtonFooter.getInput().removeClass('hidden');
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

                const $scrollableYRail = $('.ps__rail-y', $scrollableContent);
                if ($scrollableYRail.length) {
                    $('.ps__rail-y', $scrollableContent).trigger('click');
                    $scrollableContent.scrollTop(0);
                }
            });
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

                const title = this.commonDialog.$inputTitle.getValue();
                const description = this.commonDialog.$inputDescription.getValue();

                mega.fileRequest.create(this.context.nodeHandle, title, description).catch(dump);
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
            loadingDialog.hide();

            this.puHandleObject = mega.fileRequest.storage.getPuHandleByPublicHandle(context.ph);
            if (!this.puHandleObject) {
                if (d) {
                    logger.info('CreateSuccessDialog.init - No puHandleObject found', context);
                }
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
            loadingDialog.hide();

            this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(context.h);
            if (!this.puHandleObject) {
                if (d) {
                    logger.info('ManageDialog.init - No puHandleObject found', context);
                }
                return;
            }

            if (d) {
                logger.info('ManageDialog.init - puHandleObject found', this.puHandleObject);
            }
            this.puPagePublicHandle = this.puHandleObject.p;

            M.safeShowDialog('file-request-manage-dialog', () => {
                eventlog(99774);

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

                this.commonDialog.initScrollbar();
                return this.commonDialog.$dialog;
            });
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
            if (d > 1) {
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
                const type = `confirmation:!^${l.file_request_action_remove_prompt_button}!${l[82]}`;

                const _remove = () => {
                    mLoadingSpinner.show('puf-remove');

                    mega.fileRequest.remove(selectedNodeHandle, true)
                        .catch((ex) => {
                            if (ex !== ENOENT) {
                                logger.error(ex);
                                return;
                            }

                            onIdle(refreshFileRequestPageList);
                            return mega.fileRequest.storage.removePuPageByNodeHandle(selectedNodeHandle);
                        })
                        .finally(() => {
                            mLoadingSpinner.hide('puf-remove');
                        });

                    selectionManager.clear_selection();
                    showToast('warning2', l.file_request_action_remove);
                };

                msgDialog(type, title, message, description, (res) => res && _remove(), 1);
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

    /** @class mega.fileRequest */
    return new class FileRequest {
        constructor() {
            this.contextMenu = new FileRequestContextMenu();

            lazy(this, 'actionHandler', () => mega.fileRequestCommon.actionHandler);
            lazy(this, 'storage', () => mega.fileRequestCommon.storage);
            lazy(this, 'fileRequestApi', () => mega.fileRequestCommon.fileRequestApi);
            lazy(this, 'generator', () => mega.fileRequestCommon.generator);

            this.dialogs = {};

            lazy(this, 'commonDialog', () => new CommonDialog);
            lazy(this.dialogs, 'createDialog', () => new CreateDialog);
            lazy(this.dialogs, 'createSuccessDialog', () => new CreateSuccessDialog);
            lazy(this.dialogs, 'manageDialog', () => new ManageDialog);
        }

        async create(handle, title, description) {
            let puHandleObject = this.storage.getPuHandleByNodeHandle(handle);

            if (!puHandleObject) {

                puHandleObject = await this.fileRequestApi.create(handle, title, description)
                    .then((res) => {
                        const {pkt: {pup: {p}}, result: [ph, puf]} = res;
                        const c = this.storage.getPuHandleByNodeHandle(handle);

                        assert(c && c.p === p && c.ph === ph && c.p === puf, 'Invalid API response.', res, [c]);

                        onIdle(refreshFileRequestPageList);
                        this.storage.updatePuPage(c.p, title, description);
                        this.storage.updatePuHandle(c.h, title, description);

                        return c;
                    });
            }

            if (is_mobile) {
                eventlog(99834);
                mobile.fileRequestManagement.showFRUpdatedSheet(false);
            }
            else {
                mega.fileRequest.dialogs.createSuccessDialog.init({...puHandleObject});
            }
        }

        async update(handle, title, description) {
            const puHandleObject = this.storage.getPuHandleByNodeHandle(handle);

            if (!puHandleObject || puHandleObject && !puHandleObject.p) {
                return;
            }

            loadingDialog.show(); // Show dialog
            await this.fileRequestApi
                .update(puHandleObject.p, title, description)
                .catch(dump);

            this.storage.updatePuHandle(handle, title, description);
            this.storage.updatePuPage(puHandleObject.p, title, description);

            if (is_mobile) {
                mobile.fileRequestManagement.showFRUpdatedSheet(true);
            }

            loadingDialog.hide();
        }

        publicFolderExists(h, p = false) {
            const e = this.storage.cache.puHandle[h];

            return e && e.s !== 1 && (!p || e.p);
        }

        async removeList(handles, quiet) {
            if (typeof handles === 'string') {
                handles = [handles];
            }

            if (!Array.isArray(handles)) {
                handles = [];
            }

            if (handles.length && !quiet) {
                loadingDialog.pshow();
            }

            const promises = [];
            for (let index = handles.length; index--;) {
                const puHandleNodeHandle = handles[index];
                const puHandleObject = this.storage.getPuHandleByNodeHandle(puHandleNodeHandle);

                if (!puHandleObject) {
                    logger.warn(`Public Handle Object not found for Node: ${puHandleNodeHandle}`);
                }
                promises.push(this.fileRequestApi.remove(puHandleNodeHandle));
            }

            return Promise.allSettled(promises).finally(() => !quiet && loadingDialog.phide());
        }

        async remove(handle, quiet) {
            const puHandleObject = this.storage.getPuHandleByNodeHandle(handle);

            if (!puHandleObject) {
                return;
            }

            if (!quiet) {
                loadingDialog.show(); // Show dialog
            }

            return this.fileRequestApi.remove(handle)
                .finally(() => {
                    if (!quiet) {
                        loadingDialog.hide();
                    }
                });
        }

        removePuPage(publicUploadPage) {

            return this.storage.removePuPage(publicUploadPage.p, publicUploadPage.ph);
        }

        processPuPageFromDB(dbData) {
            return this.storage.processPuPageFromDB(dbData);
        }

        processPuHandleFromDB(dbData) {
            return this.storage.processPuHandleFromDB(dbData);
        }

        async getPuPage(puPageId, puHandleId) {

            return this.fileRequestApi.getPuPage(puPageId)
                .then(({result: puPage}) => {
                    this.storage.addPuPage(puPage);

                    const currentPuPage = this.storage.getPuPageByPageId(puPage.p);
                    if (currentPuPage && puPage.d) {
                        this.storage.updatePuHandle(currentPuPage.h, puPage.d.msg, puPage.d.description);
                    }

                    return puPage;
                })
                .catch((ex) => {
                    if (ex === ENOENT) {
                        this.storage.removePuPage(puPageId, puHandleId);

                        if (d) {
                            logger.warn('getPuPage(%s) Not found.', puPageId, puHandleId, ex);
                        }
                        return;
                    }

                    throw ex;
                });
        }

        async refreshPuPageList() {
            const promises = [];
            const {result: puPageList} = await this.fileRequestApi.getPuPageList();

            for (let index = puPageList.length; index--;) {
                const puPageId = puPageList[index].p;
                const puHandleId = puPageList[index].ph;
                const puHandleState = puPageList[index].s;

                if (!puPageId) {
                    if (d) {
                        logger.error(
                            'FileRequest.refreshPuPageList - Abnormal state - no puPageId',
                            puPageList[index]
                        );
                    }

                    continue;
                }

                // Lets check puHandle
                const nodeHandle = this.storage.getNodeHandleByPuHandle(puHandleId);
                if (nodeHandle) {
                    this.storage.saveOrUpdatePuHandle(
                        {
                            nodeHandle,
                            state: puHandleState,
                            publicHandle: puHandleId,
                            pagePublicHandle: puPageId
                        }
                    );

                    promises.push(this.getPuPage(puPageId, puHandleId));
                }
                else {
                    this.storage.removePuHandle(null, puHandleId);
                }
            }

            return Promise.all(promises);
        }

        async processUploadedPuHandles(fetchNodesResponse) {
            this.actionHandler.processUploadedPuHandles(fetchNodesResponse);
            return this.refreshPuPageList();
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

                msgDialog('confirmation', l[1003], fldName, l[18229], (result) => {
                    if (result) {
                        return ack();
                    }
                    reject(EBLOCKED);
                });
            });
        }

        /**
         * Make sure that user knows that FileRequest wiil be cancelled if any
         * full shares or public links are available for target
         * @param {Array} handles Array of nodes id which will be moved
         * @param {String} target Target node
         *
         * @returns {Promise} returns premove check promise
         */
        async preMoveCheck(handles, target) {
            const list = [];
            const selected = Array.isArray(handles) ? handles : [handles];

            // Is there any FileRequest active for given handles?
            // Count for precise dlg message, will loop to the
            // end in case there is not FileRequest or if only 1 found
            for (let i = selected.length; i--;) {
                list.push(...mega.fileRequestCommon.storage.isDropExist(selected[i]));
            }

            if (list.length) {
                const isShared = await shared(target) || new mega.Share({}).isShareExist([target], false, true);

                if (isShared) {
                    await this.showRemoveWarning(list);
                }
            }

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

            await this.fileRequestApi
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
