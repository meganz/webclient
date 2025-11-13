/**
 * Code for the mobile node name control
 */
class NodeNameControl {

    constructor(options) {

        if (options && options.type) {
            this.typeInfo = NodeNameControl.typeInfo[options.type];
        }

        if (!this.typeInfo) {
            if (d) {
                console.error('NodeNameControl - error: Type info is not given');
            }
            return;
        }

        this.container = document.createElement('div');
        this.container.classList = 'new-name-container';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'pmText clearButton';
        input.title = this.typeInfo.placeholder;
        this.container.appendChild(input);

        this.nameInput = new mega.ui.MegaInputs($(input));
        this.nameInput.$wrapper.addClass('slim');
        if (is_mobile) {
            this.nameInput.$wrapper.addClass('mobile');
        }
    }

    get visible() {
        return mega.ui.sheet.visible && mega.ui.sheet.name === this.typeInfo.name;
    }

    /**
     * Show the sheet
     * @param {String|Object} n {Optional} The node or node handle of the folder/file
     * @param {Object} options {Optional} overrideTypeInfo, overrideAction, onClose, noBtnDisable and allowEmpty
     * @returns {void}
     */
    show(n, options = {}) {

        const {nameInput, container} = this;
        const {overrideTypeInfo, overrideAction, onClose, noBtnDisable, allowEmpty, canSubmit} = options;
        let {typeInfo} = this;
        let closeFired = false;

        const fireOnClose = () => {
            if (!closeFired && typeof onClose === 'function') {
                closeFired = true;
                onClose();
            }
        };

        if (!typeInfo) {
            return;
        }

        if (overrideTypeInfo) {
            typeInfo = {...typeInfo, ...overrideTypeInfo};
        }

        nameInput.updateTitle(typeInfo.placeholder || '');

        let nodeType = 1;
        let nodeName = '';
        let s4 = false;

        const node = typeof n === 'object' ? n : M.d[n];
        if (node) {
            ({name: nodeName, t: nodeType, s4} = node);
        }

        // Whether the given value may be submitted, i.e. whether the action button should be enabled
        const submittable = value =>
            typeof canSubmit === 'function'
                ? canSubmit(value)
                : allowEmpty || value && !(node && node.h && value === node.name);

        M.safeShowDialog(typeInfo.name, () => {
            mega.ui.sheet.clear();

            mega.ui.sheet.type = is_mobile ? 'modal' : 'normal';

            mega.ui.sheet.showClose = true;

            mega.ui.sheet.onClose = fireOnClose;

            mega.ui.sheet.addTitle(typeInfo.title(nodeType, s4));

            mega.ui.sheet.addContent(container);

            nameInput.setValue(nodeName);

            const {$input} = nameInput;

            const actionButton = new MegaButton({
                parentNode: mega.ui.sheet.actionsNode,
                type: 'normal',
                text: typeInfo.button,
                disabled: typeof canSubmit === 'function' ? !submittable(nodeName) : !noBtnDisable
            });
            this.actionButton = actionButton;

            const runAction = async() => {

                const newValue = $input.val();

                if (typeof overrideAction === 'function') {

                    this.setDisabled(false);

                    await overrideAction({
                        value: newValue,
                        node,
                        nodeType,
                        s4,
                        typeInfo,
                        control: this,
                        nameInput,
                        actionButton,
                        close: () => mega.ui.sheet.hide()
                    });

                    this.setDisabled(submittable($input.val()));
                    return;
                }

                this.action(node, typeInfo);
            };

            if (typeInfo.checkSpaces !== false) {
                this.checkSpaces($input.val(), nodeType);
            }

            $input.rebind('input.nameControl', () => {
                const value = $input.val();

                // Keep the action button disabled while the value is not submittable (empty/unchanged/invalid)
                this.setDisabled(submittable(value));
                nameInput.hideError();

                if (typeInfo.checkSpaces !== false) {
                    this.checkSpaces(value, nodeType);
                }
            });

            $input.rebind('keydown.nameControl', e => {
                if (e.which === 13 && !actionButton.disabled && (allowEmpty || $input.val().trim() !== '')) {
                    runAction();

                    // Do not let the keystroke bubble up to the global FM key handler,
                    // it would e.g. open the still-selected folder on Enter.
                    return false;
                }

                if (e.which === 27) {
                    fireOnClose();
                    mega.ui.sheet.hide();
                    return false;
                }
            });

            if (typeInfo.selection) {
                $input.rebind('focus.selection', () => {
                    const nodeName = $input.val();
                    let selEnd = nodeName.length;
                    let tempIX;
                    if (!nodeType && (tempIX = nodeName.lastIndexOf('.')) > -1) {
                        selEnd = tempIX;
                    }
                    $input[0].selectionStart = 0;
                    $input[0].selectionEnd = selEnd;
                });
            }
            else {
                // Drop a selection handler left over from a previous show() on this shared instance
                $input.off('focus.selection');
            }

            // This code is temporary due to iOS doesn't allow manual focus
            // if the code is executed from an asynchronous function
            if (!is_ios) {
                onIdle(() => $input.trigger('focus'));
            }

            actionButton.on('click.action', () => {
                runAction();
                return false;
            });

            if (!is_mobile) {
                const buttonWrapper = mCreateElement('div', {
                    class: 'flex flex-row-reverse'
                }, mega.ui.sheet.footerNode);

                buttonWrapper.appendChild(actionButton.domNode);
                actionButton.addClass('slim', 'font-600');

                const button = new MegaButton({
                    parentNode: buttonWrapper,
                    componentClassname: 'secondary slim font-600 mx-2',
                    type: 'normal',
                    text: l[82]
                });

                button.on('click.closeAction', () => {
                    fireOnClose();
                    mega.ui.sheet.hide();
                });

                mega.ui.sheet.addFooter({
                    slot: [buttonWrapper]
                });
            }

            mega.ui.sheet.name = typeInfo.name;
            mega.ui.sheet.safeShow = true;

            mega.ui.sheet.show();
        });
    }

    /**
     * Check errors and execute action
     * @param {Object} node {Optional} The node of the folder/file
     * @param {Object} typeInfoOverride {Optional} typeInfo to use instead of this.typeInfo
     * @returns {void}
     */
    action(node, typeInfoOverride) {

        const {nameInput, actionButton} = this;
        const typeInfo = typeInfoOverride || this.typeInfo;

        let nodeType = 1;

        if (node) {
            nodeType = node.t;
        }

        actionButton.disabled = true;

        const newName = nameInput.$input.val();
        const s4NodeType = node && typeof M.getS4NodeType === 'function' && M.getS4NodeType(node);

        let errorMsg = M.safeNameError(newName, nodeType, 250, typeInfo.empty);

        if (!errorMsg && this.duplicated(newName, node ? node.p : $.cftarget || null)) {
            errorMsg = escapeHTML(l[23219]);
        }
        if (!errorMsg && (s4NodeType === 'bucket' || s4NodeType === 'object') && s4.ui) {
            errorMsg = escapeHTML(s4.ui.getInvalidNodeNameError(node, newName) || '');
        }

        if (errorMsg) {
            const alertIcon = '<i class="alert sprite-fm-mono icon-alert-triangle-thin-outline"></i>';

            nameInput.showError(`${alertIcon}${errorMsg}`);
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

        if (newName.trim() === newName) {
            nameInput.hideError();
            nameInput.$wrapper.removeClass('warning');
        }
        else {
            const alertIcon = '<i class="alert sprite-fm-mono icon-alert-circle-thin-outline"></i>';
            const warning = nodeType === 1 ? l.whitespaces_on_foldername : l.whitespaces_on_filename;

            nameInput.showError(`${alertIcon}${escapeHTML(warning)}`);
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

        if (actionButton) {
            actionButton.disabled = !newName;
        }
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
        const items = M.v.filter(item => item.name === newName);

        return items.length !== 0;
    }
}

mBroadcaster.once('fm:initialized', () => {
    'use strict';

    NodeNameControl.typeInfo = {
        create: {
            placeholder: escapeHTML(l[157]),
            selection: false,
            name: 'create-folder',
            title: () => escapeHTML(l[68]),
            button: escapeHTML(l[158]),
            empty: escapeHTML(l.EmptyName),
            submit: newName => {

                const awaitingPromise = $.cfpromise;
                const target = $.cftarget || (M.currentCustomView ? M.currentCustomView.nodeID : M.currentdirid);

                delete $.cfpromise;
                delete $.cftarget;

                mega.ui.sheet.hide();
                loadingDialog.show();

                M.createFolder(target, newName).then(h => {

                    if (is_mobile) {
                        const callbacks = {
                            actionButtonCallback: () => {
                                M.openFolder(h);
                            }
                        };

                        mega.ui.toast.show(escapeHTML(l.new_folder_created), 4, escapeHTML(l[16797]), callbacks);
                        eventlog(99677, 'Mobile web new folder created');
                    }
                    else {
                        if (awaitingPromise) {

                            // dispatch an awaiting promise expecting to perform its own action
                            onIdle(() => awaitingPromise.resolve(h));
                            return awaitingPromise;
                        }

                        const {type, original} = M.currentCustomView;
                        let id = type === mega.devices.rootId ? original : M.getNodeByHandle(h).p || target;

                        if (M.currentrootid === 'out-shares' || M.currentrootid === 'file-requests' ||
                            M.currentrootid === 'public-links') {
                            id = `${M.currentrootid}/${id}`;
                        }

                        // By default, auto-select the newly created folder as long no awaiting promise
                        return M.openFolder(id).always(() => {
                            $.selected = [h];
                            reselect(1);
                        });
                    }
                }).catch(ex => {
                    msgDialog('warninga', escapeHTML(l[135]), escapeHTML(l[47]), ex < 0 ? api_strerror(ex) : ex);
                }).finally(() => {
                    loadingDialog.hide();
                });
            }
        },
        rename: {
            placeholder: '',
            selection: true,
            name: 'rename-folder-file',
            title: (nt, s4) => escapeHTML(nt === 1 ? s4 ? l.s4_bucket_rename : l.rename_folder : l.rename_file),
            button: escapeHTML(l[61]),
            empty: escapeHTML(l[5744]),
            submit: (newName, node) => {

                const nodeType = node.t;

                mega.ui.sheet.hide();
                loadingDialog.show();

                M.rename(node.h, newName).then(() => {

                    if (mega.ui.viewerOverlay && mega.ui.viewerOverlay.visible) {
                        mega.ui.viewerOverlay.setNode(node.h);
                    }

                    // Show message 'Renamed <old name> to <new name>'
                    mega.ui.toast.show(parseHTML((nodeType === 1
                        ? node.s4 ? l.s4_bucket_autorename : l.folder_renamed_to
                        : l.file_renamed_to)
                        .replace('%1', escapeHTML(newName))));
                }).catch(tell).finally(() => {
                    loadingDialog.hide();
                });
            }
        },
        saveTextAs: {
            placeholder: '',
            selection: true,
            name: 'save-as-text',
            title: () => escapeHTML(l[22664]),
            button: escapeHTML(l[776]),
            empty: escapeHTML(l[8566]),
            submit: newName => {
                mega.ui.sheet.hide();

                if (typeof mega.ui.saveTextAs.onSubmit === 'function') {
                    mega.ui.saveTextAs.onSubmit(newName);
                    delete mega.ui.saveTextAs.onSubmit;
                }
            }
        }
    };
});
