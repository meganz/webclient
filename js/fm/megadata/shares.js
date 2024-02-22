/**
 * Initializes Shares UI.
 */
MegaData.prototype.sharesUI = function() {
    "use strict";

    $('.shares-tab-lnk').rebind('click', function() {
        var $this = $(this);
        var folder = escapeHTML($this.attr('data-folder'));

        M.openFolder(folder);
    });
};

/**
 * Open the share dialog
 */
MegaData.prototype.openSharingDialog = function(target) {
    'use strict';

    if (M.isInvalidUserStatus()) {
        return;
    }
    if (u_type === 0) {
        return ephemeralDialog(l[1006]);
    }

    var $dialog = $('.mega-dialog.share-dialog');

    $('.fm-dialog-overlay').rebind('click.closeShareDLG', function() {
        // When click the overlay, only close the share dialog if the lost changes warning dialog isn't there.
        if ($.dialog === 'share' && $('.mega-dialog.confirmation:not(.hidden)').length === 0) {
            showLoseChangesWarning().done(closeDialog);
            return false;
        }
    });

    $(window).rebind('keydown.closeShareDLG', function(e) {
        // When press the Esc key, only close the share dialog if the lost changes warning dialog isn't there.
        if (e.keyCode === 27 && $.dialog === 'share' && $('.mega-dialog.confirmation:not(.hidden)').length === 0) {
            showLoseChangesWarning().done(closeDialog);
            return false;
        }
    });

    var showShareDlg = function() {
        const scl = mBroadcaster.addListener('statechange', () => {

            if ($.dialog === 'fingerprint-dialog') {
                closeDialog();
            }

            if ($.dialog === 'share-add') {
                $('.cancel-add-share').trigger('click');
            }

            console.assert($.dialog === 'share');
            closeDialog();
        });

        $dialog.rebind('dialog-closed.share', () => {
            $dialog.off('dialog-closed.share');

            mBroadcaster.removeListener(scl);
            mega.keyMgr.removeShareSnapshot(target);
        });

        $.hideContextMenu();

        $.addContactsToShare = {};// GLOBAL VARIABLE, add contacts to a share
        $.changedPermissions = {};// GLOBAL VARIABLE, changed permissions shared dialog
        $.removedContactsFromShare = {};// GLOBAL VARIABLE, removed contacts from a share
        $.shareDialog = 'share';

        // @todo refactor!
        // eslint-disable-next-line no-use-before-define
        fillShareDlg(target).catch(dump);

        // Show the share dialog
        return $dialog.removeClass('hidden');
    };

    const fillShareDlg = async(h) => {
        if (!M.d[h]) {
            await dbfetch.get(h);
        }
        const {shares, name, td, tf} = M.getNodeByHandle(h);
        assert(name);

        var shareKeys = Object.keys(shares || {});

        // Temporary condition till all MIME icons are vector
        // $('.item-type-icon', $dialog).attr('class', `item-type-icon sprite-fm-uni icon-${folderIcon}-90`);
        $('.item-type-icon', $dialog).attr('class', `item-type-icon medium-file-icon ${fileIcon(M.d[h])}`);

        // This is shared folder, not just folder link
        if (shares && !(shares.EXP && shareKeys.length === 1) || M.ps[h]) {
            $('.remove-share', $dialog).removeClass('disabled');
        }
        else {
            $('.remove-share', $dialog).addClass('disabled');
        }

        // Fill the shared folder's name
        const $folderName = $('.share-dialog-folder-name', $dialog)
            .text(name)
            .removeClass('simpletip')
            .removeAttr('data-simpletip')
            .removeAttr('data-simpletipposition');

        if ($folderName.get(0).offsetWidth < $folderName.get(0).scrollWidth) {
            $folderName
                .addClass('simpletip')
                .attr('data-simpletip', name)
                .attr('data-simpletipposition', 'top');
        }

        // Fill the shared folder's info
        $('.share-dialog-folder-info', $dialog).text(fm_contains(tf, td, false));

        // Render the content of access list in share dialog
        renderShareDialogAccessList();

        return $dialog;
    };

    Promise.resolve(mega.fileRequestCommon.storage.isDropExist(target))
        .then((res) => {
            if (res.length) {
                return mega.fileRequest.showRemoveWarning(res);
            }
        })
        .then(() => mega.keyMgr.setShareSnapshot(target))
        .then(() => M.safeShowDialog('share', showShareDlg))
        .catch(dump);
};

/**
 * Initializes the share dialog to add more people
 *
 * @param {array} alreadyAddedContacts  exclude contacts array
 */
MegaData.prototype.initShareAddDialog = function(alreadyAddedContacts, $extraContent) {
    "use strict";

    // If chat is not ready.
    if (!megaChatIsReady) {
        if (megaChatIsDisabled) {
            console.error('Mega Chat is disabled, cannot proceed');
        }
        else {
            // Waiting for chat_initialized broadcaster.
            loadingDialog.show();
            mBroadcaster.once('chat_initialized',
                              this.initShareAddDialog.bind(this, alreadyAddedContacts, $extraContent));
        }
        return false;
    }

    loadingDialog.hide();

    var dialogPlacer = document.createElement('div');
    $.contactPickerSelected = alreadyAddedContacts; // Global variable for the selected item from the contacts picker

    var closeShareAddDialog = function() {
        closeDialog();

        ReactDOM.unmountComponentAtNode(dialogPlacer);
        dialogPlacer.remove();

        fm_showoverlay();
        renderShareDialogAccessList();
    };

    // Detect the new added contact whether in the remove list or not
    var notRmContacts = function(handle) {
        if (handle !== undefined && $.removedContactsFromShare[handle]) {
            delete $.removedContactsFromShare[handle];
            return false;
        }
        return true;
    };

    var $shareAddDialog = $extraContent;
    $('.add-share', $shareAddDialog).addClass('disabled');

    $('.cancel-add-share', $shareAddDialog).rebind('click', function() {
        closeShareAddDialog();
    });

    $('.add-share', $shareAddDialog).rebind('click', function() {
        // Add more people to share
        if (!$(this).hasClass('disabled') && !$(this).parents('.share-add-dialog').is('.error')) {
            loadingDialog.pshow();

            var addedContacts = $.contactPickerSelected.filter(function(item) {
                return alreadyAddedContacts.indexOf(item) === -1;
            });

            var removedContacts = alreadyAddedContacts.filter(function(item) {
                return $.contactPickerSelected.indexOf(item) === -1;
            });

            // Is there any existing contacts from the picker list planned for adding to share
            addedContacts.forEach(function(item) {
                if (notRmContacts(item)) {
                    $.addContactsToShare[item] = {
                        u: M.getUserByHandle(item).m,
                        r: 1
                    };
                }
            });

            // Is there any existing contacts from the picker list planned for removing from share
            removedContacts.forEach(function(item) {
                if ($.addContactsToShare[item]) {
                    delete $.addContactsToShare[item];
                }
                else {
                    $.removedContactsFromShare[item] = {
                        'selectedNodeHandle': $.selected[0],
                        'userEmailOrHandle': item,
                        'userHandle': item
                    };
                }
            });

            // Is there any new contacts planned for adding to share
            var $newContacts = $('.token-input-list-mega .token-input-token-mega', $shareAddDialog);
            if ($newContacts.length) {
                var emailText = $('.share-message textarea', $shareAddDialog).val();
                if (emailText === '') {
                    emailText = l[17738];
                }

                for (var i = 0; i < $newContacts.length; i++) {
                    var newContactEmail = $($newContacts[i]).contents().eq(1).text();
                    var newContactHandle = M.findOutgoingPendingContactIdByEmail(newContactEmail)
                        || '#new_' + MurmurHash3(newContactEmail);
                    if (notRmContacts(newContactHandle)) {
                        $.addContactsToShare[newContactHandle] = {
                            u: newContactEmail,
                            r: 1,
                            msg: emailText
                        };
                    }
                }
            }

            loadingDialog.phide();
            closeShareAddDialog();
        }

        return false;
    });

    var extraContentDidMount = function() {
        // Initializes the component of adding new contacts to share
        M.initAddByEmailComponent(alreadyAddedContacts);
        onIdle(() => {
            $('.contacts-search-header input', '.mega-dialog.share-add-dialog .share-add-dialog-top').focus();
        });
    };

    var prop = {
        className: 'mega-dialog share-add-dialog',
        pickerClassName: 'share-add-dialog-top',
        customDialogTitle: l[23710],
        selected: alreadyAddedContacts,
        showSelectedNum: true,
        disableFrequents: true,
        notSearchInEmails: false,
        autoFocusSearchField: false,
        selectCleanSearchRes: false,
        disableDoubleClick: true,
        selectedWidthSize: 62,
        emptySelectionMsg: l[23751],
        newEmptySearchResult: true,
        newNoContact: true,
        highlightSearchValue: true,
        closeDlgOnClickOverlay: false,
        emailTooltips: true,
        extraContent: $extraContent[0],
        onExtraContentDidMount: extraContentDidMount,
        onSelected: function(nodes) {
            $.contactPickerSelected = nodes;

            var $shareAddDialog = $('.mega-dialog.share-add-dialog');

            // Control the add button enable / disable
            if (JSON.stringify(clone($.contactPickerSelected).sort()) === JSON.stringify(alreadyAddedContacts.sort())
                && $('.token-input-list-mega .token-input-token-mega', $shareAddDialog).length === 0) {
                $('.add-share', $shareAddDialog).addClass('disabled');
            }
            else {
                $('.add-share', $shareAddDialog).removeClass('disabled');

                var $rmContacts = alreadyAddedContacts.filter(uHandle => !$.contactPickerSelected.includes(uHandle));
                for (var i = 0; i < $rmContacts.length; i++) {
                    // Remove it from multi-input tokens
                    var sharedIndex = $.sharedTokens.indexOf(M.getUserByHandle($rmContacts[i]).m || '');
                    if (sharedIndex > -1) {
                        $.sharedTokens.splice(sharedIndex, 1);
                    }
                }
            }
        },
        onClose: function() {
            closeShareAddDialog();
        }
    };

    // Render the add more people share dialog from reactjs
    var dialog = React.createElement(StartGroupChatDialogUI.StartGroupChatWizard, prop);
    ReactDOM.render(dialog, dialogPlacer);

    M.safeShowDialog('share-add', $('.mega-dialog.share-add-dialog'));
};

/**
 * Initializes the component of adding new contacts to the shared folder in the share add dialog.
 *
 * @param {array} alreadyAddedContacts  Array of already added contacts
 */
MegaData.prototype.initAddByEmailComponent = function(alreadyAddedContacts) {
    'use strict';

    var $shareAddDialog = $('.mega-dialog.share-add-dialog');

    // Hide the personal message by default. This gets triggered when a new contact is added
    $('.share-message', $shareAddDialog).addClass('hidden');

    // Clear text area message
    $('.share-message textarea', $shareAddDialog).val('');

    // Update drop down list / token input details
    initShareDialogMultiInput(alreadyAddedContacts);

    $('.multiple-input .token-input-token-mega', $shareAddDialog).remove();
    initPerfectScrollbar($('.multiple-input', $shareAddDialog));

    // Personal message
    $('.share-message textarea', $shareAddDialog).rebind('focus', function() {
        $('.share-message', $shareAddDialog).addClass('focused');
    });

    $('.share-message textarea', $shareAddDialog).rebind('keypress', function(e) {
        e.stopPropagation();
    });

    $('.share-message textarea', $shareAddDialog).rebind('blur', function() {
        $('.share-message', $shareAddDialog).removeClass('focused');
    });
};

/**
 * Return tooltip label for undecripted node depending on node type and shared or owned
 * @param {Object} node The current node.
 */
MegaData.prototype.getUndecryptedLabel = function(node) {
    'use strict';

    const isShared = M.getNodeRoot(node.p) !== M.RootID;

    if (node.t) {
        return isShared ? l[8595] : l.undecryptable_folder_tooltip;
    }
    return isShared ? l[8602] : l.undecryptable_file_tooltip;
};
