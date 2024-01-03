/**
 * Code for the mobile node name control
 */
class MobileNodeNameControl {

    constructor(options) {

        if (options && options.type){
            this.typeInfo = MobileNodeNameControl.typeInfo[options.type];
        }

        if (!this.typeInfo) {
            if (d) {
                console.error('MobileNodeNameControl - error: Type info is not given');
            }
            return;
        }

        this.container = document.createElement('div');
        this.container.classList = 'new-name-container';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'underlinedText no-title-top';
        input.placeholder = this.typeInfo.placeholder;
        this.container.appendChild(input);

        this.nameInput = new mega.ui.MegaInputs($(input));
        this.nameInput.$wrapper.addClass('box-style fixed-width mobile');
    }

    /**
     * Show the sheet
     * @param {String} nodeHandle {Optional} The node handle of the folder/file
     * @returns {void}
     */
    show(nodeHandle) {

        const {nameInput, container, typeInfo} = this;

        if (!typeInfo) {
            return;
        }

        let nodeType = 1;
        let nodeName = '';

        const node = M.d[nodeHandle];
        if (node) {
            nodeName = node.name;
            nodeType = node.t;
        }

        M.safeShowDialog(typeInfo.name, () => {
            mega.ui.sheet.clear();

            mega.ui.sheet.type = 'modal';

            mega.ui.sheet.showClose = true;

            mega.ui.sheet.addTitle(typeInfo.title(nodeType));

            mega.ui.sheet.addContent(container);

            // Set folder/file name
            nameInput.setValue(nodeName);

            this.checkSpaces(nameInput.$input.val(), nodeType);

            nameInput.$input.rebind("input", () => {
                this.setDisabled(nameInput.$input.val());
                nameInput.hideError();
                this.checkSpaces(nameInput.$input.val(), nodeType);
            });

            if (typeInfo.selection) {
                nameInput.$input.rebind('focus.selection', () => {
                    const nodeName = nameInput.$input.val();
                    let selEnd = nodeName.length;
                    let tempIX;
                    if (!nodeType && (tempIX = nodeName.lastIndexOf('.')) > -1){
                        selEnd = tempIX ;
                    }
                    nameInput.$input[0].selectionStart = 0;
                    nameInput.$input[0].selectionEnd = selEnd;
                });
            }

            // This code is temporary due to iOS doesn't allow manual focus
            // if the code is executed from an asynchronous function
            if (!is_ios) {
                nameInput.$input.trigger('focus');
            }

            const button = this.actionButton = new MegaMobileButton({
                parentNode: mega.ui.sheet.actionsNode,
                type: 'normal',
                text: typeInfo.button,
                disabled: true
            });

            button.on('tap.action', () => {
                this.action(node);
                return false;
            });

            mega.ui.sheet.show();

        });
    }

    /**
     * Check errors and execute action
     * @param {Object} node {Optional} The node of the folder/file
     * @returns {void}
     */
    action(node) {

        const {nameInput, actionButton, typeInfo} = this;

        let nodeType = 1;

        if (node) {
            nodeType = node.t;
        }

        // Disable the button
        actionButton.disabled = true;

        const newName = nameInput.$input.val();

        var errorMsg = '';

        if (!newName.trim()) {
            errorMsg = typeInfo.empty;
        }
        else if (!M.isSafeName(newName)) { // Check if folder/file name is valid
            errorMsg = newName.length > 250 ? nodeType === 1 ? escapeHTML(l.LongName) : escapeHTML(l.LongName1)
                : l[24708];
        }
        else if (this.duplicated(newName, node ? node.p : null)) { // Check if folder/file name already exists
            errorMsg = escapeHTML(l[23219]);
        }

        if (errorMsg !== '') {
            const alertIcon = '<i class="alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline"></i>';
            nameInput.showError(`${alertIcon}${errorMsg}`);

            // Enable the button
            actionButton.disabled = false;
            return;
        }

        // Click out of the input to hide the on screen keyboard
        nameInput.$input.trigger('blur');

        typeInfo.submit(newName, node);
    }

    /**
     * Show warning message depending if newName has spaces at the beginning or end
     * @param {String} newName The new name of the folder/file
     * @param {Number} nodeType The node type of the folder/file
     * @returns {void}
     */
    checkSpaces(newName, nodeType) {

        const {nameInput} = this;

        if (newName.trim() === newName) { // Check if folder/file name does not contain spaces at the beginning or end
            nameInput.hideMessage();
            nameInput.$wrapper.removeClass('warning');
        }
        else {
            const alertIcon = '<i class="alert sprite-mobile-fm-mono icon-alert-circle-thin-outline"></i>';
            nameInput.showMessage(
                `${alertIcon}
                    ${nodeType === 1 ? escapeHTML(l.whitespaces_on_foldername) :
        escapeHTML(l.whitespaces_on_filename)}`);
            nameInput.$wrapper.addClass('warning');
        }
    }

    /**
     * Active disabled mode depending if newName is set
     * @param {String} newName The new name of the folder/file
     * @returns {void}
     */
    setDisabled(newName) {

        const {actionButton} = this;

        actionButton.disabled = !newName;
    }

    /**
     * Check if newName already exists in the current view
     * @param {String} newName The new name of the folder/file
     * @param {String} target {Optional} The parent folder of the folder/file
     * @returns {Boolean} Returns true if the folder/file name already exists, false if not
     */
    duplicated(newName, target) {

        if (target) {
            if (M.c[target]) {
                // Check if a folder/file with the same name already exists.
                for (const handle in M.c[target]) {
                    if (M.d[handle] && M.d[handle].name === newName) {
                        return true;
                    }
                }
            }
            return false;
        }
        const items = M.v.filter((item) => {
            return item.name === newName;
        });

        return items.length !== 0;
    }
}

mBroadcaster.once('fm:initialized', () => {
    'use strict';

    MobileNodeNameControl.typeInfo = {
        create: {
            placeholder: escapeHTML(l[157]),
            selection: false,
            name: 'mobile-create-folder',
            title: () => {
                return escapeHTML(l[68]);
            },
            button: escapeHTML(l[158]),
            empty: escapeHTML(l.EmptyName),
            submit: (newName) => {
                mega.ui.sheet.hide();
                loadingDialog.show();

                // Try creating the folder
                M.createFolder(M.currentCustomView ? M.currentCustomView.nodeID : M.currentdirid, newName)
                    .then((h) => {
                        // Show message 'Folder created'
                        var callbacks = {
                            actionButtonCallback : () => {
                                M.openFolder(h);
                            }
                        };
                        mega.ui.toast.show(escapeHTML(l.created_folder).replace('%1', newName), 4, escapeHTML(l[16797]),
                                           callbacks);

                        // Add a server log
                        eventlog(99677, 'Mobile web new folder created');
                    })
                    .catch((ex) => {
                        msgDialog('warninga', escapeHTML(l[135]), escapeHTML(l[47]), ex < 0 ? api_strerror(ex) : ex);
                    })
                    .finally(() => {
                        loadingDialog.hide();
                    });
            }
        },
        rename: {
            placeholder: '',
            selection: true,
            name: 'mobile-rename-folder-file',
            title: (nodeType) => {
                return nodeType === 1 ? escapeHTML(l.rename_folder) : escapeHTML(l.rename_file);
            },
            button: escapeHTML(l[61]),
            empty: escapeHTML(l[5744]),
            submit: (newName, node) => {
                mega.ui.sheet.hide();
                loadingDialog.show();

                const nodeName = node.name;
                const nodeType = node.t;

                // Rename the folder/file
                M.rename(node.h, newName)
                    .then(() => {
                        if (mega.ui.viewerOverlay.visible) {
                            mega.ui.viewerOverlay.setNode(node.h);
                        }

                        // Show message 'Renamed <old name> to <new name>'
                        mega.ui.toast.show((nodeType === 1
                            ? escapeHTML(l.renamed_folder_to)
                            : escapeHTML(l.renamed_file_to))
                            .replace('%1', nodeName).replace('%2', newName));
                    })
                    .catch(tell)
                    .finally(() => {
                        loadingDialog.hide();
                    });
            }
        }
    };

});
