/**
 * addNewContact
 *
 * User adding new contact/s from add contact dialog.
 * @param {String} $addBtnClass, contact dialog add button class, i.e. .add-user-popup-button.
 * @param {Boolean} cd close dialog or not. default: true
 */
function addNewContact($addButton, cd) {

    var mailNum;
    var msg;
    var title;
    var email;
    var emailText;
    var $mails;
    var $textarea = $('textarea', $addButton.parents('.mega-dialog'));
    var promise = new MegaPromise();
    cd = cd === undefined ? true : cd;

    // Add button is enabled
    if (!$addButton.hasClass('disabled')) {

        // Check user type
        if (u_type === 0) {
            ephemeralDialog(l[997]);
            promise.resolve();
        }
        else {
            var promises = [];
            var addedEmails = [];

            loadingDialog.pshow();

            // Custom text message
            emailText = $textarea.val();

            if (emailText === '' || emailText === l[6853]) {
                emailText = l[17738];
            }

            // List of email address planned for addition
            $mails = $('.token-input-list-mega .token-input-token-mega');

            mailNum = $mails.length;

            // temp array to hold emails of current contacts to exclude from inviting.
            // note: didn't use "getContactsEMails()" to optimize memory usage, since the returned array
            // there is bigger (contains: email, name, handle, type)

            var currentContactsEmails = [];

            var pushAsAddedEmails = function() {
                if (!currentContactsEmails.includes(email) && !M.findOutgoingPendingContactIdByEmail(email)) {
                    // if invitation is sent, push as added Emails.
                    promises.push(
                        M.inviteContact(M.u[u_handle].m, email, emailText).then((res) => addedEmails.push(res))
                    );
                }
            };

            M.u.forEach(function(contact) {
                // Active contacts with email set
                if (contact.c === 1 && contact.m) {
                    currentContactsEmails.push(contact.m);
                }
            });

            if (mailNum) {
                // Loop through new email list
                $mails.each(function(index, value) {
                    // Extract email addresses one by one
                    email = $(value).contents().eq(1).text();

                    pushAsAddedEmails();
                });
            }

            if ($.dialog === 'share' && Object.keys($.addContactsToShare).length > 0) {
                // Invite new contacts to share
                for (var i in $.addContactsToShare) {
                    email = $.addContactsToShare[i].u;
                    emailText = $.addContactsToShare[i].msg;

                    pushAsAddedEmails();
                }
            }

            // after all process is done, and there is added email(s), show invitation sent dialog.
            Promise.allSettled(promises).always(() => {
                const shareFolderName = $.dialog === 'share'
                    && $('.share-dialog-folder-name', '.mega-dialog.share-dialog').text();

                if (addedEmails.length > 0) {
                    title = mega.icu.format(l.contacts_invited_title, addedEmails.length);
                    msg = addedEmails.length === 1 ? l[5898] : l[5899];
                    contactsInfoDialog(title, addedEmails[0], msg);
                }
                else {
                    cd = false;
                }

                if (cd) {
                    closeDialog();
                    $('.token-input-token-mega').remove();
                }

                loadingDialog.phide();

                if (shareFolderName) {
                    showToast('view', l.share_folder_toast.replace('%1', shareFolderName));
                }

                promise.resolve();
            });
        }
    }
    else {
        promise.reject();
    }

    return promise;
}

/**
 * sharedUInode
 *
 * Handle shared/export link icons in Cloud Drive
 * @param {String} nodeHandle selected node id
 * @param {*} [force] no delay
 */
// eslint-disable-next-line complexity
function sharedUInode(nodeHandle, force) {
    'use strict';

    if (!fminitialized) {
        return;
    }

    if (!force) {
        return delay(`sharedUInode:${nodeHandle}`, () => sharedUInode(nodeHandle, true), 666);
    }

    var oShares;
    var bExportLink = false;
    var bAvailShares = false;
    var UiExportLink = new mega.UI.Share.ExportLink();
    var share = new mega.Share();
    var target;
    const iconSize = M.onIconView ? 90 : 24;
    const iconSpriteClass = `item-type-icon${M.onIconView ? '-90' : ''}`;

    // Is there a full share or pending share available
    if ((M.d[nodeHandle] && M.d[nodeHandle].shares) || M.ps[nodeHandle]) {

        // Contains full shares and/or export link
        oShares = M.d[nodeHandle] && M.d[nodeHandle].shares;

        // Do we have export link for selected node?
        if (oShares && oShares.EXP) {

            UiExportLink.addExportLinkIcon(nodeHandle);

            // Item is taken down, make sure that user is informed
            if (oShares.EXP.down === 1) {
                UiExportLink.addTakenDownIcon(nodeHandle);
            }

            bExportLink = true;
        }

        // Add share icon in left panel for selected node only if we have full or pending share
        // Don't show share icon when we have export link only
        if (share.isShareExist([nodeHandle], true, true, false)) {

            // Left panel
            target = document.querySelector('#treea_' + nodeHandle + ' .nw-fm-tree-folder');

            if (target) {
                target.classList.add('shared-folder');
            }

            bAvailShares = true;
        }
    }

    // t === 1, folder
    if (M.d[nodeHandle] && M.d[nodeHandle].t) {

        target = document.getElementById(nodeHandle);

        if (target) {
            // Update right panel selected node with appropriate icon
            target = target.querySelector(`.${iconSpriteClass}`);

            if (target) {
                target.className = `${iconSpriteClass} icon-${fileIcon(M.d[nodeHandle])}-${iconSize} folder`;
            }
        }
    }

    // If no shares are available, remove share icon from left panel, right panel (list and block view)
    if (!bAvailShares) {

        // Left panel
        target = document.querySelector('#treea_' + nodeHandle + ' .nw-fm-tree-folder');

        if (target) {
            target.classList.remove('shared-folder');
        }

        target = document.getElementById(nodeHandle);

        if (target) {
            // Right panel
            target = target.querySelector(`.${iconSpriteClass}`);

            if (target) {
                target.classList.replace((`icon-folder-outgoing-${iconSize}`), `icon-folder-${iconSize}`);
            }
        }

        if (window.selectionManager) {
            // Remove the share node selection on incoming and outgoing shares pages
            if (nodeHandle !== undefined && (M.currentdirid === 'out-shares' || M.currentdirid === 'shares')
                || !M.getNodeRoot(nodeHandle) && M.search
            ) {
                selectionManager.remove_from_selection(nodeHandle);
            }
            else if (selectionManager.selected_list.includes(nodeHandle)) {
                selectionManager.updateSelectionNotification();
            }
        }
    }
    else if (window.selectionManager && selectionManager.selected_list.includes(nodeHandle)) {
        selectionManager.updateSelectionNotification();
    }

    // If no export link is available, remove export link from left and right panels (list and block view)
    if (!bExportLink) {
        UiExportLink.removeExportLinkIcon(nodeHandle);
    }

    if (M.recentsRender) {
        M.recentsRender.nodeChanged(nodeHandle);
    }

    if (mega.devices.ui) {
        mega.devices.ui.onUpdateSharedNode(nodeHandle);
    }
    if (mega.ui.secondaryNav) {
        mega.ui.secondaryNav.updateCard(nodeHandle);
    }
}

/**
 * initAddDialogInputPlugin
 */
function initAddDialogMultiInputPlugin() {

    // Plugin configuration
    var contacts = M.getContactsEMails();
    var $this  = $('.add-contact-multiple-input');
    var $scope = $this.closest('.add-user-popup');
    var $addButton = $('.add-user-popup-button', $scope);
    var $addButtonSpan = $('span', $addButton);

    $this.tokenInput(contacts, {
        theme: 'mega',
        placeholder: l[19108],// Enter one or more email address
        searchingText: '',
        noResultsText: '',
        addAvatar: true,
        autocomplete: null,
        searchDropdown: true,
        emailCheck: true,
        preventDoublet: true,
        tokenValue: 'id',
        propertyToSearch: 'id',
        resultsLimit: 5,
        // Prevent showing of drop down list with contacts email addresses
        // Max allowed email address is 254 chars
        minChars: 255,
        accountHolder: (M.u[u_handle] || {}).m || '',
        scrollLocation: 'add',
        // Exclude from dropdownlist only emails/names which exists in multi-input (tokens)
        excludeCurrent: false,
        tokenLimit: 500,
        onEmailCheck: function() {
            errorMsg(l[7415]);
        },
        onDoublet: function(u, iType) {
            $addButton.addClass('hidden');
            if (iType === 'opc') {
                errorMsg(l[17545]);
            }
            else if (iType === 'ipc') {
                errorMsg(l[17546]);
            }
            else {
                errorMsg(l[7413]);
            }
        },
        onHolder: function() {
            errorMsg(l[7414]);
        },
        onReady: function() {
            var $input = $this.parent().find('li input').eq(0);

            $input.rebind('keyup', function() {
                var value = $.trim($input.val());
                var emailList = value.split(/[ ;,]+/);
                var itemNum = $scope.find('.share-added-contact').length;

                if (isValidEmail(value)) {
                    itemNum = itemNum + 1;
                }

                if (itemNum > 0) {
                    $addButtonSpan.text(mega.icu.format(l[19113], itemNum));
                    $addButton.removeClass('hidden');
                }
                else {
                    $addButton.addClass('hidden');
                }

            });
        },
        onAdd: function() {
            var $inputTokens = $scope.find('.share-added-contact');
            var itemNum = $inputTokens.length;

            if (itemNum === 0) {
                $addButton.addClass('hidden');
            }
            else {
                var $multiInput = $scope.find('.multiple-input');

                $addButtonSpan.text(mega.icu.format(l[19113], itemNum));
                $addButton.removeClass('hidden');
            }
        },
        onDelete: function() {
            var $inputTokens = $scope.find('.token-input-list-mega .token-input-token-mega');
            var itemNum;

            setTimeout(function() {
                $inputTokens.find('input').trigger("blur");
            }, 0);

            // Get number of emails
            itemNum = $inputTokens.length;

            if (itemNum === 0) {
                $addButton.addClass('hidden');
            }
            else {
                $addButtonSpan.text(mega.icu.format(l[19113], itemNum));
                $addButton.removeClass('hidden');
            }
        }
    });

    /**
     * errorMsg
     *
     * Show error popup next to multi input box in case that email is wrong.
     * @param {String} msg, error message.
     */
    function errorMsg(msg) {

        var $addUserPopup = $('.add-user-popup'),
            $warning = $addUserPopup.find('.multiple-input-warning span');

        $warning.text(msg);
        $addUserPopup.addClass('error');

        setTimeout(function() {
            $addUserPopup.removeClass('error');
        }, 3000);
    }
}

/**
 * contactsInfoDialog
 *
 * Handle add new contact dialog UI
 * @param {String} title Dialog title
 * @param {String} username User name/email
 * @param {String} msg Dialog message
 * @param {Boolean} close Dialog parameter
 */
function contactsInfoDialog(title, username, msg, close) {
    'use strict';

    var $d = $('.mega-dialog.contact-info');
    var $msg = $('.new-contact-info', $d);

    // Hide
    if (close) {
        closeDialog();
        return true;
    }

    if (title) {
        $('#contact-info-title', $d).text(title);
    }
    else {
        $('#contact-info-title', $d).text('');
    }

    if (username && msg) {
        $msg.safeHTML(msg.replace(/%1|\[X\]/g, '<span>' + username + '</span>'));
    }
    else if (msg) {
        $msg.text(msg);
    }

    $('button.js-close, button.ok', $d).rebind('click', function() {
        contactsInfoDialog(undefined, undefined, undefined, 1);
    });

    // Set dialog name - used in overall closeDialog() logic
    $.contactInfoDialog = 'contact-info';

    M.safeShowDialog('contact-info', $d);
}

/**
 * setContactLink
 *
 * Set public link and init CopyToClipboard events
 * @param {Node|jQuery} [$container] optional container node, used to scope the `public-contact-link`
 * @returns {undefined|Boolean}
 */
function setContactLink($container) {
    "use strict";

    var $publicLink = $container ? $('.public-contact-link', $container) : $('.public-contact-link:visible');
    // multiple link data may exists!
    var linkData = $publicLink.attr('data-lnk');
    var account = M.account || false;
    var contactPrefix = '';

    // Exit if link exists
    if (!$publicLink.length || linkData) {
        return false;
    }

    // Check data exists in M.account
    if (account.contactLink && account.contactLink.length) {
        contactPrefix =  M.account.contactLink.match('^C!') ? '' : 'C!';
        $publicLink.attr('data-lnk', 'https://mega.nz/' + contactPrefix + M.account.contactLink);
    }
    else {
        api.send('clc')
            .then((res) => {
                if (typeof res === 'string') {
                    contactPrefix = res.match('^C!') ? '' : 'C!';
                    res = 'https://mega.nz/' + contactPrefix + res;
                    $publicLink.attr('data-lnk', res);
                    mBroadcaster.sendMessage('contact:setContactLink', res);
                }
            })
            .catch(tell);
    }

    $publicLink.rebind('mouseout.publiclnk', function() {
        $('.dropdown.tooltip.small')
            .removeClass('visible')
            .addClass('hidden');
    });

    $publicLink.rebind('click.publiclnk', function() {
        var linkData = $(this).attr('data-lnk') || '';

        if (linkData.length) {
            copyToClipboard(linkData, `${l[371]}<span class="link-text">${linkData}</span>`);
        }
    });
}

/**Show Contact VS User difference dialog */
function contactVsUserDialog() {
    "use strict";
    var $dialog = $('.add-reassign-dialog.user-management-dialog');

    $('.dif-dlg-contact-add-btn', $dialog).rebind('click.dlg', function addContactClickHandler() {
        closeDialog();
        return contactAddDialog(null, true);
    });

    $('button.js-close', $dialog).rebind('click.dlg', function closeClickHandler() {
        return closeDialog();
    });

    $dialog.find('.dif-dlg-user-add-btn').rebind('click.dlg', function addUserClickHandler() {
        closeDialog();
        if (!u_attr || !u_attr.b || !u_attr.b.m || u_attr.b.s === -1) {
            return false;
        }

        window.triggerShowAddSubUserDialog = true;
        M.openFolder('user-management', true);

    });

    M.safeShowDialog('contact-vs-user', $dialog);
}

/**
 * addContactUI
 *
 * Handle add contact dialog UI
 * @param {Boolean} close               dialog parameter
 * @param {Boolean} dontWarnBusiness    if true, then proceed to show the dialog
 */
function contactAddDialog(close, dontWarnBusiness) {
    'use strict';

    var $d = $('.add-user-popup');

    // not for ephemeral
    if (!u_type) {
        return;
    }

    // Hide
    if (close) {
        closeDialog();
        return true;
    }
    if (M.chat && $.dialog === 'onboardingDialog') {
        closeDialog();
    }

    // Check if this is a business master, then Warn him about the difference between Contact and User
    if (!dontWarnBusiness) {
        if (u_attr && u_attr.b && u_attr.b.m && u_attr.b.s !== -1) {
            return contactVsUserDialog();
        }
    }

    // Init default states
    $.sharedTokens = [];
    $d.removeClass('private achievements');

    M.safeShowDialog('add-user-popup', $d);

    setContactLink($d);

    var $textarea = $d.find('.add-user-textarea textarea');

    mega.achievem.enabled().done(function () {
        $d.addClass('achievements');
    });

    $textarea.val('');
    $d.find('.multiple-input .token-input-token-mega').remove();

    initPerfectScrollbar($('.multiple-input', $d));

    Soon(function() {
        $('.add-contact-multiple-input input', $d).trigger("focus");
    });

    $('.add-user-popup-button span', $d).text(mega.icu.format(l[19113], 1));
    $('.add-user-popup-button', $d).addClass('hidden');

    if (u_attr && u_attr.b) {
        $('.hidden-achievement-info', $d).addClass('hidden');
    }
    else {
        $('.hidden-achievement-info', $d).removeClass('hidden');
    }

    initTextareaScrolling($textarea);
    $('input.add-contact-multiple-input', $d).trigger("focus");
    focusOnInput();

    $d.find('.hidden-textarea-info span').rebind('click', function() {
        $d.addClass('private');
        $('.add-user-textarea textarea', $d).focus();
    });

    function focusOnInput() {
        var $tokenInput = $('#token-input-');

        $tokenInput.trigger("focus");
    }

    $('.add-user-notification textarea').rebind('focus.add-user-n', function() {
        $('.add-user-notification').addClass('focused');
    });

    $('.add-user-notification textarea').rebind('blur.add-user-n', function() {
        $('.add-user-notification').removeClass('focused');
    });

    if (!$('.add-contact-multiple-input').tokenInput("getSettings")) {
        initAddDialogMultiInputPlugin();
    }

    $('.add-user-popup-button').rebind('click', function() {
        addNewContact($(this));
    });

    $('.add-user-popup button.js-close').rebind('click', function() {
        showLoseChangesWarning().done(closeDialog);
    });
}

function ephemeralDialog(msg) {

    msgDialog('confirmation', l[998], msg + ' ' + l[999], l[1000], function(e) {
        if (e) {
            loadSubPage('register');
        }
    });
}

function fmtopUI() {
    "use strict";

    var $sharesTabBlock = $('.shares-tabs-bl');
    var $galleryTabBlock = $('.gallery-tabs-bl');
    const $galleryTabLink = $('.gallery-tab-lnk');
    const $header = $('.fm-right-header', '.fmholder');

    let primary = false;
    let secondary = false;
    let contextMenuItem = false;

    const id = String(M.currentdirid || '').split('/').pop();
    if (mega.rewind
        && M.getSelectedSourceRoot() === M.RootID
        && M.currentrootid === M.RootID
        && !pfid && M.onDeviceCenter !== M.RootID
    ) {
        contextMenuItem = id;
    }

    const $rewindNotifBanner =
        $('.fm-notification-block.new-feature-rewind-notification', '.fm-right-files-block');
    $rewindNotifBanner.addClass('hidden');

    $('.shares-tab-lnk.active', $sharesTabBlock).removeClass('active');
    $('.gallery-tab-lnk.active', $galleryTabBlock).removeClass('active');

    $('.fm-s4-settings, .fm-s4-new-bucket, .fm-s4-new-key, .fm-s4-new-user, .fm-s4-new-group', $header)
        .addClass('hidden');

    if (M.currentrootid !== 'shares' && !M.onDeviceCenter) {
        mega.ui.secondaryNav.hideCard();
        mega.ui.secondaryNav.hideActionButtons();
    }
    mega.ui.secondaryNav.updateLayoutButton(
        M.currentdirid === 'shares' ||
        M.currentdirid === 'out-shares' ||
        M.currentdirid === 'file-requests'
    );
    mega.ui.secondaryNav.updateInfoPanelButton(id && M.d[id] && M.d[id].t);
    mega.ui.secondaryNav.showBreadcrumb();
    $('.fm-right-files-block').removeClass('visible-notification rubbish-bin');

    const isSearchResult = String(M.currentdirid).substring(0, 6) === 'search';
    if (M.currentrootid === M.RubbishID) {
        if (M.v.length) {
            primary = '.fm-clearbin-button';
        }

        if (mega.config.get('dsmRubRwd')) {
            $rewindNotifBanner.addClass('hidden');
        }
        else {
            $rewindNotifBanner.removeClass('hidden');
            delay('rubbish-bin:rewind-prom', () => eventlog(500530, true), 4e3);

            $('.fm-notification-close', $rewindNotifBanner).rebind('click.rewindnotifbanner', () => {
                eventlog(500529);
                mega.config.set('dsmRubRwd', 1);
                $rewindNotifBanner.addClass('hidden');
            });

            $('.learn-more a', $rewindNotifBanner).rebind('click.rnb-lm', () => eventlog(500528));
        }

        $('.fm-right-files-block').addClass('rubbish-bin visible-notification');
    }
    else {
        if (M.currentrootid === M.InboxID) {
            if (d) {
                console.log('Inbox');
            }
        }
        else if (M.isDynPage(M.currentdirid)) {
            $('.fm-right-files-block').addClass('visible-notification');
        }
        else if (M.currentrootid === 'shares') {

            M.sharesUI();
            $sharesTabBlock.removeClass('hidden');
            $sharesTabBlock.find('.in-shares').addClass('active');
            $('.fm-right-files-block').addClass('visible-notification');

            if (M.currentdirid !== 'shares' && !M.d[M.currentdirid].su) {
                if (M.getNodeRights(M.currentdirid) > 0) {
                    primary = '.fm-new-menu';
                    secondary = '.fm-download';
                }
                else {
                    primary = '.fm-download';
                }
                contextMenuItem = contextMenuItem || M.currentdirid;
            }
            else if (M.currentdirid !== 'shares') {
                mega.ui.secondaryNav.hideBreadcrumb();
            }
        }
        else if (M.currentrootid === 'out-shares') {

            M.sharesUI();
            $sharesTabBlock.removeClass('hidden');
            $('.out-shares', $sharesTabBlock).addClass('active');
            $('.fm-right-files-block').addClass('visible-notification');

            if (M.currentdirid === M.currentrootid) {
                primary = '.fm-new-shared-folder';
                mega.ui.secondaryNav.hideBreadcrumb();
            }
            else if (M.getNodeShareUsers(M.d[M.currentdirid.replace('out-shares/', '')], 'EXP').length) {
                primary = '.fm-new-menu';
                secondary = '.fm-manage-share-folder';
                contextMenuItem = contextMenuItem || id;
            }
            else {
                primary = '.fm-new-menu';
                contextMenuItem = contextMenuItem || id;
            }
        }
        else if (M.currentrootid === 'public-links') {

            M.sharesUI();
            $sharesTabBlock.removeClass('hidden');
            $('.public-links', $sharesTabBlock).addClass('active');
            $('.fm-right-files-block').addClass('visible-notification');

            if (M.currentdirid === M.currentrootid) {
                primary = '.fm-new-link';
                mega.ui.secondaryNav.hideBreadcrumb();
            }
            else {
                primary = '.fm-new-menu';
                secondary = '.fm-manage-link';
                contextMenuItem = contextMenuItem || id;
            }
        }
        else if (M.currentrootid === 'file-requests') {
            M.sharesUI();
            $sharesTabBlock.removeClass('hidden');
            $('.file-requests', $sharesTabBlock).addClass('active');
            $('.fm-right-files-block', document).addClass('visible-notification');

            if (M.currentdirid === M.currentrootid) {
                primary = '.fm-new-file-request';
                mega.ui.secondaryNav.hideBreadcrumb();
            }
            else {
                primary = '.fm-new-menu';
                secondary = mega.fileRequest.storage.getPuHandleByNodeHandle(id) ? '.fm-manage-file-request' : false;
                contextMenuItem = contextMenuItem || id;
            }
        }
        else if (M.isGalleryPage()) {
            $galleryTabBlock.removeClass('hidden');

            if (M.currentdirid === 'favourites') {
                $galleryTabLink.addClass('hidden');
            }
            else {
                $galleryTabLink.removeClass('hidden');
            }

            if (mega.gallery[M.currentdirid]) {
                $('.gallery-tab-lnk', $galleryTabBlock).removeClass('active');
                $(`.gallery-tab-lnk-${mega.gallery[M.currentdirid].mode}`, $galleryTabBlock).addClass('active');
            }
        }
        else if (M.currentrootid === 's4' && M.currentCustomView) {
            const {subType, original, nodeID, containerID} = M.currentCustomView;
            mega.ui.secondaryNav.updateLayoutButton(!subType.startsWith('bucket'));
            if (subType === 'container') {
                primary = '.fm-s4-new-bucket';
                secondary = '.fm-s4-settings';
            }
            else if (subType === 'bucket') {
                if (M.d[nodeID].p === containerID) {
                    mega.ui.secondaryNav.showCard(
                        nodeID,
                        {
                            text: l.add_item_btn,
                            icon: 'sprite-fm-mono icon-plus-light-solid',
                            id: `newctx_${nodeID}`,
                            onClick: (ev) => {
                                mega.ui.secondaryNav.openNewMenu(ev);
                            }
                        },
                        {
                            text: l.s4_bkt_settings,
                            onClick: () => {
                                s4.ui.showDialog(s4.buckets.dialogs.settings, s4.ui.bucket);
                                eventlog(500745);
                            }
                        },
                        (ev) => {
                            mega.ui.secondaryNav.openContextMenu(ev);
                        }
                    );
                }
                else {
                    primary = '.fm-new-menu';
                    contextMenuItem = contextMenuItem || nodeID;
                }
            }
            else if (subType === 'keys') {
                primary = '.fm-s4-new-key';
            }
            else if (subType === 'policies') {
            }
            else if (subType === 'users') {
                if (original.endsWith('users')) {
                    primary = '.fm-s4-new-user';
                }
            }
            else if (subType === 'groups') {
                if (original.endsWith('groups')) {
                    primary = '.fm-s4-new-group';
                }
            }
            $('.fm-right-files-block').addClass('visible-notification');
        }
        else if (M.onDeviceCenter) {
            if (M.currentdirid === M.currentrootid && mega.devices.ui.hasDevices && mega.devices.ui.isCustomRender()) {
                primary = '.fm-add-backup';
                secondary = '.fm-add-syncs';
            }
            if (mega.devices.ui.isCustomRender()) {
                mega.ui.secondaryNav.updateLayoutButton(true);
            }
            else {
                const h = M.currentCustomView.nodeID;
                const { device } = mega.devices.ui.getCurrentDirData();
                const isBackup = mega.devices.ui.isBackupRelated(h);
                if (device && !device.folders[h]) {
                    primary = isBackup ? '.fm-share-folder' : '.fm-new-menu';
                    secondary = isBackup ? false : '.fm-share-folder';
                    contextMenuItem = contextMenuItem || h;
                }
            }

            $('.fm-right-files-block', document).addClass('visible-notification');
            mega.devices.ui.handleAddBtnVisibility();
        }
        else if (String(M.currentdirid).length === 8
            && M.getNodeRights(M.currentdirid) > 0) {

            $('.fm-right-files-block').addClass('visible-notification');
            primary = '.fm-new-menu';
            secondary = M.currentdirid === M.RootID ? false : '.fm-share-folder';
            contextMenuItem = contextMenuItem || id;
        }
        else if (folderlink) {
            primary = '.fm-import-to-cloudrive';
            secondary = '.fm-download';
        }
        else if (isSearchResult) {
            mega.ui.secondaryNav.hideBreadcrumb();
        }
    }
    $('.fm-clearbin-button').rebind('click', function() {
        if (M.isInvalidUserStatus()) {
            return;
        }

        doClearbin(true);
        eventlog(500740);
    });

    if (M.currentrootid === 'file-requests') {
        mega.fileRequest.rebindTopMenuCreateIcon();
    }
    $.tresizer();

    if (isSearchResult) {
        return;
    }
    // do not call when isSearchResult
    mega.ui.secondaryNav.showActionButtons(primary, secondary, contextMenuItem);
}

/**
 * Function to init Left Pane scrolling in FM/Settings/Dashboard
 */
function initTreeScroll() {

    "use strict";

    var treeClass = 'js-myfiles-panel';
    var scrollBlock;

    if (folderlink || !mega.ui.topmenu.activeItem) {
        treeClass = 'js-other-tree-panel';

        $('.js-other-tree-panel .section-title')
            .text(
                folderlink
                    ? (pfcol ? l.shared_album : l.folderlink_lp_title)
                    : l[24682]
            );
    }

    scrollBlock = document.getElementsByClassName(treeClass).item(0);

    if (!scrollBlock || scrollBlock.classList.contains('hidden')) {
        return false;
    }

    if (scrollBlock.classList.contains('ps')) {
        Ps.update(scrollBlock);
    }
    else {
        Ps.initialize(scrollBlock);
    }
}

function doClearbin(all) {
    "use strict";

    msgDialog('clear-bin', l[14], l[15], l[1007], function(e) {

        if (e) {
            M.clearRubbish(all).catch(dump);
        }
    });
}

/**
 * To show the password reset link / the account closure link sent dialog, and its related event handlers
 * @param {String} dialogText   The main message displays in the dialog
 * @param {String} dlgString    The dialog name
 * @returns {void}
 */
function handleResetSuccessDialogs(dialogText, dlgString) {
    'use strict';

    const $resetSuccessDlg = $('.mega-dialog.reset-success');

    $('.reset-success-title', $resetSuccessDlg)
        .text(dlgString === 'deleteaccount' ? l.ac_closure_link_sent : l.pwd_link_sent);
    $('.reset-email-success-txt', $resetSuccessDlg).safeHTML(dialogText);

    $('a.try-again, button.js-close, button.ok-btn', $resetSuccessDlg).rebind('click.close-dlg', () => {
        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');
        $resetSuccessDlg.addClass('hidden');
        delete $.dialog;
    });

    $('.fm-dialog-overlay').removeClass('hidden');
    $('body').addClass('overlayed');
    $resetSuccessDlg.removeClass('hidden');
    $.dialog = dlgString;
}

function avatarDialog(close) {
    'use strict';

    var $dialog = $('.mega-dialog.avatar-dialog');

    if (close) {
        closeDialog();
        return true;
    }

    M.safeShowDialog('avatar', $dialog);

    $('.avatar-body').safeHTML(
        `<div id="avatarcrop">
            <div class="image-upload-and-crop-container">
                <div class="image-explorer-container empty">
                    <div class="image-explorer-image-view">
                        <img class="image-explorer-source" />
                        <div class="image-explorer-mask circle-mask"></div>
                        <div class="image-explorer-drag-delegate"></div>
                    </div>
                <div class="zoom-slider-wrap">
                    <i class="zoom-out sprite-fm-theme icon-image-zoom-out simpletip" data-simpletip="${l[24927]}">
                    </i>
                    <div class="zoom-slider disabled"></div>
                    <i class="zoom-in sprite-fm-theme icon-image-zoom-in simpletip" data-simpletip="${l[24928]}">
                    </i>
                </div>
                    <input type="file" id="image-upload-and-crop-upload-field" class="image-upload-field"
                        accept="image/jpeg, image/gif, image/png" />
                </div>
            </div>
        </div>`);
    $('.avatar-footer').safeHTML(
        `<button class="mega-button cancel-avatar" id="fm-cancel-avatar">
            <span>@@</span>
        </button>
        <div>
            <label for="image-upload-and-crop-upload-field">
                <button class="mega-button image-upload-field-replacement select-avatar">
                    <span>@@</span>
                </button>
            </label>
            <button class="mega-button positive change-avatar" id="fm-change-avatar">
                <span>@@</span>
            </button>
            <button class="mega-button negative remove-avatar" id="fm-remove-avatar">
                <span>@@</span>
            </button>
        </div>`,
        l[82],
        l[1016],
        l[1017],
        l[6974]
    );
    $('#fm-change-avatar').hide();
    $('#fm-cancel-avatar').hide();
    $('#fm-remove-avatar').hide();

    mega.attr.get(u_handle, 'a', true, false)
        .fail()
        .done(function(res) {
            if (res !== null && res !== undefined && res !== "none"){
                $('#fm-remove-avatar').show();
            }
        });

    var imageCrop = new ImageUploadAndCrop($("#avatarcrop").find('.image-upload-and-crop-container'),
        {
            cropButton: $('#fm-change-avatar'),
            dragDropUploadPrompt:l[1390],
            outputFormat: 'image/jpeg',
            onCrop: function(croppedDataURI)
            {
                if (croppedDataURI.length > 64 * 1024) {
                    return msgDialog('warninga', l[8645], l[8646]);
                }
                var data = dataURLToAB(croppedDataURI);

                mega.attr.set('a', ab_to_base64(data), true, false);
                useravatar.setUserAvatar(u_handle, data, this.outputFormat);

                // Update mega.io about the new avatar change
                initMegaIoIframe(true);

                $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle, '', 'div', false));
                $('.fm-avatar').safeHTML(useravatar.contact(u_handle));
                avatarDialog(1);
            },
            onImageUpload: function()
            {
                $('#fm-change-avatar').show();
                $('#fm-cancel-avatar').show();
                $('#fm-remove-avatar').hide();
            },
            onImageUploadError: function()
            {

            }
        });
    $('#fm-cancel-avatar,.mega-dialog.avatar-dialog button.js-close').rebind('click', function() {
        avatarDialog(1);
    });

    $('#fm-remove-avatar').rebind('click', function() {
        msgDialog('confirmation', 'confirm-remove-avatar', l[18699], l[6973], function(response) {
            if (response){
                mega.attr.set('a', "none", true, false);

                // Update mega.io about the new avatar change
                initMegaIoIframe(true);

                avatarDialog(1);
            }
        });
    });

    $('.select-avatar', $dialog).rebind('click', function() {
        $(this).parent('label').trigger('click');
    });
}


/**
 * Really simple shortcut logic for select all, copy, paste, delete
 * Note: there is another key binding on initUIKeyEvents() for filemanager.
 *
 * @constructor
 */
function FMShortcuts() {
    'use strict';
    var current_operation = null;
    mBroadcaster.addListener('crossTab:fms!cut/copy', ev => (current_operation = ev.data));

    $(window).rebind('keydown.fmshortcuts', function(e) {
        var isShareRoot = false;
        if (
            !is_fm() ||
            !selectionManager ||
            M.currentrootid === 'chat' || // prevent shortcut for chat
            M.currentrootid === undefined || // prevent shortcut for file transfer, dashboard, settings
            M.isAlbumsPage() ||
            (M.isGalleryPage() && mega.gallery.photos && mega.gallery.photos.mode !== 'a') ||
            (M.isMediaDiscoveryPage() && mega.gallery.discovery && mega.gallery.discovery.mode !== 'a')
        ) {
            return true;
        }
        else if (M.currentdirid === 'shares') {
            isShareRoot = true;
        }

        e = e || window.event;

        // DO NOT start the search in case that the user is typing something in a form field... (eg.g. contacts -> add
        // contact field)
        if ($(e.target).is("input, textarea, select") || $.dialog) {
            return;
        }

        var charCode = e.which || e.keyCode; // ff
        var charTyped = String.fromCharCode(charCode).toLowerCase();

        if (charTyped === "a" && (e.ctrlKey || e.metaKey)) {
            if (typeof selectionManager != 'undefined' && selectionManager) {
                selectionManager.select_all();
            }
            return false; // stop prop.
        }
        else if (
            (charTyped === "c" || charTyped === "x") &&
            (e.ctrlKey || e.metaKey) &&
            !isShareRoot &&
            !M.gallery &&
            !M.albums
        ) {
            var items = clone(selectionManager.get_selected());
            if (items.length === 0) {
                return; // dont do anything.
            }

            current_operation = {
                'op': charTyped == "c" ? 'copy' : 'cut',
                'dir': M.currentdirid,
                'src': items
            };
            delay('crossTab:fms!cut/copy', () => {
                mBroadcaster.crossTab.notify('fms!cut/copy', current_operation);
            });

            return false; // stop prop.
        }
        else if (
            charTyped === "v" &&
            (e.ctrlKey || e.metaKey) &&
            !isShareRoot &&
            !M.gallery &&
            !M.albums
        ) {
            if (!current_operation || (M.getNodeRights(M.currentdirid || '') | 0) < 1) {
                return false; // stop prop.
            }

            let {src: handles, op, dir} = current_operation;
            op = op === 'cut' && dir === M.currentdirid ? 'copy' : op;

            if (op === "copy") {
                M.copyNodes(handles, M.currentdirid).catch((ex) => ex !== EBLOCKED && tell(ex));
            }
            else if (op === "cut") {
                M.moveNodes(handles, M.currentdirid).catch(tell);
                current_operation = null;
            }

            return false; // stop prop.
        }
        else if (
            charCode === 8 &&
            !isShareRoot &&
            !M.gallery &&
            !M.albums
        ) {
            if (M.isInvalidUserStatus() || $.msgDialog === 'remove') {
                return;
            }

            var remItems = selectionManager.get_selected();
            if (remItems.length === 0 || (M.getNodeRights(M.currentdirid || '') | 0) < 2 ||
                M.currentrootid === M.InboxID) {
                return; // dont do anything.
            }

            fmremove(remItems, e.ctrlKey || e.metaKey);

            return false;
        }
    });
}



function fm_addhtml() {
    'use strict';

    var elm = document.getElementById('fmholder');
    if (elm) {
        if (!elm.textContent) {
            $(elm).safeHTML(translate(String(pages.fm).replace(/{staticpath}/g, staticpath)));
        }

        if (!document.getElementById('invoicePdfPrinter')) {
            elm = document.querySelector('.invoice-container');
            if (elm && elm.parentNode) {
                elm.parentNode.insertBefore(mCreateElement('iframe', {
                    type: 'content',
                    'class': 'hidden',
                    src: 'about:blank',
                    id: 'invoicePdfPrinter'
                }), elm);
            }
        }
    }
    else {
        console.error('fmholder container not found...');
    }
}

function fm_hideoverlay() {
    "use strict";

    if (!$.propertiesDialog) {
        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');
    }
    $(document).trigger('MegaCloseDialog');
}

function fm_showoverlay() {
    "use strict";

    $('.fm-dialog-overlay').removeClass('hidden');

    $('body').addClass('overlayed');
}

/**
 * Search for an existing node name
 * @param {String} value New file/folder name
 * @param {String} [target] Target folder to check for duplication. If not provided, M.v will be used.
 * @returns {Boolean} Whether it does exist.
 */
function duplicated(value, target) {
    "use strict";
    if (!target) {
        return M.v.some((n) => n.name === value);
    }

    if (M.c[target]) {
        for (const handle in M.c[target]) {
            if (M.d[handle] && M.d[handle].name === value) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Helper to handle validation of Input elements tied to floating warnings.
 * e.g. leading/trailing (LT) white-spaces warning message lifecycle
 * @param {Object} $container Element having input to check
 * @param {Object} [options] the
 * @constructor
 */
function InputFloatWarning($container, options) {
    "use strict";

    if (!(this instanceof InputFloatWarning)) {
        return new InputFloatWarning($container, options);
    }

    this.$container = $container;
    this.id = `IFW.${makeUUID()}`;

    this.options = Object.assign({
        namespace: 'whitespaces'
    }, options);

    /**
     * Show warning
     * @param {String} msg Message to show
     * @returns {InputFloatWarning} this instance
     */
    this.show = (msg) => {
        $(`.${this.options.namespace}-input-warning span`, this.$container).text(msg);
        this.$container.addClass(this.options.namespace);
        return this;
    };

    /**
     * Hide warning
     * @returns {InputFloatWarning} this instance
     */
    this.hide = () => {
        this.$container.removeClass(this.options.namespace);
        return this;
    };

    /**
     * Display e.g. LT white-spaces warning if input value contains leading/trailing white-spaces
     * @param {String} name {optional} Name to check, if not provided, container input value will used
     * @param {Number} ms {optional} Timeout in milliseconds. If not provided, default timeout
     * @returns {InputFloatWarning} this instance
     */
    this.check = ({name, ms = 1000} = {}) => {
        // delay function sets default value if given timeout is 0. Workaround: set "ms" to 1 when 0 is given
        delay(this.id, () => {
            const validator = InputFloatWarning.validator[this.options.namespace];
            const msg = validator(name || $('input', this.$container).val());
            return msg ? this.show(msg) : this.hide();
        }, ms > 0 ? ms : 1);

        return this;
    };

    Object.freeze(this);
}

/** @property InputFloatWarning.validator */
lazy(InputFloatWarning, 'validator', () => {
    'use strict';
    const obj = {
        'whitespaces': (value) => {
            if (typeof value !== 'undefined' && value.length !== value.trim().length) {
                return l.whitespaces_on_name;
            }
            return false;
        }
    };
    Object.setPrototypeOf(obj, null);
    return Object.freeze(obj);
});

function renameDialog() {
    "use strict";

    if ($.selected.length > 0) {
        const n = M.getNodeByHandle($.selected[0]);
        var ext = fileext(n.name);
        var $dialog = $('.mega-dialog.rename-dialog');
        var $input = $('input', $dialog);
        var errMsg = '';
        const s4Folder = n.t && n.s4;

        M.safeShowDialog('rename', function() {
            $dialog.removeClass('hidden').addClass('active');
            $input.trigger("focus");
            return $dialog;
        });

        const ltWSpaceWarning = new InputFloatWarning($dialog);
        ltWSpaceWarning.hide().check({name: n.name, ms: 0});

        $('button.js-close, .rename-dialog-button.cancel', $dialog).rebind('click', closeDialog);

        $('.rename-dialog-button.rename').rebind('click.rename', () => {
            if ($dialog.hasClass('active')) {
                var value = $input.val();
                errMsg = '';

                if (n.name && value !== n.name) {
                    if (!value.trim()) {
                        errMsg = l[5744];
                    }
                    else if (s4Folder || M.isSafeName(value)) {
                        var targetFolder = n.p;
                        if (duplicated(value, targetFolder)) {
                            errMsg = l[23219];
                        }
                        else if (!s4Folder || !(errMsg = s4.ui.getInvalidNodeNameError(n, value))) {
                            M.rename(n.h, value).catch(tell);
                        }
                    }
                    else if (value.length > 250) {
                        errMsg = n.t === 1 ? l.LongName : l.LongName1;
                    }
                    else {
                        errMsg = l[24708];
                    }

                    if (errMsg) {
                        $('.duplicated-input-warning span', $dialog).safeHTML(errMsg);
                        $dialog.addClass('duplicate');
                        $input.addClass('error');

                        setTimeout(function() {
                            $dialog.removeClass('duplicate');
                            $input.removeClass('error');

                            $input.trigger("focus");
                        }, 2000);

                        return;
                    }
                }

                closeDialog();
            }
        });

        $('header h2', $dialog)
            .text(n.t ? s4Folder ? l.s4_bucket_rename : l[425] : l[426]);
        $input.val(n.name);

        $('.input-icon', $dialog)
            .attr('class', `input-icon item-type-icon icon-${fileIcon(n)}-24`);

        if (!n.t && ext.length > 0) {
            $input[0].selectionStart = 0;
            $input[0].selectionEnd = $input.val().length - ext.length - 1;
        }

        $input.rebind('focus', function() {
            var selEnd;
            $dialog.addClass('focused');
            var d = $(this).val().lastIndexOf('.');
            if (d > -1) {
                selEnd = d;
            }
            else {
                selEnd = $(this).val().length;
            }
            $(this)[0].selectionStart = 0;
            $(this)[0].selectionEnd = selEnd;
        });

        $input.rebind('blur', function() {
            $dialog.removeClass('focused');
        });

        $input.rebind('keydown', (event) => {
            // distingushing only keydown evet, then checking if it's Enter in order to preform the action'
            if (event.keyCode === 13) { // Enter
                $('.rename-dialog-button.rename').click();
                return;
            }
            else if (event.keyCode === 27) { // ESC
                closeDialog();
            }
            else {
                $dialog.removeClass('duplicate').addClass('active');
                $input.removeClass('error');
            }
        });

        $input.rebind('keyup.rename-f', () => {
            if (!s4Folder) {
                ltWSpaceWarning.check();
            }
        });
    }
}

/**
 * Show message dialog
 * @param {String} type Dialog type. May also contain button labels: "remove:!^$Cancel!Delete"
 * @param {String} title Header text
 * @param {String} msg Main information text
 * @param {String} [submsg] Addition text (Optional)
 * @param {Function} [callback] The function to invoke on button click
 * @param {Boolean|String} [checkboxSetting] Show "Do not show again" block if True
 * @returns {void}
 */
// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
function msgDialog(type, title, msg, submsg, callback, checkboxSetting) {
    'use strict';
    let negate = false;
    let doneButton = l.ok_button;
    let showCloseButton = checkboxSetting === 1;

    type = String(type);
    if (type[0] === '*') {
        type = type.slice(1);
        showCloseButton = true;
    }
    if (type[0] === '-') {
        type = type.slice(1);
        negate = true;
    }
    let extraButton = type.split(':');

    if (extraButton.length === 1) {
        extraButton = null;
    }
    else {
        type = extraButton.shift();
        extraButton = extraButton.join(':');

        if (extraButton[0] === '!') {
            doneButton  = l[82];
            extraButton = extraButton.substr(1);

            if (extraButton[0] === '^') {
                extraButton = extraButton.substr(1);
                var pos = extraButton.indexOf('!');
                doneButton = extraButton.substr(0, pos++);
                extraButton = extraButton.substr(pos);
            }
        }
    }
    if (d && $.warningCallback) {
        console.warn(`There is another dialog open!.. ${$.msgDialog}, ${$.warningCallback}`);
    }
    $.msgDialog = type;
    $.warningCallback = typeof callback === 'function' && ((res) => onIdle(callback.bind(null, res, null)));

    // eslint-disable-next-line sonarjs/no-duplicate-string
    var $dialog = $('#msgDialog').removeClass('confirmation warning info error question ' +
        'delete-contact loginrequired-dialog multiple with-close-btn');

    $dialog.parent().addClass('msg-dialog-container');
    $('#msgDialog aside').addClass('hidden');

    // Show the top right close (x) button
    if (showCloseButton) {
        $dialog.addClass('with-close-btn');
    }

    if (type === 'clear-bin') {
        $('#msgDialog').addClass('warning');
        $('#msgDialog footer .footer-container')
            .safeHTML(
                `<button class="mega-button cancel">
                    <span>@@</span>
                </button>
                <button class="mega-button positive confirm">
                    <span>@@</span>
                </button>`,
                l[82],
                extraButton || l[1018]);

        $('#msgDialog .mega-button.confirm').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
                $.warningCallback = null;
            }
        });
        $('#msgDialog .mega-button.cancel').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
                $.warningCallback = null;
            }
        });
    }
    else if (type === 'delete-contact') {
        $('#msgDialog').addClass('delete-contact');
        $('#msgDialog footer .footer-container')
            .safeHTML(
                `<button class="mega-button cancel">
                    <span>@@</span>
                </button>
                <button class="mega-button positive confirm">
                    <span>@@</span>
                </button>`,
                l[79],
                l[78]);

        // eslint-disable-next-line sonarjs/no-identical-functions
        $('#msgDialog .mega-button.confirm').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
                $.warningCallback = null;
            }
        });

        // eslint-disable-next-line sonarjs/no-identical-functions
        $('#msgDialog .mega-button.cancel').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
                $.warningCallback = null;
            }
        });
    }
    else if (type === 'warninga' || type === 'warningb' || type === 'info' || type === 'error') {
        if (extraButton) {
            $('#msgDialog footer .footer-container')
                .safeHTML(
                    `<button class="mega-button cancel">
                        <span>@@</span>
                    </button>
                    <button class="mega-button positive confirm">
                        <span>@@</span>
                    </button>`,
                    extraButton,
                    doneButton
                );

            // eslint-disable-next-line sonarjs/no-identical-functions
            $('#msgDialog .mega-button.confirm').rebind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(false);
                    $.warningCallback = null;
                }
            });

            // eslint-disable-next-line sonarjs/no-identical-functions
            $('#msgDialog .mega-button.cancel').rebind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(true);
                    $.warningCallback = null;
                }
            });
        }
        else {
            $('#msgDialog footer .footer-container').safeHTML(
                `<button class="mega-button confirm ${checkboxSetting === 1 ? 'positive' : ''}">
                    <span>@@</span>
                </button>`,
                l.ok_button
            );

            // eslint-disable-next-line sonarjs/no-identical-functions
            $('#msgDialog .mega-button.confirm').rebind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(true);
                    $.warningCallback = null;
                }
            });
        }
        if (type === 'warninga') {
            $('#msgDialog').addClass('info');
        }
        else if (type === 'warningb') {
            $('#msgDialog').addClass('warning');
        }
        else if (type === 'info') {
            $('#msgDialog').addClass('info');
        }
        else if (type === 'error') {
            $('#msgDialog').addClass('error');
        }
    }
    else if (type === 'confirmationa' || type === 'confirmation' || type === 'remove') {
        if (doneButton === l.ok_button) {
            doneButton = false;
        }

        negate = negate || doneButton === l[23737];
        $('#msgDialog footer .footer-container')
            .safeHTML(
                `<div class="space-between">
                    <button class="mega-button cancel">
                        <span>@@</span>
                    </button>
                    <button class="mega-button ${negate ? 'negative' : 'positive'} confirm">
                        <span>@@</span>
                    </button>
                </div>`,
                extraButton || l[79],
                doneButton || l[78]);

        $('#msgDialog aside')
            .safeHTML(`<div class="checkbox-block top-pad">
                    <div class="checkdiv checkboxOff">
                        <input type="checkbox" name="confirmation-checkbox"
                            id="confirmation-checkbox" class="checkboxOff">
                    </div>
                    <label for="confirmation-checkbox" class="radio-txt">@@</label>
                </div>`, l.do_not_show_this_again);
        $('#msgDialog aside').removeClass('hidden');

        // eslint-disable-next-line sonarjs/no-identical-functions
        $('#msgDialog .mega-button.confirm').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
                $.warningCallback = null;
            }
        });
        // eslint-disable-next-line sonarjs/no-identical-functions
        $('#msgDialog .mega-button.cancel').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
                $.warningCallback = null;
            }
        });
        if (type === 'remove') {
            $('#msgDialog').addClass('warning');
        }
        else if (type === 'confirmationa') {
            $('#msgDialog').addClass('info');
        }
        else {
            $('#msgDialog').addClass('confirmation');
        }

        checkboxSetting = checkboxSetting === 1 ? null : checkboxSetting;
        if (checkboxSetting) {
            assert(
                checkboxSetting === 'cslrem'
                || checkboxSetting === 'nowarnpl'
                || checkboxSetting === 'skipDelWarning'
                || checkboxSetting === 'skipcdtos4'
                || checkboxSetting === 'skips4tocd'
                || checkboxSetting === 'skips4tos4'
                || checkboxSetting === 'rwReinstate'
                || checkboxSetting === 'dcPause', checkboxSetting);


            $('#msgDialog .checkbox-block .checkdiv,' +
                '#msgDialog .checkbox-block input')
                    .removeClass('checkboxOn').addClass('checkboxOff');

            $.warningCheckbox = false;
            $('#msgDialog aside').removeClass('hidden');
            $('#msgDialog .checkbox-block').rebind('click', function() {
                var $o = $('#msgDialog .checkbox-block .checkdiv, #msgDialog .checkbox-block input');
                if ($('#msgDialog .checkbox-block input').hasClass('checkboxOff')) {
                    $o.removeClass('checkboxOff').addClass('checkboxOn');
                    mega.config.set(checkboxSetting, 1);
                }
                else {
                    $o.removeClass('checkboxOn').addClass('checkboxOff');
                    mega.config.remove(checkboxSetting);
                }

                return false;
            });
        }
        else {
            $('#msgDialog aside').addClass('hidden');
        }
    }
    else if (type === 'import_login_or_register') {
        // Show import confirmation dialog if a user isn't logged in
        $('#msgDialog').addClass('question with-close-btn');
        $('#msgDialog footer .footer-container')
            .safeHTML(
                `<a class="bottom-bar-link">@@</a>
                <button class="mega-button cancel">
                    <span>@@</span>
                </button>
                <button class="mega-button positive confirm">
                    <span>@@</span>
                </button>`,
                l[20754],
                l[171],
                l[209]);

        // Register a new account to complete the import
        $('#msgDialog .mega-button.confirm').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback('register');
                $.warningCallback = null;
            }
        });
        // Login to complete the import
        $('#msgDialog .mega-button.cancel').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback('login');
                $.warningCallback = null;
            }
        });
        // Have an ephemeral account to complete the import
        $('#msgDialog .bottom-bar-link').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback('ephemeral');
                $.warningCallback = null;
            }
        });
    }
    else if (type === 'save_discard_cancel') {
        $('footer .footer-container', $dialog)
            .safeHTML(
                `<div class="space-between">
                    <button class="mega-button cancel">
                        <span>@@</span>
                    </button>
                    <button class="mega-button discard">
                        <span>@@</span>
                    </button>
                    <button class="mega-button positive confirm">
                        <span>@@</span>
                    </button>
                </div>`,
                l.msg_dlg_cancel, l.msg_dlg_discard, l.msg_dlg_save);

        $('.mega-button.confirm', $dialog).rebind('click.msgdlg', () => {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(1);
                $.warningCallback = null;
            }
        });
        $('.mega-button.cancel', $dialog).rebind('click.msgdlg', () => {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(0);
                $.warningCallback = null;
            }
        });
        $('.mega-button.discard', $dialog).rebind('click.msgdlg', () => {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(-1);
                $.warningCallback = null;
            }
        });
        $dialog.addClass('confirmation');

        $('aside', $dialog).addClass('hidden');
    }

    $('#msgDialog header p.subtitle').text(title);

    if (msg) {
        $('#msgDialog header h3').safeHTML(msg);
    }
    else {
        $('#msgDialog header h3').addClass('hidden');
    }

    clickURLs();
    if (submsg) {
        $('#msgDialog header p.text').safeHTML(submsg);
        $('#msgDialog header p.text').removeClass('hidden');
    }
    else {
        $('#msgDialog header p.text').addClass('hidden');
    }

    // eslint-disable-next-line sonarjs/no-identical-functions
    $('#msgDialog button.js-close').rebind('click', function() {
        closeMsg();
        if ($.warningCallback) {
            $.warningCallback(null);
            $.warningCallback = null;
        }
    });
    $('#msgDialog').removeClass('hidden');
    fm_showoverlay();

    if ($.dialog) {
        $('.mega-dialog:not(#msgDialog)').addClass('arrange-to-back');
        $('.mega-dialog-container.common-container').addClass('arrange-to-back');
    }
}

// eslint-disable-next-line strict -- see {@link msgDialog}
function asyncMsgDialog(...args) {
    return new Promise((resolve, reject) => {
        const callback = args[4] || echo;
        args[4] = tryCatch((value) => {
            Promise.resolve(callback(value)).then(resolve).catch(reject);
        }, reject);
        msgDialog(...args);
    });
}

function closeMsg() {
    var $dialog = $('#msgDialog').addClass('hidden');
    $dialog.parent().removeClass('msg-dialog-container');

    if ($.dialog && !((M.chat && $.dialog === 'onboardingDialog') || $.dialog === 'Mega-Onboarding')) {
        $('.mega-dialog').removeClass('arrange-to-back');
        $('.mega-dialog-container.common-container').removeClass('arrange-to-back');
    }
    else {
        fm_hideoverlay();
    }

    delete $.msgDialog;
    mBroadcaster.sendMessage('msgdialog-closed');
}

/**
 * opens a contact link dialog, after getting all needed info from API
 *
 * @param {String} contactLink, user contact link, the link we want to get.
 * @returns {null} no return value
 */
function openContactInfoLink(contactLink) {
    var $dialog = $('.mega-dialog.qr-contact');
    var QRContactDialogPrepare = function QRContactDialogPrepare(em, fullname, ctHandle, avatar) {
        $('.qr-contact-name', $dialog).text(fullname);
        $('.qr-contact-email', $dialog).text(em);

        if (avatar && avatar.length > 5) {
            useravatar.setUserAvatar(em, base64_to_ab(avatar));

            avatar = `<div class="avatar-wrapper small-rounded-avatar"><img src="${avatars[em].url}"></div>`;
        }
        else {
            avatar = useravatar.contact(em, 'small-rounded-avatar square');
        }
        $('.avatar-container-qr-contact', $dialog).safeHTML(avatar);

        var contactStatus = 1;
        if (u_handle) {
            if (ctHandle === u_handle) {
                $('#qr-ctn-add', $dialog).addClass('disabled');
                $('#qr-ctn-add', $dialog).off('click');
                $('.qr-ct-exist', $dialog).text(l[18514]).removeClass('hidden');
                $('aside', $dialog).removeClass('hidden');
            }
            else if (M.u[ctHandle] && M.u[ctHandle]._data.c) {
                contactStatus = 2;
                $('#qr-ctn-add', $dialog).addClass('disabled');
                $('.qr-ct-exist', $dialog).text(l[17886]).removeClass('hidden');
                $('aside', $dialog).removeClass('hidden');
                $('#qr-ctn-add', $dialog).off('click');
            }
            else {
                $('.big-btn-txt', $dialog).text(l[101]);
                $('#qr-ctn-add', $dialog).removeClass('disabled');
                $('.qr-ct-exist', $dialog).addClass('hidden');
                $('aside', $dialog).addClass('hidden');
                $('#qr-ctn-add', $dialog).rebind('click', function () {
                    if (contactStatus === 1) {
                        M.inviteContact(u_attr.email, em, null, contactLink);
                    }
                    $('#qr-ctn-add', $dialog).off('click');
                    closeDialog();

                    return false;
                });
            }
        }
        else {
            $('.big-btn-txt', $dialog).text(l[101]);
            $('#qr-ctn-add', $dialog).removeClass('disabled');
            $('.qr-ct-exist', $dialog).addClass('hidden');
            $('aside', $dialog).addClass('hidden');
            $('#qr-ctn-add', $dialog).rebind('click', function () {
                closeDialog();
                var page = 'fm/chat/contacts';
                mBroadcaster.once('fm:initialized', function () {
                    openContactInfoLink(contactLink);
                });
                login_next = page;
                login_txt = l[1298];
                return loadSubPage('login');
            });
        }
    };


    api.req({a: 'clg', cl: contactLink})
        .then(({result}) => {

            M.safeShowDialog('qr-contact', () => {
                QRContactDialogPrepare(result.e, `${result.fn || ''} ${result.ln || ''}`, result.h, result['+a']);

                $('button.js-close', $dialog).rebind('click', () => loadSubPage('fm'));
                return $dialog.removeClass('hidden');
            });

        })
        .catch((ex) => {
            console.error(ex);
            msgDialog('warningb', l[8531], l[17865]);
        });
}

/**
 * updateDialogDropDownList
 *
 * Extract id from list of emails, preparing it for extrusion,
 * fill multi-input dropdown list with not used emails.
 *
 * @param {String} dialog multi-input dialog class name.
 */
function updateDialogDropDownList(dialog) {

    var listOfEmails = M.getContactsEMails(),
        allEmails = [],
        contacts;

    // Loop through email list and extrude id
    for (var i in listOfEmails) {
        if (listOfEmails.hasOwnProperty(i)) {
            allEmails.push(listOfEmails[i].id);
        }
    }

    contacts = excludeIntersected($.sharedTokens, allEmails);
    addToMultiInputDropDownList(dialog, contacts);
}

/**
 * checkMultiInputPermission
 *
 * Check DOM element permission level class name.
 * @param {Object} $this, DOM drop down list element.
 * @returns {Array} [drop down list permission class name, translation string].
 */
function checkMultiInputPermission($this) {

    var permissionLevel;

    if ($this.is('.read-and-write')) {
        permissionLevel = ['read-and-write', l[56]]; // Read & Write
    }
    else if ($this.is('.full-access')) {
        permissionLevel = ['full-access', l[57]]; // Full access
    }
    else {
        permissionLevel = ['read-only', l[55]]; // Read-only
    }

    return permissionLevel;
}

/**
 * Checks if an email address is already known by the user
 * @param {String} email
 * @returns {Boolean} Returns true if it exists in the state, false if it is new
 */
function checkIfContactExists(email) {

    var userIsAlreadyContact = false;
    var userContacts = M.u;

    // Loop through the user's contacts
    for (var contact in userContacts) {
        if (userContacts.hasOwnProperty(contact)) {

            // Check if the users are already contacts by comparing email addresses of known contacts and the one entered
            if (email === userContacts[contact].m) {
                userIsAlreadyContact = true;
                break;
            }
        }
    }

    return userIsAlreadyContact;
}

/**
 * Check the dialog has token input that is already filled up by user or any unsaved changes.
 * Warn user closing dialog will lose all inserted input and unsaved changes.
 */

function showLoseChangesWarning() {
    "use strict";

    var $dialog = $('.mega-dialog:visible');
    if ($dialog.length !== 1) {
        console.warn('Unexpected number of dialogs...', [$dialog]);
        return MegaPromise.resolve();
    }

    var promise = new MegaPromise();

    // If there is any tokenizer on the dialog and it is triggered by dom event.
    var $tokenInput = $('li[class*="token-input-input"]', $dialog);

    // Make sure all input is tokenized.
    if ($tokenInput.length) {
        $('input', $tokenInput).trigger('blur');
    }

    // If tokenizer is on the dialog, check it has input already. If it has, warn user.
    var $tokenItems = $('li[class*="token-input-token"]', $dialog);

    if ($tokenItems.length) {
        // Warn user closing dialog will lose all inserted input
        msgDialog('confirmation', '', l[20474], l[18229], function(e) {
            if (e) {
                const $tokenObj = $('.add-contact-multiple-input');
                if ($tokenObj.tokenInput('getSettings')) {
                    $tokenObj.data('tokenInputObject').clearOnCancel();
                }
                $tokenItems.remove();
                promise.resolve();
            }
            else {
                promise.reject();
            }
        });
    }
    else if ($.dialog === 'share' && Object.keys($.addContactsToShare || []).length > 0
        || Object.keys($.changedPermissions || []).length > 0
        || Object.keys($.removedContactsFromShare || []).length > 0
        || (
            $.dialog === 'file-request-create-dialog' &&
            mega.fileRequest.dialogs.createDialog.checkLoseChangesWarning()
        )
        || (
            $.dialog === 'file-request-manage-dialog' &&
            mega.fileRequest.dialogs.manageDialog.checkLoseChangesWarning()
        )
    )  {
        // Warn user closing dialog will lose all unsaved changes
        msgDialog('confirmation', '', l[24208], l[18229], function(e) {
            if (e) {
                promise.resolve();
            }
            else {
                promise.reject();
            }
        });
    }
    else {
        promise.resolve();
    }

    return promise;
}

function closeDialog(ev) {
    "use strict";

    if (d) {
        MegaLogger.getLogger('closeDialog').debug($.dialog);
    }

    if (!$('.mega-dialog.registration-page-success').hasClass('hidden')) {
        fm_hideoverlay();
        $('.mega-dialog.registration-page-success').addClass('hidden').removeClass('special');
    }

    if ($('.mega-dialog.incoming-call-dialog').is(':visible') === true || $.dialog === 'download-pre-warning') {
        // managing dialogs should be done properly in the future, so that we won't need ^^ bad stuff like this one
        return false;
    }

    if ($.dialog === 'passwordlink-dialog') {
        if (String(page).substr(0, 2) === 'P!') {
            // do nothing while on the password-link page
            return false;
        }
        $('.mega-dialog.password-dialog').addClass('hidden');
    }

    // business account, add sub-user dialog. we wont allow closing before copying password
    if ($.dialog === 'sub-user-adding-dlg') {
        if ($('.user-management-add-user-dialog.user-management-dialog footer .add-sub-user')
            .hasClass('disabled')) {
            return false;
        }
    }

    if ($.dialog === 'terms' && $.registerDialog) {
        $('.mega-dialog.bottom-pages-dialog').addClass('hidden');
    }
    else if ($.dialog === 'createfolder' && ($.copyDialog || $.moveDialog || $.selectFolderDialog || $.saveAsDialog)) {
        $('.mega-dialog.create-folder-dialog, .mega-dialog.s4-create-bucket-dialog').addClass('hidden');
        $('.mega-dialog.create-folder-dialog .create-folder-size-icon').removeClass('hidden');
    }
    else if (($.dialog === 'slideshow') && $.copyrightsDialog) {
        $('.copyrights-dialog').addClass('hidden');

        delete $.copyrightsDialog;
    }
    else if ($.dialog === 'fingerprint-dialog' && $.shareCollaboratorsDialog && $.shareDialog) {

        // Update rendering to account for new contact verified status
        mega.ui.mShareCollaboratorsDialog.render();

        // Close FP fialog, put Share Collaborators dialog back to the front and Share dialog should be behind it
        $('.fingerprint-dialog').addClass('hidden');
        $('.share-access-contacts-dialog').removeClass('arrange-to-back hidden');
        $('.share-dialog').addClass('arrange-to-back');
    }
    else if ($.dialog === 'fingerprint-dialog' && $.shareWithUnverifiedDialog && $.shareDialog) {

        // Close FP fialog, put Unverified Contacts dialog back to front and Share dialog should be behind it
        $('.fingerprint-dialog').addClass('hidden');
        $('.share-with-unverified-contacts').removeClass('arrange-to-back hidden');
        $('.share-dialog').addClass('arrange-to-back');
    }
    else if ($.dialog === 'fingerprint-dialog' && $.shareDialog) {
        document.querySelector('.fingerprint-dialog').classList.add('hidden');
    }
    else if ($.dialog === 'fingerprint-admin-dlg' && window.closeDlgMute) {
        return false;
    }
    else if ($.dialog === 'share' && $('#msgDialog').not('.hidden').length === 1) {

        // If they were on the Share With Non-Contact confirm dialog, bring the Share dialog back to the forefront
        $('#msgDialog').addClass('hidden');
        $('.share-dialog').removeClass('arrange-to-back hidden');
    }
    else if ($.dialog === 'contact-info' && $.shareDialog) {

        // Close the Contact/s Invited dialog and show the Share dialog again
        $('.contact-info').addClass('hidden');
        $('.share-dialog').removeClass('arrange-to-back hidden');

        // Update the Access list
        mega.ui.mShareDialog.renderAccessList();

        delete $.contactInfoDialog;
    }
    else if ($.dialog === 'share-access-contacts-dialog' && $.shareDialog) {

        // Hide the Share Collaborators dialog and bring the Share dialog back to the front
        $('.mega-dialog.share-access-contacts-dialog').addClass('hidden');
        $('.share-dialog').removeClass('arrange-to-back hidden');

        // Update the Access list
        mega.ui.mShareDialog.renderAccessList();

        delete $.shareCollaboratorsDialog;
    }
    else if ($.dialog === 'share-with-unverified-contacts' && $.shareDialog) {

        // When returning to the main Share dialog (render any avatar updates made in the meantime)
        mega.ui.mShareUnverifiedsDialog.close();

        // Hide the Unverified Contacts dialog and bring the Share dialog back to the front
        $('.mega-dialog.share-with-unverified-contacts').addClass('hidden');
        $('.share-dialog').removeClass('arrange-to-back hidden');

        delete $.shareWithUnverifiedDialog;
    }
    else {
        if ($.dialog === 'properties') {
            propertiesDialog(2);
        }
        else {
            fm_hideoverlay();
        }
        $('.mega-dialog' + ($.propertiesDialog ? ':not(.properties-dialog)' : ''))
            .trigger('dialog-closed')
            .addClass('hidden');
        $('.dialog-content-block').empty();

        // add contact popup
        $('.add-user-popup').addClass('hidden');

        $('.add-contact-multiple-input').tokenInput("clearOnCancel");
        $('.share-multiple-input').tokenInput("clearOnCancel");

        if ($.dialog === 'share') {
            // share dialog
            $('.share-dialog-access-node').remove();
            mega.ui.mShareDialog.hidePermissionsMenu();

            delete $.sharedTokens;
            delete $.contactPickerSelected;
            delete $.addContactsToShare;
            delete $.changedPermissions;
            delete $.removedContactsFromShare;
        }

        $('.copyrights-dialog').addClass('hidden');

        delete $.copyDialog;
        delete $.moveDialog;
        delete $.copyToShare;
        delete $.copyToUpload;
        delete $.shareToContactId;
        delete $.copyrightsDialog;
        delete $.selectFolderDialog;
        delete $.saveAsDialog;
        delete $.nodeSaveAs;
        delete $.shareDialog;
        delete $.fileRequestNew;

        /* copy/move dialog - save to */
        delete $.saveToDialogCb;
        delete $.saveToDialogNode;
        delete $.saveToDialog;
        delete $.chatAttachmentShare;

        if ($.saveToDialogPromise) {
            if (typeof $.saveToDialogPromise === 'function') {
                $.saveToDialogPromise(EEXPIRED);
            }
            else {
                $.saveToDialogPromise.reject(EEXPIRED);
            }
            delete $.saveToDialogPromise;
        }

        if (ev && $(ev.target).is('.fm-dialog-overlay, .fm-dialog-close')) {
            delete $.onImportCopyNodes;
            delete $.albumImport;
        }

        if ($.msgDialog) {
            if ($.warningCallback) {
                onIdle($.warningCallback.bind(null, null));
                $.warningCallback = null;
            }
            closeMsg();
        }
        if ($.dialog === 'onboardingDialog') {
            if (
                mega.ui.onboarding.$hotSpotNode
                && mega.ui.onboarding.$hotSpotNode.hasClass('onboarding-hotspot-animation-rect')
            ) {
                mega.ui.onboarding.$hotSpotNode.removeClass('onboarding-hotspot-animation-rect');
            }
        }
    }
    $('.mega-dialog, .overlay.arrange-to-back, .mega-dialog-container.common-container').removeClass('arrange-to-back');
    // $('.mega-dialog .dialog-sorting-menu').remove();

    $('.export-links-warning').addClass('hidden');
    if ($.dialog === 'terms' && $.termsAgree) {
        delete $.termsAgree;
    }

    if ($.dialog === 'createfolder') {
        if ($.cfpromise) {
            $.cfpromise.reject();
            delete $.cfpromise;
        }
    }
    else if ($.dialog !== 'terms') {
        delete $.mcImport;
    }

    if (typeof redeem !== 'undefined' && redeem.$dialog) {
        redeem.$dialog.addClass('hidden');
    }

    delete $.dialog;
    treesearch = false;

    if ($.registerDialog) {
        // if the terms dialog was closed from the register dialog
        $.dialog = $.registerDialog;
    }

    if ($.propertiesDialog) {
        // if the dialog was close from the properties dialog
        $.dialog = $.propertiesDialog;
    }

    if ($.copyDialog || $.moveDialog || $.selectFolderDialog || $.saveAsDialog) {
        // the createfolder dialog was closed
        // eslint-disable-next-line local-rules/hints
        $.dialog = $.copyDialog || $.moveDialog || $.selectFolderDialog || $.saveAsDialog;
    }

    if ($.fingerprintDialog && $.shareCollaboratorsDialog && $.shareDialog) {

        // Fingerprint dialog will be closed, then Share Collaborators dialog put to front and Share dialog behind it
        delete $.fingerprintDialog;

        // eslint-disable-next-line local-rules/hints
        $.dialog = $.shareCollaboratorsDialog;
    }
    else if ($.fingerprintDialog && $.shareWithUnverifiedDialog && $.shareDialog) {

        // Fingerprint dialog will be closed, then Unverified Contacts dialog put to front and Share dialog behind it
        delete $.fingerprintDialog;

        // eslint-disable-next-line local-rules/hints
        $.dialog = $.shareWithUnverifiedDialog;
    }
    else if ($.shareDialog) {

        // If the Share Collaborators / Unverified Contacts / Contact Info dialog were closed, return to share dialog
        // eslint-disable-next-line local-rules/hints
        $.dialog = $.shareDialog;
    }

    mBroadcaster.sendMessage('closedialog');
}

function createFolderDialog(close) {
    "use strict";

    if (M.isInvalidUserStatus()) {
        return;
    }

    var $dialog = $('.mega-dialog.create-folder-dialog');
    var $input = $('input', $dialog);
    $input.val('');

    const ltWSpaceWarning = InputFloatWarning($dialog).hide();

    if (close) {
        if ($.cftarget) {
            delete $.cftarget;
        }
        if ($.dialog === 'createfolder') {
            closeDialog();
        }
        return true;
    }

    var doCreateFolder = function(v) {
        var errorMsg = '';
        if (v.trim() === '' || v.trim() === l[157]) {
            errorMsg = l.EmptyName;
        }
        else if (v.length > 250) {
            errorMsg = l.LongName;
        }
        else if (M.isSafeName(v) === false) {
            $dialog.removeClass('active');
            errorMsg = l[24708];
        }
        else {
            var specifyTarget = null;
            if ($.cftarget) {
                specifyTarget = $.cftarget;
            }
            if (duplicated(v, specifyTarget)) {
                errorMsg = l[23219];
            }
        }

        if (errorMsg !== '') {
            showErrorCreatingFileFolder(errorMsg, $dialog, $input);

            return;
        }

        var target = $.cftarget = $.cftarget || M.currentCustomView.nodeID || M.currentdirid;
        var awaitingPromise = $.cfpromise;
        delete $.cfpromise;

        closeDialog();
        loadingDialog.pshow();

        M.createFolder(target, v)
            .then((h) => {
                if (d) {
                    console.log('Created new folder %s->%s', target, h);
                }
                createFolderDialog(1);

                if (awaitingPromise) {
                    // dispatch an awaiting promise expecting to perform its own action instead of the default one
                    queueMicrotask(() => awaitingPromise.resolve(h));
                    return awaitingPromise;
                }

                const {type, original} = M.currentCustomView;
                let id = type === mega.devices.rootId ? original : Object(M.d[h]).p || target;
                if (
                    M.currentrootid === 'out-shares' ||
                    M.currentrootid === 'file-requests' ||
                    M.currentrootid === 'public-links'
                ) {
                    id = `${M.currentrootid}/${id}`;
                }

                // By default, auto-select the newly created folder as long no awaiting promise
                return M.openFolder(id)
                    .always(() => {
                        $.selected = [h];
                        reselect(1);
                    });
            })
            .catch((ex) => {
                msgDialog('warninga', l[135], l[47], ex < 0 ? api_strerror(ex) : ex, function() {
                    if (awaitingPromise) {
                        awaitingPromise.reject(ex);
                    }
                });
            })
            .finally(() => {
                loadingDialog.phide();
            });
    };

    $input.rebind('focus', function() {
        if ($(this).val() === l[157]) {
            $input.val('');
        }
        $dialog.addClass('focused');
    });

    $input.rebind('blur', function() {
        $dialog.removeClass('focused');
    });

    $input.rebind('keyup', function(e) {
        ltWSpaceWarning.check();
        if ($input.val() === '' || $input.val() === l[157]) {
            $dialog.removeClass('active');
        }
        else if (e.which !== 13)  {
            $dialog.addClass('active');
            $input.removeClass('error');
        }
    });

    $input.rebind('keypress', function(e) {
        var v = $(this).val();
        if (e.which === 13 && v.trim() !== '') {
            doCreateFolder(v);
        }
    });

    $('button.js-close, .create-folder-button-cancel', $dialog).rebind('click', createFolderDialog);

    $('.fm-dialog-input-clear').rebind('click', function() {
        $input.val('');
        $dialog.removeClass('active');
    });

    $('.fm-dialog-new-folder-button').rebind('click', () => doCreateFolder($input.val()));

    M.safeShowDialog('createfolder', function() {
        $dialog.removeClass('hidden');
        $('.create-folder-wrapper input', $dialog).focus();
        $dialog.removeClass('active');
        return $dialog;
    });
}

function showErrorCreatingFileFolder(errorMsg, $dialog, $input) {
    "use strict";
    $('.duplicated-input-warning span', $dialog).text(errorMsg);
    $dialog.addClass('duplicate');
    $input.addClass('error');

    setTimeout(
        () => {
            $input.removeClass('error');
            $dialog.removeClass('duplicate');
            $input.trigger("focus");
        },
        2000
    );
}

function createFileDialog(close, action, params) {
    "use strict";


    var closeFunction = function() {
        if ($.cftarget) {
            delete $.cftarget;
        }
        closeDialog();
        return false;
    };


    if (close) {
        return closeFunction();
    }

    if (!action) {
        action = function(name, t) {
            if (ulmanager.ulOverStorageQuota) {
                ulmanager.ulShowOverStorageQuotaDialog();
                return;
            }

            loadingDialog.pshow();

            M.addNewFile(name, t)
                .done(function(nh) {
                    if (d) {
                        console.log('Created new file %s->%s', t, name);
                    }
                    loadingDialog.phide();

                    if ($.selectddUIgrid.indexOf('.grid-scrolling-table') > -1 ||
                        $.selectddUIgrid.indexOf('.file-block-scrolling') > -1) {
                        var $grid = $($.selectddUIgrid);
                        var $newElement = $('#' + nh, $grid);

                        if (M.megaRender && M.megaRender.megaList && M.megaRender.megaList._wasRendered) {
                            M.megaRender.megaList.scrollToItem(nh);
                            $newElement = $('#' + nh, $grid);
                        }
                        else if ($grid.length && $newElement.length && $grid.hasClass('ps')) {
                            scrollToElement($grid, $newElement);
                        }

                        // now let's select the item. we can not use the click handler due
                        // to redraw if element was out of viewport.
                        $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
                        $newElement.addClass('ui-selected');
                        $.gridLastSelected = $newElement[0];
                        selectionManager.clear_selection();
                        selectionManager.add_to_selection(nh);

                        loadingDialog.show('common', l[23130]);

                        mega.fileTextEditor.getFile(nh).done(
                            function(data) {
                                loadingDialog.hide();
                                mega.textEditorUI.setupEditor(M.d[nh].name, data, nh);
                            }
                        ).fail(function() {
                            loadingDialog.hide();
                        });

                    }

                })
                .fail(function(error) {
                    loadingDialog.phide();
                    msgDialog('warninga', l[135], l[47], api_strerror(error));
                });
        };
    }

    // there's no jquery parent for this container.
    // eslint-disable-next-line local-rules/jquery-scopes
    var $dialog = $('.mega-dialog.create-file-dialog');
    var $input = $('input', $dialog);
    $input.val('.txt')[0].setSelectionRange(0, 0);

    const ltWSpaceWarning = InputFloatWarning($dialog).hide();

    var doCreateFile = function(v) {
        var target = $.cftarget = $.cftarget || M.currentdirid;

        var errorMsg = '';

        if (v === '' || v === l[17506]) {
            errorMsg = l[8566];
        }
        else if (v.length > 250) {
            errorMsg = l.LongName1;
        }
        else if (!M.isSafeName(v)) {
            $dialog.removeClass('active');
            errorMsg = l[24708];
        }
        else if (duplicated(v, target)) {
            errorMsg = l[23219];
        }
        if (errorMsg !== '') {
            showErrorCreatingFileFolder(errorMsg, $dialog, $input);
            return;
        }
        closeFunction();
        action(v, target, params);
    };


    $input.rebind('focus.fileDialog', function() {
        if ($(this).val() === l[17506]) {
            $input.val('');
        }
        $dialog.addClass('focused');
    });

    $input.rebind('blur.fileDialog', function() {
        $dialog.removeClass('focused');
    });

    $input.rebind('keyup.fileDialog', function() {
        ltWSpaceWarning.check();
        if ($input.val() === '' || $input.val() === l[17506]) {
            $dialog.removeClass('active');
        }
        else {
            $dialog.addClass('active');
            $input.removeClass('error');
        }
    });

    $input.rebind('keypress.fileDialog', function(e) {

        if (e.which === 13) {
            doCreateFile($(this).val());
        }
        else {
            $input.removeClass('error');
            $dialog.removeClass('duplicate');
        }
    });

    // eslint-disable-next-line sonarjs/no-duplicate-string
    $('.js-close, .cancel-create-file', $dialog).rebind('click.fileDialog', closeFunction);

    $('.fm-dialog-input-clear', $dialog).rebind('click.fileDialog', function() {
        $input.val('');
        $dialog.removeClass('active');
    });

    $('.create-file', $dialog).rebind('click.fileDialog', function() {
        var v = $input.val();
        doCreateFile(v);
    });

    M.safeShowDialog('createfile', function() {
        $dialog.removeClass('hidden');
        $('.create-file-wrapper input', $dialog).focus();
        $dialog.removeClass('active');
        return $dialog;
    });
}

/**
 * Show bottom pages dialog
 * @param {Boolean} close dialog parameter
 * @param {String} bottom page title
 * @param {String} dialog header
 * @param {Boolean} tickbox tickbox existency to let user agree this dialog
 */
function bottomPageDialog(close, pp, hh, tickbox) {
    "use strict";

    var $dialog = $('.mega-dialog.bottom-pages-dialog');
    var closeDialog = function() {
        $dialog.off('dialog-closed');
        // reset scroll position to top for re-open
        $dialog.scrollTop(0);

        window.closeDialog();
        delete $.termsAgree;
        delete $.termsDeny;
        return false;
    };

    if (close) {
        closeDialog();
        return false;
    }

    if (!pp) {
        pp = 'terms';
    }

    // Show Agree/Cancel buttons for Terms dialogs if it does not have tickbox to agree=
    if ((pp === 'terms' && !tickbox) || pp === 'sdkterms') {
        $('.fm-bp-cancel, .fm-bp-agree', $dialog).removeClass('hidden');
        $('.fm-bp-close', $dialog).addClass('hidden');
        $('header h2', $dialog).text(l[385]);

        $('.fm-bp-agree', $dialog).rebind('click', function()
        {
            if ($.termsAgree) {
                $.termsAgree();
            }
            bottomPageDialog(1);
        });

        $('button.js-close, .fm-bp-cancel', $dialog).rebind('click', function()
        {
            if ($.termsDeny) {
                $.termsDeny();
            }
            bottomPageDialog(1);
        });
    }
    else {
        $('.fm-bp-cancel, .fm-bp-agree', $dialog).addClass('hidden');
        $('.fm-bp-close', $dialog).removeClass('hidden');
        if (hh) {
            $('header h2', $dialog).text(hh);
        }

        $('button.js-close, .fm-bp-close', $dialog).rebind('click', function()
        {
            bottomPageDialog(1);
        });
    }

    var asyncTaskID;
    if (!pages[pp]) {
        asyncTaskID = 'page.' + pp + '.' + makeUUID();

        M.require(pp)
            .always(function() {
                mBroadcaster.sendMessage(asyncTaskID);
                asyncTaskID = null;
            });
    }

    M.safeShowDialog(pp, function _showDialog() {
        if (asyncTaskID) {
            loadingDialog.show();
            mBroadcaster.once(asyncTaskID, function() {
                loadingDialog.hide();
                asyncTaskID = null;
                _showDialog();
            });

            return $dialog;
        }
        $dialog.rebind('dialog-closed', closeDialog).removeClass('hidden');

        const $bottomPageDialogMain = $('.bp-main', $dialog);
        $bottomPageDialogMain.safeHTML(translate(String(pages[pp])
            .split('((TOP))')[1]
            .split('((BOTTOM))')[0]
            .replace('main-mid-pad new-bottom-pages', ''))
        );

        initPerfectScrollbar($('.bp-body', $dialog));

        if (pp === 'terms') {
            $('a[href]', $bottomPageDialogMain).attr('target', '_blank');
        }
        clickURLs();
        scrollToURLs();
        return $dialog;
    });
}

function clipboardcopycomplete()
{
    if (d)
        console.log('clipboard copied');
}

function saveprogress(id, bytesloaded, bytestotal)
{
    if (d)
        console.log('saveprogress', id, bytesloaded, bytestotal);
}

function savecomplete(id)
{
    $('.mega-dialog.download-dialog').addClass('hidden');
    fm_hideoverlay();

    var dl = dlmanager.getDownloadByHandle(id);
    if (dl) {
        M.dlcomplete(dl);
        dlmanager.cleanupUI(dl, true);
    }
}

/**
 * Because of the left and transfer panes resizing options, we are now implementing the UI layout logic here, instead of
 * the original code from the styles.css.
 * The main reason is that, the CSS is not able to correctly calculate values based on other element's properties (e.g.
 * width, height, position, etc).
 * This is why we do a on('resize') handler which handles the resize of the generic layout of Mega's FM.
 */
function fm_resize_handler(force) {
    "use strict";

    if ($.tresizer.last === -1 && force !== true) {
        return;
    }
    if (d) {
        if (d > 1) {
            console.warn('fm_resize_handler');
        }
        console.time('fm_resize_handler');
    }

    // Only for old left pane pages
    if (!mega.ui.topmenu.activeItem) {
        initTreeScroll();
    }

    if (M.currentdirid === 'shares') {
        initPerfectScrollbar($('.grid-scrolling-table', '.shared-grid-view'));
    }
    else if (M.currentdirid === 'out-shares') {
        initPerfectScrollbar($('.grid-scrolling-table', '.out-shared-grid-view'));
    }
    else if (M.onDeviceCenter && M.onListView && mega.devices.ui.isCustomRender()) {
        initPerfectScrollbar($('.grid-scrolling-table', mega.devices.ui.gridWrapperSelector));
    }
    else if (M.currentdirid === 'transfers') {
        fm_tfsupdate(); // this will call $.transferHeader();
    }
    else if (M.currentdirid && M.currentdirid.substr(0, 7) === 'account') {
        var $accountContent = $('.fm-account-main', '.pm-main');

        $accountContent.removeClass('low-width');

        if ($accountContent.width() < 780) {
            $accountContent.addClass('low-width');
        }

        // Init account content scrolling
        accountUI.initAccountScroll();
    }
    else if (M.currentdirid && M.currentdirid.substr(0, 9) === 'dashboard') {
        var $dashboardContent = $('.fm-right-block.dashboard', '.pm-main');

        $dashboardContent.removeClass('low-width');

        if ($dashboardContent.width() < 780 || !$('.business-dashboard', $dashboardContent).hasClass('hidden')
            && $dashboardContent.width() < 915) {
            $dashboardContent.addClass('low-width');
        }

        // Init dashboard content scrolling
        initDashboardScroll();
    }
    else if (M.currentdirid && M.currentdirid.startsWith('user-management') &&
        typeof initBusinessAccountScroll === 'function') {
        initBusinessAccountScroll($('.user-management-view .ps:visible', fmholder));
    }
    else if (!M.chat) {
        // Resize the search breadcrumbs
        if (M.currentdirid && M.currentdirid.includes('search/')) {
            delay('render:search_breadcrumbs', () => M.renderSearchBreadcrumbs());
        }
        if (M.onIconView) {
            initPerfectScrollbar($('.file-block-scrolling:visible'));
        }
        else {
            initPerfectScrollbar($('.grid-scrolling-table:visible'));
            if ($.gridHeader) {
                $.gridHeader();
            }
        }
        // Resize the cloud drive breadcrumbs
        delay('render:path_breadcrumbs', () => M.renderPathBreadcrumbs());
    }

    if (M.currentdirid !== 'transfers') {
        var treePaneWidth = Math.round($('.fm-left-panel:visible').outerWidth());

        if (megaChatIsReady && megaChat.resized) {
            megaChat.resized();
        }

        $('.popup.transfer-widget').outerWidth(treePaneWidth - 9);
    }

    if (M.currentrootid === 'shares') {
        var $sharedDetailsBlock = $('.shared-details-block', '.pm-main');
        var sharedHeaderHeight = Math.round($('.shared-top-details', $sharedDetailsBlock).outerHeight());

        $('.files-grid-view, .fm-blocks-view', $sharedDetailsBlock).css({
            'height': `calc(100% - ${sharedHeaderHeight}px)`,
        });
    }

    if (d) {
        console.timeEnd('fm_resize_handler');
    }
}


function sharedFolderUI() {
    "use strict";

    var nodeData = M.d[M.currentdirid];
    var browsingSharedContent = false;

    // Browsing shared content
    if ($('.shared-details-block').length > 0) {

        $('.shared-details-block .files-grid-view, .shared-details-block .fm-blocks-view').removeAttr('style');
        $('.shared-details-block .shared-folder-content').unwrap();
        $('.shared-folder-content').removeClass('shared-folder-content');
        browsingSharedContent = true;
    }

    // are we in an inshare?
    if (M.currentrootid === 'shares' || M.currentrootid === 'out-shares') {
        mega.ui.secondaryNav.hideCard();
    }
    while (nodeData && !nodeData.su) {
        nodeData = M.d[nodeData.p];
    }

    if (nodeData) {

        var rightPanelView = '.files-grid-view.fm';

        if (M.onIconView) {
            rightPanelView = '.fm-blocks-view.fm';
        }

        $(rightPanelView).wrap('<div class="shared-details-block"></div>');

        const { r } = nodeData;
        const downloadButton = {
            text: l[58],
            onClick(ev) {
                mega.ui.secondaryNav.openDownloadMenu(ev);
                eventlog(500733);
            }
        };
        const newButton = {
            text: l.add_item_btn,
            icon: 'sprite-fm-mono icon-plus-light-solid',
            id: `newctx_${nodeData.h}`,
            onClick(ev) {
                mega.ui.secondaryNav.openNewMenu(ev);
            }
        };
        const onContextMenu = (ev) => {
            mega.ui.secondaryNav.openContextMenu(ev);
        };
        if (nodeData.h === M.currentdirid) {
            mega.ui.secondaryNav.hideBreadcrumb();
            if (r === 1 || r === 2) {
                mega.ui.secondaryNav.showCard(M.currentdirid, newButton, downloadButton, onContextMenu);
            }
            else {
                mega.ui.secondaryNav.showCard(
                    M.currentdirid,
                    downloadButton,
                    { componentClassname: 'hidden' },
                    onContextMenu
                );
            }
        }
        else {
            mega.ui.secondaryNav.showBreadcrumb();
        }

        $(rightPanelView).addClass('shared-folder-content');

        if (M.d[M.currentdirid] !== nodeData || M.d[nodeData.p]) {
            // hide leave-share under non-root shares
            $('.fm-leave-share').addClass('hidden');
        }

        onIdle(function() {
            $(window).trigger('resize');
            onIdle(fm_resize_handler);
        });
    }

    return browsingSharedContent;
}

function userFingerprint(userid, callback) {
    userid = userid.u || userid;
    var user = M.u[userid];
    if (!user || !user.u) {
        return callback([]);
    }
    if (userid === u_handle) {
        var fprint = authring.computeFingerprint(u_pubEd25519, 'Ed25519', 'hex');
        return callback(fprint.toUpperCase().match(/.{4}/g), fprint);
    }
    var fingerprintPromise = crypt.getFingerprintEd25519(user.h || userid);
    fingerprintPromise.done(function (response) {
        callback(
            response.toUpperCase().match(/.{4}/g),
            response
        );
    });
}

/**
 * Get and display the fingerprint
 * @param {Object} user The user object e.g. same as M.u[userHandle]
 * @param {Selector} $wrapper Container of fingerprint block
 */
function showAuthenticityCredentials(user, $wrapper) {

    var $fingerprintContainer = $wrapper.length ?
        $wrapper.find('.contact-fingerprint-txt') : $('.contact-fingerprint-txt');

    // Compute the fingerprint
    userFingerprint(user, function(fingerprints) {

        // Clear old values immediately
        $fingerprintContainer.empty();

        // Render the fingerprint into 10 groups of 4 hex digits
        $.each(fingerprints, function(key, value) {
            $('<span>').text(value).appendTo($fingerprintContainer);
        });
    });
}

/**
 * Enables the Verify button
 * @param {String} userHandle The user handle
 */
function enableVerifyFingerprintsButton(userHandle) {
    $('.fm-verify').removeClass('verified');
    $('.fm-verify').find('span').text(l[1960] + '...');
    $('.fm-verify').rebind('click', function() {
        fingerprintDialog(userHandle);
    });
}

function fingerprintDialog(userid, isAdminVerify, callback) {
    'use strict';

    userid = userid.u || userid;
    const user = M.u[userid];
    if (!user || !user.u) {
        return -5;
    }

    if (d) {
        console.warn('fingerprint-dialog', user.h, [user], isAdminVerify, [callback]);
    }

    // Add log to see how often they open the verify dialog
    eventlog(99601, !!isAdminVerify);

    const $dialog = $('.fingerprint-dialog');
    const $backgroundOverlay = $('.fm-dialog-overlay', 'body');

    $dialog.toggleClass('e-modal', isAdminVerify === null);
    $dialog.toggleClass('admin-verify', isAdminVerify === true);
    let titleTxt = l.verify_credentials;
    let subTitleTxt = l.contact_ver_dialog_content;
    let approveBtnTxt = l.mark_as_verified;
    let credentialsTitle = l[6780];
    let listenerToken = null;
    window.closeDlgMute = null;

    if (isAdminVerify) {
        titleTxt = l.bus_admin_ver;
        subTitleTxt = l.bus_admin_ver_sub;
        approveBtnTxt = l[1960];
        credentialsTitle = l.bus_admin_cred;
        listenerToken = mBroadcaster.addListener('mega:openfolder', {
            callback: () => {
                fingerprintDialog(u_attr.b.mu[0], true);
            },
            once: true
        });
        window.closeDlgMute = true;
    }

    $('header h2', $dialog).text(titleTxt);
    $('.content-block p.sub-title-txt', $dialog).text(subTitleTxt);
    $('.footer-container .dialog-approve-button span', $dialog).text(approveBtnTxt);
    $('.fingerprint-code .contact-fingerprint-title', $dialog).text(credentialsTitle);

    const closeFngrPrntDialog = () => {

        window.closeDlgMute = null;
        closeDialog();
        $('button.js-close', $dialog).off('click');
        $('.dialog-approve-button', $dialog).off('click');
        $('.dialog-skip-button', $dialog).off('click');
        $backgroundOverlay.off('click.closeMsgDialog');

        if (!isAdminVerify) {
            callback = callback || mega.ui.CredentialsWarningDialog.rendernext;
            callback(userid);
        }
        else {
            const bus = new BusinessAccount();
            bus.sendSubMKey()
                .then(() => {
                    mBroadcaster.removeListener(listenerToken);
                })
                .catch(tell);
        }
    };

    $('.fingerprint-avatar', $dialog).empty()
        .append($(useravatar.contact(userid, 'semi-mid-avatar')));

    $('.contact-details-user-name', $dialog)
        .text(M.getNameByHandle(user.u)) // escape HTML things
        .end()
        .find('.contact-details-email')
        .text(user.m); // escape HTML things

    $('.fingerprint-txt', $dialog).empty();

    userFingerprint(u_handle, (fprint) => {
        const target = $('.fingerprint-bott-txt .fingerprint-txt');
        fprint.forEach(function(v) {
            $('<span>').text(v).appendTo(target);
        });
    });

    userFingerprint(user, (fprint) => {
        let offset = 0;
        $dialog.find('.fingerprint-code .fingerprint-txt').each(function() {
            let that = $(this);

            fprint.slice(offset, offset + 5).forEach(function(v) {
                $('<span>').text(v).appendTo(that);
                offset++;
            });
        });
    });

    // The Skip or Close functionality
    const skipOrCloseFunction = () => {

        // Run the regular behaviour for Skip (or Close button)
        if (isAdminVerify) {
            return;
        }
        closeFngrPrntDialog();
        return false;
    };

    $('button.js-close, .dialog-skip-button', $dialog).rebind('click', skipOrCloseFunction);

    // On clicking the background overlay
    $backgroundOverlay.rebind('click.closeMsgDialog', skipOrCloseFunction);

    $('.dialog-approve-button', $dialog).rebind('click', () => {

        // Add log to see how often they verify the fingerprints
        api_req({ a: 'log', e: 99602, m: 'Fingerprint verification approved' });

        const promises = [];
        loadingDialog.show();

        if (!authring.getContactAuthenticated(userid, 'Cu25519') || !pubCu25519[userid]) {
            promises.push(crypt.getPubCu25519(userid, true));
        }
        // Generate fingerprint
        promises.push(crypt.getFingerprintEd25519(userid, 'string'));

        Promise.all(promises)
            .then((res) => {
                const fingerprint = res.pop();

                // Authenticate the contact
                return authring.setContactAuthenticated(
                    userid,
                    fingerprint,
                    'Ed25519',
                    authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON,
                    authring.KEY_CONFIDENCE.UNSURE
                );
            })
            .then(() => {

                // Change button state to 'Verified'
                $('.fm-verify').off('click').addClass('verified').find('span').text(l[6776]);

                closeFngrPrntDialog();

                if (M.u[userid]) {
                    M.u[userid].trackDataChange(M.u[userid], "fingerprint");

                    if (M.currentdirid === 'shares' && M.c[userid]) {

                        for (const h in M.c[userid]) {
                            if (M.megaRender) {
                                M.megaRender.revokeDOMNode(h, true);
                            }
                        }

                        M.renderMain(true);
                    }
                    else if (M.c[userid] && M.c[userid][M.currentdirid]) {
                        $('.shared-details-icon').removeClass('icon-warning-after sprite-fm-uni-after');
                        $('.' + userid).addClass('verified');
                    }

                    if ($.dialog === 'share') {

                        const contact = document.querySelector(`.share-dialog-access-list [id="${userid}"]`);

                        if (contact) {

                            contact.classList.remove('unverified-contact');
                            contact.querySelector('.avatar-wrapper').classList.add('verified');
                        }

                        mega.ui.mShareDialog.contentCheck();
                    }
                }
            })
            .catch((ex) => {
                console.error(ex);
                msgDialog('warninga', l[135], l[47], ex);

                const user = M.getUserByHandle(userid);
                const info = [
                    2,
                    String(ex).trim().split('\n')[0],
                    String(ex && ex.stack).trim().replace(/\s+/g, ' ').substr(0, 512),
                    userid,
                    {c: user.c, m: user.m ? 1 : 0, h: user.h, u: user.u, ts: user.ts, ats: user.ats}
                ];
                eventlog(99816, JSON.stringify(info));
            })
            .finally(() => {
                loadingDialog.hide();
            });
    });

    $.fingerprintDialog = 'fingerprint-dialog';

    M.safeShowDialog(isAdminVerify ? 'fingerprint-admin-dlg' : 'fingerprint-dialog', $dialog);
}

/**
 * Implements the behavior of "File Manager - Resizable Panes":
 * - Initializes a jQuery UI .resizable
 * - Sets w/h/direction
 * - Persistance (only saving is implemented here, you should implement by yourself an initial set of the w/h from the
 *  localStorage
 * - Proxies the jQ UI's resizable events - `resize` and `resizestop`
 * - Can be initialized only once per element (instance is stored in $element.data('fmresizable'))
 *
 * @param element
 * @param opts
 * @returns {*}
 * @constructor
 */
function FMResizablePane(element, opts) {
    "use strict";

    var $element = $(element);
    var self = this;
    var $self = $(this);

    self.element = element;

    /**
     * Default options
     *
     * @type {{direction: string, persistanceKey: string, minHeight: undefined, minWidth: undefined, handle: string}}
     */
    var defaults = {
        'direction': 'n',
        'persistanceKey': '',
        'maxWidth': 400,
        'minHeight': undefined,
        'minWidth': undefined,
        'handle': '.transfer-drag-handle'
    };

    var size_attr = 'height';

    opts = $.extend(true, {}, defaults, opts);

    self.options = opts; //expose as public

    console.assert(opts.multiple || $element.length === 1, 'FMResizablePane: Invalid number of elements.');

    /**
     * Depending on the selected direction, pick which css attr should we be changing - width OR height
     */
    if (opts.direction === 'n' || opts.direction === 's') {
        size_attr = 'height';
    }
    else if (opts.direction === 'e' || opts.direction === 'w') {
        size_attr = 'width';
    }
    else if (opts.direction.length === 2) {
        size_attr = 'both';
    }

    self.destroy = function() {
        $self.off();
        $element.data('fmresizable', null);
    };

    this.refresh = function(ev) {
        const width = $element.width();

        if (opts.maxWidth && width >= opts.maxWidth) {
            $('.left-pane-drag-handle').css('cursor', 'w-resize');
            $('body').css('cursor', 'w-resize');
        }
        else if (width <= opts.minWidth) {
            $('.left-pane-drag-handle').css('cursor', 'e-resize');
            $('body').css('cursor', 'e-resize');
        }
        else {
            $('.left-pane-drag-handle').css('cursor', 'ew-resize');
            $('body').css('cursor', 'ew-resize');
        }

        if (!$element.hasClass('ui-resizable-resizing')) {
            $('body').css('cursor', 'auto');
        }

        if (width < opts.updateWidth + 60) {
            $element.addClass('small-left-panel');
        }
        else {
            $element.removeClass('small-left-panel');
        }

        // Temporary RTL hack for chat left pane resize to adjust new header
        if (document.body.classList.contains('rtl') && M.chat) {
            mega.ui.header.domNode.style.paddingInlineEnd = `${width}px`;
        }
        else {
            mega.ui.header.domNode.style.paddingInlineEnd = '';
        }

        if (d > 1) {
            console.warn([this], width);
        }

        return ev || $.tresizer();
    };

    this.setWidth = function(value) {

        if (!value && opts.persistanceKey) {
            const size = mega.config.get(opts.persistanceKey) | 0;
            if (size) {
                const {maxWidth, minWidth} = opts;
                value = Math.min(maxWidth || size, Math.max(minWidth | 0, size));
            }
        }

        if (value > 0) {
            $element.width(value);
        }

        this.refresh();
    };

    this.setOption = function(key, value) {
        opts[key] = value;
        $element.resizable('option', key, value);
        this.setWidth();
    };

    if (opts.persistanceKey) {
        this.setWidth();
    }

    /**
     * Basic init/constructor code
     */
    if (!$element.data('fmresizable')) {
        var $handle = $(opts.handle, $element);

        if (d) {
            if (!$handle.length) {
                console.warn('FMResizablePane: Element not found: ' + opts.handle);
            }
        }

        $handle.addClass('ui-resizable-handle ui-resizable-' + opts.direction);

        var resizable_opts = {
            'handles': {},
            minHeight: opts.minHeight,
            minWidth: opts.minWidth,
            maxHeight: opts.maxHeight,
            maxWidth: opts.maxWidth,
            start: function(e, ui) {
                $(self.element).addClass('resizable-pane-active');
                $.hideContextMenu();
            },
            resize: function(e, ui) {
                var css_attrs = {
                    'top': 0
                };

                if (size_attr === 'both') {
                    css_attrs['width'] = ui.size['width'];
                    css_attrs['height'] = ui.size['height'];

                    $element.css(css_attrs);

                    if (opts.persistanceKey) {
                        console.assert(opts.persistanceKey !== 'leftPaneWidth');
                        mega.config.set(opts.persistanceKey, css_attrs);
                    }
                } else {
                    css_attrs[size_attr] = ui.size[size_attr];
                    $element.css(css_attrs);
                    if (opts.persistanceKey) {
                        mega.config.set(opts.persistanceKey, ui.size[size_attr]);
                    }
                    self["current_" + size_attr] = ui.size[size_attr];
                }

                delay('fm-resizable-pane:refresh', () => self.refresh(e, ui));
            },
            'stop': function(e, ui) {
                $.tresizer();
                $(self.element).removeClass('resizable-pane-active');
                $self.trigger('resizestop', [e, ui]);
            }
        };

        if (opts['aspectRatio']) {
            resizable_opts['aspectRatio'] = opts['aspectRatio'];
        }

        resizable_opts['handles'][opts.direction] = $handle;

        $element.resizable(resizable_opts);

        $element.data('fmresizable', this);
    }

    return this;
}

Object.defineProperty(FMResizablePane, 'refresh', {
    value() {
        'use strict';
        if (M.fmTabPages) {
            // @todo revamp if we ever use other than '.fm-left-panel' for these
            const cl = $('.fm-left-panel:visible, .mega-top-menu.ui-resizable:not(.hidden)').data('fmresizable');

            if (cl) {

                cl.setOption('maxWidth', M.fmTabPages['cloud-drive'][M.currentrootid] ? null : 400);
            }

            return cl;
        }
    }
});

function initDownloadDesktopAppDialog() {

    'use strict';

    const $dialog = $('.mega-dialog.mega-desktopapp-download');

    $('.download-app', $dialog).rebind('click.downloadDesktopAppDialog', () => {

        eventlog(500806);
        switch (ua.details.os) {
            case "Apple":
                window.location = megasync.getMegaSyncUrl('mac');
                break;
            case "Windows":
                // Download app for Windows
                window.location = megasync.getMegaSyncUrl(ua.details.is64bit && !ua.details.isARM ?
                    'windows' : 'windows_x32');

                break;
            case "Linux":
                $('aside', $dialog).addClass('hidden');
                mega.redirect('mega.io', '/desktop', false, false, false);
                break;
        }
    });

    clickURLs();
    $('aside a', $dialog).rebind('click.downloadDesktopAppDialog', closeDialog);

    // Close the share dialog
    $('button.js-close', $dialog).rebind('click.downloadDesktopAppDialog', (ev) => {
        eventlog(500805);
        return closeDialog(ev);
    });

    M.safeShowDialog('onboardingDesktopAppDialog', $dialog);
}
