/**
 * Code to trigger the mobile file manager's create/manage file request overlay and related behaviour
 */
mobile.fileRequestManagement = {

    /**
     * Show the overlay
     *
     * @param {String} nodeHandle A public or regular node handle
     * @returns {void}
     */
    showOverlay: async function(nodeHandle) {
        'use strict';

        this.handle = nodeHandle;
        this.currentTitle = '';
        this.currentDesc = '';
        this.closeWarning = false;
        this.linkUpdated = false;
        this.puPageLink = null;

        // Get the current title and description, if it exists
        this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(this.handle);
        const isManage = !!this.puHandleObject;
        if (isManage) {
            const puPage = await mega.fileRequest
                .getPuPage(this.puHandleObject.p, this.puHandleObject.ph)
                .catch(dump);
            const pageData = puPage && puPage.d;

            this.currentTitle = pageData && pageData.msg || this.puHandleObject.fn || '';
            this.currentDesc = pageData && pageData.description || '';
        }

        this.container = document.createElement('div');
        this.container.className = 'fr-mgmt-container mob-px-6';

        if (!isManage) {
            const frBlurbDiv = document.createElement('div');
            frBlurbDiv.className = 'fr-blurb';
            frBlurbDiv.textContent = l.file_request_dialog_create_desc;
            this.container.append(frBlurbDiv);
        }

        // Add input fields
        this.addInputFields();
        this.showFormView();
    },

    showFormView() {
        'use strict';

        loadingDialog.hide('fr-link-settings');
        const isManage = !!this.puHandleObject;
        if (isManage) {
            this.linkBanner.classList.toggle('hidden', !this.linkUpdated);
            this.linkUpdated = false;
        }

        mega.ui.overlay.show({
            name: 'file-request-overlay',
            classList: [isManage ? 'fr-manage-overlay' : 'fr-create-overlay'],
            title: isManage ?
                l.file_request_dialog_manage_title :
                l.file_request_dialog_create_title,
            showClose: true,
            actionOnBottom: isManage,
            confirmClose: () => this.confirmDiscardChanges(),
            contents: [this.container]
        });
        this.addButtons();
    },

    confirmDiscardChanges(exit) {
        'use strict';

        const changed = this.closeWarning
            || this.titleMegaInput.$input.val() !== this.currentTitle
            || this.descTextArea.$input.val() !== this.currentDesc;

        if (!changed) {
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            mega.ui.sheet.show({
                name: 'close-fr-overlay',
                classList: ['close-fr-sheet'],
                type: 'modal',
                showClose: true,
                title: exit ? l.discard_and_exit : l.discard_changes,
                contents: [exit ? l.discard_and_exit_msg : l.discard_changes_msg],
                actions: [
                    {
                        type: 'normal',
                        className: 'secondary',
                        text: l[82],
                        onClick: () => {
                            mega.ui.sheet.hide();
                            resolve(false);
                        }
                    },
                    {
                        type: 'normal',
                        text: exit ? l.discard_exit : l.file_request_discard_btn,
                        onClick: () => {
                            mega.ui.sheet.hide();
                            resolve(true);
                        }
                    }
                ],
                onClose: () => {
                    resolve(false);
                }
            });
        });
    },

    /**
     * Create the title input field and description textarea field
     *
     * @returns {void}
     */
    addInputFields: function() {
        'use strict';

        const isManage = !!this.puHandleObject;
        // Title input field
        const frTitleInput = document.createElement('input');
        frTitleInput.maxLength = 80;
        frTitleInput.type = 'text';
        frTitleInput.title = l.file_request_dialog_label_title;
        frTitleInput.className = 'fr-title-field underlinedText lengthChecker';
        frTitleInput.id = 'fr-title-field';
        frTitleInput.placeholder = l.file_request_dialog_placeholder_title;
        frTitleInput.value = isManage ?
            this.currentTitle :
            M.getNodeByHandle(this.handle).name;
        this.container.append(frTitleInput);

        this.currentTitle = frTitleInput.value;
        this.titleMegaInput = new mega.ui.MegaInputs($(frTitleInput));
        this.titleMegaInput.$wrapper.addClass('box-style fr-title-field msg-left fixed-width mobile');

        // Description textarea field
        const textarea = document.createElement('textarea');
        textarea.maxLength = 500;
        textarea.title = l[16462]; // Description
        textarea.className = 'description-field textArea clearButton lengthChecker lengthCheckerAlways optional';
        textarea.value = this.currentDesc;
        textarea.placeholder = l.info_panel_description_add;
        this.container.append(textarea);

        this.descTextArea = new mega.ui.MegaInputs($(textarea));
        this.descTextArea.$wrapper.addClass('box-style description-field fixed-width mobile');

        // Check if title and description have been changed
        this.titleMegaInput.$input
            .add(this.descTextArea.$input)
            .rebind('keyup.addDetails input.addDetails', this.disableUpdateButton.bind(this));

        if (isManage) {
            this.linkBanner = mCreateElement('div', {'class': 'link-banner hidden'}, [
                mCreateElement('div', {'class': 'banner-body'}, [
                    mCreateElement('i', {'class': 'sprite-mobile-fm-mono icon-check-circle-thin-outline'}),
                    mCreateElement('span', null, [document.createTextNode(l.link_updated)])
                ])
            ]);
            this.container.append(this.linkBanner);
            this.frLinkInput = new MegaInputComponent({
                parentNode: this.container,
                className: 'fr-link underlinedText',
                wrapperClasses: 'box-style fr-link-field msg-left fixed-width mobile',
                title: l.file_request_dialog_label_url,
                copy: l.file_request_link_copied
            });
            this.frLinkInput.value = mega.fileRequest.generator.generateUrl(this.puHandleObject.p);
            this.frLinkInput.readOnly = true;
            MegaButton.factory({
                parentNode: this.container,
                text: l.link_settings,
                componentClassname: 'text-icon fr-link-settings-btn',
                onClick: () => {
                    this.showLinkSettings();
                }
            });
        }
    },

    /**
     * Create the buttons for creating/updating and stopping the FR
     *
     * @returns {void}
     */
    addButtons: function() {
        'use strict';

        const frButtonsDiv = document.createElement('div');
        frButtonsDiv.className = 'fr-buttons';
        (this.puHandleObject ? mega.ui.overlay.actionsNode : this.container).append(frButtonsDiv);

        // Buttons (create/update & stop FR)
        this.createUpdateFRBtn = new MegaButton({
            parentNode: frButtonsDiv,
            text: this.puHandleObject ? l[776] : l[158],  // Save / Create
            componentClassname: 'block primary create-update'
        });
        this.createUpdateFRBtn.on('tap', () => {
            if (!this.titleMegaInput.$input.val().length) {
                this.titleMegaInput.setValue('');

                this.titleMegaInput.showError(
                    `<i class='alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline'></i>
                    ${escapeHTML(l.file_request_no_title_error)}`
                );

                return false;
            }

            mega.ui.overlay.hide();

            this.saveChanges().catch(tell);
        });

        if (this.puHandleObject) {
            const stopFR = new MegaButton({
                parentNode: frButtonsDiv,
                text: l.file_request_dialog_button_remove,
                componentClassname: 'text-icon fr-stop-btn'
            });
            stopFR.on('tap', () => {
                mega.ui.overlay.hide();
                this.removeFileRequest();
            });
        }
    },

    /**
     * Functionality to disable the create button while the title is empty, or the update button
     * while typing if the file request is created, and the title and description is the same as before
     *
     * @returns {void}
     */
    disableUpdateButton: function() {
        'use strict';

        this.closeWarning = true;
        const titleInput = this.titleMegaInput.$input.val();
        if (typeof this.puHandleObject === 'undefined') {
            this.createUpdateFRBtn.disabled = !titleInput.length;
            return;
        }

        const descInput = this.descTextArea.$input.val();

        this.createUpdateFRBtn.disabled = titleInput === this.currentTitle && descInput === this.currentDesc;
    },

    /**
     * Function to show the warning sheet before the user removes the file request
     *
     * @param {String} handle The node handle for this folder (if not provided earlier)
     * @returns {void}
     */
    removeFileRequest: function(handle) {
        'use strict';

        handle = handle || this.handle;

        const remove = () => {
            mega.fileRequest.remove(handle)
                .catch(dump)
                .finally(() => {
                    mega.ui.toast.show(l.file_request_action_remove);
                });
        };

        if (mega.config.get('frRemoveSkip')) {
            remove();
            return;
        }

        const contents = document.createElement('div');
        contents.className = 'remove-fr-contents';
        contents.append(document.createTextNode(l.file_request_action_remove_prompt_desc));
        const skip = new MegaCheckbox({
            parentNode: contents,
            componentClassname: 'mega-checkbox',
            labelTitle: l[229],
            checked: false
        });

        mega.ui.sheet.show({
            name: 'remove-fr-warning',
            classList: ['remove-fr-sheet'],
            type: 'modal',
            showClose: true,
            title: l.file_request_action_remove_prompt_title,
            contents: [contents],
            actions: [
                {
                    type: 'normal',
                    className: 'secondary',
                    text: l.stop_recording_nop_dialog_cta,
                    onClick: () => {
                        mega.ui.sheet.hide();
                    }
                },
                {
                    type: 'normal',
                    text: l.file_request_action_remove_prompt_button,
                    onClick: () => {
                        mega.ui.sheet.hide();
                        if (skip.checked) {
                            mega.config.set('frRemoveSkip', 1);
                        }
                        remove();
                    }
                }
            ]
        });
    },

    /**
     * Function to show the sheet after the user creates or updates their file request
     *
     * @param {Boolean} isUpdated true if the FR has been updated, false if newly created
     * @returns {void}
     */
    showFRUpdatedSheet: function(isUpdated) {
        'use strict';

        const frUpdatedContents = document.createElement('div');
        frUpdatedContents.className = 'fr-updated-sheet-contents';

        const frUpdatedBlurb = document.createElement('div');
        frUpdatedBlurb.className = 'fr-updated-blurb';
        frUpdatedBlurb.textContent = l.file_request_dialog_success_desc;
        frUpdatedContents.append(frUpdatedBlurb);

        this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(this.handle);
        const frLink = this.puPageLink || mega.fileRequest.generator.generateUrl(this.puHandleObject.p);

        const frLinkInput = document.createElement('input');
        frLinkInput.value = frLink;
        frLinkInput.disabled = true;
        frLinkInput.className = 'fr-link underlinedText copyButton';
        frLinkInput.dataset.wrapperClass = 'box-style fr-link-field mobile';
        frLinkInput.id = 'fr-link';
        frUpdatedContents.append(frLinkInput);

        const frLinkMegaInput = new mega.ui.MegaInputs($(frLinkInput), {
            copyToastText: l.file_request_link_copied,
        });

        mega.ui.sheet.show({
            name: 'create-update-fr-success',
            classList: ['create-update-fr-sheet'],
            type: 'modal',
            showClose: true,
            icon: 'sprite-mobile-fm-mono icon-check-circle-thin-outline success',
            title: isUpdated ?
                l.file_request_dialog_update_success_title :
                l.file_request_dialog_create_success_title,
            contents: [frUpdatedContents],
            actions: [
                {
                    type: 'normal',
                    text: l[1394], // Copy link
                    onClick: () => {
                        copyToClipboard(frLink, l.file_request_link_copied);
                    }
                }
            ],
            onShow: () => {
                frLinkMegaInput.$input.trigger('input');
            }
        });
    },

    buildSettings() {
        'use strict';

        this.expiryBlock = document.createElement('div');
        this.expiryBlock.className = `fr-setting-row expiry-row${this.settings.expiry ? ' expanded' : ''}`;
        let control = mCreateElement('div', { 'class': 'settings-wrap' }, [
            mCreateElement('div', { 'class': 'settings-info' }, [
                mCreateElement('div', { 'class': 'settings-label' }, [document.createTextNode(l.expiry_date)]),
                mCreateElement('div', { 'class': 'settings-desc' }, [document.createTextNode(l.fr_expiry_desc)])
            ])
        ]);
        this.expirySwitch = new MegaToggleButton({
            parentNode: control,
            componentClassname: 'mega-toggle-button',
            disabled: false,
            value: 'fr-show-expiry',
            checked: !!this.settings.expiry,
            role: 'switch',
            isProUserOption: true,
            onChange: () => {
                this.expirySetting.classList.toggle('hidden', !this.expirySwitch.checked);
                this.expiryBlock.classList.toggle('expanded', this.expirySwitch.checked);

                if (this.expirySwitch.checked) {
                    this.datePicker.show();
                }
                else {
                    this.datePicker.value = '';
                    this.updateExpiry(0);
                }

                this.validateSettings();
            }
        });
        this.expirySetting = document.createElement('div');
        this.expirySetting.className = `expiry-picker${this.settings.expiry ? '' : ' hidden'}`;
        this.expiryBlock.appendChild(control);
        this.expiryBlock.appendChild(this.expirySetting);
        this.datePicker = new MegaMobileDatePicker({
            parentNode: this.expirySetting,
            componentClassname: 'date-picker',
            defaultValue: this.settings.expiry || 0,
            frontInputID: 'fr-expiry-date',
            allowToday: true,
            placeholder: l[8953],
        });
        this.datePicker.frontInput.$wrapper.addClass('expiry msg-left');
        this.datePicker.frontInput.$wrapper.rebind('tap', () => this.datePicker.show());
        this.datePicker.rebind('change', () => {
            const { value } = this.datePicker.picker;
            if (!value) {
                this.updateExpiry(0);
                return;
            }
            const [ year, month, day ] = String(value).split('-').map(Number);
            const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 0);
            this.datePicker.value = new Date(year, month - 1, day).getTime() / 1000;
            this.updateExpiry(Math.round(endOfDay.getTime() / 1000));
        });

        this.passwordBlock = document.createElement('div');
        this.passwordBlock.className = 'fr-setting-row password-row';
        control = mCreateElement('div', { 'class': 'settings-wrap' }, [
            mCreateElement('div', { 'class': 'settings-info' }, [
                mCreateElement('div', { 'class': 'settings-label' }, [document.createTextNode(l[17454])]),
                mCreateElement('div', { 'class': 'settings-desc' }, [document.createTextNode(l.fr_password_desc)])
            ])
        ]);
        this.passwordSwitch = new MegaToggleButton({
            parentNode: control,
            componentClassname: 'mega-toggle-button',
            disabled: false,
            value: 'fr-show-password',
            checked: false,
            role: 'switch',
            isProUserOption: true,
            onChange: () => {
                this.passwordSetting.classList.toggle('hidden', !this.passwordSwitch.checked);
                if (this.passwordSwitch.checked && typeof zxcvbn === 'undefined') {
                    M.require('zxcvbn_js').done(() => this.validateSettings());
                }
                this.validateSettings();
            }
        });
        this.passwordSetting = document.createElement('div');
        this.passwordSetting.className = 'password-input hidden';
        this.passwordBlock.appendChild(control);
        this.passwordBlock.appendChild(this.passwordSetting);
        this.passwordValid = false;
        this.passwordInput = new MegaInputComponent({
            parentNode: this.passwordSetting,
            className: 'form-element underlinedText no-title-top clearButton',
            wrapperClasses: 'box-style fixed-width mobile',
            password: true,
            messageIcons: true,
            placeholder: l.start_typing
        });
        this.passwordInput.on('input.frpwd', () => {
            this.closeWarning = true;
            this.validatePassword();
        });
        this.passwordInput.on('blur.frpwd', () => this.validateSettings());

        this.sizeBlock = document.createElement('div');
        this.sizeBlock.className = 'fr-setting-row size-row';
        control = mCreateElement('div', { 'class': 'settings-wrap' }, [
            mCreateElement('div', { 'class': 'settings-info' }, [
                mCreateElement('div', { 'class': 'settings-label' }, [document.createTextNode(l.fr_size_title)]),
                mCreateElement('div', { 'class': 'settings-desc' }, [document.createTextNode(l.fr_size_desc)])
            ])
        ]);
        this.sizeSwitch = new MegaToggleButton({
            parentNode: control,
            componentClassname: 'mega-toggle-button',
            disabled: false,
            value: 'fr-show-size',
            checked: !!this.settings.size,
            role: 'switch',
            isProUserOption: true,
            onChange: () => {
                this.sizeSetting.classList.toggle('hidden', !this.sizeSwitch.checked);
                this.updateSize();
            }
        });
        this.sizeSetting = document.createElement('div');
        this.sizeSetting.className = `file-size-wrap${this.settings.size ? '' : ' hidden'}`;
        this.sizeBlock.appendChild(control);
        this.sizeBlock.appendChild(this.sizeSetting);
        const sizeValue = mCreateElement('div', { 'class': 'file-size-value' });
        this.sizeUnitSelect = mCreateElement('div', { 'class': 'file-size-unit mega-input mobile box-style' }, [
            mCreateElement('span'),
            mCreateElement('i', { 'class': 'sprite-fm-mono icon-chevron-down-thin-outline' })
        ]);
        this.sizeSetting.append(sizeValue, this.sizeUnitSelect);
        this.sizeInput = new MegaInputComponent({
            parentNode: sizeValue,
            className: 'form-element underlinedText no-title-top',
            wrapperClasses: 'box-style mobile',
            messageIcons: true
        });
        this.sizeInput.input.type = 'number';
        this.sizeInput.input.min = '0';
        this.sizeInput.on('input.frsize', () => this.handleSizeInput());
        this.sizeUnitSelect.addEventListener('click', () => this.showSizeUnitMenu());

        const { linkSettings } = mega.fileRequestCommon;
        this.sizeUnit = linkSettings.unitFor(this.settings.size);
        this.sizeInput.value = linkSettings.fromBytes(this.settings.size, this.sizeUnit);
        this.sizeUnitSelect.querySelector('span').textContent = linkSettings.unitLabels[this.sizeUnit];

        this.folderBlock = document.createElement('div');
        this.folderBlock.className = 'fr-setting-row folder-row';
        control = mCreateElement('div', { 'class': 'settings-wrap' }, [
            mCreateElement('div', { 'class': 'settings-info' }, [
                mCreateElement('div', { 'class': 'settings-label' }, [document.createTextNode(l.fr_folder_title)]),
                mCreateElement('div', { 'class': 'settings-desc' }, [document.createTextNode(l.fr_folder_desc)])
            ])
        ]);
        this.folderSwitch = new MegaToggleButton({
            parentNode: control,
            componentClassname: 'mega-toggle-button',
            disabled: false,
            value: 'fr-toggle-folders',
            checked: !!this.settings.folder,
            role: 'switch',
            onChange: () => {
                this.settings.folder = this.folderSwitch.checked;
                if (this.settings.folder !== this.origSettings.folder) {
                    this.closeWarning = true;
                }
            }
        });
        this.folderBlock.appendChild(control);
        this.settingsContainer.appendChild(this.expiryBlock);
        this.settingsContainer.appendChild(this.passwordBlock);
        this.settingsContainer.appendChild(this.sizeBlock);
        this.settingsContainer.appendChild(this.folderBlock);
    },

    updateExpiry(timestamp) {
        'use strict';

        this.settings.expiry = timestamp || false;
        if (this.settings.expiry !== this.origSettings.expiry) {
            this.closeWarning = true;
        }
        this.validateSettings();
    },

    handleSizeInput() {
        'use strict';

        let value = parseFloat(this.sizeInput.value);
        if (Number.isNaN(value) || value < 0) {
            value = 0;
        }
        // Auto switch to GB
        const { unit } = mega.fileRequestCommon.linkSettings;
        if (this.sizeUnit === unit.MB && value > 1024) {
            this.sizeInput.value = Math.round(value / 1024 * 100) / 100;
            this.setSizeUnit(unit.GB);
            return;
        }
        this.updateSize();
    },

    setSizeUnit(unit) {
        'use strict';

        this.sizeUnit = unit;
        this.sizeUnitSelect.querySelector('span').textContent = mega.fileRequestCommon.linkSettings.unitLabels[unit];
        this.updateSize();
    },

    updateSize() {
        'use strict';

        const { linkSettings } = mega.fileRequestCommon;
        const bytes = linkSettings.toBytes(this.sizeInput.value, this.sizeUnit);
        linkSettings.setSizeState(this.sizeInput, {
            bytes,
            origSize: this.origSettings.size,
            enabled: this.sizeSwitch.checked,
        });

        this.settings.size = this.sizeSwitch.checked && bytes ? bytes : false;
        if (this.settings.size !== this.origSettings.size) {
            this.closeWarning = true;
        }

        this.validateSettings();
    },

    showSizeUnitMenu() {
        'use strict';

        const contents = document.createElement('div');
        contents.className = 'fr-size-units px-6';
        const radios = [];
        const { unitLabels } = mega.fileRequestCommon.linkSettings;
        const unitKeys = Object.keys(unitLabels);
        for (let i = 0; i < unitKeys.length; i++) {
            radios.push({
                parentNode: contents,
                label: unitLabels[unitKeys[i]],
                value: unitKeys[i],
                checked: unitKeys[i] === this.sizeUnit,
            });
        }
        const unitGroup = new MegaMobileRadioGroup({
            name: 'fr-size-unit',
            radios,
            align: 'right',
            onChange: () => {
                this.setSizeUnit(unitGroup.value);
                this.sizeUnitSelect.classList.remove('active');
                mega.ui.sheet.hide();
            }
        });

        this.sizeUnitSelect.classList.add('active');
        mega.ui.sheet.show({
            name: 'fr-size-unit',
            classList: ['fr-size-menu'],
            type: 'modal',
            showClose: true,
            contents: [contents],
            onClose: () => this.sizeUnitSelect.classList.remove('active')
        });
    },

    validatePassword() {
        'use strict';

        const result = security.isValidPassword(this.passwordInput.value);
        const invalid = typeof result === 'string';

        this.passwordValid = !invalid;
        this.passwordInput.error = invalid && this.passwordInput.value ? result : '';

        if (!invalid && this.passwordInput.value) {
            this.passwordInput.success = l.password_strength_strong;
            this.validateSettings();
        }

        return !invalid;
    },

    validateSettings() {
        'use strict';

        this.settingsInvalid = mega.fileRequestCommon.linkSettings.isInvalid(this.settings, {
            expiry: this.expirySwitch.checked,
            password: this.passwordSwitch.checked,
            size: this.sizeSwitch.checked,
            passwordValid: this.passwordValid,
        });
        if (this.saveSettingsBtn) {
            this.saveSettingsBtn.classList.toggle('disabled', this.settingsInvalid);
        }
    },

    showLinkSettings() {
        'use strict';

        this.settingsContainer = document.createElement('div');
        this.settingsContainer.className = 'fr-settings-container mob-px-6';
        this.closeWarning = false;
        this.settings = mega.fileRequestCommon.linkSettings.read(this.puHandleObject);
        this.origSettings = { ...this.settings };
        this.buildSettings();

        mega.ui.overlay.show({
            name: 'file-request-settings-overlay',
            classList: ['fr-settings-overlay'],
            title: l.link_settings,
            showClose: true,
            actionOnBottom: true,
            actions: [
                {
                    type: 'normal',
                    text: l[19631],
                    className: 'block primary save-settings',
                    onClick: () => {
                        if (this.settingsInvalid) {
                            return;
                        }

                        if (!this.closeWarning) {
                            this.showFormView();
                            return;
                        }

                        loadingDialog.show('fr-link-settings');
                        this.saveSettings()
                            .then(() => this.showFormView())
                            .catch((ex) => {
                                loadingDialog.hide('fr-link-settings');
                                tell(ex);
                            });
                    }
                }
            ],
            confirmClose: () => this.confirmDiscardChanges(true),
            onBack: () => {
                this.confirmDiscardChanges().then((discard) => {
                    if (discard) {
                        this.showFormView();
                    }
                });
            },
            contents: [this.settingsContainer]
        });
        this.saveSettingsBtn = mega.ui.overlay.actionsNode.querySelector('.save-settings');
        this.validateSettings();
    },

    saveChanges() {
        'use strict';

        const title = this.titleMegaInput.$input.val();
        const description = this.descTextArea.$input.val();
        if (!this.puHandleObject) {
            return mega.fileRequest.create(this.handle, title, description);
        }

        return mega.fileRequest.update(this.handle, title, description, this.settings && {
            expiry: this.settings.expiry,
            limit: this.settings.size,
            folder: this.settings.folder
        });
    },

    async saveSettings() {
        'use strict';

        const previousLink = this.puPageLink;
        const password = this.passwordSwitch.checked && this.validatePassword()
            ? this.passwordInput.value
            : '';

        this.puPageLink = await mega.fileRequestCommon.linkSettings.save(this.puHandleObject, {
            title: this.titleMegaInput.$input.val(),
            description: this.descTextArea.$input.val(),
            settings: this.settings,
            password,
        });
        this.linkUpdated = this.puPageLink !== previousLink;

        this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(this.handle) || this.puHandleObject;
        this.frLinkInput.value = this.puPageLink || mega.fileRequest.generator.generateUrl(this.puHandleObject.p);
    }
};
