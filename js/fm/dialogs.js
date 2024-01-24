(function _dialogs(global) {
    'use strict'; /* jshint -W074 */

    // @private pointer to global fm-picker-dialog
    var $dialog = false;
    // @private reference to active dialog section
    var section = 'cloud-drive';
    // @private shared nodes metadata
    var shares = Object.create(null);
    if (d) {
        window.mcshares = shares;
    }

    // ------------------------------------------------------------------------
    // ---- Private Functions -------------------------------------------------

    /**
     * Find shared folders marked read-only and disable it in dialog.
     * @private
     */
    var disableReadOnlySharedFolders = function() {
        var $ro = $('.fm-picker-dialog-tree-panel.shared-with-me .dialog-content-block span[id^="mctreea_"]');
        var targets = $.selected || [];

        if (!$ro.length) {
            if ($('.fm-picker-dialog-button.shared-with-me', $dialog).hasClass('active')) {
                // disable import btn
                $('.dialog-picker-button', $dialog).addClass('disabled');
            }
        }
        $ro.each(function(i, v) {
            var h = $(v).attr('id').replace('mctreea_', '');
            var s = shares[h] = Object.create(null);
            var n = M.d[h];

            while (n && !n.su) {
                n = M.d[n.p];
            }

            if (n) {
                s.share = n;
                s.owner = n.su;
                s.level = n.r;

                for (i = targets.length; i--;) {
                    if (M.isCircular(n.h, targets[i])) {
                        s.circular = true;
                        break;
                    }
                }
            }

            if (!n || !n.r) {
                $(v).addClass('disabled');
            }
        });
    };

    /**
     * Disable circular references and read-only shared folders.
     * @private
     */
    var disableFolders = function() {
        $('*[id^="mctreea_"]').removeClass('disabled');

        if ($.moveDialog) {
            M.disableCircularTargets('#mctreea_');
        }
        else if ($.selectFolderDialog && $.fileRequestNew) {
            const getIdAndDisableDescendants = (elem) => {
                const handle = String($(elem).attr('id')).replace('mctreea_', '');
                if (handle) {
                    M.disableDescendantFolders(handle, '#mctreea_');
                }
            };

            const $allFolders = $('*[id^="mctreea_"]', $dialog);
            const $sharedAndFileRequestFolders = $('*[id^="mctreea_"]', $dialog)
                .children('.file-request-folder, .shared-folder');

            // All parent file request and shared folder
            $sharedAndFileRequestFolders.closest('.nw-fm-tree-item')
                .addClass('disabled');

            // Filter shared folder and disable descendants
            const filteredSharedFolders = $sharedAndFileRequestFolders.filter('.shared-folder')
                .closest('.nw-fm-tree-item');

            if (filteredSharedFolders.length) {
                for (let i = 0; i < filteredSharedFolders.length; i++) {
                    getIdAndDisableDescendants(filteredSharedFolders[i]);
                }
            }

            // Check all linked folders and disable descendants
            const filteredLinkedFolders = $allFolders
                .filter('.linked')
                .addClass('disabled');

            if (filteredLinkedFolders.length) {
                for (let i = 0; i < filteredLinkedFolders.length; i++) {
                    getIdAndDisableDescendants(filteredLinkedFolders[i]);
                }
            }
        }
        else if (!$.copyToUpload) {
            var sel = $.selected || [];

            for (var i = sel.length; i--;) {
                $('#mctreea_' + String(sel[i]).replace(/[^\w-]/g, '')).addClass('disabled');
            }
        }

        disableReadOnlySharedFolders();
    };

    /**
     * Retrieve array of non-circular nodes
     * @param {Array} [selectedNodes]
     * @returns {Array}
     * @private
     */
    var getNonCircularNodes = function(selectedNodes) {
        var r = [];

        if ($.mcselected) {
            selectedNodes = selectedNodes || $.selected || [];

            for (var i = selectedNodes.length; i--;) {
                if ($.moveDialog && M.isCircular(selectedNodes[i], $.mcselected)) {
                    continue; // Ignore circular targets if move dialog is active
                }

                if (selectedNodes[i] === $.mcselected) {
                    continue; // If the source node is equal to target node
                }

                r.push(selectedNodes[i]);
            }
        }

        return r;
    };

    /**
     * Retrieves a list of currently selected target chats
     * @private
     */
    var getSelectedChats = function() {
        var chats = $('.nw-contact-item.selected', $dialog).attrs('id');
        chats = chats.map(function(c) {
            return String(c).replace('cpy-dlg-chat-itm-spn-', '');
        });
        return chats;
    };

    /**
     * Set the dialog button state to either disabled or enabled
     * @param {Object} $btn The jQuery's node or selector
     * @private
     */
    var setDialogButtonState = function($btn) {
        $btn = $($btn);

        if (section === 'conversations') {
            if (getSelectedChats().length) {
                $btn.removeClass('disabled');
            }
            else {
                $btn.addClass('disabled');
            }
        }
        else if (!$.mcselected) {
            $btn.addClass('disabled');
        }
        else if ($.copyDialog && section === 'cloud-drive') {
            $btn.removeClass('disabled');
        }
        else if ($.selectFolderDialog && section === 'cloud-drive' && $.mcselected !== M.RootID) {
            $btn.removeClass('disabled');
        }
        else {
            var forceEnabled = $.copyToShare || $.copyToUpload || $.onImportCopyNodes || $.saveToDialog || $.nodeSaveAs;

            console.assert(!$.copyToShare || Object($.selected).length === 0, 'check this...');

            if (!forceEnabled && !getNonCircularNodes().length) {
                $btn.addClass('disabled');
            }
            else {
                $btn.removeClass('disabled');
            }
        }

        // Set Create folder label
        if (section === 's4' && M.tree.s4 && M.tree.s4[$.mcselected]) {
            $('.dialog-newfolder-button span', $dialog).text(l.s4_create_bkt);
        }
        else {
            $('.dialog-newfolder-button span', $dialog).text(l[68]);
        }
    };

    /**
     * Select tree item node
     * @param {String} h The node handle
     */
    var selectTreeItem = function(h) {
        queueMicrotask(() => {
            if (section === 'conversations') {
                $('#cpy-dlg-chat-itm-spn-' + h, $dialog).trigger('click');
            }
            else if (!$('#mctreesub_' + h, $dialog).hasClass('opened')) {
                $('#mctreea_' + h, $dialog).trigger('click');
            }
        });
    };

    /**
     * Render target breadcrumb
     * @param {String} [aTarget] Target node handle
     * @private
     */
    var setDialogBreadcrumb = function(aTarget) {
        let path = false;
        let names = Object.create(null);
        const titles = Object.create(null);
        const dialog = $dialog[0];
        var autoSelect = $.copyToUpload && !$.copyToUpload[2];

        if (section === 'conversations') {
            const chats = getSelectedChats();
            if (chats.length > 1) {
                path = [u_handle, 'contacts'];
                names[u_handle] = l[23755];
            }
            else {
                aTarget = chats[0] || String(aTarget || '').split('/').pop();
            }
            if (aTarget && String(aTarget).indexOf("#") > -1) {
                aTarget = aTarget.split("#")[0];
            }
        }

        // Update global $.mcselected with the target handle
        $.mcselected = aTarget && aTarget !== 'transfers' ? aTarget : undefined;
        path = path || M.getPath($.mcselected);

        titles[M.RootID] = l[164];
        titles[M.RubbishID] = l[167];
        titles.shares = l[5542];
        titles.contacts = l[17765];

        if (path.length === 1) {
            names = titles;
        }

        if ($.mcselected && !path.length) {
            // The selected node is likely not in memory, try to rely on DOM and find the ancestors
            var el = $dialog[0].querySelector('#mctreea_' + aTarget);

            if (el) {
                path.push(aTarget);
                names[aTarget] = el.querySelector(
                    '.nw-fm-tree-folder, .nw-fm-tree-icon-wrap'
                ).textContent;

                $(el).parentsUntil('.dialog-content-block', 'ul').each(function(i, elm) {
                    var h = String(elm.id).split('_')[1];
                    path.push(h);

                    elm = dialog.querySelector(
                        `#mctreea_${h} .nw-fm-tree-folder, #mctreea_${h} .nw-fm-tree-icon-wrap`
                    );
                    if (elm) {
                        names[h] = elm.textContent;
                    }
                });
            }
        }

        const scope = dialog.querySelector('.fm-picker-breadcrumbs');
        const dictionary = function _(handle) {

            // If this is gallery view, make it default to root path instead
            if (M.isGalleryPage(handle) || M.isAlbumsPage(0, handle)) {
                return _(M.RootID);
            }

            let name = names[handle] || M.getNameByHandle(handle) || '';
            let id = handle;
            let typeClass = 'folder';

            const typeClasses = {
                [M.RootID]: 'cloud-drive',
                [M.RubbishID]: 'rubbish-bin',
                'contacts': 'contacts',
                'shares': 'shared-with-me'
            };

            if (handle === M.RootID) {
                if (!folderlink) {
                    typeClass = typeClasses[handle];
                }
            }
            else if (typeClasses[handle]) {
                typeClass = typeClasses[handle];
            }
            else if (handle.length === 11) {
                typeClass = 'contact selectable-txt';
            }

            if (name === 'undefined') {
                name = '';
            }

            if (titles[handle]) {
                name = titles[handle];
            }

            if (section === 'conversations') {
                name = name && megaChat.plugins.emoticonsFilter.processHtmlMessage(escapeHTML(name)) || name;
            }
            else if (typeClass === 'contact') {
                name = '';
            }

            // Object storage icons
            if (section === 's4' && M.tree.s4) {
                if (M.tree.s4[handle]) {
                    name = l.obj_storage;
                    typeClass = 's4-object-storage';
                }
                else {
                    const cn = Object.values(M.tree.s4);

                    for (let i = 0; i < cn.length; ++i) {
                        if (M.tree[cn[i].h] && M.tree[cn[i].h][handle]) {
                            typeClass = 's4-buckets';
                        }
                    }
                }
            }

            if (autoSelect) {
                selectTreeItem(handle);
            }

            return {
                name,
                id,
                typeClass
            };
        };

        M.renderBreadcrumbs(path, scope, dictionary, id => {
            var $elm = $('#mctreea_' + id, $dialog);
            if ($elm.length) {
                $elm.trigger('click');
            }
            else {
                $('.fm-picker-dialog-button.active', $dialog).trigger('click');
            }
            $('.breadcrumb-dropdown.active', $dialog).removeClass('active');
            return false;
        });

        const placeholder = dialog.querySelector('.summary-input.placeholder');
        if (path.length) {
            placeholder.classList.add('correct-input');
            placeholder.classList.remove('high-light');
        }
        else {
            placeholder.classList.add('high-light');
            placeholder.classList.remove('correct-input');
            const filetypeIcon = placeholder.querySelector('.target-icon');
            filetypeIcon.classList.remove('icon-chat-filled', 'icon-folder-filled', 'sprite-fm-uni', 'sprite-fm-mono');
            filetypeIcon.classList.add(
                'sprite-fm-mono',
                section === 'conversations' ? 'icon-chat-filled' : 'icon-folder-filled'
            );
        }

        if ($.copyToUpload) {
            // auto-select entries once
            $.copyToUpload[2] = true;
        }
    };

    /**
     * Set selected items...
     * @param {*} [single] Single item mode
     * @private
     */
    var setSelectedItems = function(single) {
        var $icon = $('.summary-items-drop-icon', $dialog)
            .removeClass('icon-arrow-up drop-up icon-arrow-down drop-down hidden');
        var $div = $('.summary-items', $dialog).removeClass('unfold multi').empty();
        var names = Object.create(null);
        var items = $.selected || [];

        $('.summary-title.summary-selected-title', $dialog).text(l[19180]);

        if ($.saveToDialogNode) {
            items = [$.saveToDialogNode.h];
            names[$.saveToDialogNode.h] = $.saveToDialogNode.name;
        }
        if ($.copyToShare) {
            items = [];
            single = true;
            $('.summary-target-title', $dialog).text(l[19180]);
            $('.summary-selected', $dialog).addClass('hidden');
        }
        else if ($.selectFolderDialog) {
            $('.summary-target-title', $dialog).text(l[19181]);
            $('.summary-selected', $dialog).addClass('hidden');
        }
        else {
            $('.summary-target-title', $dialog).text(l[19181]);

            if ($.onImportCopyNodes) {
                $('.summary-selected', $dialog).addClass('hidden');
            }
            else {
                $('.summary-selected', $dialog).removeClass('hidden');
            }

            if ($.copyToUpload) {
                items = $.copyToUpload[0];

                for (var j = items.length; j--;) {
                    items[j].uuid = makeUUID();
                }
            }
        }

        if (!single) {
            $div.addClass('unfold');
            $div.safeAppend('<div class="item-row-group"></div>');
            $div = $div.find('.item-row-group');

        }

        if ($.nodeSaveAs) {
            items = [$.nodeSaveAs.h];
            names[$.nodeSaveAs.h] = $.nodeSaveAs.name || '';

            $('.summary-title.summary-selected-title', $dialog).text(l[1764]);
            var rowHtml = '<div class="item-row">' +
                '<div class="transfer-filetype-icon file text"></div>' +
                '<input id="f-name-input" class="summary-ff-name" type="text" value="' + escapeHTML($.nodeSaveAs.name)
                + '" placeholder="' + l[17506] + '" autocomplete="off"/> &nbsp; '
                + '</div>'
                + '<div class="whitespaces-input-warning"> <div class="arrow"></div> <span></span></div>'
                + '<div class="duplicated-input-warning"> <div class="arrow"></div> <span>'
                + l[17578] + '</span> </div>';

            $div.safeHTML(rowHtml);

            const ltWSpaceWarning = new InputFloatWarning($dialog);
            ltWSpaceWarning.check({type: 0, name: names[$.nodeSaveAs.h], ms: 0});

            $('#f-name-input', $div).rebind('keydown.saveas', function(e) {
                if (e.which === 13 || e.keyCode === 13) {
                    $('.dialog-picker-button', $dialog).trigger('click');
                }
            });
            $('#f-name-input', $div).rebind('keyup.saveas', () => {
                ltWSpaceWarning.check({type: 0});
            });
            if ($.saveAsDialog) {
                $('#f-name-input', $dialog).focus();
            }
        }
        else {
            for (var i = 0; i < items.length; i++) {
                var h = items[i];
                var n = M.getNodeByHandle(h) || Object(h);
                var name = names[h] || M.getNameByHandle(h) || n.name;
                var tail = '<i class="delete-item sprite-fm-mono icon-close-component "></i>';
                var summary = '<div class="summary-ff-name-ellipsis">@@</div>';
                var icon = fileIcon(n);
                var data = n.uuid || h;

                if (single) {
                    tail = '<span>(@@)</span>';
                    if (items.length < 2) {
                        tail = '';
                        summary = '<div class="summary-ff-name">@@</div>';
                    }
                }

                const pluralText = mega.icu.format(l.items_other_count, items.length - 1);
                $div.safeAppend(
                    '<div class="item-row" data-node="@@">' +
                    '    <div class="transfer-filetype-icon file @@"></div>' +
                        summary + ' &nbsp; ' + tail +
                    '</div>', data, icon, name, pluralText
                );

                if (single) {
                    break;
                }
            }
        }

        $icon.rebind('click', function() {
            $div.off('click.unfold');
            setSelectedItems(!single);
            return false;
        });

        if (single) {
            if (items.length > 1) {
                $div.addClass('multi').rebind('click.unfold', function() {
                    $icon.trigger('click');
                    return false;
                });
                $icon.addClass('icon-arrow-down drop-down');
            }
            else {
                $icon.addClass('hidden');
            }
        }
        else {
            initPerfectScrollbar($div);
            $icon.addClass('icon-arrow-up drop-up');

            $('.delete-item', $div).rebind('click', function() {
                var $row = $(this).parent();
                var data = $row.attr('data-node');

                $row.remove();
                initPerfectScrollbar($div);

                if ($.copyToUpload) {
                    for (var i = items.length; i--;) {
                        if (items[i].uuid === data) {
                            items.splice(i, 1);
                            break;
                        }
                    }
                    $('header h2', $dialog).text(getDialogTitle());
                }
                else {
                    array.remove(items, data);
                }

                if (items.length < 2) {
                    setSelectedItems(true);
                }

                return false;
            });
        }
    };

    /**
     * Get the button label for the dialog's main action button
     * @returns {String}
     * @private
     */
    var getActionButtonLabel = function() {
        if ($.albumImport) {
            return l.context_menu_import;
        }

        if ($.mcImport) {
            return l[236]; // Import
        }

        if ($.chatAttachmentShare && section !== 'conversations') {
            return l[776]; // Save
        }

        if ($.copyToShare) {
            return l[1344]; // Share
        }

        if ($.copyToUpload) {
            return l[372]; // Upload
        }

        if (section === 'conversations') {
            return l[1940]; // Send
        }

        if ($.saveToDialog || $.saveAsDialog) {
            if ($.nodeSaveAs && !$.nodeSaveAs.h) {
                return l[158];
            }
            return l[776]; // Save
        }

        if ($.moveDialog) {
            return l[62]; // Move
        }

        if ($.selectFolderDialog) {
            return l[1523]; // Select
        }

        return l[16176]; // Paste
    };

    /**
     * Get the dialog title based on operation
     * @returns {String}
     * @private
     */
    var getDialogTitle = function() {
        if ($.albumImport) {
            return l.context_menu_import;
        }

        if ($.mcImport) {
            return l[236]; // Import
        }

        if ($.chatAttachmentShare && section !== 'conversations') {
            return l[776]; // Save
        }

        if ($.copyToShare) {
            return l[1344]; // Share
        }

        if ($.copyToUpload) {
            var len = $.copyToUpload[0].length;

            if (section === 'conversations') {
                return mega.icu.format(l.upload_to_conversation, len);
            }

            if (section === 'shared-with-me') {
                return mega.icu.format(l.upload_to_share, len);
            }

            if (section === 's4') {
                return mega.icu.format(l.upload_to_s4, len);
            }

            return mega.icu.format(l.upload_to_cd, len);
        }

        if ($.saveToDialog) {
            return l[776]; // Save
        }

        if ($.saveAsDialog) {
            if ($.nodeSaveAs && !$.nodeSaveAs.h) {
                return l[22680];
            }
            return l[22678];
        }

        if (section === 'conversations') {
            return l[17764]; // Send to chat
        }

        if ($.moveDialog) {
            return l[62]; // Move
        }

        return l[63]; // Copy
    };

    /**
     * Getting contacts and view them in copy dialog
     */
    var handleConversationTabContent = function _handleConversationTabContent() {
        var myChats = megaChat.chats;
        var myContacts = M.getContactsEMails(true); // true to exclude requests (incoming and outgoing)
        var $conversationTab = $('.fm-picker-dialog-tree-panel.conversations');
        var $conversationNoConvTab = $('.dialog-empty-block.conversations');
        var $conversationTabHeader = $('.fm-picker-dialog-panel-header', $conversationTab);
        var $contactsContentBlock = $('.dialog-content-block', $conversationTab);
        var contactGeneratedList = "";
        var ulListId = 'cpy-dlg-chat-' + u_handle;
        var addedContactsByRecent = [];
        var nbOfRecent = 0;
        var isActiveMember = false;

        var createContactEntry = function _createContactEntry(name, email, handle) {
            if (name && handle && email) {
                var contactElem = '<span id="cpy-dlg-chat-itm-spn-' + handle
                    + '" class="nw-contact-item single-contact ';
                var contactStatus = 'offline';
                if (M.d[handle] && M.d[handle].presence) {
                    contactStatus = M.onlineStatusClass(M.d[handle].presence)[1];
                }
                contactElem += contactStatus + '">';
                contactElem += '<i class="encrypted-icon sprite-fm-uni icon-ekr"></i>';
                contactElem += '<span class="nw-contact-status"></span>';
                contactElem +=
                    '<span class="nw-contact-name selectable-txt">' +
                        megaChat.plugins.emoticonsFilter.processHtmlMessage(escapeHTML(name))
                    + '</span>';
                contactElem += '<span class="nw-contact-email">' + escapeHTML(email) + '</span>';
                contactElem = '<li id="cpy-dlg-chat-itm-' + handle + '">' + contactElem + '</li>';
                return contactElem;
            }
            return '';
        };

        var createGroupEntry = function _createGroupEntry(names, nb, handle, chatRoom) {
            if (names && names.length && nb && handle) {
                var groupElem = '<span id="cpy-dlg-chat-itm-spn-' + handle
                    + '" class="nw-contact-item multi-contact">';

                if (chatRoom && (chatRoom.type === "group" || chatRoom.type === "private")) {
                    groupElem += '<i class="encrypted-icon sprite-fm-uni icon-ekr"></i>';
                }
                else {
                    groupElem += '<span class="encrypted-spacer"></span>';
                }

                groupElem += '<i class="group-chat-icon sprite-fm-mono icon-contacts"></i>';

                var namesCombine = names[0];
                var k = 1;
                while (namesCombine.length <= 40 && k < names.length) {
                    namesCombine += ', ' + names[k];
                    k++;
                }
                if (k !== names.length) {
                    namesCombine = namesCombine.substr(0, 37);
                    namesCombine += '...';
                }
                groupElem += '<span class="nw-contact-name group selectable-txt">' +
                    megaChat.plugins.emoticonsFilter.processHtmlMessage(escapeHTML(namesCombine)) +
                    '</span>';
                groupElem += '<span class="nw-contact-group">' + mega.icu.format(l[24157], nb) + '</span>';
                groupElem = '<li id="cpy-dlg-chat-itm-' + handle + '">' + groupElem + '</li>';
                return groupElem;
            }
            return '';
        };

        if (myChats && myChats.length) {
            isActiveMember = myChats.every(function(chat) {
                return chat.members[u_handle] !== undefined && chat.members[u_handle] !== -1;
            });
            var top5 = 5; // defined in specs, top 5 contacts
            var sortedChats = obj_values(myChats.toJS());
            sortedChats.sort(M.sortObjFn("lastActivity", -1));
            for (var chati = 0; chati < sortedChats.length; chati++) {
                var chatRoom = sortedChats[chati];
                if (chatRoom.isArchived()) {
                    continue;
                }
                if (chatRoom.isReadOnly()) {
                    continue;
                }
                var isValidGroupOrPubChat = false;
                if (chatRoom.type === 'group') {
                    if (!$.len(chatRoom.members)) {
                        continue;
                    }
                    isValidGroupOrPubChat = true;
                }
                else if (
                    chatRoom.type === "public" &&
                    chatRoom.membersSetFromApi &&
                    chatRoom.membersSetFromApi.members[u_handle] >= 2
                ) {
                    isValidGroupOrPubChat = true;
                }

                if (isValidGroupOrPubChat) {
                    var gNames = [];
                    if (chatRoom.topic) {
                        gNames.push(chatRoom.topic);
                    }
                    else {
                        ChatdIntegration._ensureContactExists(chatRoom.members);
                        for (var grHandle in chatRoom.members) {
                            if (gNames.length > 4) {
                                break;
                            }

                            if (grHandle !== u_handle) {
                                gNames.push(M.getNameByHandle(grHandle));
                            }
                        }
                    }
                    if (gNames.length) {
                        if (nbOfRecent < top5) {
                            var gElem = createGroupEntry(
                                gNames,
                                Object.keys(chatRoom.members).length,
                                chatRoom.roomId,
                                chatRoom
                            );
                            contactGeneratedList += gElem;
                        }
                        else {
                            myContacts.push({
                                id: Object.keys(chatRoom.members).length,
                                name: gNames[0], handle: chatRoom.roomId, isG: true,
                                gMembers: gNames
                            });
                        }
                        nbOfRecent++;

                    }
                }
                else if (nbOfRecent < top5) {
                    var contactHandle;
                    for (var ctHandle in chatRoom.members) {
                        if (ctHandle !== u_handle) {
                            contactHandle = ctHandle;
                            break;
                        }
                    }
                    if (
                        contactHandle &&
                        M.u[contactHandle] && M.u[contactHandle].c === 1 && M.u[contactHandle].m
                    ) {
                        addedContactsByRecent.push(contactHandle);
                        var ctElemC = createContactEntry(
                            M.getNameByHandle(contactHandle),
                            M.u[contactHandle].m,
                            contactHandle
                        );
                        contactGeneratedList += ctElemC;
                        nbOfRecent++;
                    }
                }
            }
        }

        if (myContacts && myContacts.length) {
            myContacts.sort(M.sortObjFn("name", 1));

            for (var a = 0; a < myContacts.length; a++) {
                if (addedContactsByRecent.includes(myContacts[a].handle)) {
                    continue;
                }
                var ctElem;
                if (!myContacts[a].isG) {
                    ctElem = createContactEntry(myContacts[a].name, myContacts[a].id, myContacts[a].handle);
                }
                else {
                    ctElem = createGroupEntry(
                        myContacts[a].gMembers,
                        myContacts[a].id,
                        myContacts[a].handle,
                        megaChat.chats[myContacts[a].handle]
                    );
                }
                contactGeneratedList += ctElem;
            }
        }

        if (
            myChats && myChats.length && isActiveMember ||
            myContacts && myContacts.length
        ) {
            contactGeneratedList = '<ul id="' + ulListId + '">' + contactGeneratedList + '</ul>';
            $contactsContentBlock.safeHTML(contactGeneratedList);
            $conversationTab.addClass('active');
            $conversationNoConvTab.removeClass('active');
            $conversationTabHeader.removeClass('hidden');
        }
        else {
            $conversationTab.removeClass('active');
            $conversationNoConvTab.addClass('active');
            $conversationTabHeader.addClass('hidden');
        }
    };

    /**
     * Show content or empty block.
     * @param {String} tabClass dialog tab class name.
     * @param {String} parentTag tag of source element.
     * @private
     */
    const showDialogContent = (tabClass, parentTag) => {
        const $tab = $(`.fm-picker-dialog-tree-panel.${tabClass}`, $dialog);

        if ($(`.dialog-content-block ${parentTag}`, $tab).children().length) {
            // Items available, hide empty message
            $('.dialog-empty-block', $dialog).removeClass('active');
            $('.fm-picker-dialog-panel-header', $tab).removeClass('hidden');
            $tab.addClass('active'); // TODO check why this was only here
        }
        else {
            // Empty message, no items available
            $(`.dialog-empty-block.${tabClass}`, $dialog).addClass('active');
            $('.fm-picker-dialog-panel-header', $tab).addClass('hidden');
        }
    };


    /**
     * Handle DOM directly, no return value.
     * @param {String} tabClass dialog tab class name.
     * @param {String} parentTag tag of source element.
     * @param {String} htmlContent html content.
     * @returns {void} void
     * @private
     */
    const handleDialogTabContent = (tabClass, parentTag, htmlContent) => {
        const $tab = $(`.fm-picker-dialog-tree-panel.${tabClass}`, $dialog);
        const $contentBlock =  $('.dialog-content-block', $tab);
        const html = String(htmlContent)
            .replace(/treea_/ig, 'mctreea_')
            .replace(/treesub_/ig, 'mctreesub_')
            .replace(/treeli_/ig, 'mctreeli_');

        $contentBlock.empty().safeHTML(html);
        $('.s4-static-item', $contentBlock).remove();

        showDialogContent(tabClass, parentTag);
    };

    /**
     * Build tree for a move/copy dialog.
     * @private
     */
    var buildDialogTree = function() {
        var $dpa = $('.fm-picker-dialog-panel-arrows', $dialog).removeClass('hidden');

        if (section === 'cloud-drive' || section === 'folder-link') {
            M.buildtree(M.d[M.RootID], 'fm-picker-dialog', 'cloud-drive');
            showDialogContent('cloud-drive', 'ul');
        }
        else if (section === 'shared-with-me') {
            M.buildtree({h: 'shares'}, 'fm-picker-dialog');
        }
        else if (section === 'rubbish-bin') {
            M.buildtree({h: M.RubbishID}, 'fm-picker-dialog');
        }
        else if (section === 'conversations') {
            if (window.megaChatIsReady) {
                // prepare Conversation Tab if needed
                $dpa.addClass('hidden');
                handleConversationTabContent();
            }
            else {
                console.error('MEGAchat is not ready');
            }
        }
        else if (section === 's4') {
            M.buildtree({h: 's4'}, 'fm-picker-dialog');
            showDialogContent('s4', 'ul');
        }

        if (!treesearch) {
            $('.nw-fm-tree-item', '.fm-picker-dialog')
                .removeClass('expanded active opened selected');
            $('.nw-fm-tree-item + ul', '.fm-picker-dialog').removeClass('opened');
        }

        disableFolders();
        onIdle(() => {
            initPerfectScrollbar($('.right-pane.active .dialog-tree-panel-scroll', $dialog));

            // Place tooltip for long names
            const folderNames = $dialog[0]
                .querySelectorAll('.nw-fm-tree-folder:not(.inbound-share), .nw-fm-tree-icon-wrap');

            for (let i = folderNames.length; i--;) {

                const elm = folderNames[i];

                if (elm.scrollWidth > elm.offsetWidth) {
                    elm.setAttribute('data-simpletip', elm.textContent);
                    elm.classList.add('simpletip');
                }
            }
        });
    };

    /**
     * Dialogs content handler
     * @param {String} dialogTabClass Dialog tab class name.
     * @param {String} [buttonLabel] Action button label.
     * @private
     */
    var handleDialogContent = function(dialogTabClass, buttonLabel) {
        section = dialogTabClass || 'cloud-drive';
        buttonLabel = buttonLabel || getActionButtonLabel();

        let title = '';

        var $pickerButtons = $('.fm-picker-dialog-button', $dialog).removeClass('active');
        $('.dialog-sorting-menu', $dialog).addClass('hidden');
        $('.dialog-empty-block', $dialog).removeClass('active');
        $('.fm-picker-dialog-tree-panel', $dialog).removeClass('active');
        $('.fm-picker-dialog-panel-arrows', $dialog).removeClass('active');
        $('.fm-picker-dialog-desc', $dialog).addClass('hidden'); // Hide description
        $dialog.removeClass('fm-picker-file-request');
        $('button.js-close', $dialog).addClass('hidden');

        // inherited dialog content...
        var html = section !== 'conversations' && $('.content-panel.' + section).html();
        var $permissionSelect = $('.permissions.dropdown-input', $dialog);
        var $permissionIcon = $('i.permission', $permissionSelect);
        var $permissionOptions = $('.option', $permissionSelect);

        // all the different buttons
        // var $cloudDrive = $pickerButtons.filter('[data-section="cloud-drive"]');
        const $s4 = $pickerButtons.filter('[data-section="s4"]');
        var $sharedMe = $pickerButtons.filter('[data-section="shared-with-me"]');
        var $conversations = $pickerButtons.filter('[data-section="conversations"]');
        var $rubbishBin = $pickerButtons.filter('[data-section="rubbish-bin"]');


        // Action button label
        $('.dialog-picker-button span', $dialog).text(buttonLabel);

        // if the site is initialized on the chat, $.selected may be `undefined`,
        // which may cause issues doing .length on it in dialogs.js, so lets define it as empty array
        // if is not def.
        $.selected = $.selected || [];

        $conversations.addClass('hidden');
        $rubbishBin.addClass('hidden');

        if (
            ($.dialog === 'copy' && $.selected.length && !$.saveToDialog || $.copyToUpload)
            && !(
                // Don't allow copying incoming shared folders to chat as it is currently not functional
                $.dialog === 'copy'
                && $.selected.filter(n => !M.isFileNode(M.getNodeByHandle(n)) && M.getNodeRoot(n) === 'shares').length
            )
        ) {
            $conversations.removeClass('hidden');
        }

        const nodeRoot = M.getNodeRoot($.selected[0]);
        if (!u_type || $.copyToShare || $.mcImport || $.selectFolderDialog
            || $.saveAsDialog) {
            $rubbishBin.addClass('hidden');
            $conversations.addClass('hidden');
        }
        if (nodeRoot === M.RubbishID || $.copyDialog || $.moveDialog) {
            $rubbishBin.addClass('hidden');
        }

        if (nodeRoot === M.RubbishID || $.copyToShare || $.selectFolderDialog
            || !u_type || M.currentdirid === 'devices' || $.albumImport) {
            $sharedMe.addClass('hidden');
        }
        else {
            $sharedMe.removeClass('hidden');
        }

        if ('kernel' in s4 && M.tree.s4 && ($.copyDialog || $.moveDialog || $.selectFolderDialog)) {
            $s4.removeClass('hidden');
        }
        else {
            $s4.addClass('hidden');
        }

        if ($.copyToUpload) {
            $('.fm-picker-notagain', $dialog).removeClass('hidden');
            $('footer', $dialog).removeClass('dialog-bottom');
        }
        else {
            $('.fm-picker-notagain', $dialog).addClass('hidden');
            $('footer', $dialog).addClass('dialog-bottom');
        }

        handleDialogTabContent(section, section === 'conversations' ? 'div' : 'ul', html);

        buildDialogTree();

        // 'New Folder' button
        if (section === 'shared-with-me' || section === 'conversations') {
            $('.dialog-newfolder-button', $dialog).addClass('hidden');
        }
        else {
            $('.dialog-newfolder-button', $dialog).removeClass('hidden');
        }

        // Reset the value of permission and permissions list
        if ($permissionSelect.length > 0) {

            $permissionSelect.attr('data-access', 'read-only');
            $permissionIcon.attr('class', 'permission sprite-fm-mono icon-read-only');
            $('> span', $permissionSelect).text(l[7534]);
            $permissionOptions.removeClass('active');
            $('.permissions .option[data-access="read-only"]', $dialog).addClass('active');
            $('.permissions .option[data-state="active"]', $dialog).removeAttr('data-state');
        }

        // If copying from contacts tab (Ie, sharing)
        if (!$.saveToDialog && section === 'cloud-drive' && (M.currentrootid === 'chat' || $.copyToShare)) {
            $('.dialog-newfolder-button', $dialog).addClass('hidden');
            $permissionSelect.removeClass('hidden');
            bindDropdownEvents($permissionSelect);

            $permissionOptions.rebind('click.selectpermission', function() {
                var $this = $(this);

                $permissionIcon.attr('class', 'permission sprite-fm-mono ' + $this.attr('data-icon'));
                $permissionSelect.attr('data-access', $this.attr('data-access'));
            });
        }
        else if ($.selectFolderDialog) {
            $permissionSelect.addClass('hidden');
            if ($.fileRequestNew) {
                $dialog.addClass('fm-picker-file-request');

                $('.fm-picker-dialog-desc', $dialog)
                    .removeClass('hidden');
                $('.fm-picker-dialog-desc p', $dialog)
                    .text(l.file_request_select_folder_desc);
                $('button.js-close', $dialog).removeClass('hidden');

                title = l.file_request_select_folder_title;
            }
            else {
                title = l[16533];
            }
        }
        else {
            $permissionSelect.addClass('hidden');
        }

        if ($.chatAttachmentShare && section !== 'conversations') {
            $permissionSelect.addClass('hidden');
        }

        // 'New contact' button
        if (section === 'conversations') {
            $('.dialog-newcontact-button', $dialog).removeClass('hidden');
        }
        else {
            $('.dialog-newcontact-button', $dialog).addClass('hidden');
        }

        // Activate tab
        $('.fm-picker-dialog-button[data-section="' + section + '"]', $dialog).addClass('active');

        $('header h2', $dialog).text(title || getDialogTitle());
    };

    /**
     * Handle opening dialogs and content
     * @param {String} aTab The section/tab to activate
     * @param {String} [aTarget] The target folder for the operation
     * @param {String|Object} [aMode] Copy dialog mode (share, save, etc)
     */
    var handleOpenDialog = function(aTab, aTarget, aMode) {
        // Save an snapshot of selected nodes at time of invocation, given $.hideContextMenu(); could swap
        // the internal list as part of cleanup performed during closing context-menus, e.g. for in-shares
        const preUserSelection = window.selectionManager && selectionManager.get_selected() || $.selected;

        onIdle(function() {
            /** @name $.copyDialog */
            /** @name $.moveDialog */
            /** @name $.selectFolderDialog */
            /** @name $.saveAsDialog */
            $[$.dialog + 'Dialog'] = $.dialog;

            if (aMode) {
                /** @name $.copyToShare */
                /** @name $.copyToUpload */
                /** @name $.saveToDialog */
                $[aMode.key || aMode] = aMode.value || true;
            }

            if (preUserSelection && preUserSelection.length) {
                const postSelection = window.selectionManager && selectionManager.get_selected() || $.selected;

                if (preUserSelection !== postSelection) {
                    $.selected = preUserSelection;
                    if (window.selectionManager) {
                        selectionManager.reinitialize();
                    }
                }
            }

            $('.search-bar input', $dialog).val('');
            $('.search-bar.placeholder .search-icon-reset', $dialog).addClass('hidden');
            handleDialogContent(typeof aTab === 'string' && aTab);
            if (aTab === 'conversations') {
                setDialogBreadcrumb(M.currentrootid === 'chat' && aTarget !== M.RootID ? aTarget : '');
            }
            else {
                setDialogBreadcrumb(aTarget);
            }
            setDialogButtonState($('.dialog-picker-button', $dialog).addClass('active'));
            setSelectedItems(true);
        });

        $.hideContextMenu();
        $dialog.removeClass('duplicate');

        console.assert($dialog, 'The dialogs subsystem is not yet initialized!...');
    };

    /** Checks if the user can access dialogs copy/move/share */
    var isUserAllowedToOpenDialogs = function() {
        if (M.isInvalidUserStatus()) {
            return false;
        }
        return true;
    };

    // ------------------------------------------------------------------------
    // ---- Public Functions --------------------------------------------------

    /**
     * Refresh copy/move dialog content with newly created directory.
     * @global
     */
    global.refreshDialogContent = function refreshDialogContent() {
        var tab = $.cfsection || 'cloud-drive';

        var b = $('.content-panel.' + tab).html();

        // Before refresh content remember what is opened.
        var $openedNodes = $('ul.opened[id^="mctreesub_"]', $dialog);
        $.openedDialogNodes = {};

        for (var i = $openedNodes.length; i--;) {

            var id = $openedNodes[i].id.replace('mctreesub_', '');
            $.openedDialogNodes[id] = 1;
        }

        handleDialogTabContent(tab, 'ul', b);
        buildDialogTree();

        delete $.cfsection; // safe deleting
        delete $.openedDialogNodes;

        disableFolders($.moveDialog && 'move');
        initPerfectScrollbar($('.right-pane.active .dialog-tree-panel-scroll', $dialog));
    };

    /**
     * A version of the Copy dialog used in the contacts page for sharing.
     * @param {String} [u_id] Share to contact handle.
     * @global
     */
    global.openCopyShareDialog = function openCopyShareDialog(u_id) {
        // Not allowed chats
        if (isUserAllowedToOpenDialogs()) {
            M.safeShowDialog('copy', function() {
                $.shareToContactId = u_id;
                handleOpenDialog('cloud-drive', false, 'copyToShare');
                return $dialog;
            });
        }

        return false;
    };

    /**
     * A version of the Copy dialog used when uploading.
     * @param {Array} files The files being uploaded.
     * @param {Object} [emptyFolders] Empty folders to create hierarchy for.
     * @global
     */
    global.openCopyUploadDialog = function openCopyUploadDialog(files, emptyFolders) {
        // Is allowed chats
        if (isUserAllowedToOpenDialogs()) {
            M.safeShowDialog('copy', function() {
                var tab = M.chat ? 'conversations' : M.currentrootid === 'shares' ?
                    'shared-with-me' : M.currentrootid === 's4' ? 's4' : 'cloud-drive';
                var dir = M.currentdirid === 'transfers' ? M.lastSeenCloudFolder || M.RootID : M.currentdirid;
                closeMsg();
                handleOpenDialog(tab, dir, { key: 'copyToUpload', value: [files, emptyFolders] });
                return uiCheckboxes($dialog);
            });
        }

        return false;
    };

    /**
     * Generic function to open the Copy dialog.
     * @global
     */
    global.openCopyDialog = function openCopyDialog(activeTab, onBeforeShown) {
        // Is allowed chats
        if (isUserAllowedToOpenDialogs()) {
            if ($.dialog === 'onboardingDialog') {
                closeDialog();
            }
            M.safeShowDialog('copy', function() {
                if (typeof activeTab === 'function') {
                    onBeforeShown = activeTab;
                    activeTab = false;
                }
                if (typeof onBeforeShown === 'function') {
                    onBeforeShown($dialog);
                }
                handleOpenDialog(activeTab, M.RootID);
                return $dialog;
            });
        }

        return false;
    };

    /**
     * Generic function to open the Move dialog.
     * @global
     */
    global.openMoveDialog = function openMoveDialog() {
        // Not allowed chats
        if (isUserAllowedToOpenDialogs()) {
            M.safeShowDialog('move', function() {
                handleOpenDialog(0, M.RootID);
                return $dialog;
            });
        }

        return false;
    };

    /**
     * A version of the Copy dialog used for "Save to" in chat.
     * @global
     */
    global.openSaveToDialog = function openSaveToDialog(node, cb, activeTab) {
        // Not allowed chats
        if (isUserAllowedToOpenDialogs()) {
            M.safeShowDialog('copy', function() {
                $.saveToDialogCb = cb;
                $.saveToDialogNode = node;
                handleOpenDialog(activeTab, M.RootID, activeTab !== 'conversations' && 'saveToDialog');
                return $dialog;
            });
        }

        return false;
    };

    /**
     * Save As dialog show
     * @param {Object} node     The node to save AS
     * @param {String} content  Content to be saved
     * @param {Function} cb     a callback to be called when the user "Save"
     * @returns {Object}        The jquery object of the dialog
     */
    global.openSaveAsDialog = function(node, content, cb) {
        // Not allowed chats
        M.safeShowDialog('saveAs', function() {
            const ltWSpaceWarning = new InputFloatWarning($dialog);
            ltWSpaceWarning.hide();

            $.saveAsCallBack = cb;
            $.nodeSaveAs = typeof node === 'string' ? M.d[node] : node;
            $.saveAsContent = content;
            handleOpenDialog(null, node.p || M.RootID);
            return $dialog;
        });

        return false;
    };

    /**
     * A version of the select a folder dialog used for "New Shared Folder" in out-shares.
     * @global
     */
    global.openNewSharedFolderDialog = async function openNewSharedFolderDialog() {
        const target = await selectFolderDialog().catch(dump);
        if (target) {
            M.addSelectedNodes(target);
            return M.openSharingDialog(target);
        }
    };

    /**
     * A version of the select a folder dialog used for selecting target folder
     * @global
     * @param {String} [dialogName] Dialog name (copy, move, share, save, etc)
     * @param {String|Object} [mode] dialog mode (share, save, etc)
     * @param {String} [target] initial target folder, M.RootID by default.
     * @returns {Object} The jquery object of the dialog
     */
    global.selectFolderDialog = function(dialogName = 'selectFolder', mode = false, target = null) {
        return new Promise((resolve, reject) => {
            if (!isUserAllowedToOpenDialogs()) {
                return resolve(null);
            }

            const dsp = () => {
                const res = tryCatch(() => {
                    if (dialogName === 'selectFolder') {
                        M.clearSelectedNodes();
                    }
                    handleOpenDialog(0, target || M.RootID, mode);

                    $.selectFolderCallback = (target) => {
                        $dialog.off('dialog-closed.sfd');
                        delete $.selectFolderCallback;

                        // fulfill with null if dialog was closed/canceled
                        resolve(target || null);
                    };
                    return $dialog.rebind('dialog-closed.sfd', () => $.selectFolderCallback());
                }, reject)();

                assert(res, '[selectFolderDialog] caught exception');
                return res;
            };

            M.safeShowDialog(dialogName, dsp);
        });
    };

    /**
     * A version of the select a folder dialog used for "New File Request Folder" in out-shares.
     * @global
     * @param {Object} options Additional settings for new file request dialog
     * @returns {Object} The jquery object of the dialog
     */
    global.openNewFileRequestDialog = async function(target, options = false) {
        return selectFolderDialog('selectFolder', options.mode || options || 'fileRequestNew', target).catch(dump);
    };

    mBroadcaster.addListener('fm:initialized', function copyMoveDialogs() {
        if (folderlink) {
            return false;
        }

        $dialog = $('.mega-dialog.fm-picker-dialog');
        var $btn = $('.dialog-picker-button', $dialog);
        var $swm = $('.shared-with-me', $dialog);
        var dialogTooltipTimer;

        var treePanelHeader = document.querySelector('.fm-picker-dialog-panel-header');
        $('.fm-picker-dialog-tree-panel', $dialog).each(function(i, elm) {
            elm.insertBefore(treePanelHeader.cloneNode(true), elm.firstElementChild);
        });
        treePanelHeader.parentNode.removeChild(treePanelHeader);

        // dialog sort
        $dialog.find('.fm-picker-dialog-panel-header').append($('.dialog-sorting-menu.hidden').clone());

        $('.fm-picker-dialog-tree-panel.conversations .item-names', $dialog).text(l[17765]);
        $('.fm-picker-dialog-tree-panel.s4 .item-names',  $dialog).text(l.s4_my_buckets);

        // close breadcrumb overflow menu
        $dialog.rebind('click.dialog', e => {
            if (!e.target.closest('.breadcrumb-dropdown, .breadcrumb-dropdown-link') &&
                $('.breadcrumb-dropdown', $dialog).hasClass('active')) {
                $('.breadcrumb-dropdown', $dialog).removeClass('active');
            }
        });

        $('button.js-close, .dialog-cancel-button', $dialog).rebind('click', () => {
            delete $.onImportCopyNodes;
            delete $.albumImport;
            closeDialog();
        });

        $('.fm-picker-dialog-button', $dialog).rebind('click', function _(ev) {
            section = $(this).attr('data-section');

            if (section === 'shared-with-me' && ev !== -0x3f) {
                $('.dialog-content-block', $dialog).empty();
                $('.fm-picker-dialog-button', $dialog).removeClass('active');
                $(this).addClass('active');
                dbfetch.geta(Object.keys(M.c.shares || {}), new MegaPromise())
                    .always(function() {
                        if (section === 'shared-with-me') {
                            _.call(this, -0x3f);
                        }
                    }.bind(this));
                return false;
            }

            treesearch = false;
            handleDialogContent(section);
            $('.search-bar input', $dialog).val('');
            $('.search-bar.placeholder .search-icon-reset', $dialog).addClass('hidden');
            $('.nw-fm-tree-item', $dialog).removeClass('selected');

            if ($.copyToShare) {
                setDialogBreadcrumb();
            }
            else if (section === 'cloud-drive' || section === 'folder-link') {
                setDialogBreadcrumb(M.RootID);
            }
            else if (section === 's4' && 'utils' in s4) {
                const cn = s4.utils.getContainersList();

                // Select MEGA container handle if it's the only one
                setDialogBreadcrumb(cn.length === 1 && cn[0].h || undefined);
            }
            else if (section === 'rubbish-bin') {
                setDialogBreadcrumb(M.RubbishID);
            }
            else {
                setDialogBreadcrumb();
            }

            setDialogButtonState($btn);
        });

        /**
         * On click, copy dialog, dialog-sorting-menu will be shown.
         * Handles that valid informations about current sorting options
         * for selected tab of copy dialog are up to date.
         */
        $('.fm-picker-dialog-panel-arrows', $dialog).rebind('click', function() {
            var $self = $(this);

            if (!$self.hasClass('active')) {
                // There are four menus for each tab: get menu for active tab
                var $menu = $self.siblings('.dialog-sorting-menu');

                var p = $self.position();

                $menu.css('left', p.left + 24 + 'px');
                $menu.css('top', p.top - 8 + 'px');

                // @ToDo: Make sure .by is hadeled properly once when we have chat available

                // Copy dialog key only
                var key = $.dialog[0].toUpperCase() + $.dialog.substr(1) + section;

                $('.dropdown-item', $menu).removeClass('active asc desc');
                $('.sort-arrow', $menu).removeClass('icon-up icon-down');

                const by = escapeHTML(M.sortTreePanel[key] && M.sortTreePanel[key].by || 'name');
                const dir = M.sortTreePanel[key] && M.sortTreePanel[key].dir || 1;

                var $sortbutton = $('.dropdown-item[data-by="' + by + '"]', $menu);

                $sortbutton.addClass(dir > 0 ? 'asc' : 'desc').addClass('active');
                $('.sort-arrow', $sortbutton).addClass(dir > 0 ? 'icon-up' : 'icon-down');

                $self.addClass('active');
                $dialog.find('.dialog-sorting-menu').removeClass('hidden');
            }
            else {
                $self.removeClass('active');
                $dialog.find('.dialog-sorting-menu').addClass('hidden');
            }
        });

        $('.dialog-sorting-menu .dropdown-item', $dialog).rebind('click', function() {
            var $self = $(this);

            // Arbitrary element data
            var data = $self.data();
            var key = $.dialog[0].toUpperCase() + $.dialog.substr(1) + section;
            var $arrowIcon = $('.sort-arrow', $self).removeClass('icon-down icon-up');
            var sortDir;

            if (data.by) {
                M.sortTreePanel[key].by = data.by;
            }

            $self.removeClass('asc desc');



            if ($self.hasClass('active')) {
                M.sortTreePanel[key].dir *= -1;
                sortDir = M.sortTreePanel[key].dir > 0 ? 'asc' : 'desc';
                $self.addClass(sortDir);
            }

            buildDialogTree();

            // Disable previously selected
            $('.sorting-menu-item', $self.parent()).removeClass('active');
            $('.sort-arrow', $self.parent()).removeClass('icon-down icon-up');
            $self.addClass('active');

            // Change icon
            $arrowIcon.addClass(sortDir === 'asc' ? 'icon-up' : 'icon-down');

            // Hide menu
            $('.dialog-sorting-menu', $dialog).addClass('hidden');
            $('.fm-picker-dialog-panel-arrows.active').removeClass('active');
        });

        $('.search-bar input', $dialog).rebind('keyup.dsb', function(ev) {
            var value = String($(this).val()).toLowerCase();
            var exit = ev.keyCode === 27 || !value;
            if (value) {
                $('.search-bar.placeholder .search-icon-reset', $dialog).removeClass('hidden');
            }
            else {
                $('.search-bar.placeholder .search-icon-reset', $dialog).addClass('hidden');
            }
            if (section === 'conversations') {
                var $lis = $('.nw-contact-item', $dialog).parent();

                if (exit) {
                    $lis.removeClass('tree-item-on-search-hidden');
                    if (value) {
                        $(this).val('').trigger("blur");
                    }
                }
                else {
                    $lis.addClass('tree-item-on-search-hidden').each(function(i, elm) {
                        var sel = ['.nw-contact-name', '.nw-contact-email'];
                        for (i = sel.length; i--;) {
                            var tmp = elm.querySelector(sel[i]);
                            if (tmp) {
                                tmp = String(tmp.textContent).toLowerCase();

                                if (tmp.indexOf(value) !== -1) {
                                    elm.classList.remove('tree-item-on-search-hidden');
                                    break;
                                }
                            }
                        }
                    });
                }

                onIdle(function() {
                    initPerfectScrollbar($('.right-pane.active .dialog-tree-panel-scroll', $dialog));
                });
            }
            else {
                if (exit) {
                    treesearch = false;
                    if (value) {
                        $(this).val('').trigger("blur");
                    }
                }
                else {
                    treesearch = value;
                }

                delay('mctree:search', buildDialogTree);
            }

            return false;
        });

        $('.search-bar.placeholder .search-icon-reset', $dialog).rebind('click.dsb', () => {
            $('.search-bar input', $dialog).val('').trigger('keyup.dsb');
        });

        $('.dialog-newfolder-button', $dialog).rebind('click', function() {
            $dialog.addClass('arrange-to-back');

            $.cfsection = section;
            $.cftarget = $.mcselected || (section === 'cloud-drive' ? M.RootID : M.RubbishID);

            const callback = (h) => {
                // Auto-select the created folder.
                const p = Object(M.d[h]).p || $.cftarget;

                // Refresh list (moved from sc-parser)
                refreshDialogContent();

                // Make sure parent has selected class to make it expand
                $(`#mctreea_${p}`, $dialog).addClass('selected');
                selectTreeItem(p);
                selectTreeItem(h);
            };

            const target = $.mcselected || (section === 'cloud-drive' ? M.RootID : M.RubbishID);
            const node = M.getNodeByHandle(target);

            if ('kernel' in s4 && node.s4 && s4.kernel.getS4NodeType(node) === 'container') {
                return s4.ui.showDialog(s4.buckets.dialogs.create, target, callback);
            }

            $.cftarget = target;
            ($.cfpromise = mega.promise)
                .then((h) => callback(h))
                .catch(nop);

            createFolderDialog();

            $('.mega-dialog.create-folder-dialog .create-folder-size-icon').addClass('hidden');
        });

        $('.dialog-newcontact-button', $dialog).rebind('click', function() {
            closeDialog();
            contactAddDialog();
        });

        $dialog.rebind('click', '.nw-contact-item', function() {
            const $this = $(this);
            const $scrollBlock = $('.right-pane.active .dialog-tree-panel-scroll', $dialog);

            if ($this.hasClass('selected')) {
                $this.removeClass('selected');
            }
            else {
                $this.addClass('selected');
            }

            setDialogBreadcrumb();
            setDialogButtonState($btn);
            initPerfectScrollbar($scrollBlock);

            // Scroll the element into view, only needed if element triggered.
            scrollToElement($scrollBlock, $this);
        });

        $dialog.rebind('click', '.nw-fm-tree-item', function(e) {

            var ts = treesearch;
            var old = $.mcselected;
            const $scrollBlock = $('.right-pane.active .dialog-tree-panel-scroll', $dialog);

            setDialogBreadcrumb(String($(this).attr('id')).replace('mctreea_', ''));

            treesearch = false;
            M.buildtree({h: $.mcselected}, 'fm-picker-dialog', section);
            treesearch = ts;
            disableFolders();

            var c = $(e.target).attr('class');

            // Sub-folder exist?
            if (c && c.indexOf('nw-fm-tree-arrow') > -1) {

                c = $(this).attr('class');

                // Sub-folder expanded
                if (c && c.indexOf('expanded') > -1) {
                    $(this).removeClass('expanded');
                    $('#mctreesub_' + $.mcselected).removeClass('opened');
                }
                else {
                    $(this).addClass('expanded');
                    $('#mctreesub_' + $.mcselected).addClass('opened');
                }
            }
            else {

                c = $(this).attr('class');

                if (c && c.indexOf('selected') > -1) {
                    if (c && c.indexOf('expanded') > -1) {
                        $(this).removeClass('expanded');
                        $('#mctreesub_' + $.mcselected).removeClass('opened');
                    }
                    else {
                        $(this).addClass('expanded');
                        $('#mctreesub_' + $.mcselected).addClass('opened');
                    }
                }
            }

            if (!$(this).is('.disabled')) {
                // unselect previously selected item
                $('.nw-fm-tree-item', $dialog).removeClass('selected');
                $(this).addClass('selected');
                $btn.removeClass('disabled');
            }
            else if ($('#mctreea_' + old + ':visible').length) {
                setDialogBreadcrumb(old);
                $('#mctreea_' + old).addClass('selected');
            }
            else {
                setDialogBreadcrumb();
            }

            initPerfectScrollbar($scrollBlock);

            // Disable action button if there is no selected items
            setDialogButtonState($btn);

            // Set opened & expanded ancestors, only needed if element triggered.
            $(this).parentsUntil('.dialog-content-block', 'ul').addClass('opened')
                .prev('.nw-fm-tree-item').addClass('expanded');

            // Scroll the element into view, only needed if element triggered.
            scrollToElement($scrollBlock, $(this));

            // // If not copying from contacts tab (Ie, sharing)
            if (!(section === 'cloud-drive' && (M.currentrootid === 'chat' || $.copyToShare))) {
                if ($.mcselected && M.getNodeRights($.mcselected) > 0) {
                    $('.dialog-newfolder-button', $dialog).removeClass('hidden');
                }
                else {
                    $('.dialog-newfolder-button', $dialog).addClass('hidden');
                }
            }
        });

        $swm.rebind('mouseenter', '.nw-fm-tree-item', function _try(ev) {
            var h = $(this).attr('id').replace('mctreea_', '');

            if (ev !== 0xEFAEE && !M.c[h]) {
                var self = this;
                dbfetch.get(h).always(function() {
                    _try.call(self, 0xEFAEE);
                });
                return false;
            }

            var share = shares[h];
            var owner = share && share.owner;
            var user = M.getUserByHandle(owner);

            if (!user) {
                return false;
            }

            var $item = $('.nw-fm-tree-folder, .nw-fm-tree-icon-wrap', $(this));
            var itemLeftPos = $item.offset().left;
            var itemTopPos = $item.offset().top;
            var $tooltip = $('.contact-preview', $dialog);
            var avatar = useravatar.contact(owner, '', 'div');
            var note = !share.level && !share.circular && l[19340];
            var displayName = user.nickname || user.name || user.m;

            $tooltip.find('.contacts-info.body')
                .safeHTML(
                    '<div class="user-card-wrap">' +
                    avatar +
                    '<div class="user-card-data no-status">' +
                    '  <div class="user-card-name small selectable-txt">@@<span class="grey">(@@)</span></div>' +
                    '  <div class="user-card-email selectable-txt small">@@</div>' +
                    '</div>' +
                    '</div>' +
                    ' <div class="user-card-email selectable-txt small @@">@@</div>',
                    displayName || '', l[8664], user.m || '', note ? 'note' : '', note || ''
                );

            clearTimeout(dialogTooltipTimer);
            dialogTooltipTimer = setTimeout(function() {
                $tooltip.removeClass('hidden');
                $tooltip.css({
                    'left': itemLeftPos + $item.outerWidth() / 2 - $tooltip.outerWidth() / 2 + 'px',
                    'top': (itemTopPos - (note ? 120 : 75)) + 'px'
                });
            }, 200);

            return false;
        });

        $swm.rebind('mouseleave', '.nw-fm-tree-item', function() {

            var $tooltip = $('.contact-preview', $dialog);

            clearTimeout(dialogTooltipTimer);
            $tooltip.hide();

            return false;
        });

        // Handle conversations tab item selection
        $dialog.rebind('click', '.nw-conversations-item', function() {

            setDialogBreadcrumb(String($(this).attr('id')).replace('contact2_', ''));

            // unselect previously selected item
            $('.nw-conversations-item', $dialog).removeClass('selected');
            $(this).addClass('selected');
            $btn.removeClass('disabled');

            // Disable action button if there is no selected items
            setDialogButtonState($btn);
        });

        // Handle copy/move/share button action
        $btn.rebind('click', function() {
            var chats = getSelectedChats();
            var skip = !$.mcselected && section !== 'conversations';

            if (skip || $(this).hasClass('disabled')) {
                return false;
            }
            let selectedNodes = [];
            if (Array.isArray($.selected)) {
                selectedNodes = [...$.selected];
            }

            // closeDialog would cleanup some $.* variables, so we need them cloned here
            const {
                saveToDialogCb,
                saveToDialogNode,
                shareToContactId,
                noOpenChatFromPreview
            } = $;
            const saveToDialog = $.saveToDialog || saveToDialogNode;

            delete $.saveToDialogPromise;
            delete $.noOpenChatFromPreview;

            if ($.copyToUpload) {
                var data = $.copyToUpload;
                var target = $.mcselected;

                if (section === 'conversations') {
                    target = chats.map(function(h) {
                        if (megaChat.chats[h]) {
                            return megaChat.chats[h].getRoomUrl().replace("fm/", "");
                        } else if (M.u[h]) {
                            return 'chat/p/' + h;
                        }
                        else {
                            if (d) {
                                console.error("Chat room not found for handle:", h);
                            }
                            return '';
                        }
                    });
                }

                if ($('.notagain', $dialog).prop('checked')) {
                    mega.config.setn('ulddd', 1);
                }

                closeDialog();
                M.addUpload(data[0], false, data[1], target);
                return false;
            }

            if ($.selectFolderCallback) {
                tryCatch(() => $.selectFolderCallback($.mcselected))();
                delete $.selectFolderCallback;
                closeDialog();
                return false;
            }

            if ($.moveDialog) {
                if (section === "shared-with-me") {
                    var $tooltip = $('.contact-preview', $dialog);
                    clearTimeout(dialogTooltipTimer);
                    $tooltip.hide();
                }
                closeDialog();
                mLoadingSpinner.show('safeMoveNodes');
                M.safeMoveNodes($.mcselected).catch(dump).finally(() => mLoadingSpinner.hide('safeMoveNodes'));
                return false;
            }

            if ($.nodeSaveAs) {
                var $nameInput = $('#f-name-input', $dialog);
                var saveAsName = $nameInput.val();
                var eventName = 'input.saveas';

                var removeErrorStyling = function() {
                    $nameInput.removeClass('error');
                    $dialog.removeClass('duplicate');
                    $nameInput.off(eventName);
                };

                removeErrorStyling();

                var errMsg = '';

                if (!saveAsName.trim()) {
                    errMsg = l[5744];
                }
                else if (!M.isSafeName(saveAsName)) {
                    errMsg = saveAsName.length > 250 ? l.LongName1 : l[24708];
                }
                else if (duplicated(saveAsName, $.mcselected)) {
                    errMsg = l[23219];
                }

                if (errMsg) {
                    $('.duplicated-input-warning span', $dialog).text(errMsg);
                    $dialog.addClass('duplicate');
                    $nameInput.addClass('error');

                    $nameInput.rebind(eventName, function() {
                        removeErrorStyling();
                        return false;
                    });

                    setTimeout(() => {
                        removeErrorStyling();
                    }, 2000);

                    return false;
                }

                $nameInput.rebind(eventName, function() {
                    removeErrorStyling();
                    return false;
                });

                $nameInput.off(eventName);

                var nodeToSave = $.nodeSaveAs;
                closeDialog();

                M.getStorageQuota().then(data => {
                    if (data.isFull) {
                        ulmanager.ulShowOverStorageQuotaDialog();
                        return false;
                    }

                    mega.fileTextEditor.saveFileAs(saveAsName, $.mcselected, $.saveAsContent, nodeToSave)
                        .then((handle) => {
                            if ($.saveAsCallBack) {
                                $.selected = Array.isArray(handle) ? handle : [handle];
                                $.saveAsCallBack(handle);
                            }
                        })
                        .catch(tell);
                });

                return false;
            }

            closeDialog();

            if (saveToDialog) {
                saveToDialogCb(saveToDialogNode, section === 'conversations' && chats || $.mcselected);
                return false;
            }

            // Get active tab
            if (section === 'cloud-drive' || section === 'folder-link'
                || section === 'rubbish-bin' || section === 's4') {

                // If copying from contacts tab (Ie, sharing)
                if ($(this).text().trim() === l[1344]) {
                    var user = {
                        u: shareToContactId ? shareToContactId : M.currentdirid
                    };
                    var spValue = $('.permissions.dropdown-input', $dialog).attr('data-access');
                    if (spValue === 'read-and-write') {
                        user.r = 1;
                    }
                    else if (spValue === 'full-access') {
                        user.r = 2;
                    }
                    else {
                        user.r = 0;
                    }
                    const target = $.mcselected;
                    mega.keyMgr.setShareSnapshot(target)
                        .then(() => doShare(target, [user]))
                        .catch(tell);
                }
                else if ($.albumImport) {
                    // This is a set to be imported
                    mega.sets.copyNodesAndSet(selectedNodes, $.mcselected)
                        .catch((ex) => {
                            if (ex === EBLOCKED) {
                                // Album link import failed (quota, ...)
                                eventlog(99955);
                            }
                            else {
                                tell(ex);
                            }
                        });
                }
                else {
                    M.copyNodes(selectedNodes, $.mcselected)
                        .catch((ex) => ex !== EBLOCKED && tell(ex));
                }
            }
            else if (section === 'shared-with-me') {
                M.copyNodes(getNonCircularNodes(selectedNodes), $.mcselected).catch(tell);
            }
            else if (section === 'conversations') {
                if (window.megaChatIsReady) {

                    megaChat.openChatAndAttachNodes(chats, selectedNodes, !!noOpenChatFromPreview).dump('attach');
                }
                else if (d) {
                    console.error('MEGAchat is not ready');
                }

            }

            delete $.onImportCopyNodes;

            return false;
        });

        return 0xDEAD;
    });

})(self);
