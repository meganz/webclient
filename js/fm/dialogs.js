(function _dialogs(global) {
    'use strict';

    // ------------------------------------------------------------------------
    // ---- Private Functions -------------------------------------------------

    /**
     * Find shared folders marked read-only and disable it in dialog.
     * @param {String} dialogName Dialog name i.e. { copy, move }.
     * @private
     */
    var disableReadOnlySharedFolders = function(dialogName) {
        var $ro = $('.' + dialogName + '-dialog-tree-panel.shared-with-me .dialog-content-block span[id^="mctreea_"]');
        var targets = $.selected || [];

        if (!$ro.length) {
            if ($('.' + dialogName + '-dialog-txt' + '.shared-with-me').hasClass('active')) {
                // disable import btn
                $('.dialog-' + dialogName + '-button').addClass('disabled');
            }
        }
        $ro.each(function(i, v) {
            var node = M.d[$(v).attr('id').replace('mctreea_', '')];

            while (node && !node.su) {
                node = M.d[node.p];
            }

            if (node) {
                for (i = targets.length; i--;) {
                    if (M.isCircular(node.h, targets[i])) {
                        node = null;
                        break;
                    }
                }
            }

            if (!node || !node.r) {
                $(v).addClass('disabled');
            }
        });
    };

    /**
     * Disable circular references and read-only shared folders.
     * @param {String} dialogPrefix dialog prefix i.e. { copy, move }.
     * @private
     */
    var disableFolders = function(dialogPrefix) {
        var promiseToSyncCalls = new MegaPromise();
        $('*[id^="mctreea_"]').removeClass('disabled');

        if (dialogPrefix === 'move') {
            M.disableCircularTargets('#mctreea_');
        }
        else {
            var sel = $.selected || [];

            for (var i = sel.length; i--;) {
                $('#mctreea_' + String(sel[i]).replace(/[^\w-]/g, '')).addClass('disabled');
            }
        }
        dbfetch.geta(Object.keys(M.c.shares || {}))
            .always(function () {
                disableReadOnlySharedFolders(dialogPrefix);
                promiseToSyncCalls.resolve();
            });
        return promiseToSyncCalls;
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
     * Set the dialog button state to either disabled or enabled
     * @param {Object} $btn The jQuery's node or selector
     */
    var setDialogButtonState = function($btn) {
        $btn = $($btn);

        // if we are using this dialog from contacts (means share with)
        // --> it does not mean anything to get selected since where choosing something to share from dialog itself
        if (!$('.fm-dialog.copy-dialog .share-dialog-permissions').hasClass('hidden')) {
            return;
        }

        if (!getNonCircularNodes().length && !$.onImportCopyNodes && !$.dialogIsChatSave) {
            $btn.addClass('disabled');
        }
        else {
            $btn.removeClass('disabled');
        }
    };



    /**
     * Getting contacts and view them in copy dialog
     * @param {Boolean} allowConversationTab if true then it means show Conversation Tab
     */
    var handleConversationTabContent = function _handleConversationTabContent() {
        var myChats = megaChat.chats;
        var myContacts = M.getContactsEMails(true); // true to exclude requests (incoming and outgoing)
        var conversationTab = $('.copy-dialog-tree-panel.conversations');
        var conversationNoConvTab = $('.dialog-empty-block.copy.conversations');
        var conversationTabHeader = $('.copy-dialog-panel-header', conversationTab);
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
                    contactElem += '<span class="nw-contact-email">' + escapeHTML(email) + '</span> </span>';
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
                    groupElem += '<span class="nw-contact-name group">' + escapeHTML(namesCombine) + '</span>';
                    groupElem += '<span class="nw-contact-group">' + nb + ' chat members</span> </span>';
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

    var checkContactHandler = function _checkContactHandler() {
        var conversationTab = $('.copy-dialog-tree-panel.conversations');
        var conversationTabHeader = $('.copy-dialog-panel-header', conversationTab);
        if (!conversationTabHeader.hasClass('hidden') && conversationTab.hasClass('active')) {
            handleConversationTabContent();
        }
    };

    /**
     * Handle DOM directly, no return value.
     * @param {String} dialogTabClass dialog tab class name.
     * @param {String} parentTag tag of source element.
     * @param {String} dialogPrefix dialog prefix i.e. { copy, move }.
     * @param {String} htmlContent html content.
     * @private
     */
    var handleDialogTabContent = function(dialogTabClass, parentTag, dialogPrefix, htmlContent) {
        var prefix = '.' + dialogPrefix;
        var tabClass = '.' + dialogTabClass;
        var html = String(htmlContent)
            .replace(/treea_/ig, 'mctreea_')
            .replace(/treesub_/ig, 'mctreesub_')
            .replace(/treeli_/ig, 'mctreeli_');

        $(prefix + '-dialog-tree-panel' + tabClass + ' .dialog-content-block').empty().safeHTML(html);

        // Empty message, no items available
        if (!$(prefix + '-dialog-tree-panel' + tabClass + ' .dialog-content-block ' + parentTag).children().length) {
            $(prefix + '.dialog-empty-block' + tabClass).addClass('active');
            $(prefix + '-dialog-tree-panel' + tabClass + ' ' + prefix + '-dialog-panel-header').addClass('hidden');
        }

        // Items available, hide empty message
        else {
            $(prefix + '-dialog-tree-panel' + tabClass).addClass('active');
            $(prefix + '-dialog-tree-panel' + tabClass + ' ' + prefix + '-dialog-panel-header').removeClass('hidden');
        }
    };

    /**
     * Build tree for a move/copy dialog.
     * @param {String} dialogPrefix i.e. [copy, move].
     * @param {String} dialogTabClass Dialog tab class name.
     * @private
     */
    var buildDialogTree = function (dialogPrefix, dialogTabClass) {
        $('.' + dialogPrefix + '-dialog-panel-arrows').removeClass('hidden');
        if (dialogTabClass === 'cloud-drive' || dialogTabClass === 'folder-link') {
            M.buildtree(M.d[M.RootID], dialogPrefix + '-dialog');
        }
        else if (dialogTabClass === 'shared-with-me') {
            M.buildtree({h: 'shares'}, dialogPrefix + '-dialog');
        }
        else if (dialogTabClass === 'rubish-bin') {
            M.buildtree({h: M.RubbishID}, dialogPrefix + '-dialog');
        }
        else if (dialogTabClass === 'conversations') {
            if (window.megaChatIsReady) {
                // prepare Conversation Tab if needed
                $('.' + dialogPrefix + '-dialog-panel-arrows').addClass('hidden');
                if (!$.copyDialogContactsChangeToken) {
                    $.copyDialogContactsChangeToken = M.u.addChangeListener(checkContactHandler);
                }
                handleConversationTabContent();
            }
            else {
                console.error('MEGAchat is not ready');
            }
        }

        disableFolders(dialogPrefix);
    };

    /**
     * Dialogs content  handler
     * @param {String} dialogTabClass Dialog tab class name.
     * @param {String} parentTag Tag that contains one menu-item.
     * @param {Boolean} newFolderButton Should we show new folder button.
     * @param {String} dialogPrefix i.e. [copy, move].
     * @param {String} buttonLabel Action button label.
     * @param {String} [convTab] In case of conversations tab.
     * @param {Boolean} isChatSave pass true for triggering the "Save to" logic
     * @private
     */
    var handleDialogContent = function(dialogTabClass, parentTag, newFolderButton,
                                       dialogPrefix, buttonLabel, convTab,
                                       isChatSave) {

        var html;
        $('.' + dialogPrefix + '-dialog-txt').removeClass('active');
        $('.' + dialogPrefix + '-dialog-button').removeClass('active');
        $('.' + dialogPrefix + '-dialog-tree-panel').removeClass('active');
        $('.' + dialogPrefix + '-dialog-panel-arrows').removeClass('active');
        $('.' + dialogPrefix + '-dialog .dialog-sorting-menu').addClass('hidden');
        $('.' + dialogPrefix + '.dialog-empty-block').removeClass('active');
        $.dialogIsChatSave = isChatSave;

        $('.dialog-' + dialogPrefix + '-button span').text(buttonLabel);

        // if the site is initialized on the chat, $.selected may be `undefined`,
        // which may cause issues doing .length on it in dialogs.js, so lets define it as empty array
        // if is not def.
        $.selected = $.selected || [];

        // Action button label
        var $btn = $('.dialog-' + dialogPrefix + '-button');

        // Disable/enable button
        // coming from contacts tab, and into sharing dlg.
        if (dialogTabClass === 'cloud-drive' && M.currentrootid === 'contacts') {
            $btn.removeClass('disabled');
        }
        else {
            setDialogButtonState($btn);
        }

        // Activate proper tab
        $('.' + dialogPrefix + '-dialog-txt' + '.' + dialogTabClass).addClass('active');

        // Added cause of conversations-container
        if (convTab) {
            html = $('.content-panel ' + convTab).html();
        }
        else {
            html = $('.content-panel' + '.' + dialogTabClass).html();
        }

        // check if we will enable conversation tab
        var allowConversationTab = $.dialogIsChatSave;
        if (!allowConversationTab && dialogPrefix.toLowerCase() === 'copy') {
            if ($.selected.length) {
                allowConversationTab = true;
                for (var e = 0; e < $.selected.length; e++) {
                    if (!M.d[$.selected[e]] || M.d[$.selected[e]].t !== 0) {
                        allowConversationTab = false;
                        break;
                    }
                }
            }
        }
        if (!allowConversationTab) {
            $('.copy-dialog-button.conversations').addClass('hidden');
            $('.fm-dialog-body').addClass('two-tabs');
        }
        else {
            $('.copy-dialog-button.conversations').removeClass('hidden');
            $('.fm-dialog-body').removeClass('two-tabs');
        }

        handleDialogTabContent(dialogTabClass, parentTag, dialogPrefix, html);

        buildDialogTree(dialogPrefix, dialogTabClass);

        // 'New Folder' button
        if (newFolderButton) {
            $('.dialog-newfolder-button').removeClass('hidden');
        }
        else {
            $('.dialog-newfolder-button').addClass('hidden');
        }

        // If copying from contacts tab (Ie, sharing)
        if (dialogTabClass === 'cloud-drive' && M.currentrootid === 'contacts') {
            $('.fm-dialog.copy-dialog .share-dialog-permissions').removeClass('hidden');
            $('.dialog-newfolder-button').addClass('hidden');
            $('.copy-operation-txt').text(l[1344]);

            $('.fm-dialog.copy-dialog .share-dialog-permissions')
                .rebind('click', function() {
                    var $btn = $(this);
                    var $menu = $('.permissions-menu', this.parentNode);
                    var $items = $('.permissions-menu-item', $menu);

                    $menu.removeAttr('style');

                    $items
                        .rebind('click', function() {
                            $items.unbind('click');

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
            $('.fm-dialog.copy-dialog .share-dialog-permissions').addClass('hidden');
            $('.copy-dialog-button').removeClass('hidden');
            $('.copy-operation-txt').text(buttonLabel === l[236] ? l[236] : l[63]);
        }

        $('.' + dialogPrefix + '-dialog .nw-fm-tree-item').removeClass('expanded active opened selected');
        $('.' + dialogPrefix + '-dialog ul').removeClass('opened');

        dialogPositioning('.fm-dialog' + '.' + dialogPrefix + '-dialog');

        dialogScroll('.dialog-tree-panel-scroll');

        // Activate tab
        $('.' + dialogPrefix + '-dialog-button' + '.' + dialogTabClass).addClass('active');
    };

    // ------------------------------------------------------------------------
    // ---- Public Functions --------------------------------------------------

    /**
     * Refresh copy/move dialog content with newly created directory.
     */
    global.refreshDialogContent = function refreshDialogContent() {
        var b = $('.content-panel.cloud-drive').html();

        if ($.copyDialog) {
            handleDialogTabContent('cloud-drive', 'ul', 'copy', b);
        }
        else {
            handleDialogTabContent('cloud-drive', 'ul', 'move', b);
        }

        disableFolders($.moveDialog && 'move');
        dialogScroll('.dialog-tree-panel-scroll');
    };

    /**
     * Close any open dialog
     * @name closeDialog
     * @global
     */
    // global.closeDialog = // todo

    /**
     * A version of the Copy dialog used in the contacts page for sharing.
     * @global
     */
    global.openCopyShareDialog = function openCopyShareDialog() {
        M.safeShowDialog('copy', function() {
            var $dialog = $('.fm-dialog.copy-dialog');
            $dialog.removeClass('hidden');

            $.copyDialog = 'copy';
            $.mcselected = undefined;
            $.copyToShare = true;

            handleDialogContent('cloud-drive', 'ul', true, 'copy', l[1344]);

            $.hideContextMenu();
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
            var $dialog = $('.fm-dialog.copy-dialog');

            $.copyDialog = 'copy';// this is used like identifier when key with key code 27 is pressed
            $.mcselected = M.RootID;

            $dialog.removeClass('hidden');
            $('.dialog-copy-button', $dialog).addClass('active');
            var aTab = 'cloud-drive';
            if (activeTab && typeof activeTab === 'string') {
                aTab = activeTab;
            }
            handleDialogContent(aTab, 'ul', (aTab === 'conversations') ? false : true,
                'copy', $.mcImport ? l[236] : (aTab === 'conversations' ? l[1940] : l[16176]));

            $.hideContextMenu();
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
            var $dialog = $('.fm-dialog.move-dialog');

            $.moveDialog = 'move';// this is used like identifier when key with key code 27 is pressed
            $.mcselected = M.RootID;

            $dialog.removeClass('hidden');
            handleDialogContent('cloud-drive', 'ul', true, 'move', l[62]);

            $.hideContextMenu();
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
            var $dialog = $('.fm-dialog.copy-dialog');

            $.copyDialog = 'copy';// this is used like identifier when key with key code 27 is pressed
            $.mcselected = M.RootID;

            $dialog.removeClass('hidden');
            $('.dialog-copy-button', $dialog).addClass('active');

            $.saveToDialogNode = node;
            $.saveToDialogCb = cb;

            var aTab = 'cloud-drive';
            if (activeTab && typeof activeTab === 'string') {
                aTab = activeTab;
            }

            handleDialogContent(
                aTab,
                'ul',
                (aTab === 'conversations') ? false : true,
                'copy',
                (aTab === 'conversations' ? l[1940] : l[776]),
                undefined,
                true
            );

            $.hideContextMenu();
            return $dialog;
        });

        return false;
    };

    mBroadcaster.addListener('fm:initialized', function copyMoveDialogs(mode) {
        if (folderlink) {
            return false;
        }

        var move = mode !== 'copy';
        var type = move ? 'move' : 'copy';
        var $dialog = $('.fm-dialog.' + type + '-dialog');
        var $btn = $('.dialog-' + type + '-button', $dialog);
        var $swm = $('.shared-with-me', $dialog);
        var dialogTooltipTimer;

        // Clears already selected sub-folders, and set selection to root
        var selectDialogTabRoot = function(section) {

            $('.nw-fm-tree-item', $dialog).removeClass('selected');

            if (section === 'cloud-drive' || section === 'folder-link') {
                $.mcselected = M.RootID;
            }
            else if (section === 'rubbish-bin') {
                $.mcselected = M.RubbishID;
            }
            else {
                $.mcselected = undefined;
            }

            // Disable/enable button
            setDialogButtonState($btn);
        };

        $('.fm-dialog-close, .dialog-cancel-button', $dialog).rebind('click', closeDialog);

        $('.' + type + '-dialog-button', $dialog).rebind('click', function() {

            if (!$(this).hasClass('active')) {

                var section = $(this).attr('class').split(" ")[1];
                selectDialogTabRoot(section);

                if (section === 'cloud-drive' || section === 'folder-link') {
                    handleDialogContent(
                        section,
                        'ul',
                        true,
                        type,
                        move ? l[62] : $.mcImport ? l[236] : $.dialogIsChatSave ? l[776] : l[16176],
                        undefined,
                        $.dialogIsChatSave
                    );
                }
                else if (section === 'shared-with-me') {
                    handleDialogContent(
                        section,
                        'ul',
                        false,
                        type,
                        $.mcImport ? l[236] : l[1344],
                        undefined,
                        $.dialogIsChatSave
                    ); // Share
                }
                else if (section === 'conversations' && window.megaChatIsReady) {
                    handleDialogContent(
                        section,
                        'div',
                        false,
                        type,
                        l[1940],
                        '.conversations-container',
                        $.dialogIsChatSave
                    ); // Send
                }
                else if (section === 'rubbish-bin') {
                    handleDialogContent(
                        section,
                        'ul',
                        false,
                        type,
                        l[62],
                        undefined,
                        $.dialogIsChatSave
                    ); // Move
                }
            }
        });

        /**
         * On click, copy dialog, dialog-sorting-menu will be shown.
         * Handles that valid informations about current sorting options
         * for selected tab of copy dialog are up to date.
         */
        $('.' + type + '-dialog-panel-arrows', $dialog).rebind('click', function() {
            var $self = $(this);

            if (!$self.hasClass('active')) {

                var $menu = $('.dialog-sorting-menu', $dialog).removeClass('hidden');
                var section = $('.fm-dialog-title .' + type + '-dialog-txt.active').attr('class').split(' ')[1];

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
                var key = type[0].toUpperCase() + type.substr(1) + section;

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
                var section = $('.fm-dialog-title .' + type + '-dialog-txt.active').attr('class').split(' ')[1];
                var key = type[0].toUpperCase() + type.substr(1) + section;

                // Check arbitrary data associated with current menu item
                if (data.dir) {
                    localStorage['sort' + key + 'Dir'] = $.sortTreePanel[key].dir = data.dir;
                }
                if (data.by) {
                    localStorage['sort' + key + 'By'] = $.sortTreePanel[key].by = data.by;
                }

                buildDialogTree(type, section);

                // Disable previously selected
                $self.parent().find('.sorting-menu-item').removeClass('active');
                $self.addClass('active');
            }

            // Hide menu
            $('.dialog-sorting-menu', $dialog).addClass('hidden');
            $('.' + type + '-dialog-panel-arrows.active').removeClass('active');
        });

        $('.dialog-newfolder-button', $dialog).rebind('click', function() {

            $dialog.addClass('arrange-to-back');

            var dest = $(this).parents('.fm-dialog').find('.active .nw-fm-tree-item.selected');
            if (dest.length) {
                $.cftarget = dest.attr('id').replace(/[^_]+_/, '');
            }
            else {
                /* No folder is selected, "New Folder" must create a new folder in Root */
                $.cftarget = M.RootID;
            }
            createFolderDialog();

            $('.fm-dialog.create-folder-dialog .create-folder-size-icon').addClass('hidden');
        });

        $dialog.off('click', '.nw-contact-item');
        $dialog.on('click', '.nw-contact-item', function () {
            $.mcselected = $(this).attr('id').replace('cpy-dlg-chat-itm-spn-', '');

            $('.nw-contact-item', $dialog).removeClass('selected');
            $(this).addClass('selected');
            dialogScroll('.dialog-tree-panel-scroll');
            setDialogButtonState($btn);
        });

        $dialog.off('click', '.nw-fm-tree-item');
        $dialog.on('click', '.nw-fm-tree-item', function(e) {

            var old = $.mcselected;
            var mySelf = this;

            $.mcselected = $(this).attr('id').replace('mctreea_', '');
            M.buildtree({h: $.mcselected});

            var markup = $('#treesub_' + $.mcselected).html();
            if (markup) {
                markup = markup
                    .replace(/treea_/ig, 'mctreea_')
                    .replace(/treesub_/ig, 'mctreesub_')
                    .replace(/treeli_/ig, 'mctreeli_');
                $('#mctreesub_' + $.mcselected).html(markup);
            }

            disableFolders(type).always(function () {
                var c = $(e.target).attr('class');

                // Sub-folder exist?
                if (c && c.indexOf('nw-fm-arrow-icon') > -1) {

                    c = $(mySelf).attr('class');

                    // Sub-folder expanded
                    if (c && c.indexOf('expanded') > -1) {
                        $(mySelf).removeClass('expanded');
                        $('#mctreesub_' + $.mcselected).removeClass('opened');
                    }
                    else {
                        $(mySelf).addClass('expanded');
                        $('#mctreesub_' + $.mcselected).addClass('opened');
                    }
                }
                else {

                    c = $(mySelf).attr('class');

                    if (c && c.indexOf('selected') > -1) {
                        if (c && c.indexOf('expanded') > -1) {
                            $(mySelf).removeClass('expanded');
                            $('#mctreesub_' + $.mcselected).removeClass('opened');
                        }
                        else {
                            $(mySelf).addClass('expanded');
                            $('#mctreesub_' + $.mcselected).addClass('opened');
                        }
                    }
                }

                if (!$(mySelf).is('.disabled')) {
                    // unselect previously selected item
                    $('.nw-fm-tree-item', $dialog).removeClass('selected');
                    $(mySelf).addClass('selected');
                    $btn.removeClass('disabled');
                }
                else if ($('#mctreea_' + old + ':visible').length) {
                    $.mcselected = old;
                    $('#mctreea_' + old).addClass('selected');
                }
                else {
                    $.mcselected = undefined;
                }

                // dialogScroll('.copy-dialog-tree-panel .dialog-tree-panel-scroll');
                dialogScroll('.dialog-tree-panel-scroll');

                // Disable action button if there is no selected items
                setDialogButtonState($btn);
            });

        });

        $swm.off('mouseenter', '.nw-fm-tree-item');
        $swm.on('mouseenter', '.nw-fm-tree-item', function _try(ev) {
            var sharedNodeHandle = $(this).attr('id').replace('mctreea_', '');

            if (ev !== 0xEFAEE && !M.d[sharedNodeHandle]) {
                var self = this;
                dbfetch.get(sharedNodeHandle).always(function() {
                    _try.call(self, 0xEFAEE);
                });
                return false;
            }

            var $item = $(this).find('.nw-fm-tree-folder');
            var itemLeftPos = $item.offset().left;
            var itemTopPos = $item.offset().top;
            var $tooltip = $('.contact-preview', $dialog);
            var ownerHandle = sharer(sharedNodeHandle);
            var ownerEmail = Object(M.u[ownerHandle]).m || '';
            var ownerName = Object(M.u[ownerHandle]).name || '';

            if (!(ownerEmail && ownerName)) {
                return false;
            }

            var html = useravatar.contact(ownerHandle, 'small-rounded-avatar', 'div') +
                '<div class="user-card-data no-status">' +
                '<div class="user-card-name small">' + htmlentities(ownerName) +
                ' <span class="grey">(' + l[8664] + ')</span></div>' +
                '<div class="user-card-email small">' + htmlentities(ownerEmail) +
                '</div></div>';

            $tooltip.find('.contacts-info.body').safeHTML(html);

            clearTimeout(dialogTooltipTimer);
            dialogTooltipTimer = setTimeout(function() {
                $tooltip.css({
                    'left': itemLeftPos + $item.outerWidth() / 2 - $tooltip.outerWidth() / 2 + 'px',
                    'top': itemTopPos - 63 + 'px'
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

            $.mcselected = $(this).attr('id').replace('contact2_', '');

            // unselect previously selected item
            $('.nw-conversations-item', $dialog).removeClass('selected');
            $(this).addClass('selected');
            $btn.removeClass('disabled');

            // Disable action button if there is no selected items
            setDialogButtonState($btn);
        });

        // Handle copy/move/share button action
        $btn.rebind('click', function() {

            if (!$.mcselected || $(this).hasClass('disabled')) {
                return false;
            }
            var selectedNodes = ($.selected || []).concat();

            // closeDialog would cleanup some $.* variables, so we need them cloned here
            var saveToDialogNode = $.saveToDialogNode;
            var saveToDialogCb = $.saveToDialogCb;
            var dialogIsChatSave = $.dialogIsChatSave;

            closeDialog();

            if (move) {
                M.safeMoveNodes($.mcselected);
                return false;
            }

            // Get active tab
            var section = $('.fm-dialog-title .copy-dialog-txt.active').attr('class').split(" ")[1];
            if (section === 'cloud-drive' || section === 'folder-link') {
                // If copying from contacts tab (Ie, sharing)
                if ($(this).text().trim() === l[1344]) {
                    var user = {
                        u: M.currentdirid
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
                else if (dialogIsChatSave) {
                    saveToDialogCb(saveToDialogNode, $.mcselected);
                    saveToDialogCb = saveToDialogNode = dialogIsChatSave = undefined;
                }
                else {
                    M.copyNodes(getNonCircularNodes(selectedNodes), $.mcselected);
                }
            }
            else if (section === 'shared-with-me') {
                if (dialogIsChatSave) {
                    saveToDialogCb(saveToDialogNode, $.mcselected);
                    saveToDialogCb = saveToDialogNode = dialogIsChatSave = undefined;
                }
                else {
                    M.copyNodes(getNonCircularNodes(selectedNodes), $.mcselected);
                }
            }
            else if (section === 'conversations') {
                if (!window.megaChatIsReady) {
                    console.error('MEGAchat is not ready');
                }
                else if (megaChat.chats[$.mcselected]) {
                    if (dialogIsChatSave) {
                        saveToDialogCb(saveToDialogNode, $.mcselected, true);
                        saveToDialogCb = saveToDialogNode = dialogIsChatSave = undefined;
                    }
                    else {
                        megaChat.chats[$.mcselected].attachNodes($.selected); // 17766 // 17767
                        showToast('send-chat', ($.selected.length > 1) ? l[17767] : l[17766]);
                    }
                }
                else {
                    var userHandles = [u_handle, $.mcselected];
                    var result = megaChat.openChat(
                        userHandles,
                        "private",
                        undefined,
                        undefined,
                        undefined,
                        false
                    );

                    if (result && result[1] && result[2]) {
                        var room = result[1];
                        var chatInitDonePromise = result[2];
                        chatInitDonePromise.done(function() {
                            createTimeoutPromise(function() {
                                return room.state === ChatRoom.STATE.READY;
                            }, 300, 30000)
                                .done(function() {
                                    room.attachNodes(selectedNodes);
                                    showToast('send-chat', (selectedNodes.length > 1) ? l[17767] : l[17766]);
                                });
                        });
                    }
                }
            }

            delete $.onImportCopyNodes;
            return false;
        });

        if (move) {
            copyMoveDialogs('copy');
        }

        return 0xDEAD;
    });

})(self);
