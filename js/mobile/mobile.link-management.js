/**
 * Code to trigger the mobile file manager's export/copy and remove link overlay and related behaviour
 */
mobile.linkManagement = {

    /**
     * Show the overlay
     * @param {String} nodeHandle A public or regular node handle
     */
    showOverlay: function(nodeHandle) {
        'use strict';

        this.handle = nodeHandle;
        this.node = M.getNodeByHandle(this.handle);

        this.currentPassword = '';
        this.pwdProtectedLink = '';

        var tmpFn = async() => {
            if (!this.node.ph) {
                loadingDialog.show();
                await this.manageLink(false);
                loadingDialog.hide();
            }

            mega.ui.toast.rack.addClass('above-actions');

            mega.ui.overlay.show({
                name: 'link-management-overlay',
                title: l.mobile_manage_link_overlay_heading,
                showClose: true,
                actionOnBottom: true
            });

            this.container = document.createElement('div');
            this.container.className = 'link-mgmt-container';

            this.showSelectedNode();

            // Create the toggles
            const togglesContainer = document.createElement('div');
            togglesContainer.className = 'link-management-toggles';

            // Share another link on folder link page should not have expiry dates or passwords
            if (!folderlink) {
                this.createExpiryToggle();
                this.createPasswordToggle();
                togglesContainer.append(this.expDateToggleContainer, this.pwdToggleContainer);
            }

            this.createDecryptionKeyToggle();
            togglesContainer.append(this.decKeyToggleContainer);

            this.inlineAlert = mobile.inline.alert.create({
                parentNode: this.container,
                componentClassname: 'share-link-info-msg',
                text: l.mobile_manage_link_alert_message,
                icon: 'sprite-mobile-fm-mono icon-info-thin-outline',
                iconSize: '24',
                closeButton: false
            });

            this.container.append(togglesContainer);

            mega.ui.overlay.addContent(this.container);

            this.createBottomBar();
        };

        const mdList = mega.fileRequestCommon.storage.isDropExist(this.handle);

        if (mdList.length) {
            mega.fileRequest.showRemoveWarning(mdList).then(() => tmpFn.call(this)).catch(dump);
        }
        else {
            tmpFn.call(this);
        }
    },

    /**
     * Creates and 'returns' a bottom bar component for use on this overlay
     * @returns {MegaMobileBottomBar} bottom bar component
     */
    createBottomBar: function() {
        'use strict';

        const actionsArray = [
            [
                ['copy-link', l.mobile_manage_link_copy_link_button, () => {
                    const link = this.pwdProtectedLink || this.formatLink();
                    copyToClipboard(link, l.mobile_link_copied_toast_text);

                    if (this.passwordInput) {
                        const pwdInput = this.passwordInput.$input.val();

                        // User has tapped the Copy link button after entering / clearing their password
                        if (pwdInput && this.currentPassword !== pwdInput ||
                            !pwdInput && this.currentPassword) {
                            delay('pwd-focus', () => {
                                this.passwordInput.$input.trigger('focus');
                            }, 30);
                        }
                    }
                }]
            ]
        ];

        return new MegaMobileBottomBar({
            parentNode: mega.ui.overlay.actionsNode,
            componentClassname: 'share-link-bar',
            actions: actionsArray
        });
    },

    /**
     * Create the expiry date and associated elements
     */
    createExpiryToggle: function() {
        'use strict';

        this.expDateToggleContainer = document.createElement('div');
        this.expDateToggleContainer.className = 'toggle-container expiry-date';

        const expiryTimestamp = M.getNodeShare(this.handle).ets;

        const expiryDateToggle = new MegaMobileToggleButton({
            parentNode: this.expDateToggleContainer,
            componentClassname: 'mega-toggle-button',
            disabled: false,
            value: 'expiry-date',
            id: 'expiry-date',
            label: l.mobile_manage_link_expiry_date,
            checked: expiryTimestamp,
            isProUserOption: true,
            role: 'switch',
            onChange: () => {
                this.datePicker.frontInput.$wrapper.toggleClass('hidden');
                this.datePicker.domNode.classList.toggle('hidden');

                if (expiryDateToggle.checked) {
                    this.datePicker.show();

                    // Change the expiry date immediately for iOS devices
                    if (is_ios) {
                        this.changeExpiryDate(this.datePicker.min);
                    }
                }
                else {
                    this.changeExpiryDate('');
                    this.datePicker.value = '';
                }
            }
        });

        this.datePicker = new MegaMobileDatePicker({
            parentNode: this.expDateToggleContainer,
            componentClassname: 'date-picker',
            defaultValue: expiryTimestamp,
            frontInputID: 'exp-date',
        });
        this.datePicker[u_attr && u_attr.p && expiryTimestamp ? 'removeClass' : 'addClass']('hidden');

        this.datePicker.rebind('change', () => {
            this.changeExpiryDate(this.datePicker.picker.value);
        });

        this.datePicker.frontInput.$wrapper
            .addClass('expiry msg-left')
            .toggleClass('hidden', !expiryDateToggle.checked);

        this.datePicker.frontInput.$wrapper.rebind('tap', () => {
            this.datePicker.show();
        });

        if (expiryTimestamp) {
            this.checkExpiryDate(expiryTimestamp, false);
        }
    },

    /**
     * Function to change the expiry date for a file/folder
     * @param {Date|null} newDate the set expiry date for the file/folder (can be empty)
     * @returns {undefined}
     */
    changeExpiryDate: function(newDate) {
        'use strict';

        var request = {
            a: 'l',
            n: this.handle,
            i: requesti
        };

        var unixDate = new Date(newDate);
        unixDate.setHours(0,0,0,0);

        const unixTime = unixDate.getTime() / 1000;

        if (!this.checkExpiryDate(unixTime, true)) {
            return; // Don't send API request if date is invalid
        }

        if (newDate) {
            request.ets = unixTime;
            this.datePicker.value = unixTime;
        }
        else {
            this.datePicker.value = '';
        }

        api.screq(request).catch(tell);
    },

    /**
     * Function to check the expiry date set for a file/folder. An error message is displayed
     * if the date is invalid.
     *
     * @param {Integer} unixTime the Unix timestamp for the link's expiry date
     * @param {Boolean} datePicked false if this overlay was opened (i.e. date was not picked),
     * true if the user just picked the date
     * @returns {Boolean} if the date is valid or not
     */
    checkExpiryDate: function(unixTime, datePicked) {
        'use strict';

        this.datePicker.frontInput.hideError();

        var todaysDate = new Date();
        todaysDate.setHours(0,0,0,0);

        const dateIsInvalid = unixTime <= todaysDate.getTime() / 1000;
        this.datePicker.domNode.classList.toggle('expired', dateIsInvalid);

        // If the expiry timestamp is in the past or today's timestamp, then show an error message
        if (dateIsInvalid) {
            if (!datePicked) {
                const errorMsg = l.share_link_expired_link_error;

                const alertIcon = 'alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline';
                this.datePicker.frontInput.showError(`<i class='${alertIcon}'></i>${escapeHTML(errorMsg)}`);
            }

            return false;
        }

        return true;
    },

    /**
     * Function to update the UI when the password is changed
     * @param {Boolean} disableToggle Whether to disable the decryption key toggle or not
     */
    passwordChangeUpdateUI: function(disableToggle) {
        'use strict';

        this.decryptionKeyToggle.disabled = disableToggle;
        this.decryptionKeyToggle.toggle.classList.toggle('disabled', disableToggle);

        const decKeyEnabledAndChecked = !disableToggle && this.decryptionKeyToggle.checked;

        this.inlineAlert.text = disableToggle ?
            l.mobile_manage_pwd_protected_link_alert_message :
            l.mobile_manage_link_alert_message;

        this.decKeyFieldText.classList[decKeyEnabledAndChecked ? 'remove' : 'add']('hidden');
        this.$decKeyInput.$wrapper.toggleClass('hidden', !decKeyEnabledAndChecked);
    },

    /**
     * Function to validate the password the user has entered.
     * Password must be different to any previously set one and be more than 3 characters
     *
     * @returns {Boolean} whether the password is valid or not
     */
    validatePassword: function() {
        'use strict';

        const password = this.passwordInput.$input.val();
        const pwdLength = password.length;

        // Don't validate password when it is the same as an existing one and isn't empty
        if (this.currentPassword === password && password) {
            return true;
        }

        this.passwordInput.hideError();

        if (pwdLength >= 3) {
            this.pwdProtectedLink = ''; // Reset the link if the new password is valid
            this.currentPassword = password;
            this.passwordChangeUpdateUI(true);

            mega.ui.toast.show(l.mobile_link_updated_toast_text, 4);

            this.updatePwdProtectedLink();

            return true;
        }

        if (this.currentPassword) {
            mega.ui.toast.show(l.mobile_link_updated_toast_text, 4);
        }
        this.passwordChangeUpdateUI(false);

        // Reset this.pwdProtectedLink and this.currentPassword if password is invalid
        this.pwdProtectedLink = '';
        this.currentPassword = '';

        const errorMsg = pwdLength > 0 ?
            l.mobile_manage_link_stronger_pwd_error :
            l.mobile_manage_link_empty_pwd_error;

        const alertIcon = 'alert sprite-mobile-fm-mono icon-alert-triangle-thin-outline';
        this.passwordInput.showError(`<i class='${alertIcon}'></i>${escapeHTML(errorMsg)}`);

        // Override the margin bottom style set by showError
        this.passwordInput.$wrapper.css('marginBottom', '48px');

        return false;
    },

    /**
     * Function that gets the password protected link.
     * Adapted/copied from export.js getLinkInfo
     */
    updatePwdProtectedLink: function() {
        'use strict';

        var linkInfo = {
            type: this.node.t ? exportPassword.LINK_TYPE_FOLDER : exportPassword.LINK_TYPE_FILE,
            key: this.node.t ? u_sharekeys[this.node.h][0] : this.node.k,
            handle: this.node.h,
            publicHandle: this.node.ph,
        };
        linkInfo.keyBytes = a32_to_ab(linkInfo.key);

        // Generate a random salt for encrypting this link
        var algorithm = exportPassword.currentAlgorithm;
        var saltLengthBytes = exportPassword.algorithms[algorithm].saltLength / 8;
        linkInfo.saltBytes = crypto.getRandomValues(new Uint8Array(saltLengthBytes));

        exportPassword.deriveKey(algorithm, linkInfo.saltBytes, this.currentPassword, (derivedKeyBytes) => {
            exportPassword.encrypt.encryptAndMakeLink(linkInfo, derivedKeyBytes);
        });
    },

    /**
     * Create the password toggle and associated elements for display
     */
    createPasswordToggle: function() {
        'use strict';

        this.pwdToggleContainer = document.createElement('div');
        this.pwdToggleContainer.className = 'toggle-container password';

        this.passwordToggle = new MegaMobileToggleButton({
            parentNode: this.pwdToggleContainer,
            componentClassname: 'mega-toggle-button',
            disabled: false,
            value: 'password',
            id: 'password',
            label: l.mobile_manage_link_password,
            checked: false,
            isProUserOption: true,
            role: 'switch',
            onChange: () => {
                this.passwordInput.$wrapper.toggleClass('hidden', !this.passwordToggle.checked);
                this.passwordFieldInput.value = '';
                this.passwordInput.hideError();

                if (this.passwordToggle.checked) {
                    delay('pwd-focus', () => {
                        this.passwordInput.$input.trigger('focus');
                    }, 30);
                }
                else {
                    if (this.currentPassword) {
                        mega.ui.toast.show(l.mobile_link_updated_toast_text, 4);
                    }

                    this.pwdProtectedLink = '';
                    this.currentPassword = '';
                    this.passwordInput.$wrapper.find('.clear-input').addClass('hidden');
                    this.passwordChangeUpdateUI(false);
                }
            }
        });

        this.passwordFieldInput = document.createElement('input');
        this.passwordFieldInput.type = 'password';
        this.passwordFieldInput.className = 'password-field underlinedText clearButton no-title-top with-icon';
        this.passwordFieldInput.id = 'link-pwd';

        this.pwdToggleContainer.append(this.passwordFieldInput);

        this.passwordInput = new mega.ui.MegaInputs($(this.passwordFieldInput));
        this.passwordInput.$wrapper
            .addClass('box-style link-pwd hidden msg-left mobile')
            .find('i').attr('tabindex', '0');

        // Validate the password if:
        // 1. Event is blur and e.relatedTarget doesn't exist
        // 2. User taps enter on their keyboard
        // 3. User taps eye icon or link to HC article
        this.passwordInput.$input.rebind('blur.passwordCheck keyup.passwordCheck change.passwordCheck', (e) => {
            const clickedAway = e.type === 'blur' && !e.relatedTarget;
            const enterTapped = e.which === 13;

            const relatedTargets = ['pass-visible', 'hc-article'];
            const relatedTargetsTapped = e.relatedTarget &&
                relatedTargets.some(className => e.relatedTarget.classList.contains(className));

            if (clickedAway || enterTapped || relatedTargetsTapped) {
                if (e.type === 'blur') {
                    this.passwordInput.$wrapper.find('.clear-input').addClass('hidden');
                }

                this.validatePassword();
            }
        });
    },

    /**
     * Create the decryption key toggle and associated elements for display
     */
    createDecryptionKeyToggle: function() {
        'use strict';

        this.decKeyToggleContainer = document.createElement('div');
        this.decKeyToggleContainer.className = 'toggle-container decryption-key';

        this.decryptionKeyToggle = new MegaMobileToggleButton({
            parentNode: this.decKeyToggleContainer,
            componentClassname: 'mega-toggle-button',
            disabled: false,
            value: 'decryption-key',
            id: 'decryption-key',
            label: l.mobile_manage_link_decryption_key,
            checked: false,
            isProUserOption: false,
            role: 'switch',
            onChange: () => {
                this.decKeyFieldText.classList.toggle('hidden');
                this.$decKeyInput.$wrapper.toggleClass('hidden');
            }
        });

        const decryptionKeyMessage = document.createElement('div');
        decryptionKeyMessage.className = 'decryption-key-message';
        decryptionKeyMessage.append(parseHTML(l.manage_link_export_link_text));

        const learnMoreLink = decryptionKeyMessage.querySelector('a');
        learnMoreLink.classList.add('hc-article');

        this.decKeyFieldText = document.createElement('div');
        this.decKeyFieldText.className = 'title hidden';
        this.decKeyFieldText.textContent = l.mobile_manage_link_decryption_key_field_title;

        const decKeyInputField = document.createElement('input');
        decKeyInputField.type = 'text';
        decKeyInputField.placeholder = this.getDecryptionKey();
        decKeyInputField.disabled = true;
        decKeyInputField.className = 'dec-key underlinedText no-title-top with-icon';
        decKeyInputField.id = 'dec-key';

        this.decKeyToggleContainer.append(decryptionKeyMessage, this.decKeyFieldText, decKeyInputField);

        this.$decKeyInput = new mega.ui.MegaInputs(
            $(decKeyInputField).data('icon', 'sprite-mobile-fm-mono icon-copy-thin-outline')
        );

        this.$decKeyInput.$wrapper.addClass('box-style dec-key hidden mobile');

        // Only copy text if icon is tapped
        this.$decKeyInput.$wrapper.rebind('tap', (e) => {
            if (e.target.classList.contains('icon-copy-thin-outline')) {
                copyToClipboard(decKeyInputField.placeholder, l.mobile_link_dec_key_copied_toast_text);
            }
        });
    },

    /**
     * Display node details in overlay (by duplicating the file/folder node)
     */
    showSelectedNode: function() {
        'use strict';

        const selectedNode = document.createElement('div');
        selectedNode.className = 'selected-node';

        const itemComponent = MegaMobileNode.getNodeComponentByHandle(this.handle);
        let itemNode = itemComponent && itemComponent.domNode;
        if (!itemNode && mega.ui.viewerOverlay.visible) {
            itemNode = mega.ui.viewerOverlay.nodeComponent.domNode;
        }
        const itemName = itemNode.querySelector('.fm-item-name');
        const itemImage = itemNode.querySelector('.fm-item-img');
        selectedNode.append(itemImage.cloneNode(true));

        const thumbTag = selectedNode.querySelector('img'); // remove thumbnails if it has
        if (thumbTag) {
            thumbTag.remove();
        }

        const nodeDetails = document.createElement('div');
        nodeDetails.className = 'node-details';
        nodeDetails.append(itemName.cloneNode(true));

        if (M.currentdirid === 'out-shares') {
            const numFiles = document.createElement('div');
            numFiles.className = 'mobile num-files';
            numFiles.textContent = fm_contains(this.node.tf, this.node.td);

            nodeDetails.append(numFiles);
        }
        else if (this.node.t === 1) {
            // folder
            nodeDetails.append(itemNode.querySelector('.num-files').cloneNode(true));
        }
        else if (this.node.t === 0) {
            // file
            nodeDetails.append(itemNode.querySelector('.file-size').cloneNode(true));
        }

        selectedNode.append(nodeDetails);
        this.container.append(selectedNode);
    },

    /**
     * Create or remove the link for the given node (handle)
     * @param {Boolean} removeLink True if the link is to be removed, false if being added
     * @param {String} handle The node handle for this file (if not provided earlier)
     */
    manageLink: async function(removeLink, handle) {
        'use strict';

        handle = handle || this.handle;

        if (!handle) {
            console.error('Node handle / ID not provided');
            return;
        }

        // Get link to be added / removed
        var exportLink = new mega.Share.ExportLink({
            'showExportLinkDialog': false,
            'updateUI': false,
            'nodesToProcess': [handle]
        });

        const res = await exportLink[removeLink ? 'removeExportLink' : 'getExportLink']().catch(dump);

        if (removeLink && res && res.length) {
            mega.ui.toast.show(l.mobile_link_removed_toast_text, 4);
        }
    },

    /**
     * Formats the public link with key
     * @returns {String} Returns the URL in format:
     *                   https://mega.nz/#!X4NiADjR!BRqpTTSy-4UvHLz_6sHlpnGS-dS0E_RIVCpGAtjFmZQ
     */
    formatLink: function() {
        'use strict';

        var type = '';

        if (!this.node.ph && !folderlink) {
            if (d) {
                console.warn('No public handle for node %s', this.handle);
            }
            return false;
        }

        var nodeUrlWithPublicHandle;
        var nodeDecryptionKey = (!this.decryptionKeyToggle.disabled && this.decryptionKeyToggle.checked) ?
            '' : this.getDecryptionKey();
        var fileUrlNodeHandle = '';

        if (folderlink) {
            if (mega.flags.nlfe) {
                nodeUrlWithPublicHandle = getBaseUrl() + '/folder/' + pfid + '#';
            }
            else {
                nodeUrlWithPublicHandle = getBaseUrl() + '/#F!' + pfid;
            }
        }
        else {
            if (this.node.t) {
                type = 'F';
            }

            if (mega.flags.nlfe) {
                type = (type) ? '/folder/' : '/file/';
                nodeUrlWithPublicHandle = getBaseUrl() + type + this.node.ph + '#';
            }
            else {
                nodeUrlWithPublicHandle = getBaseUrl() + '/#' + type + '!' + this.node.ph;
            }
        }

        return nodeUrlWithPublicHandle + nodeDecryptionKey + fileUrlNodeHandle;
    },

    /**
     * Gets the decryption key for a node
     * @returns {String} the node's decryption key (empty string if not found)
     */
    getDecryptionKey: function() {

        'use strict';

        if (folderlink) {
            let fileUrlNodeHandle = '';

            if (mega.flags.nlfe) {
                fileUrlNodeHandle = (this.node.t ? '/folder/' : '/file/') + this.node.h;
            }
            else {
                fileUrlNodeHandle = (item.t ? '!' : '?') + item.h;
            }

            return pfkey + fileUrlNodeHandle;
        }

        var key = this.node.t ?
            u_sharekeys[this.node.h] && u_sharekeys[this.node.h][0] :
            this.node.k;

        if (key) {
            return (mega.flags.nlfe) ?
                a32_to_base64(key) :
                '!' + a32_to_base64(key);
        }

        return '';
    }
};
