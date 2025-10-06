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
        var $ro = $('.shared-with-me .dialog-content-block span[id^="mctreea_"]', $dialog);
        var targets = $.selected || [];

        if (!$ro.length) {
            if ($('.fm-picker-dialog-button.shared-with-me', $dialog).hasClass('active')) {
                // disable import btn
                $('.dialog-picker-button', $dialog).addClass('disabled');
            }
        }
        let note = l.share_ro_tip_copy;
        if ($.moveDialog) {
            note = l.share_ro_tip_move;
        }
        else if ($.mcImport || $.saveAsDialog) {
            note = l.share_ro_tip_save;
        }
        else if ($.copyToUpload) {
            note = l.share_ro_tip_upload;
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
                $(v).addClass('disabled simpletip').attr('data-simpletip', note);
            }
        });
    };

    /**
     * Disable circular references and read-only shared folders.
     * @private
     */
    var disableFolders = function() {
        $('*[id^="mctreea_"]').removeClass('disabled');

        const sel = $.selected || [];
        if ($.moveDialog) {
            M.disableCircularTargets('#mctreea_');
            for (let i = sel.length; i--;) {
                const { t, p } = M.getNodeByHandle(sel[i]);
                const $parent = $(`#mctreea_${String(p).replace(/[^\w-]/g, '')}`, $dialog)
                    .addClass('expandable simpletip')
                    .removeClass('disabled');
                if (t === 0) {
                    $parent.attr('data-simpletip', l.same_loc_tip_move_file);
                }
                else {
                    $parent.attr('data-simpletip', l.same_loc_tip_move_folder);
                    const $node = $(`#mctreea_${String(sel[i]).replace(/[^\w-]/g, '')}`, $dialog);
                    $node.addClass('simpletip').attr('data-simpletip', l.circular_tip_move);
                }
            }
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

            const disableTip = $.copyDialog ? l.circular_tip_copy : '';
            for (var i = sel.length; i--;) {
                const { t, p } = M.getNodeByHandle(sel[i]);
                if ($.copyDialog) {
                    $(`#mctreea_${String(p).replace(/[^\w-]/g, '')}`, $dialog)
                        .addClass('expandable simpletip')
                        .attr('data-simpletip', t === 0 ? l.same_loc_tip_copy_file : l.same_loc_tip_copy_folder);
                }
                const $node = $(`#mctreea_${String(sel[i]).replace(/[^\w-]/g, '')}`, $dialog);
                $node.addClass('disabled');
                if (disableTip && t) {
                    $node.addClass('simpletip').attr('data-simpletip', disableTip);
                }
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
            const c = M.c[$.mcselected] || {};

            selectedNodes = selectedNodes || $.selected || [];

            for (var i = selectedNodes.length; i--;) {
                if ($.moveDialog && M.isCircular(selectedNodes[i], $.mcselected)) {
                    continue; // Ignore circular targets if move dialog is active
                }

                if (selectedNodes[i] === $.mcselected) {
                    continue; // If the source node is equal to target node
                }

                if (c[selectedNodes[i]]) {
                    continue; // If the target folder already contains this node
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
        else if ($.selectFolderDialog && (
            section === 'cloud-drive' && $.mcselected !== M.RootID ||
            section === 's4' && M.tree.s4 && !M.tree.s4[$.mcselected]
        )) {
            $btn.removeClass('disabled');
        }
        else if (M.onDeviceCenter && $.dialog === 'stop-backup') {
            $btn.removeClass('disabled');
        }
        else if ($.copyToShare && ($.mcselected === M.RootID || section === 's4')) {
            $btn.addClass('disabled');
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

        // Set Create folder btn label for S4 container and Cloud drive
        if (section === 's4' && M.tree.s4 && M.tree.s4[$.mcselected]) {

            // Disable action button when copying/moving files to container
            // @todo fixup import folder links strings and check this properly
            if ($.onImportCopyNodes || $.selected.length === 0 || !M.isFolder($.selected)) {
                $btn.addClass('disabled');
            }

            // "Create new bucket"  label
            $('.dialog-newfolder-button span', $dialog).text(l.s4_create_bkt);
        }
        else if (section === 's4' && !$.mcselected) {
            $('.dialog-newfolder-button', $dialog).addClass('hidden');
        }
        else if (section === 's4' && $.copyToShare) {
            $btn.removeClass('disabled');
        }
        else {
            $('.dialog-newfolder-button span', $dialog).text(l.create_folder);
        }
    };

    let chatSel = [];

    /**
     * Select tree item node
     * @param {String} h The node handle
     */
    var selectTreeItem = function(h) {
        queueMicrotask(() => {
            if (section === 'conversations') {
                const $chat = $('#cpy-dlg-chat-itm-spn-' + h, $dialog);
                if ($chat.length) {
                    $chat.trigger('click');
                }
                else {
                    // Assume loading still.
                    chatSel.push(h);
                }
            }
            else if (!$('#mctreesub_' + h, $dialog).hasClass('opened')) {
                $('#mctreea_' + h, $dialog).trigger('click');
            }
        });
    };

    const avatar = (meta) => {
        const inner = meta.avatarUrl ?
            `<img src="${meta.avatarUrl}">` :
            `<div class="color${meta.color}">
                <span class="avatar-txt">${meta.shortName}</span>
            </div>`;
        return `
            <div class="mega-node user simpletip" data-simpletip="${escapeHTML(meta.fullName)}">
                <div class="avatar size-24">
                    ${inner}
                </div>
            </div>
        `;
    };

    const chatChipContent = (id) => {
        let icon = '';
        let name = '';
        let isAvatar = false;
        if (id === u_handle) {
            icon = '<i class="sprite-fm-mono icon-file-text-thin-outline"></i>';
            name = escapeHTML(l.note_label);
        }
        else if (id in M.u) {
            isAvatar = true;
            icon = avatar(generateAvatarMeta(id));
            name = megaChat.html(M.getNameByHandle(id));
        }
        else {
            const chatRoom = megaChat.chats[id];
            icon = chatRoom.isMeeting ?
                '<div class="meeting-icon"><i class="sprite-fm-mono icon-video-call-filled"></i></div>' :
                '<div class="group-chat-icon"><i class="sprite-fm-uni icon-chat-group"></i></div>';
            name = megaChat.html(chatRoom.getRoomTitle());
        }
        return { icon, name, isAvatar };
    };

    function handleChatBreadcrumb(aTarget, autoSelect) {
        const dialog = $dialog[0];
        const chats = $.dialogSelChats || [];
        const instructionRow = dialog.querySelector('.summary-conversations .summary-row');
        const holderRow = dialog.querySelector('.summary-conversations .summary-input');
        holderRow.textContent = '';
        if (mega.ui.menu.name === 'picker-chat-items') {
            mega.ui.menu.hide();
        }
        if (chats.length) {
            instructionRow.classList.add('hidden');
            const containerWidth = holderRow.clientWidth;
            let totalWidth = 0;
            for (let i = 0; i < chats.length; i++) {
                const { icon, name, isAvatar } = chatChipContent(chats[i]);
                const node = document.createElement('div');
                node.className = 'chat-chip';
                node.appendChild(parseHTML(`
                        <div class="chat-icon-wrap ${isAvatar ? 'avatar-wrap' : ''}">${icon}</div>
                        <div class="chat-name">${name}</div>
                        <i class="sprite-fm-mono icon-dialog-close-thin action"></i>
                    `));
                holderRow.appendChild(node);
                const action = node.querySelector('i.action');
                // Include margin
                const w = node.clientWidth + 12;
                if (chats.length > 1 && totalWidth + w >= containerWidth) {
                    const icon = node.querySelector('.chat-icon-wrap');
                    icon.textContent = '';
                    icon.classList.remove('avatar-wrap');
                    icon.appendChild(parseHTML('<i class="sprite-fm-mono icon-contacts"></i>'));
                    const name = node.querySelector('.chat-name');
                    name.textContent = mega.icu.format(l.sel_chat_more_chip, chats.length - i);
                    action.classList.remove('icon-dialog-close-thin');
                    action.classList.add('icon-chevron-down-thin-outline');
                    node.dataset.from = i;
                    // Re-measure
                    if (node.clientWidth + 12 + totalWidth >= containerWidth) {
                        if (node.previousElementSibling) {
                            node.previousElementSibling.remove();
                        }
                        name.textContent = mega.icu.format(l.sel_chat_more_chip, chats.length - (i - 1));
                        node.dataset.from = Math.max(i - 1, 0);
                    }
                    action.addEventListener('click', (ev) => {
                        if (action.classList.contains('active')) {
                            mega.ui.menu.hide();
                            action.classList.remove('active');
                            return;
                        }
                        action.classList.add('active');
                        const menu = document.createElement('div');
                        menu.className = 'picker-list-wrap';
                        for (let j = parseInt(node.dataset.from, 10); j < chats.length; j++) {
                            const { icon, name } = chatChipContent(chats[j]);
                            const row = document.createElement('div');
                            row.className = 'chat-item-row';
                            row.appendChild(parseHTML(`
                                <div class="chat-icon-wrap">${icon}</div>
                                <div class="chat-name">${name}</div>
                                <button class="mega-component nav-elem icon-only transparent-icon">
                                    <i class="sprite-fm-mono icon-dialog-close-thin action"></i>
                                </button>
                            `));
                            row.querySelector('button').addEventListener('click', () => {
                                mega.ui.menu.hide();
                                action.classList.remove('active');
                                const item = document.getElementById(`cpy-dlg-chat-itm-${chats[j]}`);
                                if (item) {
                                    item.querySelector('.nw-contact-item').click();
                                }
                            });
                            menu.appendChild(row);
                        }
                        ev.stopPropagation();
                        ev.preventDefault();
                        ev = {currentTarget: {domNode: action}};
                        mega.ui.menu.show({
                            name: 'picker-chat-items',
                            classList: ['picker-chat-items', 'picker-dropdown'],
                            event: ev,
                            eventTarget: action,
                            contents: [menu],
                            resizeHandler: true,
                            onClose: () => {
                                if (document.contains(action)) {
                                    action.classList.remove('active');
                                }
                            }
                        });
                    });
                    break;
                }
                else {
                    totalWidth += w;
                    action.addEventListener('click', () => {
                        const item = document.getElementById(`cpy-dlg-chat-itm-${chats[i]}`);
                        if (item) {
                            item.querySelector('.nw-contact-item').click();
                        }
                    });
                }
            }
            return;
        }

        if (autoSelect) {
            selectTreeItem(String(aTarget || '').split('/').pop());
        }

        instructionRow.classList.remove('hidden');
    }

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
            return handleChatBreadcrumb(aTarget, autoSelect);
        }
        if (section === 'shared-with-me' && !aTarget) {
            path = ['shares'];
        }

        // Update global $.mcselected with the target handle
        $.mcselected = aTarget && aTarget !== 'transfers' ? aTarget : undefined;
        path = path || M.getPath($.mcselected);
        if (section === 'shared-with-me' && path.length > 1) {
            path.splice(-2, 1);
        }

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
                const cn = Object.values(M.tree.s4);

                if (M.tree.s4[handle]) {
                    name = cn.length === 1 ? l.obj_storage : name;
                    typeClass = 's4-object-storage';
                }
                else {
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

        M.renderBreadcrumbs(path, scope, dictionary, nop);
        const breadcrumbClear =  dialog.querySelector('.crumb-clear-sel');
        if (breadcrumbClear && (path.length === 1 || section === 's4' && path.length === 2)) {
            breadcrumbClear.classList.add('hidden');
        }
        else if (breadcrumbClear) {
            breadcrumbClear.classList.remove('hidden');
        }

        if ($.copyToUpload) {
            // auto-select entries once
            $.copyToUpload[2] = true;
        }
    };

    /**
     * Set selected items...
     * @private
     */
    var setSelectedItems = function() {
        var names = Object.create(null);
        var items = $.selected || [];


        if ($.saveToDialogNode) {
            items = [$.saveToDialogNode.h];
            names[$.saveToDialogNode.h] = $.saveToDialogNode.name;
        }
        if ($.copyToShare) {
            items = [];
        }
        else if ($.copyToUpload) {
            items = $.copyToUpload[0];

            for (var j = items.length; j--;) {
                items[j].uuid = makeUUID();
            }
        }

        if ($.nodeSaveAs) {
            items = [$.nodeSaveAs.h];
            names[$.nodeSaveAs.h] = $.nodeSaveAs.name || '';

            const ltWSpaceWarning = new InputFloatWarning($dialog);
            ltWSpaceWarning.check({name: names[$.nodeSaveAs.h], ms: 0});
            const $input = $('.search-bar input', $dialog);

            $input.rebind('keydown.saveas', (e) => {
                if (e.which === 13 || e.keyCode === 13) {
                    $('.dialog-picker-button', $dialog).trigger('click');
                }
            });
            $input.rebind('keyup.saveas', () => {
                ltWSpaceWarning.check();
            });
            if ($.saveAsDialog) {
                if (names[$.nodeSaveAs.h]) {
                    $input.val(names[$.nodeSaveAs.h]);
                    $('.search-icon-reset', $dialog).removeClass('hidden');
                }
                $input.focus();
            }
        }
        else {
            $('.search-bar input', $dialog).off('keydown.saveas').off('keyup.saveas');
        }
        // eslint-disable-next-line no-use-before-define
        const title = getDialogTitle(items, names);
        const titleElem = document.getElementById('fm-picker-dialog-title');
        titleElem.textContent = title;
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
            return l.btn_imptomega; // Save to MEGA
        }

        if ($.chatAttachmentShare && section !== 'conversations') {
            return l[776]; // Save
        }

        if ($.copyToShare) {
            return l[1344]; // Share
        }

        if ($.copyToUpload) {
            if (section === 'conversations') {
                return l.upload_and_send;
            }
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

        return l[63]; // Copy
    };

    function getFolderLinkTitle() {
        let count = 0;
        let singleRoot = false;
        for (let i = 0; i < $.onImportCopyNodes.length; i++) {
            const n = $.onImportCopyNodes[i];
            if (!n.p) {
                singleRoot = n;
                if (count++ > 0) {
                    singleRoot = false;
                }
            }
        }
        if (singleRoot) {
            singleRoot = {...singleRoot};
            crypto_procattr(singleRoot, singleRoot.k);
            return l.import_file.replace('%s', singleRoot.name);
        }
        return mega.icu.format(l.import_files, count);
    }

    function getCopyMoveTitle(items, names) {
        const h = items[0];
        const n = M.getNodeByHandle(h) || Object(h);
        const name = names && names[h] || M.getNameByHandle(h) || n.name;

        if ($.mcImport) {
            if ($.saveToDialogNode) {
                return l.import_file.replace('%s', $.saveToDialogNode.name || l[7381]);
            }
            return getFolderLinkTitle();
        }

        if ($.sendToChatDialog) {
            if (items.length === 1 && name) {
                return l.send_item.replace('%s', name);
            }
            return mega.icu.format(l.send_items, items.length);
        }
        if ($.moveDialog) {
            if (items.length === 1 && name) {
                return l.move_dlg_item_title.replace('%s', name);
            }
            return mega.icu.format(l.move_dlg_items_title, items.length);
        }

        if (items.length === 1 && name) {
            return l.copy_dlg_item_title.replace('%s', name);
        }
        return mega.icu.format(l.copy_dlg_items_title, items.length);
    }

    /**
     * Get the dialog title based on operation
     * @param {Array} items Item handles that can be included in the title
     * @param {*} [names] Optional name mapping
     * @returns {String}
     * @private
     */
    // eslint-disable-next-line complexity
    var getDialogTitle = function(items, names) {
        if ($.selectFolderDialog) {
            return $.fileRequestNew ? l.file_request_dialog_create_title : l[5631];
        }
        if ($.albumImport) {
            return l.context_menu_import;
        }

        if ($.mcImport) {
            return getCopyMoveTitle(items, names);
        }

        if ($.chatAttachmentShare && section !== 'conversations') {
            return l[776]; // Save
        }

        if ($.copyToShare) {
            return l[5631]; // Share folder
        }

        if ($.copyToUpload) {
            const { length, paths } = $.copyToUpload[0];
            const path = Object.keys(paths);
            const set = new Set(path.map(n => String(n).split('/').shift()));
            if (set.size) {
                let count = set.size;
                for (let i = length; i--;) {
                    if ($.copyToUpload[0][i].path === '') {
                        count++;
                    }
                }
                if (set.size !== count) {
                    return mega.icu.format(l.upload_items, count);
                }
                return set.size === 1 ?
                    l.upload_item.replace('%s', set.values().next().value) :
                    mega.icu.format(l.upload_folders, set.size);
            }
            return length === 1 ?
                l.upload_item.replace('%s', $.copyToUpload[0][0].name) :
                mega.icu.format(l.upload_items, length);
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

        if ($.sendToChatDialog) {
            return getCopyMoveTitle(items, names);
        }

        if (section === 'conversations') {
            return l[17764]; // Send to chat
        }

        return getCopyMoveTitle(items, names);
    };

    /**
     * Getting contacts and view them in copy dialog
     */
    async function handleConversationTabContent() {
        var myChats = megaChat.chats;
        let hasChats = myChats && myChats.length;
        var myContacts = M.getContactsEMails(true); // true to exclude requests (incoming and outgoing)
        var $conversationTab = $('.fm-picker-dialog-tree-panel.conversations');
        var $conversationNoConvTab = $('.dialog-empty-block.conversations');
        var $contactsContentBlock = $('.dialog-content-block', $dialog);
        var contactGeneratedList = "";
        var ulListId = 'cpy-dlg-chat-' + u_handle;
        var addedContactsByRecent = [];
        var isActiveMember = false;

        const createContactEntry = (handle) => {
            if (handle in M.u) {
                let contactElem = `<span id="cpy-dlg-chat-itm-spn-${handle}" class="nw-contact-item single-contact">`;
                contactElem += `<div class="overlapped-avatar">${avatar(generateAvatarMeta(handle))}</div>`;
                contactElem +=
                    `<span class="nw-contact-name selectable-txt">${megaChat.html(M.getNameByHandle(handle))}</span>`;
                contactElem += `<span class="nw-contact-email">${escapeHTML(M.u[handle].m)}</span>`;
                return `<li id="cpy-dlg-chat-itm-${handle}">${contactElem}</li>`;
            }
            return '';
        };

        const createGroupEntry = (chatRoom) => {
            const title = chatRoom.getRoomTitle();
            const { roomId, members } = chatRoom;
            if (title) {
                let groupElem = `<span id="cpy-dlg-chat-itm-spn-${roomId}" class="nw-contact-item multi-contact">`;

                groupElem += `
                    <div class="overlapped-avatar">
                        <div class="group-chat-icon">
                            <i class="sprite-fm-uni icon-chat-group"></i>
                        </div>
                    </div>
                `;
                groupElem += `<span class="nw-contact-name group selectable-txt">${megaChat.html(title)}</span>`;
                groupElem += `<span class="nw-contact-group">${
                    mega.icu.format(l[20233], Object.keys(members).length)}</span>`;
                groupElem = `<li id="cpy-dlg-chat-itm-${roomId}">${groupElem}</li>`;
                return groupElem;
            }
            return '';
        };

        const createMeetingEntry = (chatRoom, contacts) => {
            let [first, second] = contacts;
            first = first && generateAvatarMeta(first);
            second = second && generateAvatarMeta(second);

            let avatarTemplate = '';
            if (!first && !second) {
                avatarTemplate =
                    `<div class="meeting-icon">
                        <i class="sprite-fm-mono icon-video-call-filled"></i>
                    </div>`;
            }
            else if (second) {
                avatarTemplate = avatar(second);
            }
            if (first) {
                avatarTemplate = `${avatarTemplate}${avatar(first)}`;
            }
            return `
                <li id="cpy-dlg-chat-itm-${chatRoom.roomId}">
                    <span id="cpy-dlg-chat-itm-spn-${chatRoom.roomId}" class="nw-contact-item multi-contact">
                        <div class="overlapped-avatar ${first && second ? 'multi' : ''}">
                            ${avatarTemplate}
                        </div>
                        <span class="nw-contact-name group selectable-txt">
                            ${megaChat.html(chatRoom.getRoomTitle())}
                        </span>
                        <span class="nw-contact-group">
                            ${mega.icu.format(l[20233], chatRoom.getParticipants().length)}
                        </span>
                    </span>
                </li>
            `;
        };

        const createNoteEntry = (noteChat) => {
            const isEmptyNote = noteChat && !noteChat.hasMessages();
            return `<li id="cpy-dlg-chat-itm-${u_handle}" class="note-chat-item">
                <span id="cpy-dlg-chat-itm-spn-${u_handle}" class="nw-contact-item">
                    <div class="overlapped-avatar">
                        <span class="nw-note-signifier ${isEmptyNote ? 'note-chat-empty' : 'boo'}">
                            <i class="sprite-fm-mono icon-file-text-thin-outline note-chat-icon"></i>
                        </span>
                    </div>
                    <span class="nw-contact-name nw-note-name note-chat-label">${l.note_label}</span>
                </span>
            </li>`;
        };

        const allSeparator = `<div class="chat-separator">${l.contact_list_all_header}</div>`;
        let separated = false;
        const rest = [];
        if (hasChats) {
            const unsortedChats = Object.values(myChats.toJS());
            const recents = [];
            const all = [];
            const meetingContacts = Object.create(null);
            const now = Date.now();
            const avatars = new Set();

            const checkAndProcessMeeting = (chatRoom) => {
                if (!chatRoom.isMeeting) {
                    return;
                }
                if ((chatRoom.lastActivity + 30 * 86400) * 1000 >= now) {
                    recents.push(chatRoom);
                }
                else {
                    all.push(chatRoom);
                }
                meetingContacts[chatRoom.chatId] = megaChat.lastRoomContacts(chatRoom).then(res => {
                    meetingContacts[chatRoom.chatId] = res;
                    for (let i = res.length; i--;) {
                        avatars.add(res[i]);
                    }
                });
            };

            const checkAndProcessChat = (chatRoom) => {
                if (chatRoom.isMeeting) {
                    return;
                }
                const isRecent = (chatRoom.lastActivity + 30 * 86400) * 1000 >= now;
                const { members, membersSetFromApi, topic, type } = chatRoom;
                let isValidGroupOrPubChat = false;
                if (type === 'group') {
                    isValidGroupOrPubChat = !!Object.keys(members).length;
                }
                else if (
                    type === 'public' &&
                    membersSetFromApi &&
                    membersSetFromApi.members[u_handle] >= 2
                ) {
                    isValidGroupOrPubChat = true;
                }

                if (isValidGroupOrPubChat) {
                    if (!topic && !Object.keys(members).length) {
                        return;
                    }
                    if (isRecent) {
                        recents.push(chatRoom);
                    }
                    else {
                        all.push(chatRoom);
                    }
                }
                else {
                    let contactHandle;
                    for (const ctHandle in members) {
                        if (ctHandle !== u_handle) {
                            contactHandle = ctHandle;
                            break;
                        }
                    }
                    if (
                        contactHandle &&
                        M.u[contactHandle] && M.u[contactHandle].c === 1 && M.u[contactHandle].m
                    ) {
                        avatars.add(contactHandle);
                        if (isRecent) {
                            recents.push(chatRoom);
                        }
                        else {
                            all.push(chatRoom);
                        }
                    }
                }
            };

            for (let i = unsortedChats.length; i--;) {
                const chatRoom = unsortedChats[i];
                const { members } = chatRoom;
                isActiveMember = isActiveMember || members[u_handle] !== undefined && members[u_handle] !== -1;
                if (!chatRoom.isReadOnly() && !chatRoom.isArchived()) {
                    checkAndProcessMeeting(chatRoom);
                    checkAndProcessChat(chatRoom);
                }
            }

            const contactPromise = Object.values(meetingContacts);
            if (contactPromise.length) {
                await Promise.allSettled(contactPromise);
            }

            if (avatars.size) {
                await Promise.allSettled([...avatars].map(h => useravatar.loadAvatar(h)));
            }

            recents.sort(M.sortObjFn('lastActivity', 1));

            const processReady = (arr, separator, unsortedArr) => {
                if (arr.length) {
                    contactGeneratedList = `${contactGeneratedList}${separator}`;
                }
                for (let i = arr.length; i--;) {
                    const chatRoom = arr[i];
                    if (chatRoom.isMeeting) {
                        const entry = createMeetingEntry(chatRoom, meetingContacts[chatRoom.chatId]);
                        if (unsortedArr) {
                            unsortedArr.push({
                                entry,
                                sortable: chatRoom.getRoomTitle(),
                            });
                        }
                        else {
                            contactGeneratedList = `${contactGeneratedList}${entry}`;
                        }
                    }
                    else if (chatRoom.type === 'private') {
                        const h = chatRoom.getParticipantsExceptMe()[0];
                        addedContactsByRecent.push(h);
                        const entry = createContactEntry(h);
                        if (unsortedArr) {
                            unsortedArr.push({
                                entry,
                                sortable: chatRoom.getRoomTitle(),
                            });
                        }
                        else {
                            contactGeneratedList = `${contactGeneratedList}${entry}`;
                        }
                    }
                    else {
                        const entry = createGroupEntry(chatRoom);
                        if (unsortedArr) {
                            unsortedArr.push({
                                entry,
                                sortable: chatRoom.getRoomTitle(),
                            });
                        }
                        else {
                            contactGeneratedList = `${contactGeneratedList}${entry}`;
                        }
                    }
                }
            };
            processReady(recents, `<div class="chat-separator">${l.contact_list_recent_header}</div>`);
            processReady(all, allSeparator, rest);
            separated = all.length;
        }

        if (myContacts.length) {
            for (var a = 0; a < myContacts.length; a++) {
                if (addedContactsByRecent.includes(myContacts[a].handle)) {
                    continue;
                }
                if (!separated) {
                    contactGeneratedList = `${contactGeneratedList}${allSeparator}`;
                    separated = true;
                }
                rest.push({
                    entry: createContactEntry(myContacts[a].handle),
                    sortable: M.getNameByHandle(myContacts[a].handle)
                });
            }
        }
        rest.sort(M.sortObjFn('sortable', 1));
        contactGeneratedList = `${contactGeneratedList}${rest.map(a => a.entry).join('')}`;

        if (megaChat.WITH_SELF_NOTE) {
            contactGeneratedList = `${createNoteEntry(megaChat.getNoteChat())}${contactGeneratedList}`;
            // Note chat is enabled but shouldn't be counted for the empty state.
            hasChats--;
        }

        contactGeneratedList = `<ul id="${ulListId}">${contactGeneratedList}</ul>`;
        const checkNoteEmptyState = () => {
            const exist = $conversationNoConvTab[0].querySelector('ul');
            if (exist) {
                exist.remove();
            }
            if (!megaChat.WITH_SELF_NOTE) {
                return;
            }
            $conversationNoConvTab.safePrepend(contactGeneratedList);
        };
        if (
            hasChats && isActiveMember ||
            myContacts.length
        ) {
            $contactsContentBlock.safeHTML(contactGeneratedList);
            $conversationTab.addClass('active');
            $conversationNoConvTab.removeClass('active');
            $('.dialog-tree-panel-scroll').removeClass('hidden');
        }
        else {
            checkNoteEmptyState();
            $conversationTab.removeClass('active');
            $conversationNoConvTab.addClass('active');
            $('.dialog-tree-panel-scroll').addClass('hidden');
        }
    };

    async function handleShareTabContent() {
        const elems = $dialog[0].querySelectorAll('.shared-with-me .nw-fm-tree-item');
        if (!elems.length) {
            return;
        }
        const handles = [...elems].map(elem => elem.id.replace('mctreea_', ''));
        if (handles.some(h => !M.c[h])) {
            await dbfetch.geta(handles);
        }
        for (let i = handles.length; i--;) {
            const h = handles[i];
            const share = shares[h];
            const owner = share && share.owner;
            const user = M.getUserByHandle(owner);
            if (user) {
                const root = document.createElement('div');
                root.className = 'mega-node user';
                elems[i].appendChild(root);
                MegaAvatarComponent.factory({
                    parentNode: root,
                    userHandle: owner,
                    size: 24,
                });
                const name = document.createElement('div');
                name.className = 'user-card-name';
                name.textContent = M.getNameByHandle(owner);
                root.appendChild(name);
            }
        }
    }

    /**
     * Show content or empty block.
     * @param {String} tabClass dialog tab class name.
     * @param {String} parentTag tag of source element.
     * @private
     */
    const showDialogContent = (tabClass, parentTag) => {
        const $tab = $(`.fm-picker-dialog-tree-panel.${tabClass}`, $dialog);
        const dialog = $dialog[0];
        const panel = dialog.querySelector('.dialog-tree-panel-scroll');
        panel.className = `dialog-tree-panel-scroll ${tabClass}`;
        const sort = dialog.querySelector('.content-block.sort');
        const sortIcon = sort.querySelector('.fm-picker-dialog-panel-arrows');
        const sortLabel = sort.querySelector('.item-names');
        const collapseBar = sort.querySelector('.search-collapse-bar');
        const summary = dialog.querySelector('.content-block.summary-container');
        const defSummary = dialog.querySelector('.summary-container > .summary-row');
        const convSummary = summary.querySelector('.summary-conversations');
        if (section === 'conversations') {
            convSummary.classList.remove('hidden');
            defSummary.classList.add('hidden');
        }
        else {
            convSummary.classList.add('hidden');
            defSummary.classList.remove('hidden');
        }
        summary.classList.remove('hidden');
        $('.dialog-empty-block', $dialog).removeClass('active');
        let fromS4 = false;
        let fileFromCd = false;
        for (let i = $.selected.length; i--;) {
            const root = M.getNodeRoot($.selected[i]);
            fromS4 = fromS4 || root === 's4';
            fileFromCd = fileFromCd || !M.getNodeByHandle($.selected[i]).t && root === M.RootID;
            if (fromS4 && fileFromCd) {
                break;
            }
        }
        const $children = $(`.dialog-content-block ${parentTag}`, $dialog).children();

        if (
            !treesearch && $children.length ||
            treesearch && $children.filter('.tree-item-on-search-hidden').length < $children.length
        ) {
            // Items available, hide empty message
            $tab.addClass('active'); // TODO check why this was only here
            if ($.saveAsDialog) {
                sortIcon.classList.remove('hidden');
                sortLabel.classList.remove('hidden');
                collapseBar.classList.remove('hidden');
            }
            else {
                sort.classList.remove('hidden');
            }
            // Ensure sensitive nodes don't show their borders.
            $('.hidden-as-sensitive', $children).parent('li').addClass('hidden');
        }
        else {
            // Empty message, no items available
            panel.classList.add('hidden');
            if ($.saveAsDialog) {
                sortIcon.classList.add('hidden');
                sortLabel.classList.add('hidden');
            }
            else if (!treesearch) {
                sort.classList.add('hidden');
            }
            if (treesearch) {
                dialog.querySelector('.dialog-empty-block.search').classList.add('active');
            }
            else {
                if ($.saveAsDialog) {
                    collapseBar.classList.add('hidden');
                }
                const emptyBlock = dialog.querySelector(`.dialog-empty-block.${tabClass}`);
                emptyBlock.classList.add('active');
                const title = emptyBlock.querySelector('.title h1');
                const subtitle = emptyBlock.querySelector('.subtitle span');
                if ($.moveDialog) {
                    if (section === 'cloud-drive') {
                        subtitle.textContent = fromS4 ? l.move_dlg_empty_cd_from_s4 : l.move_dlg_empty_cd;
                    }
                    else if (section === 's4') {
                        subtitle.textContent = l.move_dlg_empty_s4;
                    }
                }
                else if ($.copyToShare || $.selectFolderDialog && !$.fileRequestNew) {
                    subtitle.textContent = section === 's4' ? l.share_folder_dlg_empty_s4 : l.share_folder_dlg_empty_cd;
                    summary.classList.add('hidden');
                }
                else if ($.mcImport && section !== 'shared-with-me') {
                    subtitle.textContent = section === 's4' ? l.import_dlg_empty_s4 : l.save_dlg_empty_cd;
                }
                else if ($.copyDialog) {
                    if (section === 'cloud-drive') {
                        subtitle.textContent = $.copyToUpload ?
                            l.upload_dlg_empty_cd :
                            fromS4 ? l.copy_dlg_empty_cd_from_s4 : l.copy_dlg_empty_cd;
                    }
                    else if (section === 's4') {
                        subtitle.textContent = $.copyToUpload ? l.upload_dlg_empty_s4 : l.copy_dlg_empty_s4;
                    }
                }
                else if ($.saveAsDialog && section === 'cloud-drive') {
                    subtitle.textContent = l.save_dlg_empty_cd;
                }
                else if ($.fileRequestNew) {
                    subtitle.textContent = l.file_req_dlg_empty_cd;
                    summary.classList.add('hidden');
                }

                if (section === 'shared-with-me') {
                    summary.classList.add('hidden');
                }
                if (section === 's4') {
                    if ('kernel' in s4) {
                        title.textContent = l.dlg_empty_title_s4;
                        subtitle.classList.remove('hidden');
                    }
                    else {
                        title.textContent = l[5533];
                        subtitle.classList.add('hidden');
                    }
                }
                else {
                    subtitle.classList.remove('hidden');
                }
            }
        }

        const instructions = $dialog[0].querySelector('.summary-container > .summary-row .summary-instructions');
        const instructionTxt = instructions.querySelector('.instruction');
        if ($.copyToShare || $.selectFolderDialog && !$.fileRequestNew) {
            instructions.classList.remove('hidden');
            instructionTxt.textContent = section === 's4' ?
                l.share_folder_dlg_instruction_s4 :
                l.share_folder_dlg_instruction_cd;
        }
        else if ($.mcImport && (section === 's4' || section === 'shared-with-me')) {
            instructions.classList.remove('hidden');
            instructionTxt.textContent =
                section === 's4' ? l.import_dlg_instruction_s4 : l.import_dlg_instruction_share;
        }
        else if (section === 's4' && fileFromCd) {
            instructions.classList.remove('hidden');
            instructionTxt.textContent =
                $.moveDialog ? l.move_dlg_instruction_s4 : l.copy_dlg_instruction_s4;
        }
        else if (section === 'shared-with-me') {
            instructions.classList.remove('hidden');
            let instruction = l.copy_dlg_instruction_shares;
            if ($.moveDialog) {
                instruction = l.move_dlg_instruction_shares;
            }
            else if ($.saveAsDialog) {
                instruction = l.save_dlg_instruction_shares;
            }
            instructionTxt.textContent = instruction;
        }
        else if (section === 'cloud-drive' && $.fileRequestNew) {
            instructions.classList.remove('hidden');
            instructionTxt.textContent = l.file_req_dlg_instruction;
        }
        else {
            instructions.classList.add('hidden');
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
        const $contentBlock =  $('.dialog-content-block', $dialog);
        const html = String(htmlContent)
            .replace(/treea_/ig, 'mctreea_')
            .replace(/treesub_/ig, 'mctreesub_')
            .replace(/treeli_/ig, 'mctreeli_');

        $contentBlock.empty().safeHTML(html);
        $('.s4-static-item', $contentBlock).remove();
        $('.nw-fm-tree-arrow', $contentBlock).addClass('sprite-fm-mono icon-chevron-right-thin-outline');
        $('.file-status-ico', $contentBlock).addClass('sprite-fm-mono icon-link-thin-outline');

        showDialogContent(tabClass, parentTag);
    };

    /**
     * Build tree for a move/copy dialog.
     * @private
     */
    var buildDialogTree = function() {
        const key = String($.dialog)[0].toUpperCase() + String($.dialog).substr(1) + section;
        const sortDir = M.sortTreePanel[key] && M.sortTreePanel[key].dir || 1;
        const $arrow = $('.fm-picker-dialog-panel-arrows i', $dialog);
        if (sortDir > 0) {
            $arrow.addClass('icon-arrow-up-thin-outline').removeClass('icon-arrow-down-thin-outline');
        }
        else {
            $arrow.addClass('icon-arrow-down-thin-outline').removeClass('icon-arrow-up-thin-outline');
        }

        if (section === 'cloud-drive' || section === 'folder-link') {
            M.buildtree(M.d[M.RootID], 'fm-picker-dialog', 'cloud-drive');
            showDialogContent('cloud-drive', 'ul');
        }
        else if (section === 'shared-with-me') {
            M.buildtree({h: 'shares'}, 'fm-picker-dialog');
            showDialogContent('shared-with-me', 'ul');
        }
        else if (section === 'conversations') {
            if (window.megaChatIsReady) {
                // prepare Conversation Tab if needed
                loadingDialog.show('send-to-chat-loader');
                handleConversationTabContent()
                    .then(() => {
                        if (chatSel.length) {
                            for (let i = chatSel.length; i--;) {
                                const chat =
                                    $dialog[0].querySelector(`#cpy-dlg-chat-itm-${chatSel[[i]]} .nw-contact-item`);
                                if (chat) {
                                    chat.click();
                                }
                            }
                            chatSel = [];
                        }
                    })
                    .catch(dump)
                    .finally(() => {
                        loadingDialog.hide('send-to-chat-loader');
                    });
            }
            else {
                console.error('MEGAchat is not ready');
            }
        }
        else if (section === 's4') {
            M.buildtree({h: 's4'}, 'fm-picker-dialog');
            showDialogContent('s4', 'ul');

            if (!('kernel' in s4) && !mBroadcaster.hasListener('s4-init(C)')) {
                mBroadcaster.once('s4-init(C)', () => {
                    if (section === 's4'
                        && ($.copyDialog || $.moveDialog || $.selectFolderDialog && !$.fileRequestNew)) {
                        $('.fm-picker-dialog-button[data-section="s4"]', $dialog).click();
                    }
                });
            }
        }

        if (treesearch) {
            $('.nw-fm-tree-arrow', $('.nw-fm-tree-item.expanded', $dialog))
                .removeClass('icon-chevron-right-thin-outline').addClass('icon-chevron-down-thin-outline');
        }
        else {
            $('.nw-fm-tree-item', '.fm-picker-dialog')
                .removeClass('expanded active opened selected');
            $('.nw-fm-tree-arrow', $dialog)
                .removeClass('icon-chevron-down-thin-outline').addClass('icon-chevron-right-thin-outline');
            $('.nw-fm-tree-item + ul', '.fm-picker-dialog').removeClass('opened');
        }

        disableFolders();
        if (section === 'shared-with-me') {
            handleShareTabContent().catch(dump);
        }
        onIdle(() => {
            initPerfectScrollbar($('.dialog-tree-panel-scroll', $dialog));

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

    const permissionMenu = () => {
        const select = $dialog[0].querySelector('.permissions');
        const resetChecks = () => {
            const checks = permissionMenu.elem.querySelectorAll('.checked');
            const { access = 'read-only' } = select.dataset;
            for (let i = checks.length; i--;) {
                if (checks[i].parentNode.dataset.access === access) {
                    checks[i].classList.remove('hidden');
                }
                else {
                    checks[i].classList.add('hidden');
                }
            }
        };
        if (permissionMenu.elem) {
            resetChecks();
            return permissionMenu.elem;
        }
        const menu = document.createElement('div');
        menu.className = 'copy-permissions picker-list-wrap';
        const opts = {
            'read-only': {
                text: l[7534],
                icon: 'sprite-fm-mono icon-eye-reveal1'
            },
            'read-and-write': {
                text: l[56],
                icon: 'sprite-fm-mono icon-edit-02-thin-outline'
            },
            'full-access': {
                text: l[57],
                icon: 'sprite-fm-mono icon-star-thin-outline'
            }
        };
        const checkHolder = document.createElement('i');
        checkHolder.className = 'hidden checked sprite-fm-mono icon-check-thin-outline';
        const selIconBase = 'permission';
        for (const [access, { text, icon }] of Object.entries(opts)) {
            const rowElem = document.createElement('div');
            rowElem.className = `option ${access}`;
            rowElem.dataset.access = access;
            const iconElem = document.createElement('i');
            iconElem.className = icon;
            rowElem.appendChild(iconElem);
            const textElem = document.createElement('span');
            textElem.textContent = text;
            rowElem.appendChild(textElem);
            rowElem.appendChild(checkHolder.cloneNode());
            rowElem.addEventListener('click', () => {
                select.querySelector('i.permission').className = `${selIconBase} ${icon}`;
                select.querySelector('span').textContent = text;
                select.dataset.access = access;
                resetChecks();
                mega.ui.menu.hide();
                select.classList.remove('active');
            });
            menu.appendChild(rowElem);
        }

        permissionMenu.elem = menu;
        resetChecks();
        return menu;
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
        var $permissionSelect = $('.permissions', $dialog);
        var $permissionIcon = $('i.permission', $permissionSelect);

        // all the different buttons
        const $cloudDrive = $pickerButtons.filter('[data-section="cloud-drive"]');
        const $s4 = $pickerButtons.filter('[data-section="s4"]');
        const $sharedMe = $pickerButtons.filter('[data-section="shared-with-me"]');
        const $conversations = $pickerButtons.filter('[data-section="conversations"]');
        $cloudDrive.removeClass('hidden');
        if (section === 'cloud-drive') {
            $('i', $cloudDrive).removeClass('icon-cloud-thin-outline').addClass('icon-cloud-thin-solid');
        }
        else {
            $('i', $cloudDrive).removeClass('icon-cloud-thin-solid').addClass('icon-cloud-thin-outline');
        }
        if (section === 's4') {
            $('i', $s4).removeClass('icon-bucket-triangle-thin-outline').addClass('icon-bucket-triangle-thin-solid');
        }
        else {
            $('i', $s4).removeClass('icon-bucket-triangle-thin-solid').addClass('icon-bucket-triangle-thin-outline');
        }
        if (section === 'shared-with-me') {
            $('i', $sharedMe).removeClass('icon-folder-users-thin-outline').addClass('icon-folder-users-thin-solid');
        }
        else {
            $('i', $sharedMe).removeClass('icon-folder-users-thin-solid').addClass('icon-folder-users-thin-outline');
        }
        if (section === 'conversations') {
            $('i', $conversations).removeClass('icon-message-chat-circle-thin').addClass('icon-chat-filled');
        }
        else {
            $('i', $conversations).removeClass('icon-chat-filled').addClass('icon-message-chat-circle-thin');
        }

        // Action button label
        $('.dialog-picker-button span', $dialog).text(buttonLabel);

        // if the site is initialized on the chat, $.selected may be `undefined`,
        // which may cause issues doing .length on it in dialogs.js, so lets define it as empty array
        // if is not def.
        $.selected = $.selected || [];

        $conversations.addClass('hidden');

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
            || $.saveAsDialog || $.dialog === 'copy' && !$.copyToUpload) {
            $conversations.addClass('hidden');
        }

        if (nodeRoot === M.RubbishID || $.copyToShare || $.selectFolderDialog
            || !u_type || $.albumImport) {
            $sharedMe.addClass('hidden');
        }
        else {
            $sharedMe.removeClass('hidden');
        }

        if (self.u_attr && u_attr.s4 && ($.copyDialog || $.moveDialog || $.selectFolderDialog && !$.fileRequestNew)) {
            $s4.removeClass('hidden');
        }
        else {
            $s4.addClass('hidden');
        }

        if ($.copyToUpload) {
            $('.fm-picker-notagain', $dialog).removeClass('hidden');
            $('footer', $dialog).removeClass('dialog-bottom');
            if (Object(window.fmconfig).ulddd) {
                $('.notagain', $dialog).prop('checked', true).parent()
                    .addClass('sprite-fm-mono icon-check-thin-outline checkbox-on');
            }
            else {
                $('.notagain', $dialog).prop('checked', false).parent()
                    .removeClass('sprite-fm-mono icon-check-thin-outline checkbox-on');
            }

        }
        else {
            $('.fm-picker-notagain', $dialog).addClass('hidden');
            $('footer', $dialog).addClass('dialog-bottom');
        }

        if ($.sendToChatDialog) {
            $cloudDrive.addClass('hidden');
            $s4.addClass('hidden');
            $sharedMe.addClass('hidden');
            $conversations.removeClass('hidden');
        }

        const searchInput = $dialog[0].querySelector('.search-bar input');
        if (section === 'cloud-drive') {
            searchInput.placeholder = l.dlg_search_cd;
        }
        else if (section === 's4') {
            searchInput.placeholder = l.dlg_search_s4;
        }
        else if (section === 'shared-with-me') {
            searchInput.placeholder = l.dlg_search_share;
        }
        else if (section === 'conversations') {
            searchInput.placeholder = l.dlg_search_chat;
        }

        if ($.saveAsDialog) {
            searchInput.placeholder = l.save_name_placeholder;
            searchInput.parentNode.classList.add('save-input');
            document.getElementById('fm-picker-dialog-title').classList.add('save-as');
            $('.search-collapse-bar', $dialog).removeClass('hidden').addClass('collapsed');
            searchInput.previousElementSibling.className = 'sprite-fm-mime icon-text-24 left-icon';
        }
        else {
            searchInput.previousElementSibling.className = 'sprite-fm-mono icon-search-light-outline left-icon';
            searchInput.parentNode.classList.remove('save-input');
            document.getElementById('fm-picker-dialog-title').classList.remove('save-as');
            $('.search-collapse-bar', $dialog).addClass('hidden');
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

            $permissionSelect.attr('data-access', 'read-only').removeClass('active');
            $permissionIcon.attr('class', 'permission sprite-fm-mono icon-eye-reveal1');
            $('> span', $permissionSelect).text(l[7534]);
        }

        $dialog.removeClass('no-left');
        $('.summary-target-title', $dialog).text(section === 'conversations' ? l.chat_target : l.item_target);

        // If copying from contacts tab (Ie, sharing)
        if (
            !$.saveToDialog &&
            (section === 'cloud-drive' || section === 's4') &&
            (M.currentrootid === 'chat' || $.copyToShare) &&
            !$.copyToUpload
        ) {
            $('.dialog-newfolder-button', $dialog).addClass('hidden');
            $permissionSelect.removeClass('hidden');
            $('.summary-target-title', $dialog).text(l.selected_folder);

            $permissionSelect.rebind('click.dsp', (ev) => {
                if (mega.ui.menu.name === 'picker-permissions') {
                    mega.ui.menu.hide();
                    $('i.select-arrow', $permissionSelect).removeClass('face-up');
                    $permissionSelect.removeClass('active');
                    return;
                }
                ev = {currentTarget: {domNode: $permissionSelect[0]}};
                $('i.select-arrow', $permissionSelect.addClass('active')).addClass('face-up');
                mega.ui.menu.show({
                    name: 'picker-permissions',
                    classList: ['picker-permissions', 'picker-dropdown'],
                    event: ev,
                    eventTarget: $permissionSelect[0],
                    pos: 'bottomRight',
                    contents: [permissionMenu()],
                    resizeHandler: true,
                    onClose: () => {
                        $('i.select-arrow', $permissionSelect).removeClass('face-up');
                    }
                });
                return false;
            });
        }
        else if ($.selectFolderDialog) {
            $permissionSelect.addClass('hidden');
            if ($.fileRequestNew) {
                $dialog.addClass('fm-picker-file-request no-left');

                $('.fm-picker-dialog-desc', $dialog)
                    .removeClass('hidden');
                $('.fm-picker-dialog-desc p', $dialog)
                    .text(l.file_request_select_folder_desc);
                $('button.js-close', $dialog).removeClass('hidden');

            }
        }
        else {
            $permissionSelect.addClass('hidden');
        }

        if ($.chatAttachmentShare && section !== 'conversations') {
            $permissionSelect.addClass('hidden');
        }

        // 'New group chat' button
        if (section === 'conversations' && M.u.some(contact => contact.c === 1)) {
            $('.dialog-newgroup-button', $dialog).removeClass('hidden');
        }
        else {
            $('.dialog-newgroup-button', $dialog).addClass('hidden');
        }

        // Activate tab
        $('.fm-picker-dialog-button[data-section="' + section + '"]', $dialog).addClass('active');
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
            /** @name $.sendToChatDialog */
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
            $('.summary-error, .save-input-error', $dialog).addClass('hidden');
            handleDialogContent(typeof aTab === 'string' && aTab);
            if (aTab === 'conversations') {
                setDialogBreadcrumb(M.currentrootid === 'chat' && aTarget !== M.RootID ? aTarget : '');
            }
            else {
                setDialogBreadcrumb(aTarget);
            }
            setDialogButtonState($('.dialog-picker-button', $dialog).addClass('active'));
            setSelectedItems();
        });

        $.hideContextMenu();
        $dialog.removeClass('duplicate');

        console.assert($dialog, 'The dialogs subsystem is not yet initialized!...');
    };

    /** Checks if the user can access dialogs copy/move/share */
    var isUserAllowedToOpenDialogs = function() {
        console.assert($dialog, 'The dialogs subsystem is not yet initialized!');

        return $dialog && !M.isInvalidUserStatus();
    };

    const _memoriseTreeState = () => {
        const expanded = $dialog[0].querySelectorAll('span.expanded');
        const ids = [];

        for (let i = expanded.length; i--;) {
            const elem = expanded[i];
            if (
                !elem.parentNode.classList.contains('tree-item-on-search-hidden') &&
                !elem.parentNode.classList.contains('hidden')
            ) {
                ids.push(elem.id);
            }
        }

        const sel = $.mcselected;
        const scrollPos = $dialog[0].querySelector('.dialog-tree-panel-scroll').scrollTop;

        return [ids, sel, scrollPos];
    };

    const _reapplyTreeState = ([ids, sel, scrollPos]) => {
        for (let i = ids.length; i--;) {

            const el = $dialog[0].querySelector(`#${ids[i]}`);

            if (el && el.classList.contains('contains-folders') && !el.classList.contains('expanded')) {

                const arrow = el.querySelector('.nw-fm-tree-arrow');
                const sub = $dialog[0].querySelector(ids[i].replace('mctreea_', '#mctreesub_'));

                el.classList.add('expanded');
                arrow.classList.remove('icon-chevron-right-thin-outline');
                arrow.classList.add('icon-chevron-down-thin-outline');
                sub.classList.add('opened');
            }
        }
        if (sel) {
            const el = $dialog[0].querySelector(`#mctreea_${sel}`);
            if (el) {
                el.click();
            }
            else { // selected item is deleted, reset UI
                setDialogBreadcrumb();
                setDialogButtonState($('.dialog-picker-button', $dialog));
            }
        }
        if (typeof scrollPos === 'number') {
            const el = $dialog[0].querySelector('.dialog-tree-panel-scroll');
            if (el) {
                el.scrollTop = scrollPos;
            }
        }
    };

    // ------------------------------------------------------------------------
    // ---- Public Functions --------------------------------------------------

    /**
     * Refresh copy/move dialog content with newly created directory.
     * @global
     */
    global.refreshDialogContent = function refreshDialogContent() {
        var tab = $.cfsection || section || 'cloud-drive';

        // eslint-disable-next-line local-rules/jquery-replacements
        const b = tab !== 'conversations' && $('.content-panel.' + tab).html();

        // Before refresh content remember what is opened.
        var $openedNodes = $('ul.opened[id^="mctreesub_"]', $dialog);
        $.openedDialogNodes = {};

        for (var i = $openedNodes.length; i--;) {

            var id = $openedNodes[i].id.replace('mctreesub_', '');
            $.openedDialogNodes[id] = 1;
        }

        if (section === 'conversations') {
            $.dialogSelChats = [];
            const sel = $dialog[0].querySelectorAll('.nw-contact-item.selected');
            for (let i = sel.length; i--;) {
                chatSel.push(sel[i].id.replace('cpy-dlg-chat-itm-spn-', ''));
            }
        }
        if (!treesearch) {
            const $search = $($.saveAsDialog ? '.search-collapse-bar input' : '.search-bar input', $dialog);
            if ($search.val()) {
                $search.val('').blur();
                if (!$.saveAsDialog) {
                    $('.search-icon-reset', $dialog).addClass('hidden');
                }
            }
        }

        // Remember current tree state, include selection and expand states
        const memory = _memoriseTreeState();

        handleDialogTabContent(tab, 'ul', b);
        buildDialogTree();

        _reapplyTreeState(memory);

        delete $.cfsection; // safe deleting
        delete $.openedDialogNodes;

        disableFolders($.moveDialog && 'move');
        initPerfectScrollbar($('.dialog-tree-panel-scroll', $dialog));
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
                handleOpenDialog('cloud-drive', M.RootID, 'copyToShare');
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

            const openDialog = () => M.safeShowDialog('copy', () => {
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

            if (activeTab === 'conversations') {
                mega.sensitives.passShareCheck($.selected).then(openDialog).catch(dump);
            }
            else {
                openDialog();
            }
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
        if (!isUserAllowedToOpenDialogs()) {
            return false;
        }

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
            return mega.ui.mShareDialog.init(target);
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
                        if ($.dialog !== dialogName) {
                            return;
                        }
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

    global.openSendToChatDialog = function() {
        if (isUserAllowedToOpenDialogs()) {
            mega.sensitives.passShareCheck($.selected).then(() => {
                M.safeShowDialog('sendToChat', () => {
                    handleOpenDialog('conversations', M.RootID);
                    return $dialog;
                });
            }).catch(dump);
        }

        return false;
    };

    mBroadcaster.addListener('fm:initialized', function copyMoveDialogs() {
        if (folderlink) {
            return false;
        }

        $dialog = $('.mega-dialog.fm-picker-dialog');
        var $btn = $('.dialog-picker-button', $dialog);

        // close breadcrumb overflow menu
        $dialog.rebind('click.dialog', e => {
            if (!e.target.closest('.breadcrumb-dropdown, .breadcrumb-dropdown-link') &&
                $('.breadcrumb-dropdown', $dialog).hasClass('active')) {
                $('.breadcrumb-dropdown, .breadcrumb-dropdown-link', $dialog).removeClass('active');
            }
            if (mega.ui.menu.name && ['picker-chat-items', 'picker-permissions'].includes(mega.ui.menu.name)) {
                mega.ui.menu.hide();
                $('.summary-conversations .active, .permissions.active', $dialog).removeClass('active');
                $('.face-up', $dialog).removeClass('face-up');
            }
        });

        $('.dialog-cancel-button', $dialog).rebind('click', () => {
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
            if ($.saveAsDialog) {
                $('input', $('.search-collapse-bar', $dialog).addClass('collapsed')).val('');
            }
            else {
                $('.search-bar input', $dialog).val('');
            }
            $('.search-bar.placeholder .search-icon-reset', $dialog).addClass('hidden');
            $('.nw-fm-tree-item', $dialog).removeClass('selected');

            if ($.dialogSelChats) {
                delete $.dialogSelChats;
            }
            if (section === 'cloud-drive' || section === 'folder-link') {
                setDialogBreadcrumb(M.RootID);
            }
            else if (section === 's4' && 'utils' in s4) {
                const cn = s4.utils.getContainersList();

                // Select MEGA container handle if it's the only one
                setDialogBreadcrumb(cn.length === 1 && cn[0].h || undefined);
            }
            else {
                setDialogBreadcrumb();
            }

            setDialogButtonState($btn);
        });

        $('.sort-height', $dialog).rebind('click.pickerdlg', () => {
            const key = String($.dialog)[0].toUpperCase() + String($.dialog).substr(1) + section;
            if (!M.sortTreePanel[key]) {
                return;
            }

            M.sortTreePanel[key].by = 'name';
            M.sortTreePanel[key].dir *= -1;

            const memory = _memoriseTreeState();
            buildDialogTree();
            _reapplyTreeState(memory);
        });

        const $saveErr = $('.save-input-error', $dialog);
        function searchKeypress(ev) {
            var value = String($(this).val()).toLowerCase();
            var exit = ev.keyCode === 27 || !value;
            const isSaveAs = this.parentNode.classList.contains('save-input');
            if (value) {
                this.nextElementSibling.classList.remove('hidden');
            }
            else {
                this.nextElementSibling.classList.add('hidden');
            }
            if (isSaveAs) {
                if (value && (section !== 'shared-with-me' || $.mcselected)) {
                    $btn.removeClass('disabled');
                }
                return;
            }
            if (section === 'conversations') {
                var $lis = $('.nw-contact-item', $dialog).parent();

                const resultSeparator = $dialog[0].querySelector('.chat-separator.search');
                if (resultSeparator) {
                    resultSeparator.remove();
                }
                const chatSeparators = $dialog[0].querySelectorAll('.chat-separator');
                const empty = $dialog[0].querySelector('.dialog-empty-block.search');
                const scroller = $dialog[0].querySelector('.dialog-tree-panel-scroll');
                empty.classList.remove('active');
                scroller.classList.remove('hidden');
                if (exit) {
                    for (let i = chatSeparators.length; i--;) {
                        chatSeparators[i].classList.remove('hidden');
                    }
                    $lis.removeClass('tree-item-on-search-hidden');
                    if (value) {
                        $(this).val('').trigger("blur");
                    }
                }
                else {
                    let anyVisible = false;
                    $lis.addClass('tree-item-on-search-hidden').each(function(i, elm) {
                        var sel = ['.nw-contact-name', '.nw-contact-email'];
                        for (i = sel.length; i--;) {
                            var tmp = elm.querySelector(sel[i]);
                            if (tmp) {
                                tmp = String(tmp.textContent).toLowerCase();

                                if (tmp.indexOf(value) !== -1) {
                                    elm.classList.remove('tree-item-on-search-hidden');
                                    anyVisible = true;
                                    break;
                                }
                            }
                        }
                    });
                    for (let i = chatSeparators.length; i--;) {
                        chatSeparators[i].classList.add('hidden');
                    }
                    if (anyVisible) {
                        const elem = document.createElement('div');
                        elem.className = 'chat-separator search';
                        elem.textContent = l.search_results;
                        chatSeparators[0].parentNode.prepend(elem);
                    }
                    else {
                        scroller.classList.add('hidden');
                        empty.classList.add('active');
                    }
                }

                onIdle(function() {
                    initPerfectScrollbar($('.dialog-tree-panel-scroll', $dialog));
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

                delay('mctree:search', () => {
                    // Clear selection on search change
                    if (section === 'cloud-drive') {
                        setDialogBreadcrumb(M.RootID);
                    }
                    else if (section === 's4' && 'utils' in s4) {
                        const cn = s4.utils.getContainersList();
                        setDialogBreadcrumb(cn.length === 1 && cn[0].h || undefined);
                    }
                    else {
                        setDialogBreadcrumb();
                    }
                    if (section === 'shared-with-me') {
                        $('.dialog-newfolder-button', $dialog).addClass('hidden');
                    }
                    $('.nw-fm-tree-item', $dialog).removeClass('selected');
                    setDialogButtonState($btn);
                    buildDialogTree();
                });
            }

            return false;
        }
        const $collapseBar = $('.search-collapse-bar', $dialog);
        $('.search-bar input', $dialog).rebind('keyup.dsb', searchKeypress);
        $('input', $collapseBar).rebind('keyup.dsb', searchKeypress).rebind('blur.dsb', () => {
            if ($('input', $collapseBar).val().trim() === '') {
                $('.search-icon-collapse', $collapseBar).click();
            }
        });

        $('.search-bar.placeholder .search-icon-reset', $dialog).rebind('click.dsb', () => {
            $('.search-bar input', $dialog).val('').trigger('keyup.dsb');
        });
        $('.search-icon-collapse, .search-icon-expand', $collapseBar).rebind('click.dsb', (ev) => {
            if ($collapseBar.hasClass('collapsed')) {
                $collapseBar.removeClass('collapsed');
                $('input', $collapseBar).focus();
            }
            else if (ev.currentTarget.classList.contains('search-icon-collapse')) {
                $collapseBar.addClass('collapsed');
                $('input', $collapseBar).val('').trigger('keyup.dsb');
                $('.search-icon-collapse', $collapseBar).addClass('hidden');
            }
        });

        $('.dialog-newfolder-button', $dialog).rebind('click', function() {
            $dialog.addClass('arrange-to-back');

            $.cfsection = section;
            $.cftarget = $.mcselected || (section === 'cloud-drive' ? M.RootID : M.RubbishID);

            const callback = (h) => {
                // Force clear search since closeDialog will but s4 won't do that in the same order.
                treesearch = false;
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

            if (M.getS4NodeType(node) === 'container') {
                if ('ui' in s4) {
                    s4.ui.showDialog(s4.buckets.dialogs.create, target, callback);
                }
                return;
            }

            $.cftarget = target;
            console.assert(!$.cfpromise, 'We already have a pending folder creation request...');
            ($.cfpromise = mega.promise)
                .then((h) => callback(h))
                .catch(nop);

            createFolderDialog();

            $('.mega-dialog.create-folder-dialog .create-folder-size-icon').addClass('hidden');
        });

        $('.dialog-newgroup-button', $dialog).rebind('click', () => {
            $dialog.addClass('arrange-to-back');
            $.cfsection = section;
            const requestEvent = 'onNewGroupChatRequest.cpd';
            const initEvent = 'onRoomInitialized.cpd';
            let triggered = false;
            $.cpdGroupChat = true;
            megaChat.rebind(requestEvent, () => {
                triggered = true;
                megaChat.off(requestEvent);
                megaChat.rebind(initEvent, ({ data }) => {
                    megaChat.off(initEvent);
                    if ($.copyToUpload || $.sendToChatDialog) {
                        delay('cpd-new-group',() => {
                            refreshDialogContent();
                            if (data && data[0] && data[0].chatId) {
                                chatSel.push(data[0].chatId);
                            }
                        }, 1000);
                    }
                    delete $.cpdGroupChat;
                });
            });
            M.initNewChatlinkDialog(1, () => {
                fm_showoverlay();
                if (!triggered) {
                    megaChat.off(requestEvent);
                    megaChat.off(initEvent);
                    delete $.cpdGroupChat;
                }
            });

        });

        $dialog.rebind('click', '.nw-contact-item', function() {
            const $this = $(this);
            const $scrollBlock = $('.dialog-tree-panel-scroll', $dialog);

            const id = String(this.id).replace('cpy-dlg-chat-itm-spn-', '');
            $.dialogSelChats = $.dialogSelChats || [];
            if ($this.hasClass('selected')) {
                $this.removeClass('selected');
                const idx = $.dialogSelChats.indexOf(id);
                $.dialogSelChats.splice(idx, 1);
            }
            else {
                $this.addClass('selected');
                $.dialogSelChats.push(id);
            }

            setDialogBreadcrumb();
            setDialogButtonState($btn);
            initPerfectScrollbar($scrollBlock);

            // Scroll the element into view, only needed if element triggered.
            scrollToElement($scrollBlock, $this);
        });

        $dialog.rebind('click', '.nw-fm-tree-item', function(e) {

            const disabled = e.currentTarget.classList.contains('disabled');
            const expandable = e.currentTarget.classList.contains('expandable');
            if (disabled && !expandable) {
                return false;
            }
            var ts = treesearch;
            var old = $.mcselected;
            const $scrollBlock = $('.dialog-tree-panel-scroll', $dialog);

            const id = String($(this).attr('id')).replace('mctreea_', '');
            if (!expandable) {
                setDialogBreadcrumb(id);
            }
            treesearch = false;
            M.buildtree({h: expandable ? id : $.mcselected}, 'fm-picker-dialog', section);
            treesearch = ts;
            disableFolders();

            var c = $(e.target).attr('class');

            const elmId = `#mctreesub_${expandable ? id : $.mcselected}`;
            const arrow = this.querySelector('.nw-fm-tree-arrow');
            // Sub-folder exist?
            if (c && c.indexOf('nw-fm-tree-arrow') > -1) {

                c = $(this).attr('class');

                // Sub-folder expanded
                if (c && c.indexOf('expanded') > -1) {
                    $(this).removeClass('expanded');
                    arrow.classList.add('icon-chevron-right-thin-outline');
                    arrow.classList.remove('icon-chevron-down-thin-outline');
                    $(elmId).removeClass('opened');
                }
                else {
                    $(this).addClass('expanded');
                    arrow.classList.add('icon-chevron-down-thin-outline');
                    arrow.classList.remove('icon-chevron-right-thin-outline');
                    $(elmId).addClass('opened');
                }
            }
            else {

                c = $(this).attr('class');

                if (c && c.indexOf('selected') > -1 || expandable) {
                    if (c && c.indexOf('expanded') > -1) {
                        $(this).removeClass('expanded');
                        arrow.classList.add('icon-chevron-right-thin-outline');
                        arrow.classList.remove('icon-chevron-down-thin-outline');
                        $(elmId).removeClass('opened');
                    }
                    else {
                        $(this).addClass('expanded');
                        arrow.classList.add('icon-chevron-down-thin-outline');
                        arrow.classList.remove('icon-chevron-right-thin-outline');
                        $(elmId).addClass('opened');
                    }
                }
            }

            // Set opened & expanded ancestors, only needed if element triggered.
            $(this).parentsUntil('.dialog-content-block', 'ul').addClass('opened')
                .prev('.nw-fm-tree-item').addClass('expanded');

            // Scroll the element into view, only needed if element triggered.
            scrollToElement($scrollBlock, $(this));
            if (expandable) {
                return false;
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

            const instructions = $dialog[0].querySelector('.summary-container > .summary-row .summary-instructions');
            instructions.classList.add('hidden');

            // // If not copying from contacts tab (Ie, sharing)
            if (!$.copyToShare) {
                if ($.mcselected && (section === 's4' || M.getNodeRights($.mcselected) > 0)) {
                    $('.dialog-newfolder-button', $dialog).removeClass('hidden');
                }
                else {
                    $('.dialog-newfolder-button', $dialog).addClass('hidden');
                }
            }
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
        const $wrapper = $('.checkbox-wrapper', $dialog);
        const $boxes = $('.notagain', $dialog);
        $wrapper.rebind('click.mcd', (ev) => {
            // Link both checkboxes.
            const checked = !ev.currentTarget.classList.contains('checkbox-on');
            $boxes.prop('checked', checked);
            $('.checkbox-wrapper', $dialog)
                .toggleClass('sprite-fm-mono icon-check-thin-outline checkbox-on', checked);
        });
        const $searchInput = $('.search-bar input', $dialog);
        $searchInput.rebind('blur.dsp', (ev) => {
            if (!$.saveAsDialog) {
                return;
            }
            if (ev.currentTarget.value.trim() === '') {
                $btn.addClass('disabled');
                $('.error-text', $saveErr).text(l.save_error_empty);
                $searchInput[0].parentNode.classList.add('error');
                $saveErr.removeClass('hidden');
                tSleep(2).then(() => {
                    $saveErr.addClass('hidden');
                    $searchInput[0].parentNode.classList.remove('error');
                });
            }
            else if (section !== 'shared-with-me' || $.mcselected) {
                $btn.removeClass('disabled');
            }
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
            let fileCount = 0;
            let folderCount = 0;
            let objectCount = 0;
            let bucketCount = 0;
            if ($.mcImport) {
                if ($.saveToDialogNode) {
                    if ($.saveToDialogNode.t === 0) {
                        fileCount++;
                    }
                    else {
                        folderCount++;
                    }
                }
                else {
                    for (let i = $.onImportCopyNodes.length; i--;) {
                        const n = $.onImportCopyNodes[i];
                        if (!n.p && n.t === 1) {
                            folderCount++;
                        }
                        else if (!n.p) {
                            fileCount++;
                        }
                    }
                }
            }
            else {
                for (let i = selectedNodes.length; i--;) {
                    const node = M.getNodeByHandle(selectedNodes[i]);
                    if (node) {
                        const root = M.getNodeRoot(selectedNodes[i]);
                        if (root === 's4') {
                            const type = M.getS4NodeType(node);
                            if (type === 'bucket') {
                                bucketCount++;
                            }
                            else if (type === 'object') {
                                objectCount++;
                            }
                            else {
                                folderCount++;
                            }
                        }
                        else if (node.t) {
                            folderCount++;
                        }
                        else {
                            fileCount++;
                        }
                    }
                }
            }
            const isMultiTyped = fileCount && folderCount ||
                bucketCount && objectCount ||
                bucketCount && folderCount ||
                objectCount && folderCount ||
                bucketCount && objectCount && folderCount;
            let unclearResult = false;
            const targetName = M.getNameByHandle($.mcselected);

            // closeDialog would cleanup some $.* variables, so we need them cloned here
            const {
                saveToDialogCb,
                saveToDialogNode,
                shareToContactId,
                noOpenChatFromPreview,
                mcImport,
            } = $;
            const saveToDialog = $.saveToDialog || saveToDialogNode;
            let viewCb = false;
            // eslint-disable-next-line complexity
            const showToast = (isMove) => {
                let string = '';
                let count = 0;
                if (unclearResult) {
                    if (mcImport) {
                        string = l.toast_import_items_nc;
                    }
                    else {
                        string = isMove ? l.toast_move_items_nc : l.toast_copy_items_nc;
                    }
                }
                else if (isMultiTyped) {
                    count = bucketCount + objectCount + folderCount + fileCount;
                    if (mcImport) {
                        string = l.toast_import_items;
                    }
                    else {
                        string = isMove ? l.toast_move_items : l.toast_copy_items;
                    }
                }
                else if (objectCount) {
                    count = objectCount;
                    string = isMove ? l.toast_move_objects : l.toast_copy_objects;
                }
                else if (bucketCount) {
                    count = bucketCount;
                    string = isMove ? l.toast_move_buckets : l.toast_copy_buckets;
                }
                else if (fileCount) {
                    count = fileCount;
                    if (mcImport) {
                        string = l.toast_import_file;
                    }
                    else {
                        string = isMove ? l.toast_move_files : l.toast_copy_files;
                    }
                }
                else if (folderCount) {
                    count = folderCount;
                    if (mcImport) {
                        string = l.toast_import_folder;
                    }
                    else {
                        string = isMove ? l.toast_move_folders : l.toast_copy_folders;
                    }
                }
                else {
                    return;
                }
                string = (unclearResult ? string : mega.icu.format(string, count)).replace('%s', targetName);
                if (typeof viewCb === 'function') {
                    mega.ui.toast.show(
                        string,
                        4,
                        l[16797],
                        { actionButtonCallback: viewCb }
                    );
                }
                else {
                    mega.ui.toast.show(string);
                }
            };

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
                closeDialog();
                return false;
            }

            const t = $.mcselected;
            if ($.moveDialog) {
                closeDialog();
                mLoadingSpinner.show('safeMoveNodes');
                M.safeMoveNodes(t)
                    .then(() => {
                        viewCb = selectedNodes.length ? () => {
                            M.openFolder(t).then(() => {
                                if (window.selectionManager) {
                                    let reset = false;
                                    for (let i = selectedNodes.length; i--;) {
                                        const n = M.getNodeByHandle(selectedNodes[i]);
                                        if (n.p === t) {
                                            if (reset) {
                                                selectionManager.add_to_selection(n.h);
                                            }
                                            else {
                                                selectionManager.resetTo(n.h);
                                                reset = true;
                                            }
                                        }
                                    }
                                }
                            }).catch(dump);
                        } : false;
                        showToast(true);
                    })
                    .catch(dump).finally(() => mLoadingSpinner.hide('safeMoveNodes'));
                return false;
            }

            if ($.nodeSaveAs) {
                const $nameInput = $('.search-bar input', $dialog);
                const $summaryError = $('.summary-error', $dialog);
                var saveAsName = $nameInput.val();
                var eventName = 'input.saveas';

                var removeErrorStyling = function() {
                    $saveErr.addClass('hidden');
                    $searchInput[0].parentNode.classList.remove('error');
                    $dialog.removeClass('duplicate');
                    $summaryError.addClass('hidden');
                    $nameInput.off(eventName);
                };

                removeErrorStyling();

                var errMsg = '';

                if (!saveAsName.trim()) {
                    errMsg = l[5744];
                    $('.error-text', $saveErr).text(errMsg);
                    $saveErr.removeClass('hidden');
                }
                else if (!M.isSafeName(saveAsName)) {
                    errMsg = saveAsName.length > 250 ? l.LongName1 : l[24708];
                    $('.error-text', $saveErr).text(errMsg);
                    $saveErr.removeClass('hidden');
                }
                else if (duplicated(saveAsName, $.mcselected)) {
                    errMsg = true;
                    $summaryError.removeClass('hidden');
                    $('.error-text', $summaryError).text(l.save_error_dupe);
                }

                if (errMsg) {
                    $dialog.addClass('duplicate');
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
                        .then($.saveAsCallBack || nop)
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
            if (section === 'cloud-drive' || section === 'folder-link' || section === 's4') {

                // If copying from contacts tab (Ie, sharing)
                if ($(this).text().trim() === l[1344]) {
                    var user = {
                        u: shareToContactId ? shareToContactId : M.currentdirid
                    };
                    var spValue = $('.permissions', $dialog).attr('data-access');
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
                        .then(() => {
                            mega.ui.toast.show(l.share_folder_toast.replace('%1', targetName));
                        })
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
                    M.copyNodes(selectedNodes, t)
                        .then((res) => {
                            if (res && res.length) {
                                if (res.length < selectedNodes.length) {
                                    unclearResult = true;
                                }
                                viewCb = () => {
                                    M.openFolder(t).then(() => {
                                        if (window.selectionManager) {
                                            let reset = false;
                                            for (let i = res.length; i--;) {
                                                const n = M.getNodeByHandle(res[i]);
                                                if (n.p === t) {
                                                    if (reset) {
                                                        selectionManager.add_to_selection(n.h);
                                                    }
                                                    else {
                                                        selectionManager.resetTo(n.h);
                                                        reset = true;
                                                    }
                                                }
                                            }
                                        }
                                    }).catch(dump);
                                };

                                const toUnhide = section === 's4' && mega.sensitives.featureEnabled
                                    ? res.filter(h => M.d[h].sen)
                                    : [];

                                if (toUnhide.length) {
                                    mega.sensitives.toggleStatus(toUnhide, false);
                                }

                                showToast();
                            }
                        })
                        .catch((ex) => ex !== EBLOCKED && tell(ex));
                }
            }
            else if (section === 'shared-with-me') {
                M.copyNodes(getNonCircularNodes(selectedNodes), t)
                    .then((res) => {
                        if (res && res.length) {
                            if (res.length < selectedNodes.length) {
                                unclearResult = true;
                            }
                            viewCb = () => {
                                M.openFolder(t).then(() => {
                                    let reset = false;
                                    for (let i = res.length; i--;) {
                                        const n = M.getNodeByHandle(res[i]);
                                        if (n.p === t) {
                                            if (reset) {
                                                selectionManager.add_to_selection(n.h);
                                            }
                                            else {
                                                selectionManager.resetTo(n.h);
                                                reset = true;
                                            }
                                        }
                                    }
                                }).catch(dump);
                            };
                            showToast();
                        }
                    })
                    .catch(tell);
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

        const breadcrumbClear = $dialog[0].querySelector('.crumb-clear-sel');
        if (breadcrumbClear) {
            breadcrumbClear.addEventListener('click', () => {
                breadcrumbClear.classList.add('hidden');
                $dialog[0].querySelector(`.fm-picker-dialog-button[data-section="${section}"]`).click();
            });
        }

        return 0xDEAD;
    });

})(self);
