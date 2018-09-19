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
                        n = null;
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
        else {
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
                if (!M.isCircular(selectedNodes[i], $.mcselected)) {
                    r.push(selectedNodes[i]);
                }
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
        else {
            var forceEnabled = $.copyToShare || $.copyToUpload || $.onImportCopyNodes || $.saveToDialog;

            console.assert(!$.copyToShare || Object($.selected).length === 0, 'check this...');

            if (!forceEnabled && !getNonCircularNodes().length) {
                $btn.addClass('disabled');
            }
            else {
                $btn.removeClass('disabled');
            }
        }
    };

    /**
     * Select tree item node
     * @param {String} h The node handle
     */
    var selectTreeItem = function(h) {
        onIdle(function() {
            if (!$('#mctreesub_' + h, $dialog).hasClass('opened')) {
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
        var path = false;
        var names = Object.create(null);
        var titles = Object.create(null);
        var $dbc = $('.fm-picker-breadcrumbs', $dialog).empty();

        if (section === 'conversations') {
            var chats = getSelectedChats();
            if (chats.length > 1) {
                path = [u_handle, 'contacts'];
                names[u_handle] = l[1025];
            }
            else {
                aTarget = chats[0];
            }
        }

        // Update global $.mcselected with the target handle
        $.mcselected = aTarget || undefined;
        path = path || M.getPath($.mcselected);

        titles[M.RootID] = l[164];
        titles[M.RubbishID] = l[167];
        titles['shares'] = l[5542];

        if (path.length === 1) {
            names = titles;
        }

        if ($.mcselected && !path.length) {
            // The selected node is likely not in memory, try to rely on DOM and find the ancestors
            var el = $dialog[0].querySelector('#mctreea_' + aTarget);

            if (el) {
                path.push(aTarget);
                names[aTarget] = el.querySelector('.nw-fm-tree-folder').textContent;

                $(el).parentsUntil('.dialog-content-block', 'ul').each(function(i, elm) {
                    var h = String(elm.id).split('_')[1];
                    path.push(h);

                    elm = $dialog[0].querySelector('#mctreea_' + h + ' .nw-fm-tree-folder');
                    if (elm) {
                        names[h] = elm.textContent;
                    }
                });
            }
        }

        for (var i = path.length; i--;) {
            var h = path[i];
            var type = 'folder';
            var name = names[h] || M.getNameByHandle(h);

            if (h === M.RootID) {
                if (!folderlink) {
                    type = 'cloud-drive';
                }
            }
            else if (h === M.RubbishID) {
                type = 'rubbish-bin';
            }
            else if (h === 'contacts') {
                type = 'contacts';
            }
            else if (h === 'shares') {
                type = 'shared-with-me';
            }
            else if (h.length === 11) {
                type = 'contact';
            }

            if (name === 'undefined') {
                name = '';
            }

            var nameFmt = '@@';
            if (section === 'conversations') {
                nameFmt = name && megaChat.plugins.emoticonsFilter.processHtmlMessage(escapeHTML(name)) || nameFmt;
            }

            $dbc.safeAppend(
                '<a class="fm-breadcrumbs @@ @@" title="@@" data-node="@@">' +
                '    <span class="right-arrow-bg"><span>' + nameFmt + '</span></span>' +
                '</a>', type, i > 0 ? 'has-next-button' : '', titles[h] || name, h, name
            );

            // selectTreeItem(h);
        }

        if (path.length) {
            $dbc.parent().addClass('correct-input').removeClass('high-light');
        }
        else {
            $dbc.parent().addClass('high-light').removeClass('correct-input')
                .find('.transfer-filetype-icon').removeClass('chat folder')
                .addClass(section === 'conversations' ? 'chat' : 'folder');
        }

        $dbc.safeAppend('<div class="clear"></div>');

        $('a.fm-breadcrumbs', $dialog).rebind('click', function() {
            var $elm = $('#mctreea_' + $(this).attr('data-node'), $dialog);
            if ($elm.length) {
                $elm.trigger('click');
            }
            else {
                $('.fm-picker-dialog-button.active', $dialog).trigger('click');
            }
            return false;
        });
    };

    /**
     * Set selected items...
     * @param {*} [single] Single item mode
     * @private
     */
    var setSelectedItems = function(single) {
        var $icon = $('.summary-items-drop-icon', $dialog).removeClass('drop-up-icon drop-down-icon hidden');
        var $div = $('.summary-items', $dialog).removeClass('unfold multi').empty();
        var names = Object.create(null);
        var items = $.selected || [];

        var jScrollPane = function() {
            var jsp = $div.data('jsp');

            if (items.length > 4) {
                if (jsp) {
                    jsp.reinitialise();
                }
                else {
                    $div.jScrollPane({animateScroll: true});
                }
            }
            else if (jsp) {
                jsp.destroy();
            }
        };

        var setTitle = function() {
            $('.fm-picker-dialog-title', $dialog)
                .text(
                    items.length < 2
                        ? l[19338]
                        : escapeHTML(l[19339]).replace('[x]', items.length)
                );
        };

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
        else {
            $('.summary-target-title', $dialog).text(l[19181]);

            if ($.onImportCopyNodes) {
                $('.summary-selected', $dialog).addClass('hidden');
            }
            else {
                $('.summary-selected', $dialog).removeClass('hidden');
            }

            if ($.copyToUpload) {
                items = $.copyToUploadData[0];

                for (var j = items.length; j--;) {
                    items[j].uuid = makeUUID();
                }
                setTitle();
            }
        }

        if (!single) {
            $div.addClass('unfold');
            $div.safeAppend('<div class="item-row-group"></div>');
            $div = $div.find('.item-row-group');
        }

        for (var i = 0; i < items.length; i++) {
            var h = items[i];
            var n = M.getNodeByHandle(h) || Object(h);
            var name = names[h] || M.getNameByHandle(h) || n.name;
            var tail = '<div class="delete-img icon"></div>';
            var icon = fileIcon(n);
            var data = n.uuid || h;

            if (single) {
                tail = '<span>(@@)</span>';
                if (items.length < 2) {
                    tail = '';
                }
            }

            $div.safeAppend(
                '<div class="item-row" data-node="@@">' +
                '    <div class="transfer-filetype-icon file @@"></div>' +
                '    <div class="summary-ff-name">@@</div> &nbsp; ' + tail +
                '</div>', data, icon, str_mtrunc(name, 42), String(l[10663]).replace('[X]', items.length - 1)
            );

            if (single) {
                break;
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
                $icon.addClass('drop-down-icon');
            }
            else {
                $icon.addClass('hidden');
            }
        }
        else {
            jScrollPane();
            $icon.addClass('drop-up-icon');

            $('.delete-img.icon', $div).rebind('click', function() {
                var $row = $(this).parent();
                var data = $row.attr('data-node');

                $row.remove();
                jScrollPane();

                if ($.copyToUpload) {
                    for (var i = items.length; i--;) {
                        if (items[i].uuid === data) {
                            items.splice(i, 1);
                            break;
                        }
                    }
                    setTitle();
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

        // reposition dialog in case we did hide selected-items (Ie. importing)
        dialogPositioning($dialog);
    };

    /**
     * Get the button label for the dialog's main action button
     * @returns {String}
     * @private
     */
    var getActionButtonLabel = function() {
        if ($.mcImport) {
            return l[236]; // Import
        }

        if ($.copyToShare || section === 'shared-with-me') {
            return l[1344]; // Share
        }

        if ($.copyToUpload) {
            return l[372]; // Upload
        }

        if (section === 'conversations') {
            return l[1940]; // Send
        }

        if ($.saveToDialog) {
            return l[776]; // Save
        }

        if ($.moveDialog) {
            return l[62]; // Move
        }

        return l[16176]; // Paste
    };

    /**
     * Get the dialog title based on operation
     * @returns {String}
     * @private
     */
    var getDialogTitle = function() {
        if ($.mcImport) {
            return l[236]; // Import
        }

        if ($.copyToShare) {
            return l[1344]; // Share
        }

        if ($.copyToUpload) {
            return l[372]; // Upload  - will be replaced later
        }

        if ($.saveToDialog) {
            return l[776]; // Save
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
     * @param {Boolean} allowConversationTab if true then it means show Conversation Tab
     */
    var handleConversationTabContent = function _handleConversationTabContent() {
        var myChats = megaChat.chats;
        var myContacts = M.getContactsEMails(true); // true to exclude requests (incoming and outgoing)
        var conversationTab = $('.fm-picker-dialog-tree-panel.conversations');
        var conversationNoConvTab = $('.dialog-empty-block.conversations');
        var conversationTabHeader = $('.fm-picker-dialog-panel-header', conversationTab);
        var contactsContentBlock = $('.dialog-content-block', conversationTab);
        if (myContacts && myContacts.length) {
            var contactGeneratedList = "";
            var ulListId = 'cpy-dlg-chat-' + u_handle;

            var createContactEntry = function _createContactEntry(name, email, handle) {
                if (name && handle && email) {
                    var contactElem = '<span id="cpy-dlg-chat-itm-spn-' + handle
                        + '" class="nw-contact-item single-contact ';
                    var contactStatus = 'offline';
                    if (M.d[handle] && M.d[handle].presence) {
                        contactStatus = M.onlineStatusClass(M.d[handle].presence)[1];
                    }
                    contactElem += contactStatus + '">';
                    contactElem += '<span class="nw-contact-status"></span>';
                    contactElem += '<span class="nw-contact-name">' + escapeHTML(name) + '</span>';
                    contactElem += '<span class="nw-contact-email">' + escapeHTML(email) + '</span>';
                    contactElem += '<span class="nw-contact-checkbox">' + '</span> </span>';
                    contactElem = '<li id="cpy-dlg-chat-itm-' + handle + '">' + contactElem + '</li>';
                    return contactElem;
                }
                else {
                    return '';
                }
            };
            var createGroupEntry = function _createGroupEntry(names, nb, handle) {
                if (names && names.length && nb && handle) {
                    var groupElem = '<span id="cpy-dlg-chat-itm-spn-' + handle
                        + '" class="nw-contact-item multi-contact">';
                    groupElem += '<span class="nw-contact-group-icon"></span>';
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
                    groupElem += '<span class="nw-contact-name group">' +
                        megaChat.plugins.emoticonsFilter.processHtmlMessage(escapeHTML(namesCombine)) +
                        '</span>';
                    groupElem += '<span class="nw-contact-group">' + nb + ' chat members </span>';
                    groupElem += '<span class="nw-contact-checkbox">' + '</span> </span>';
                    groupElem = '<li id="cpy-dlg-chat-itm-' + handle + '">' + groupElem + '</li>';
                    return groupElem;
                }
                else {
                    return '';
                }

            };
            var addedContactsByRecent = [];
            var top5 = 5; // defined in specs, top 5 contacts
            var nbOfRecent = 0;
            if (myChats && myChats.length) {
                var sortedChats = obj_values(myChats.toJS());
                sortedChats.sort(M.sortObjFn("lastActivity", -1));
                for (var chati = 0; chati < sortedChats.length; chati++) {
                    if (sortedChats[chati].isArchived()) {
                        continue;
                    }
                    if (sortedChats[chati].type === 'group') {
                        var gNames = [];
                        if (!sortedChats[chati].topic) {
                            ChatdIntegration._ensureNamesAreLoaded(sortedChats[chati].members);
                            for (var grHandle in sortedChats[chati].members) {
                                if (grHandle !== u_handle) {
                                    gNames.push(M.getNameByHandle(grHandle));
                                }
                            }
                        }
                        else {
                            gNames.push(sortedChats[chati].topic);
                        }
                        if (gNames.length) {
                            if (nbOfRecent < top5) {
                                var gElem = createGroupEntry(gNames,
                                    Object.keys(sortedChats[chati].members).length, sortedChats[chati].roomId);
                                contactGeneratedList = contactGeneratedList + gElem;
                            }
                            else {
                                myContacts.push({
                                    id: Object.keys(sortedChats[chati].members).length,
                                    name: gNames[0], handle: sortedChats[chati].roomId, isG: true,
                                    gMembers: gNames
                                });
                            }
                            nbOfRecent++;

                        }
                    }
                    else {
                        if (nbOfRecent < top5) {
                            var contactHandle;
                            for (var ctHandle in sortedChats[chati].members) {
                                if (ctHandle !== u_handle) {
                                    contactHandle = ctHandle;
                                    break;
                                }
                            }
                            if (contactHandle) {
                                if (M.u[contactHandle] && M.u[contactHandle].c === 1 && M.u[contactHandle].m) {
                                    addedContactsByRecent.push(contactHandle);
                                    var ctElemC = createContactEntry(M.getNameByHandle(contactHandle),
                                        M.u[contactHandle].m, contactHandle);
                                    contactGeneratedList = contactGeneratedList + ctElemC;
                                    nbOfRecent++;
                                }
                            }
                        }
                    }
                }
            }
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
                    ctElem = createGroupEntry(myContacts[a].gMembers, myContacts[a].id, myContacts[a].handle);
                }
                contactGeneratedList = contactGeneratedList + ctElem;
            }
            contactGeneratedList = '<ul id="' + ulListId + '">' + contactGeneratedList + '</ul>';
            contactsContentBlock.html(contactGeneratedList);
            conversationTab.addClass('active');
            conversationNoConvTab.removeClass('active');
            conversationTabHeader.removeClass('hidden');
        }
        else {
            conversationTab.removeClass('active');
            conversationNoConvTab.addClass('active');
            conversationTabHeader.addClass('hidden');
        }
    };

    /**
     * Handle DOM directly, no return value.
     * @param {String} dialogTabClass dialog tab class name.
     * @param {String} parentTag tag of source element.
     * @param {String} htmlContent html content.
     * @private
     */
    var handleDialogTabContent = function(dialogTabClass, parentTag, htmlContent) {
        var tabClass = '.' + dialogTabClass;
        var $tab = $('.fm-picker-dialog-tree-panel' + tabClass, $dialog);

        var html = String(htmlContent)
            .replace(/treea_/ig, 'mctreea_')
            .replace(/treesub_/ig, 'mctreesub_')
            .replace(/treeli_/ig, 'mctreeli_');

        $('.dialog-content-block', $tab).empty().safeHTML(html);

        if ($('.dialog-content-block ' + parentTag, $tab).children().length) {
            // Items available, hide empty message
            $('.dialog-empty-block', $dialog).removeClass('active');
            $('.fm-picker-dialog-panel-header', $tab).removeClass('hidden');
            $tab.addClass('active'); // TODO check why this was only here
        }
        else {
            // Empty message, no items available
            $('.dialog-empty-block' + tabClass, $dialog).addClass('active');
            $('.fm-picker-dialog-panel-header', $tab).addClass('hidden');
        }
    };

    /**
     * Build tree for a move/copy dialog.
     * @private
     */
    var buildDialogTree = function() {
        var $dpa = $('.fm-picker-dialog-panel-arrows', $dialog).removeClass('hidden');

        if (section === 'cloud-drive' || section === 'folder-link') {
            M.buildtree(M.d[M.RootID], 'fm-picker-dialog');
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

        if (!treesearch) {
            $('.fm-picker-dialog .nw-fm-tree-item').removeClass('expanded active opened selected');
            $('.fm-picker-dialog ul').removeClass('opened');
        }

        disableFolders();
        dialogScroll('.dialog-tree-panel-scroll');
        onIdle(function() {
            dialogScroll('.dialog-tree-panel-scroll');
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

        $('.dialog-sorting-menu', $dialog).addClass('hidden');
        $('.dialog-empty-block', $dialog).removeClass('active');
        $('.fm-picker-dialog-button', $dialog).removeClass('active');
        $('.fm-picker-dialog-tree-panel', $dialog).removeClass('active');
        $('.fm-picker-dialog-panel-arrows', $dialog).removeClass('active');

        // inherited dialog content...
        var html = section !== 'conversations' && $('.content-panel.' + section).html();

        // Action button label
        $('.dialog-picker-button', $dialog).text(buttonLabel);

        // if the site is initialized on the chat, $.selected may be `undefined`,
        // which may cause issues doing .length on it in dialogs.js, so lets define it as empty array
        // if is not def.
        $.selected = $.selected || [];

        // check if we will enable conversation tab
        var allowConversationTab = false;
        if ($.dialog === 'copy' && $.selected.length) {
            allowConversationTab = true;

            for (var i = $.selected.length; i--;) {
                var n = M.getNodeByHandle($.selected[i]);

                if (n.t !== 0) {
                    allowConversationTab = false;
                    break;
                }
            }
        }

        if (allowConversationTab) {
            $('.fm-picker-dialog-button.rubbish-bin', $dialog).addClass('hidden');
            $('.fm-picker-dialog-button.conversations', $dialog).removeClass('hidden');
        }
        else {
            $('.fm-picker-dialog-button.conversations', $dialog).addClass('hidden');
            $('.fm-picker-dialog-button.rubbish-bin', $dialog).removeClass('hidden');
        }

        if (!u_type || $.saveToDialog || $.copyToShare || $.copyToUpload || $.mcImport) {
            $('.fm-picker-dialog-button.rubbish-bin', $dialog).addClass('hidden');
            $('.fm-picker-dialog-button.conversations', $dialog).addClass('hidden');
        }

        if ($.copyToShare) {
            $('.fm-picker-dialog-button.shared-with-me', $dialog).addClass('hidden');
        }
        else {
            $('.fm-picker-dialog-button.shared-with-me', $dialog).removeClass('hidden');
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

        // If copying from contacts tab (Ie, sharing)
        if (section === 'cloud-drive' && M.currentrootid === 'contacts') {
            $('.fm-picker-dialog-title', $dialog).text(l[1344]);
            $('.dialog-newfolder-button', $dialog).addClass('hidden');
            $('.share-dialog-permissions', $dialog).removeClass('hidden')
                .rebind('click', function() {
                    var $btn = $(this);
                    var $menu = $('.permissions-menu', this.parentNode);
                    var $items = $('.permissions-menu-item', $menu);

                    $menu.removeAttr('style');

                    $items
                        .rebind('click', function() {
                            $items.off('click');

                            $items.removeClass('active');
                            $(this).addClass('active');
                            $btn.attr('class', 'share-dialog-permissions ' + this.classList[1])
                                .safeHTML('<span></span>' + $(this).text());
                            $menu.fadeOut(200);
                        });
                    $menu.fadeIn(200);
                });
        }
        else {
            $('.share-dialog-permissions', $dialog).addClass('hidden');
            $('.fm-picker-dialog-title', $dialog).text(getDialogTitle());
        }

        dialogPositioning($dialog);

        // Activate tab
        $('.fm-picker-dialog-button.' + section, $dialog).addClass('active');
    };

    /**
     * Handle opening dialogs and content
     * @param {String} aTab The section/tab to activate
     * @param {String} [aTarget] The target folder for the operation
     * @param {String} [aMode] Copy dialog mode (share, save, etc)
     */
    var handleOpenDialog = function(aTab, aTarget, aMode) {
        onIdle(function() {
            if (aMode) {
                $[aMode] = true;
            }
            $[$.dialog + 'Dialog'] = $.dialog;
            $('.search-bar input', $dialog).val('');
            handleDialogContent(typeof aTab === 'string' && aTab);
            setDialogBreadcrumb(aTab !== 'conversations' && aTarget);
            setDialogButtonState($('.dialog-picker-button', $dialog).addClass('active'));
            setSelectedItems(true);
        });

        $.hideContextMenu();
        dialogPositioning($dialog);
    };


    // ------------------------------------------------------------------------
    // ---- Public Functions --------------------------------------------------

    /**
     * Refresh copy/move dialog content with newly created directory.
     */
    global.refreshDialogContent = function refreshDialogContent() {
        var b = $('.content-panel.cloud-drive').html();

        if ($.copyDialog) {
            handleDialogTabContent('cloud-drive', 'ul', b);
        }
        else {
            handleDialogTabContent('cloud-drive', 'ul', b);
        }

        disableFolders($.moveDialog && 'move');
        dialogScroll('.dialog-tree-panel-scroll');
    };

    /**
     * A version of the Copy dialog used in the contacts page for sharing.
     * @param {String} [u_id] Share to contact handle.
     * @global
     */
    global.openCopyShareDialog = function openCopyShareDialog(u_id) {
        M.safeShowDialog('copy', function() {
            $.shareToContactId = u_id;
            handleOpenDialog('cloud-drive', false, 'copyToShare');
            return $dialog;
        });

        return false;
    };

    /**
     * A version of the Copy dialog used when uploading.
     * @param {Array} files The files being uploaded.
     * @param {Object} [emptyFolders] Empty folders to create hierarchy for.
     * @global
     */
    global.openCopyUploadDialog = function openCopyUploadDialog(files, emptyFolders) {
        M.safeShowDialog('copy', function() {
            $.copyToUploadData = [files, emptyFolders];
            var tab = M.currentrootid === 'shares' ? 'shared-with-me' : 'cloud-drive';
            handleOpenDialog(tab, M.currentdirid, 'copyToUpload');
            return $dialog;
        });

        return false;
    };

    /**
     * Generic function to open the Copy dialog.
     * @global
     */
    global.openCopyDialog = function openCopyDialog(activeTab) {
        M.safeShowDialog('copy', function() {
            handleOpenDialog(activeTab, M.RootID);
            return $dialog;
        });

        return false;
    };

    /**
     * Generic function to open the Move dialog.
     * @global
     */
    global.openMoveDialog = function openMoveDialog() {
        M.safeShowDialog('move', function() {
            handleOpenDialog(0, M.RootID);
            return $dialog;
        });

        return false;
    };

    /**
     * A version of the Copy dialog used for "Save to" in chat.
     * @global
     */
    global.openSaveToDialog = function openSaveToDialog(node, cb, activeTab) {
        M.safeShowDialog('copy', function() {
            $.saveToDialogCb = cb;
            $.saveToDialogNode = node;
            handleOpenDialog(activeTab, M.RootID, 'saveToDialog');
            return $dialog;
        });

        return false;
    };

    mBroadcaster.addListener('fm:initialized', function copyMoveDialogs() {
        if (folderlink) {
            return false;
        }

        $dialog = $('.fm-dialog.fm-picker-dialog');
        var $btn = $('.dialog-picker-button', $dialog);
        var $swm = $('.shared-with-me', $dialog);
        var dialogTooltipTimer;

        var treePanelHeader = document.querySelector('.fm-picker-dialog-panel-header');
        $('.fm-picker-dialog-tree-panel', $dialog).each(function(i, elm) {
            elm.insertBefore(treePanelHeader.cloneNode(true), elm.firstElementChild);
        });
        treePanelHeader.parentNode.removeChild(treePanelHeader);

        $('.fm-picker-dialog-tree-panel.conversations .fm-picker-dialog-panel-header span:first').text(l[17765]);

        $('.fm-dialog-close, .dialog-cancel-button', $dialog).rebind('click', closeDialog);

        $('.fm-picker-dialog-button', $dialog).rebind('click', function _(ev) {
            section = $(this).attr('class').split(" ")[1];

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
            $('.nw-fm-tree-item', $dialog).removeClass('selected');

            if ($.copyToShare) {
                setDialogBreadcrumb();
            }
            else if (section === 'cloud-drive' || section === 'folder-link') {
                setDialogBreadcrumb(M.RootID);
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

                var $menu = $('.dialog-sorting-menu', $dialog).removeClass('hidden');

                if (section === 'contacts') {
                    // Enable all menu items
                    $menu.find('.sorting-item-divider,.sorting-menu-item').removeClass('hidden');
                    $menu.find('*[data-by=label]').addClass('hidden');
                }
                else {
                    // Hide sort by status and last-interaction items from menu
                    $menu.find('*[data-by=status],*[data-by=last-interaction]').addClass('hidden');
                    $menu.find('*[data-by=label]').removeClass('hidden');
                }

                // @ToDo: Make sure .by is hadeled properly once when we have chat available

                // Copy dialog key only
                var key = $.dialog[0].toUpperCase() + $.dialog.substr(1) + section;

                // Check existance of previous sort options, direction (dir)
                if (localStorage['sort' + key + 'Dir']) {
                    $.sortTreePanel[key].dir = localStorage['sort' + key + 'Dir'];
                }
                else {
                    $.sortTreePanel[key].dir = 1;
                }

                // Check existance of previous sort option, ascending/descending (By)
                if (localStorage['sort' + key + 'By']) {
                    $.sortTreePanel[key].by = localStorage['sort' + key + 'By'];
                }
                else {
                    $.sortTreePanel[key].by = 'name';
                }

                // dir stands for direction i.e. [ascending, descending]
                $dialog.find('.dialog-sorting-menu .sorting-menu-item')
                    .removeClass('active')
                    .filter('*[data-by=' + $.sortTreePanel[key].by + '],*[data-dir=' + $.sortTreePanel[key].dir + ']')
                    .addClass('active');

                $self.addClass('active');
                $dialog.find('.dialog-sorting-menu').removeClass('hidden');
            }
            else {
                $self.removeClass('active');
                $dialog.find('.dialog-sorting-menu').addClass('hidden');
            }
        });

        $('.sorting-menu-item', $dialog).rebind('click', function() {
            var $self = $(this);

            if (!$self.hasClass('active')) {

                // Arbitrary element data
                var data = $self.data();
                var key = $.dialog[0].toUpperCase() + $.dialog.substr(1) + section;

                // Check arbitrary data associated with current menu item
                if (data.dir) {
                    localStorage['sort' + key + 'Dir'] = $.sortTreePanel[key].dir = data.dir;
                }
                if (data.by) {
                    localStorage['sort' + key + 'By'] = $.sortTreePanel[key].by = data.by;
                }

                buildDialogTree();

                // Disable previously selected
                $self.parent().find('.sorting-menu-item').removeClass('active');
                $self.addClass('active');
            }

            // Hide menu
            $('.dialog-sorting-menu', $dialog).addClass('hidden');
            $('.fm-picker-dialog-panel-arrows.active').removeClass('active');
        });

        $('.search-bar input', $dialog).rebind('keyup.dsb', function(ev) {
            var value = String($(this).val()).toLowerCase();
            var exit = ev.keyCode === 27 || !value;

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
                    dialogScroll('.dialog-tree-panel-scroll');
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

        $('.dialog-newfolder-button', $dialog).rebind('click', function() {
            $dialog.addClass('arrange-to-back');

            $.cfpromise = new MegaPromise();
            $.cftarget = $.mcselected || (section === 'cloud-drive' ? M.RootID : M.RubbishID);

            createFolderDialog();

            $('.fm-dialog.create-folder-dialog .create-folder-size-icon').addClass('hidden');

            // Auto-select the created folder.
            $.cfpromise.done(function(h) {
                var p = $.cftarget;
                selectTreeItem(p);
                selectTreeItem(h);
            });
        });

        $dialog.off('click', '.nw-contact-item');
        $dialog.on('click', '.nw-contact-item', function () {
            var $this = $(this);

            if ($this.hasClass('selected')) {
                $this.removeClass('selected');
            }
            else {
                $this.addClass('selected');
            }

            setDialogBreadcrumb();
            setDialogButtonState($btn);
            dialogScroll('.dialog-tree-panel-scroll');
        });

        $dialog.off('click', '.nw-fm-tree-item');
        $dialog.on('click', '.nw-fm-tree-item', function(e) {

            var ts = treesearch;
            var old = $.mcselected;

            setDialogBreadcrumb(String($(this).attr('id')).replace('mctreea_', ''));

            treesearch = false;
            M.buildtree({h: $.mcselected}, 'fm-picker-dialog');
            treesearch = ts;
            disableFolders();

            var c = $(e.target).attr('class');

            // Sub-folder exist?
            if (c && c.indexOf('nw-fm-arrow-icon') > -1) {

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

            // dialogScroll('.fm-picker-dialog-tree-panel .dialog-tree-panel-scroll');
            dialogScroll('.dialog-tree-panel-scroll');

            // Disable action button if there is no selected items
            setDialogButtonState($btn);

            // Set opened & expanded ancestors, only needed if element triggered.
            $(this).parentsUntil('.dialog-content-block', 'ul').addClass('opened')
                .prev('.nw-fm-tree-item').addClass('expanded');

            // Scroll the element into view, only needed if element triggered.
            var jsp = $(this).parents('.dialog-tree-panel-scroll').data('jsp');
            if (jsp) {
                jsp.scrollToElement($(this));
            }
        });

        $swm.off('mouseenter', '.nw-fm-tree-item');
        $swm.on('mouseenter', '.nw-fm-tree-item', function _try(ev) {
            var h = $(this).attr('id').replace('mctreea_', '');

            if (ev !== 0xEFAEE && !M.d[h]) {
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

            var $item = $(this).find('.nw-fm-tree-folder');
            var itemLeftPos = $item.offset().left;
            var itemTopPos = $item.offset().top;
            var $tooltip = $('.contact-preview', $dialog);
            var avatar = useravatar.contact(owner, '', 'div');
            var note = !share.level && !share.circular && l[19340];

            $tooltip.find('.contacts-info.body')
                .safeHTML(
                    avatar +
                    '<div class="user-card-data no-status">' +
                    '  <div class="user-card-name small">@@<span class="grey">(@@)</span></div>' +
                    '  <div class="user-card-email small">@@</div>' +
                    '  <div class="user-card-email small @@">@@</div>' +
                    '</div>', user.name || '', l[8664], user.m || '', note ? 'note' : '', note || ''
                );

            clearTimeout(dialogTooltipTimer);
            dialogTooltipTimer = setTimeout(function() {
                $tooltip.css({
                    'left': itemLeftPos + $item.outerWidth() / 2 - $tooltip.outerWidth() / 2 + 'px',
                    'top': (itemTopPos - (note ? 99 : 63)) + 'px'
                });
                $tooltip.fadeIn(200);
            }, 200);

            return false;
        });

        $swm.off('mouseleave', '.nw-fm-tree-item');
        $swm.on('mouseleave', '.nw-fm-tree-item', function() {

            var $tooltip = $('.contact-preview', $dialog);

            clearTimeout(dialogTooltipTimer);
            $tooltip.hide();

            return false;
        });

        // Handle conversations tab item selection
        $dialog.off('click', '.nw-conversations-item');
        $dialog.on('click', '.nw-conversations-item', function() {

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
            var selectedNodes = ($.selected || []).concat();

            // closeDialog would cleanup some $.* variables, so we need them cloned here
            var saveToDialogNode = $.saveToDialogNode;
            var saveToDialogCb = $.saveToDialogCb;
            var saveToDialog = $.saveToDialog;
            var shareToContactId = $.shareToContactId;
            delete $.saveToDialogPromise;

            if ($.copyToUpload) {
                var data = $.copyToUploadData;
                closeDialog();
                $.addUploadTarget = $.mcselected;
                M.addUpload(data[0], false, data[1]);
                return false;
            }

            if ($.moveDialog) {
                if (section === "shared-with-me") {
                    var $tooltip = $('.contact-preview', $dialog);
                    clearTimeout(dialogTooltipTimer);
                    $tooltip.hide();
                }
                closeDialog();
                M.safeMoveNodes($.mcselected);
                return false;
            }
            closeDialog();

            if (saveToDialog) {
                saveToDialogCb(saveToDialogNode, section === 'conversations' && chats || $.mcselected);
                return false;
            }

            // Get active tab
            if (section === 'cloud-drive' || section === 'folder-link' || section === 'rubbish-bin') {
                // If copying from contacts tab (Ie, sharing)
                if ($(this).text().trim() === l[1344]) {
                    var user = {
                        u: shareToContactId ? shareToContactId : M.currentdirid
                    };
                    var $sp = $('.share-dialog-permissions', $dialog);
                    if ($sp.hasClass('read-and-write')) {
                        user.r = 1;
                    }
                    else if ($sp.hasClass('full-access')) {
                        user.r = 2;
                    }
                    else {
                        user.r = 0;
                    }
                    doShare($.mcselected, [user], true);
                }
                else {
                    M.copyNodes(selectedNodes, $.mcselected);
                }
            }
            else if (section === 'shared-with-me') {
                M.copyNodes(getNonCircularNodes(selectedNodes), $.mcselected);
            }
            else if (section === 'conversations') {
                if (!window.megaChatIsReady) {
                    console.error('MEGAchat is not ready');
                }
                else {
                    var attachNodes = function(room) {
                        delay('copydialog:chatattachnodes', function() {
                            showToast('send-chat', (selectedNodes.length > 1) ? l[17767] : l[17766]);
                            M.openFolder('chat/' + (room.type === 'group' ? 'g/' : '') + room.roomId);
                        });
                        room.attachNodes(selectedNodes);
                    };

                    var openChat = function(roomId) {
                        if (megaChat.chats[roomId]) {
                            attachNodes(megaChat.chats[roomId]);
                        }
                        else {
                            var userHandles = [u_handle, roomId];
                            var result = megaChat.openChat(userHandles, "private");

                            if (result && result[1] && result[2]) {
                                var room = result[1];
                                var chatInitDonePromise = result[2];
                                chatInitDonePromise.done(function() {
                                    createTimeoutPromise(function() {
                                        return room.state === ChatRoom.STATE.READY;
                                    }, 300, 30000).done(function() {
                                        attachNodes(room);
                                    });
                                });
                            }
                            else if (d) {
                                console.warn('Cannot openChat for %s and hence nor attach nodes to it.', roomId);
                            }
                        }
                    };

                    for (var i = chats.length; i--;) {
                        openChat(chats[i]);
                    }
                }
            }

            delete $.onImportCopyNodes;
            return false;
        });

        return 0xDEAD;
    });

})(self);
