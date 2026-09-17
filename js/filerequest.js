/* eslint-disable max-classes-per-file */
/**
 * @property {FileRequest} mega.fileRequest
 */
lazy(mega, 'fileRequest', () => {
    'use strict';

    const logger = MegaLogger.getLogger('FileRequest');

    const { linkSettings } = mega.fileRequestCommon;

    const refreshFileRequestPageList = () => {
        if (fminitialized && M.currentdirid === 'file-requests') {
            M.openFolder(M.currentdirid, true);
        }
    };

    const openCreateDialogFromSelect = (selectedNodeHandle) => {
        if (selectedNodeHandle) {
            mega.fileRequest.dialogs.createDialog.init(selectedNodeHandle, true);
        }
    };

    class BaseDialog {
        setShareLink() {
            if (!this.$shareLink) {
                return;
            }

            this.$shareLink.update({
                puPagePublicHandle: this.puPagePublicHandle,
                link: this.puPageLink
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
            this.copyFooter = false;

            this.previewButtonFooter = false;

            this.stop = false;
            this.puPagePublicHandle = null;
            this.puPageLink = null;
            this.linkUpdated = false;

            this.$dialog = $('.file-request', document.body);
            this.dialogClassBackup = this.$dialog.prop('class');

            this.$sectionDivider = $('.divider', this.$dialog);
            this.$sectionPrimary = $('.content-block.primary', this.$dialog);
            this.$sectionSecondary = $('.content-block.secondary', this.$dialog);
            this.linkBanner = this.$sectionSecondary[0].querySelector('.link-banner');
            this.$scrollableContent = $('.content .scrollable', this.$dialog);

            // Header
            this.$headerTitle = $('header .dialog-title', this.$dialog);
            this.$headerCaption = $('header .dialog-caption', this.$dialog);
            this.headerBack = new MegaButton({
                prepend: true,
                parentNode: this.$headerTitle[0].parentNode,
                type: 'icon',
                componentClassname: 'hidden transparent-icon text-icon secondary dialog-back',
                icon: 'sprite-fm-mono icon-arrow-left-regular-outline',
                onClick: () => {
                    if (this.closeWarning) {
                        showLoseChangesWarning().then(() => this.init()).catch(nop);
                        return;
                    }
                    this.init();
                }
            });

            // Primary
            this.$selectFolderContainer = $('.form-row.select-folder', this.$sectionPrimary);
            this.$selectFolder = new mega.fileRequestUI.SelectFolderComponent(this.$dialog);

            this.$previewButtonFooter = new mega.fileRequestUI.PreviewButtonComponent(
                $('footer .file-request-preview-button', this.$dialog)
            );
            this.$previewButtons = new mega.fileRequestUI.PreviewButtonComponent(
                $('.content .file-request-preview-button', this.$dialog)
            );

            this.$inputTitle = new mega.fileRequestUI.ValidatableInputComponent(
                $('.file-request-title', this.$sectionPrimary), {
                    validations: {
                        limit: {
                            max: 80,
                            message: l.file_request_dialog_label_title_invalid
                        },
                        required: {
                            message: l.file_request_dialog_label_title_required
                        },
                        postValidation: ($input, result) => {
                            this.$previewButtonFooter.getInput()
                                .toggleClass('hidden', !(result && this.previewButtonFooter));
                        }
                    },
                    namespace: this.namespace
                }
            );

            const descMount = this.$sectionPrimary[0].querySelector('.file-request-description');
            const descWrapper = descMount.closest('.mega-input-wrapper');
            const descMessage = descWrapper.querySelector('.message-container');
            const descTextArea = new MegaTextArea({
                parentNode: descMount,
                componentClassname: 'fr-desc',
                placeholder: l.info_panel_description_add,
                minHeight: 64,
                maxHeight: 64,
                id: 'frDesc',
            });

            this.$inputDescription = {
                options: {
                    validations: {
                        limit: {
                            max: 500,
                            message: l.file_request_dialog_label_desc_invalid,
                            formatMessage: true
                        },
                    },
                    namespace: this.namespace
                },
                getInput() {
                    return $(descTextArea.textArea);
                },
                getValue() {
                    return descTextArea.value;
                },
                setOptions(options) {
                    this.options = { ...this.options, ...options };
                },
                validate() {
                    const { limit } = this.options.validations || {};
                    const max = limit && limit.max || 0;
                    const invalid = !!max && descTextArea.value.length > max;
                    descWrapper.classList.toggle('error', invalid);
                    descWrapper.classList.toggle('msg', invalid);
                    descTextArea.textArea.classList.toggle('errored', invalid);
                    if (invalid) {
                        descMessage.textContent =
                            limit.formatMessage ? mega.icu.format(limit.message, max) : limit.message;
                    }
                    return !invalid;
                },
                handleInput() {
                    const result = this.validate();
                    if (typeof this.options.post === 'function') {
                        this.options.post(this, this.options, result);
                    }
                    return result;
                },
                setValue(newValue) {
                    descTextArea.value = newValue || '';
                    this.handleInput();
                    onIdle(() => descTextArea.adjustHeight());
                },
                reset() {
                    descTextArea.value = '';
                    this.handleInput();
                }
            };

            descTextArea.on('focusin.fr', () => {
                descTextArea.spellcheck = true;
            });
            descTextArea.on('focusout.fr', () => {
                descTextArea.spellcheck = false;
            });
            descTextArea.on('keydown.fr', (ev) => {
                ev.stopPropagation();
            });
            descTextArea.on('input.fr', () => this.$inputDescription.handleInput());

            // Secondary
            this.$embedOption = $('.fr-embed-option-container', this.$dialog);
            MegaButton.factory({
                parentNode: this.$embedOption[0],
                type: 'icon',
                componentClassname: 'transparent-icon text-icon secondary embed-page',
                icon: 'sprite-fm-mono icon-chevron-right-thin-outline',
                onClick: () => {
                    this.viewEmbed();
                }
            });

            this.$sectionEmbed = $('.content-block.fr-embed', this.$dialog);

            this.$embedCode = new mega.fileRequestUI.EmbedCodeInputComponent(
                $('.file-request-embed-code', this.$dialog)
            );
            this.$shareLink = new mega.fileRequestUI.ShareLinkInputComponent(
                $('.file-request-share-link', this.$dialog)
            );
            this.$copyButton = new mega.fileRequestUI.ClassCopyButtonComponent(this.$dialog, {
                copy: {
                    'fr-theme-r': {
                        content: () => $('.fr-theme-r', this.$dialog).text(),
                        toastText: l.file_request_action_copy_code,
                        className: 'clipboard-embed-code'
                    },
                    'fr-theme-d': {
                        content: () => $('.fr-theme-d', this.$dialog).text(),
                        toastText: l.file_request_action_copy_code,
                        className: 'clipboard-embed-code'
                    },
                    'fr-theme-l': {
                        content: () => $('.fr-theme-l', this.$dialog).text(),
                        toastText: l.file_request_action_copy_code,
                        className: 'clipboard-embed-code'
                    },
                    'file-request-share-link': {
                        content: () => this.$shareLink.getContent(),
                        toastText: l.file_request_action_copy_link
                    },
                },
                namespace: this.namespace
            });

            this.qrPopup = null;
            this.qrCodeNode = null;
            this.qrButton = new MegaButton({
                parentNode: this.$dialog[0].querySelector('.input-share'),
                icon: 'sprite-fm-mono icon-qr-thin-outline',
                type: 'icon',
                componentClassname: 'transparent-icon text-icon secondary icon-only qr',
                dataset: { simpletip: l[17754] },
                onClick: () => this.toggleShareLinkQR()
            });

            this.$dialog.rebind('click.frpopups', (ev) => {
                if (this.qrPopup && !this.qrPopup.classList.contains('hidden')
                    && !this.qrPopup.contains(ev.target) && !this.qrButton.domNode.contains(ev.target)) {
                    this.hideShareLinkQR();
                }
                const sizeUnit = ev.target.closest('.file-size-unit');
                if (mega.ui.menu.name === 'picker-fr-size-unit' && !sizeUnit) {
                    this.$dialog[0].querySelector('.file-size-unit').classList.remove('active');
                    mega.ui.menu.hide();
                }
            });

            // Footer
            this.$footer = $('footer', this.$dialog);
            this.$removeButton = new mega.fileRequestUI.ButtonComponent($('.file-request-remove-button', this.$dialog));
            this.saveButton = new MegaButton({
                parentNode: this.$dialog[0].querySelector('footer .button-container'),
                text: l.msg_dlg_save,
                componentClassname: 'primary file-request-save-button'
            });
            this.createCopyButton = new MegaButton({
                parentNode: this.$dialog[0].querySelector('footer .button-container'),
                text: l.copy_link,
                componentClassname: 'primary file-request-create-copy',
                onClick: () => {
                    copyToClipboard(this.$shareLink.getContent());
                    mega.ui.toast.show(l[1642]);
                    closeDialog();
                }
            });
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

            const titleDescInputPostCallback = (selfObject, options, result) => {
                const $formRow = selfObject.getInput().closest('.form-row');
                const $charCount = $('.char-count', $formRow);
                const limit = options &&
                    options.validations &&
                    options.validations.limit ||
                    0;

                if (this.saveButton) {
                    const $other = selfObject === this.$inputTitle ? this.$inputDescription : this.$inputTitle;
                    const otherValid = $other.validate();
                    const titleValid = selfObject === this.$inputTitle ? result : otherValid;
                    const hasNode = this.$selectFolder.nodeHandle || this.puPagePublicHandle;

                    this.saveButton.disabled = true;
                    if (result && otherValid && hasNode) {
                        this.saveButton.disabled = false;
                    }

                    this.$previewButtons.$input.hide();
                    if (titleValid && hasNode) {
                        this.$previewButtons.$input.show();
                    }
                }

                if ($charCount.length && limit && limit.max) {
                    const charLength = selfObject.getValue().length;
                    $charCount.text(`${charLength}/${limit.max}`);
                }
                else {
                    $charCount.text(``);
                }
            };

            this.$inputTitle.setOptions({
                post: titleDescInputPostCallback
            });

            this.$inputDescription.setOptions({
                post: titleDescInputPostCallback
            });

            const previewOptions = {
                namespace: this.namespace,
                callback: () => {
                    const title = this.$inputTitle.getValue();
                    const description = this.$inputDescription.getValue();
                    const page = this.puPagePublicHandle
                        && mega.fileRequest.storage.getPuPageByPageId(this.puPagePublicHandle);
                    const { expiry, size } = linkSettings.read(page);

                    return {
                        name: u_attr.name,
                        title,
                        description,
                        theme: u_attr && u_attr['^!webtheme'] !== undefined ? u_attr['^!webtheme'] : '',
                        pupHandle: this.puPagePublicHandle || null,
                        expiry,
                        size
                    };
                }
            };

            this.$previewButtons.setOptions(previewOptions);
            this.$previewButtonFooter.setOptions(previewOptions);

            this.$copyButton.addEventHandlers();

            this.$linkSettings = $('.fr-link-settings', this.$dialog);
            this.linkSettingsLabel = this.$linkSettings[0].parentNode.querySelector('label');
            this.settingsBlock = this.$dialog[0].querySelector('.fr-settings');
            this.expiryBlock = this.settingsBlock.querySelector('.expiry');
            this.expiryPro = this.expiryBlock.querySelector('.badge');
            this.passwordBlock = this.settingsBlock.querySelector('.password');
            this.passwordPro = this.passwordBlock.querySelector('.badge');
            this.sizeBlock = this.settingsBlock.querySelector('.size');
            this.sizePro = this.sizeBlock.querySelector('.badge');
            this.folderBlock = this.settingsBlock.querySelector('.folders');
            this.expirySetting = this.expiryBlock.querySelector('.expiry-picker');
            this.passwordSetting = this.passwordBlock.querySelector('.password-input');
            this.sizeSetting = this.sizeBlock.querySelector('.file-size-wrap');
            this.$dateInput = $('.set-date', this.settingsBlock);
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
            this.copyFooter = false;

            this.previewButtonFooter = false;

            this.stop = false;
            this.puPagePublicHandle = null;
            this.puPageLink = null;
            this.linkUpdated = false;

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

            // Reset Divider
            this.$sectionDivider.addClass('hidden');

            // Reset section
            this.$sectionSecondary.addClass('hidden');
            this.linkBanner.classList.add('hidden');

            // Footer
            this.$previewButtonFooter.getInput().addClass('hidden');
            this.$removeButton.getInput().addClass('hidden');
            this.$closeButtonFooter.addClass('hidden').removeClass('positive');
            this.saveButton.hide();
            this.saveButton.removeClass('positive');
            this.saveButton.loading = false;
            this.saveButton.text = l.msg_dlg_save;

            if (this.qrPopup) {
                this.qrPopup.classList.add('hidden');
                this.qrButton.removeClass('active');
            }

            // dialog
            this.$dialog.off('dialog-closed');
            this.linkSettingsLabel.textContent = l.file_request_dialog_label_url;
            this.createCopyButton.hide();
        }

        initScrollbar(options) {
            initPerfectScrollbar(this.$scrollableContent, options || {});
            this.triggerClickOnRail(this.$scrollableContent);
        }

        resetScroll() {
            const scrollableContent = this.$scrollableContent[0];
            scrollableContent.scrollTop = 0;
            onIdle(() => Ps.update(scrollableContent));
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

            this.$sectionEmbed.addClass('hidden');
            this.settingsBlock.classList.add('hidden');
            this.$dialog.removeClass('fr-link-settings fr-embed-view');

            this.setFooter();
            this.resetScroll();
        }

        setFooter() {
            this.$footer.removeClass('hidden');

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
                this.saveButton.show();
                if (this.savePositive) {
                    this.saveButton.addClass('positive');
                }
                this.saveButton.text = this.save;
            }

            if (this.stop) {
                this.$removeButton.getInput().removeClass('hidden');
            }

            if (this.copyFooter) {
                this.createCopyButton.show();
            }
            this.saveButton.loading = false;
        }

        setSectionPrimary() {
            this.$sectionPrimary.removeClass('hidden');

            if (this.selectFolder) {
                this.$selectFolderContainer.removeClass('hidden');
            }
        }

        setSectionSecondary() {
            this.$sectionSecondary.removeClass('hidden');
            this.linkBanner.classList.toggle('hidden', !this.linkUpdated);
            this.linkUpdated = false;
        }

        setDialogHeader() {
            this.headerBack.hide();

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

        setEmbedCode() {
            if (!this.$embedCode) {
                return;
            }

            this.$embedCode.update({
                puPagePublicHandle: this.puPagePublicHandle
            });
        }

        viewEmbed() {
            this.$sectionPrimary.addClass('hidden');
            this.$sectionSecondary.addClass('hidden');
            this.$sectionDivider.addClass('hidden');
            this.$footer.addClass('hidden');
            this.$sectionEmbed.removeClass('hidden');
            this.headerBack.show();
            this.$headerTitle.text(l.file_request_dialog_label_embed);
            this.$dialog.addClass('fr-embed-view');
            this.resetScroll();
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

        hideShareLinkQR() {
            if (this.qrPopup) {
                this.qrPopup.classList.add('hidden');
            }
            this.qrButton.removeClass('active');
        }

        toggleShareLinkQR() {
            if (this.qrPopup && !this.qrPopup.classList.contains('hidden')) {
                this.hideShareLinkQR();
                return;
            }

            if (!this.qrPopup) {
                let content;
                this.qrPopup = mCreateElement('div', { class: 'qrcode-popup hidden' }, [
                    content = mCreateElement('div', { class: 'qrcode-popup-content' }, [
                        mCreateElement('div', { class: 'qrcode-popup-content-header' }, [
                            document.createTextNode(l[17754])
                        ]),
                        this.qrCodeNode = mCreateElement('div', { class: 'qrcode-popup-content-body' })
                    ])
                ], this.$dialog[0]);

                MegaButton.factory({
                    parentNode: content,
                    icon: 'sprite-fm-mono icon-dialog-close-thin',
                    type: 'icon',
                    componentClassname: 'text-icon close-qrcode',
                    onClick: () => this.hideShareLinkQR()
                });
            }

            const text = this.puPageLink
                || mega.fileRequest.generator.generateUrl(this.puPagePublicHandle);

            $(this.qrCodeNode).empty().qrcode({
                width: 168,
                height: 168,
                correctLevel: QRErrorCorrectLevel.H,
                background: 'rgba(255, 255, 255, 1)',
                foreground: 'rgba(0, 0, 0, 1)',
                text,
            });

            const rect = this.qrButton.domNode.getBoundingClientRect();
            const x = lang === 'ar' ? rect.left - 26 : rect.right + 26;
            const y = rect.top - 24;
            this.qrPopup.style.cssText = `top: ${y}px; left: ${x}px`;

            this.qrPopup.classList.remove('hidden');
            this.qrButton.addClass('active');
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

        init(selectedHandle, retainInput) {
            const title = retainInput ? this.commonDialog.$inputTitle.getValue() : '';
            const description = retainInput ? this.commonDialog.$inputDescription.getValue() : '';

            // Reset fields
            this.commonDialog.reset();
            this.setDialog();
            this.commonDialog.init();
            this.addEventHandlers();

            // Reset error messages
            this.setContext({
                nodeHandle: selectedHandle
            });

            this.fileObject = M.getNodeByHandle(selectedHandle);
            this.fileHandle = selectedHandle;
            this.folderName = this.fileObject && this.fileObject.name || null;
            this.commonDialog.$selectFolder.setFolder(this.folderName);
            this.commonDialog.$selectFolder.setNodeHandle(selectedHandle);
            this.commonDialog.$inputDescription.reset();
            this.commonDialog.$inputTitle.reset();
            this.commonDialog.$previewButtonFooter.getInput().addClass('hidden');

            if (title) {
                this.commonDialog.$inputTitle.setValue(title);
            }
            if (description) {
                this.commonDialog.$inputDescription.setValue(description);
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
            this.commonDialog.close = l.msg_dlg_cancel;
            this.commonDialog.save = l[158];
            this.commonDialog.savePositive = true;
            this.commonDialog.previewButtonFooter = true;
        }

        addEventHandlers() {
            this.commonDialog.saveButton.rebind('click.fr', () => {
                if (!this.context.nodeHandle) {
                    return;
                }

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

                this.commonDialog.$linkSettings.rebind('click.fr', () => {
                    const nodeHandle = this.puHandleObject.h;
                    closeDialog();
                    loadingDialog.show();
                    mega.fileRequest.dialogs.manageDialog.init({h: nodeHandle}, true).catch(dump);
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
            this.commonDialog.dialogCaption = false;
            this.commonDialog.sectionSecondary = true;
            this.commonDialog.close = false;
            this.commonDialog.puPagePublicHandle = this.puPagePublicHandle;
            this.commonDialog.linkSettingsLabel.textContent = l.file_request_dialog_success_desc;
            this.commonDialog.copyFooter = true;
        }
    }

    class ManageDialog {
        constructor() {
            this.context = null;
            this.puHandleObject = null;
            this.puPagePublicHandle = null;
            this.commonDialog = mega.fileRequest.commonDialog;

            this.settings = null;
            this.origSettings = null;
            this.datepicker = null;

            const {
                expiryBlock, passwordBlock, sizeBlock, folderBlock, passwordSetting, expirySetting, $dateInput,
                sizeSetting
            } = this.commonDialog;
            this.expirySwitch = new MegaToggleButton({
                parentNode: expiryBlock.querySelector('.settings-wrap'),
                componentClassname: 'mega-toggle-button',
                disabled: false,
                value: 'fr-show-expiry',
                checked: false,
                role: 'switch',
                onChange: () => {
                    expirySetting.classList.toggle('hidden', !this.expirySwitch.checked);
                    if (this.expirySwitch.checked) {
                        M.require('datepicker_js').done(() => this.initExpiryDatePicker());
                    }
                    else {
                        if (this.datepicker) {
                            this.datepicker.clear();
                        }
                        $dateInput.val('');
                        this.updateExpiry(0);
                    }
                    this.validateSettings();
                }
            });
            this.passwordSwitch = new MegaToggleButton({
                parentNode: passwordBlock.querySelector('.settings-wrap'),
                componentClassname: 'mega-toggle-button',
                disabled: false,
                value: 'fr-show-password',
                checked: false,
                role: 'switch',
                onChange: () => {
                    passwordSetting.classList.toggle('hidden', !this.passwordSwitch.checked);
                    if (this.passwordSwitch.checked && typeof zxcvbn === 'undefined') {
                        M.require('zxcvbn_js').done(() => this.validateSettings());
                    }
                    this.validateSettings();
                }
            });
            this.sizeSwitch = new MegaToggleButton({
                parentNode: sizeBlock.querySelector('.settings-wrap'),
                componentClassname: 'mega-toggle-button',
                disabled: false,
                value: 'fr-show-size',
                checked: false,
                role: 'switch',
                onChange: () => {
                    sizeSetting.classList.toggle('hidden', !this.sizeSwitch.checked);
                    this.updateSize();
                }
            });
            this.folderSwitch = new MegaToggleButton({
                parentNode: folderBlock.querySelector('.settings-wrap'),
                componentClassname: 'mega-toggle-button',
                disabled: false,
                value: 'fr-toggle-folders',
                checked: false,
                role: 'switch',
                onChange: () => {
                    this.settings.folder = this.folderSwitch.checked;
                    if (this.settings.folder !== this.origSettings.folder) {
                        this.commonDialog.closeWarning = true;
                    }
                }
            });

            this.passwordInput = new MegaInputComponent({
                parentNode: passwordSetting,
                className: 'form-element pmText no-title-top clearButton',
                wrapperClasses: 'pm box-style with-icon',
                password: true,
                messageIcons: true,
                placeholder: l.start_typing,
            });
            this.passwordInput.on('input.frpwd', () => {
                this.commonDialog.closeWarning = true;
                this.validatePassword();
            });
            this.passwordInput.on('blur.frpwd', () => this.validateSettings());
            this.sizeUnit = linkSettings.unit.MB;
            this.sizeInput = new MegaInputComponent({
                parentNode: sizeBlock.querySelector('.file-size-value'),
                className: 'form-element pmText no-title-top',
                messageIcons: true
            });
            this.sizeInput.input.type = 'number';
            this.sizeInput.input.min = '0';
            this.sizeInput.on('input.frsize', () => this.handleSizeInput());
            this.sizeUnitSelect = sizeBlock.querySelector('.file-size-unit');
            this.sizeUnitSelect.addEventListener('click', () => this.showSizeUnitMenu());
            this.sizeUnitMenu = document.createElement('div');
            this.sizeUnitMenu.className = 'file-size-units picker-list-wrap';
            const { unitLabels } = linkSettings;
            const unitKeys = Object.keys(unitLabels);
            for (let i = 0; i < unitKeys.length; i++) {
                const unit = unitKeys[i];
                const row = document.createElement('div');
                row.className = `option ${unit}`;
                row.dataset.unit = unit;
                const text = document.createElement('span');
                text.textContent = unitLabels[unit];
                row.appendChild(text);
                const check = document.createElement('i');
                check.className = 'checked sprite-fm-mono icon-check-thin-outline';
                row.appendChild(check);
                row.addEventListener('click', () => {
                    this.setSizeUnit(unit);
                    this.sizeUnitSelect.classList.remove('active');
                    mega.ui.menu.hide();
                });
                this.sizeUnitMenu.appendChild(row);
            }
        }

        async init(context, openSettings) {
            if (context) {
                this.setContext(context);
            }

            this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(context.h);
            if (!this.puHandleObject) {
                loadingDialog.hide();

                if (d) {
                    logger.info('ManageDialog.init - No puHandleObject found', context);
                }
                return;
            }

            if (d) {
                logger.info('ManageDialog.init - puHandleObject found', this.puHandleObject);
            }
            this.puPagePublicHandle = this.puHandleObject.p;

            const puPage = await mega.fileRequest
                .getPuPage(this.puPagePublicHandle, this.puHandleObject.ph)
                .catch(dump);
            const pageData = puPage && puPage.d;

            this.currentTitle = pageData && pageData.msg || this.puHandleObject.fn || '';
            this.currentDesc = pageData && pageData.description || '';

            loadingDialog.hide();

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
                this.commonDialog.$inputTitle.setValue(this.currentTitle);
                this.commonDialog.$inputDescription.setValue(this.currentDesc);

                this.commonDialog.initScrollbar();

                if (openSettings) {
                    this.viewSettings();
                }

                return this.commonDialog.$dialog;
            });
        }

        setDialog() {
            this.commonDialog.dialogClass = 'file-request-manage-dialog';
            this.commonDialog.dialogTitle = l.file_request_dialog_manage_title;

            this.commonDialog.closeWarning = true;
            this.commonDialog.sectionPrimary = true;
            this.commonDialog.close = l.msg_dlg_cancel;
            this.commonDialog.save = l.msg_dlg_save;
            this.commonDialog.savePositive = true;
            this.commonDialog.stop = true;

            this.commonDialog.sectionDivider = true;

            this.commonDialog.sectionSecondary = true;
            this.commonDialog.puPagePublicHandle = this.puPagePublicHandle;
        }

        setContext(context) {
            this.context = context;
        }

        addEventHandlers() {
            this.commonDialog.$linkSettings.rebind('click.fr', () => this.viewSettings());
            this.commonDialog.saveButton.rebind('click.fr', () => {
                if (!this.commonDialog.settingsBlock.classList.contains('hidden')) {
                    if (!this.commonDialog.closeWarning) {
                        return this.commonDialog.init();
                    }
                    this.commonDialog.saveButton.loading = '1';
                    this.saveSettings()
                        .then(() => this.commonDialog.init())
                        .catch(tell);
                    return;
                }
                if (!this.commonDialog.$inputTitle.validate()) {
                    return;
                }

                if (!this.commonDialog.$inputDescription.validate()) {
                    return;
                }

                this.commonDialog.saveButton.disabled = true;
                mega.fileRequest.update(
                    this.puHandleObject.h,
                    this.commonDialog.$inputTitle.getValue(),
                    this.commonDialog.$inputDescription.getValue()
                )
                    .then(() => {
                        this.commonDialog.saveButton.disabled = false;
                        closeDialog();
                    })
                    .catch(tell);
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
                            mega.ui.toast.show(l.file_request_action_remove);
                            selectionManager.clear_selection();
                        });
                };

                if (mega.config.get('frRemoveSkip')) {
                    removeDialogCallback(true);
                    return;
                }

                msgDialog(
                    `confirmation:!^${l.file_request_action_remove_prompt_button}!${l.stop_recording_nop_dialog_cta}`,
                    title,
                    message,
                    description,
                    removeDialogCallback,
                    'frRemoveSkip'
                );
            });
        }

        checkLoseChangesWarning() {
            if (!this.commonDialog.settingsBlock.classList.contains('hidden') && this.commonDialog.closeWarning) {
                return true;
            }

            if (this.commonDialog.$inputTitle.getValue() !== this.currentTitle ||
                this.commonDialog.$inputDescription.getValue() !== this.currentDesc) {
                return true;
            }
        }

        async saveSettings() {
            const previousLink = this.commonDialog.puPageLink;
            const password = this.passwordSwitch.checked && this.validatePassword()
                ? this.passwordInput.value
                : '';

            this.commonDialog.puPageLink = await linkSettings.save(this.puHandleObject, {
                title: this.commonDialog.$inputTitle.getValue(),
                description: this.commonDialog.$inputDescription.getValue(),
                settings: this.settings,
                password,
            });

            this.commonDialog.linkUpdated = this.commonDialog.puPageLink !== previousLink;

            this.puHandleObject =
                mega.fileRequest.storage.getPuHandleByNodeHandle(this.puHandleObject.h) || this.puHandleObject;

            this.commonDialog.setShareLink();
        }

        viewSettings() {
            this.commonDialog.$sectionPrimary.addClass('hidden');
            this.commonDialog.$sectionSecondary.addClass('hidden');
            this.commonDialog.$sectionDivider.addClass('hidden');
            this.commonDialog.headerBack.show();
            this.commonDialog.$headerTitle.text(l.link_settings);
            this.commonDialog.settingsBlock.classList.remove('hidden');
            this.commonDialog.$removeButton.$input.addClass('hidden');
            this.commonDialog.saveButton.text = l[19631];
            this.commonDialog.$dialog.addClass('fr-link-settings');
            this.commonDialog.resetScroll();

            this.settings = linkSettings.read(this.puHandleObject);
            this.origSettings = { ...this.settings };

            this.folderSwitch.setButtonState(!!this.settings.folder, true);

            const pro = !!(u_attr && u_attr.p);
            this.commonDialog.expiryPro.classList.toggle('hidden', pro);
            this.commonDialog.passwordPro.classList.toggle('hidden', pro);
            this.commonDialog.sizePro.classList.toggle('hidden', pro);
            if (!pro) {
                this.expirySwitch.hide();
                this.expirySwitch.setButtonState(false);
                this.commonDialog.expirySetting.classList.add('hidden');

                this.passwordSwitch.hide();
                this.passwordSwitch.setButtonState(false);
                this.commonDialog.passwordSetting.classList.add('hidden');

                this.sizeSwitch.hide();
                this.sizeSwitch.setButtonState(false);
                this.commonDialog.sizeSetting.classList.add('hidden');

                this.commonDialog.closeWarning = false;
                this.validateSettings();
                return;
            }

            this.expirySwitch.show();
            this.passwordSwitch.show();
            this.sizeSwitch.show();

            if (this.datepicker) {
                this.datepicker.clear();
            }
            if (this.settings.expiry) {
                M.require('datepicker_js').done(() => this.initExpiryDatePicker());
                this.updateExpiryInputText(new Date(this.settings.expiry * 1000));
            }
            else {
                this.commonDialog.$dateInput.val('');
            }

            this.sizeSwitch.setButtonState(!!this.settings.size);
            this.sizeUnit = linkSettings.unitFor(this.settings.size);
            this.sizeInput.value = linkSettings.fromBytes(this.settings.size, this.sizeUnit);
            this.sizeUnitSelect.querySelector('span').textContent = linkSettings.unitLabels[this.sizeUnit];

            this.expirySwitch.setButtonState(!!this.settings.expiry, true);
            this.commonDialog.expirySetting.classList.toggle('hidden', !this.settings.expiry);
            this.passwordInput.value = '';
            this.passwordValid = false;
            this.passwordSwitch.setButtonState(false, true);
            this.commonDialog.sizeSetting.classList.toggle('hidden', !this.settings.size);
            this.commonDialog.closeWarning = false;
            this.validateSettings();
        }

        initExpiryDatePicker() {
            if (this.datepicker) {
                return;
            }

            const { $dateInput } = this.commonDialog;
            const minDate = new Date();
            const maxDate = new Date(2060, 11, 31);
            this.datepicker = $dateInput.datepicker({
                // Date format, @ - Unix timestamp
                dateFormat: '@',
                classes: 'fr-expiry-calendar',
                minDate,
                maxDate,
                startDate: null,
                prevHtml: '<i class="sprite-fm-mono icon-chevron-left-thin-outline"></i>',
                nextHtml: '<i class="sprite-fm-mono icon-chevron-right-thin-outline"></i>',
                firstDay: 0,
                autoClose: true,
                toggleSelected: false,
                position: 'bottom left',
                language: {
                    // Sun - Sat
                    daysMin: [l[8763], l[8764], l[8765], l[8766], l[8767], l[8768], l[8769]],
                    months: [
                        l[408], l[409], l[410], l[411], l[412], l[413],     // January - June
                        l[414], l[415], l[416], l[417], l[418], l[419]      // July - December
                    ],
                    monthsShort: [
                        l[24035], l[24037], l[24036], l[24038], l[24047], l[24039],     // January - June
                        l[24040], l[24041], l[24042], l[24043], l[24044], l[24045]      // July - December
                    ]
                },
                onShow: (inst) => {
                    if (!inst.selectedDates.length && this.settings.expiry) {
                        inst.selectedDates.push(new Date(this.settings.expiry * 1000));
                    }
                    const newDate = inst.selectedDates[0];
                    const newOptions = {
                        'position': 'bottom left',
                        'offset': 12
                    };
                    if (screen.height <= 1080) {
                        newOptions.position = 'top left';
                        newOptions.offset = 40;
                    }
                    if (newDate) {
                        newOptions.date = newDate;
                        inst.update(newOptions);
                        this.updateExpiryInputText(newDate);
                    }
                    else {
                        inst.update(newOptions);
                    }

                    $(window).rebind('resize.setDatepickerPosition', () => {
                        inst.setPosition();
                    });
                },
                onSelect: (dateText, date) => {
                    this.updateExpiryInputText(date);
                    let expiry = 0;
                    if (date) {
                        // Set expiry to the end of the day to allow selecting today
                        const endOfDay = new Date(date);
                        endOfDay.setHours(23, 59, 59, 0);
                        expiry = Math.round(endOfDay.getTime() / 1000);
                    }
                    this.updateExpiry(expiry);
                },

                onHide: () => {
                    $(window).unbind('resize.setDatepickerPosition');
                }
            }).data('datepicker');
            $dateInput.closest('.mega-input').rebind('click.frExpiry', () => {
                $dateInput.trigger('focus');
            });
        }

        updateExpiryInputText(date) {
            if (!date) {
                return;
            }
            this.commonDialog.$dateInput.val(time2date(Math.round(date.getTime() / 1000), 2));
        }

        updateExpiry(timestamp) {
            this.settings.expiry = timestamp || false;
            if (this.settings.expiry !== this.origSettings.expiry) {
                this.commonDialog.closeWarning = true;
            }
            this.validateSettings();
        }

        showSizeUnitMenu() {
            if (mega.ui.menu.name === 'picker-fr-size-unit') {
                this.sizeUnitSelect.classList.remove('active');
                mega.ui.menu.hide();
                return;
            }
            const options = this.sizeUnitMenu.querySelectorAll('.option');
            for (let i = options.length; i--;) {
                options[i].querySelector('.checked')
                    .classList.toggle('hidden', options[i].dataset.unit !== this.sizeUnit);
            }
            mega.ui.menu.show({
                name: 'picker-fr-size-unit',
                classList: ['picker-fr-size-unit', 'picker-dropdown'],
                event: { currentTarget: { domNode: this.sizeUnitSelect } },
                eventTarget: this.sizeUnitSelect,
                pos: 'bottomRight',
                contents: [this.sizeUnitMenu],
                resizeHandler: true,
                onClose: () => this.sizeUnitSelect.classList.remove('active')
            });
            this.sizeUnitSelect.classList.add('active');
        }

        setSizeUnit(unit) {
            this.sizeUnit = unit;
            this.sizeUnitSelect.querySelector('span').textContent = linkSettings.unitLabels[unit];
            this.updateSize();
        }

        handleSizeInput() {
            let value = parseFloat(this.sizeInput.value);
            if (Number.isNaN(value) || value < 0) {
                value = 0;
            }

            // Auto switch to GB
            if (this.sizeUnit === linkSettings.unit.MB && value > 1024) {
                this.sizeInput.value = Math.round(value / 1024 * 100) / 100;
                this.setSizeUnit(linkSettings.unit.GB);
                return;
            }

            this.updateSize();
        }

        updateSize() {
            const bytes = linkSettings.toBytes(this.sizeInput.value, this.sizeUnit);
            linkSettings.setSizeState(this.sizeInput, {
                bytes,
                origSize: this.origSettings.size,
                enabled: this.sizeSwitch.checked,
            });

            this.settings.size = this.sizeSwitch.checked && bytes ? bytes : false;
            if (this.settings.size !== this.origSettings.size) {
                this.commonDialog.closeWarning = true;
            }
            this.validateSettings();
        }

        validatePassword() {
            const result = security.isValidPassword(this.passwordInput.value);
            const invalid = typeof result === 'string';
            this.passwordValid = !invalid;
            this.passwordInput.error = invalid && this.passwordInput.value ? result : '';
            if (!invalid && this.passwordInput.value) {
                this.passwordInput.success = l.password_strength_strong;
                this.validateSettings();
            }
            return !invalid;
        }

        validateSettings() {
            this.commonDialog.saveButton.disabled = linkSettings.isInvalid(this.settings, {
                expiry: this.expirySwitch.checked,
                password: this.passwordSwitch.checked,
                size: this.sizeSwitch.checked,
                passwordValid: this.passwordValid,
            });
        }
    }

    function renderObDialog(nextFn) {
        const container = document.createElement('div');
        container.className = 'filereq-ob-container';
        const subtitle = document.createElement('div');
        subtitle.className = 'points-head';
        subtitle.textContent = l.fr_ob_point_title;
        container.appendChild(subtitle);
        const points = document.createElement('div');
        points.className = 'filereq-points';
        const fileReqPoints = [
            {
                icon: 'sprite-fm-mono icon-file-upload-thin-outline',
                description: l.fr_ob_point1,
            },
            {
                icon: 'sprite-fm-mono icon-folder-arrow-02-thin-outline',
                description: l.fr_ob_point2,
            },
            {
                icon: 'sprite-fm-mono icon-bell-thin-outline',
                description: l.fr_ob_point3,
            }
        ];
        for (let i = 0; i < fileReqPoints.length; i++) {
            const item = fileReqPoints[i];
            const pointsItem = document.createElement('div');
            pointsItem.className = 'points-item';
            const icon = document.createElement('i');
            icon.className = `points-icon ${item.icon}`;
            const description = document.createElement('p');
            description.className = 'points-description';
            description.textContent = item.description;
            pointsItem.appendChild(icon);
            pointsItem.appendChild(description);
            points.appendChild(pointsItem);
        }
        container.appendChild(points);
        const content = [container];
        mega.ui.sheet.show({
            name: 'filereq-ob-dialog',
            classList: ['filereq-ob-dialog'],
            title: l.file_request_dialog_create_title,
            subtitle: l.file_request_dialog_create_desc,
            contents: content,
            centered: false,
            showClose: true,
            navImage: 'cloud-ob1',
            actions: [
                {
                    type: 'normal',
                    text: l.ok_button,
                    onClick: () => {
                        if (mega.ui.sheet && mega.ui.sheet.name === 'filereq-ob-dialog') {
                            mega.ui.sheet.hide();
                        }
                        tSleep(0.5).then(() => nextFn());
                    }
                }
            ],
            onClose() {
                tSleep(0.5).then(() => nextFn());
            }
        });
    }

    /** @class mega.fileRequest */
    return new class FileRequest {
        constructor() {
            lazy(this, 'actionHandler', () => mega.fileRequestCommon.actionHandler);
            lazy(this, 'storage', () => mega.fileRequestCommon.storage);
            /**
             * @property {FileRequestApi} mega.fileRequest.fileRequestApi
             */
            lazy(this, 'fileRequestApi', () => mega.fileRequestCommon.fileRequestApi);
            lazy(this, 'generator', () => mega.fileRequestCommon.generator);

            this.dialogs = {};

            /**
             * @property {CommonDialog} mega.fileRequesst.commonDialog
             */
            lazy(this, 'commonDialog', () => new CommonDialog);
            /**
             * @property {CreateDialog} mega.fileRequest.createDialog
             */
            lazy(this.dialogs, 'createDialog', () => new CreateDialog);
            /**
             * @property {CreateSuccessDialog} mega.fileRequest.createSuccessDialog
             */
            lazy(this.dialogs, 'createSuccessDialog', () => new CreateSuccessDialog);
            /**
             * @property {ManageDialog} mega.fileRequest.manageDialog
             */
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

        async update(handle, title, description, settings, quiet) {
            const puHandleObject = this.storage.getPuHandleByNodeHandle(handle);

            if (!puHandleObject || puHandleObject && !puHandleObject.p) {
                return;
            }

            loadingDialog.show(); // Show dialog
            await this.fileRequestApi
                .update(puHandleObject.p, title, description, undefined, undefined, settings)
                .catch(dump);

            const stored = settings && {
                ets: settings.expiry || 0,
                mfs: settings.limit || 0,
                f: settings.folder ? 0 : 1
            } || undefined;

            this.storage.updatePuHandle(handle, title, description, stored);
            this.storage.updatePuPage(puHandleObject.p, title, description, stored);

            if (is_mobile && !quiet) {
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
                .rebind('click.frtmc', () => {
                    this.start();
                    eventlog(500738);
                    return false;
                });
        }

        rebindPageEmptyCreateButton() {
            $('.fm-empty-file-requests .fm-new-file-request', document).rebind('click.frpec', () => this.start());
        }

        showRemoveWarning(list, action) {
            return new Promise((resolve, reject) => {
                const ack = () => {
                    onIdle(closeDialog);
                    mega.fileRequest.removeList(list).always(dump).finally(resolve);
                };

                let message = l.file_request_action_remove_prompt_title;
                let description;

                if (action === 'link') {
                    description = list.length > 1 ? l.fr_action_links_cancel : l.fr_action_link_cancel;
                }
                if (action === 'outshare') {
                    description = list.length > 1 ? l.fr_action_shares_cancel : l.fr_action_share_cancel;
                }

                if (!description) {
                    message = list.length > 1
                        ? l[17626]
                        : l[17403].replace('%1', escapeHTML(M.getNodeByHandle(list[0]).name));
                    description = l[18229];
                }

                msgDialog(
                    `warninga:!^${l.file_request_action_remove_prompt_button}!${l[82]}`,
                    l[1003],
                    message,
                    description,
                    (result) => {
                        if (result === false) {
                            return ack();
                        }
                        reject(EBLOCKED);
                    },
                    1
                );
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
                const isShared = await shared(target);

                if (isShared) {
                    await this.showRemoveWarning(list, 'move');
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

        start(handle) {
            const continueFn = () => is_mobile ?
                mobile.fileRequestManagement.showOverlay(handle) : this.dialogs.createDialog.init(handle);
            if (mega.ui.onboarding && mega.ui.onboarding.flagStorage) {
                mega.ui.onboarding.flagStorage.get(window.OBV4_FLAGS.FR_INIT_DLG).then(res => {
                    if (res) {
                        return continueFn();
                    }
                    renderObDialog(continueFn);
                    mega.ui.onboarding.flagStorage.setSync(window.OBV4_FLAGS.FR_INIT_DLG, 1);
                    mega.ui.onboarding.flagStorage.safeCommit();
                }).catch(() => continueFn());
            }
            else {
                continueFn();
            }
        }
    };
});
