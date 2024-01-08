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

        // Get the current title and description, if it exists
        this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(this.handle);
        if (this.puHandleObject) {
            let fileRequestData = await mega.fileRequestCommon.fileRequestApi.getPuPage(this.puHandleObject.p)
                .catch(tell);
            fileRequestData = fileRequestData.result.d;

            this.currentTitle = fileRequestData.msg;
            this.currentDesc = fileRequestData.description;
        }

        this.container = document.createElement('div');
        this.container.className = 'fr-mgmt-container';

        // Blurb text
        const frBlurbDiv = document.createElement('div');
        frBlurbDiv.className = 'fr-blurb';
        frBlurbDiv.append(parseHTML(l.file_request_overlay_blurb));
        this.container.append(frBlurbDiv);

        // Add input fields and buttons
        this.addInputFields();
        this.addButtons();

        mega.ui.overlay.show({
            name: 'file-request-overlay',
            title: this.puHandleObject ?
                l.file_request_dialog_manage_title :
                l.file_request_dialog_create_title,
            showClose: true,
            confirmClose: () => {
                return new Promise((resolve) => {
                    mega.ui.sheet.show({
                        name: 'close-fr-overlay',
                        type: 'modal',
                        showClose: true,
                        icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning-icon',
                        title: l.file_request_confirm_close_page,
                        contents: [l.file_request_discard_changes],
                        actions: [
                            {
                                type: 'normal',
                                text: l.file_request_discard_btn,
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
            contents: [this.container]
        });
    },

    /**
     * Create the title input field and description textarea field
     *
     * @returns {void}
     */
    addInputFields: function() {
        'use strict';

        // Title input field
        const frTitleInput = document.createElement('input');
        frTitleInput.maxLength = 80;
        frTitleInput.type = 'text';
        frTitleInput.title = l.file_request_title_heading;
        frTitleInput.className = 'fr-title-field underlinedText lengthChecker';
        frTitleInput.id = 'fr-title-field';
        frTitleInput.value = this.puHandleObject ?
            this.currentTitle :
            M.getNodeByHandle(this.handle).name;
        this.container.append(frTitleInput);

        this.titleMegaInput = new mega.ui.MegaInputs($(frTitleInput));
        this.titleMegaInput.$wrapper.addClass('box-style fr-title-field msg-left fixed-width mobile');

        // Description textarea field
        const textarea = document.createElement('textarea');
        textarea.maxLength = 500;
        textarea.title = l[16462]; // Description
        textarea.className = 'description-field textArea clearButton lengthChecker optional';
        textarea.value = this.currentDesc;
        this.container.append(textarea);

        this.descTextArea = new mega.ui.MegaInputs($(textarea));
        this.descTextArea.$wrapper.addClass('box-style description-field fixed-width mobile');

        // Check if title and description have been changed
        this.titleMegaInput.$input
            .add(this.descTextArea.$input)
            .rebind('keyup.addDetails input.addDetails', this.disableUpdateButton.bind(this));
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
        this.container.append(frButtonsDiv);

        // Buttons (create/update & stop FR)
        this.createUpdateFRBtn = new MegaMobileButton({
            parentNode: frButtonsDiv,
            text: this.puHandleObject ? l[707] : l[158],  // Update / Create
            componentClassname: 'block primary create-update'
        });
        this.createUpdateFRBtn.on('tap', () => {
            const title = this.titleMegaInput.$input.val();
            const description = this.descTextArea.$input.val();

            if (!title.length) {
                this.titleMegaInput.setValue('');

                this.titleMegaInput.showError(
                    `<i class='alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline'></i>
                    ${escapeHTML(l.file_request_no_title_error)}`
                );

                return false;
            }

            mega.ui.overlay.hide();

            if (this.puHandleObject) {
                mega.fileRequest.update(this.handle, title, description).catch(tell);
            }
            else {
                mega.fileRequest.create(this.handle, title, description).catch(tell);
            }
        });
        this.createUpdateFRBtn.disabled = this.puHandleObject;

        if (this.puHandleObject) {
            const stopFR = new MegaMobileButton({
                parentNode: frButtonsDiv,
                text: l.file_request_dialog_button_remove,
                componentClassname: 'block text-only'
            });
            stopFR.on('tap', () => {
                mega.ui.overlay.hide();
                this.removeFileRequest();
            });
        }
    },

    /**
     * Functionality to disable the update button while typing if the file request is created,
     * and the title and description entered by the user is the same as before
     *
     * @returns {void}
     */
    disableUpdateButton: function() {
        'use strict';

        if (typeof this.puHandleObject === 'undefined') {
            return;
        }

        const titleInput = this.titleMegaInput.$input.val();
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

        mega.ui.sheet.show({
            name: 'remove-fr-warning',
            type: 'modal',
            showClose: true,
            icon: 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline warning-icon',
            title: l.file_request_stop_title,
            contents: [l.file_request_action_remove_prompt_desc],
            actions: [
                {
                    type: 'normal',
                    text: l.file_request_dialog_button_remove,
                    onClick: () => {
                        mega.ui.sheet.hide();
                        mega.fileRequest.remove(handle)
                            .catch(dump)
                            .finally(() => {
                                mega.ui.toast.show(l.file_request_action_remove);
                            });
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

        // Update puHandleObject to get the file request link
        this.puHandleObject = mega.fileRequest.storage.getPuHandleByNodeHandle(this.handle);
        const frLink = `${getBaseUrl()}/filerequest/${this.puHandleObject.p}`;

        const frLinkInput = document.createElement('textarea');
        frLinkInput.title = l.file_request_copy_link_title;
        frLinkInput.value = frLink;
        frLinkInput.disabled = true;
        frLinkInput.className = 'fr-link underlinedText copyButton';
        frLinkInput.dataset.wrapperClass = 'box-style fr-link-field mobile';
        frLinkInput.id = 'fr-link';
        frUpdatedContents.append(frLinkInput);

        const frLinkMegaInput = new mega.ui.MegaInputs($(frLinkInput), {
            copyToastText: l.file_request_link_copied,
            autoHeight: true
        });

        mega.ui.sheet.show({
            name: 'create-update-fr-success',
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
    }
};
