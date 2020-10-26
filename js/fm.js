/**
 * initTextareaScrolling
 *
 * @param {Object} $textarea. DOM textarea element.
 * @param {Number} textareaMaxHeight Textarea max height. Default is 100
 * @param {Boolean} resizeEvent If we need to bind window resize event
 */
function initTextareaScrolling($textarea, textareaMaxHeight, resizeEvent) {
    var textareaWrapperClass = $textarea.parent().attr('class'),
          $textareaClone,
          textareaLineHeight = parseInt($textarea.css('line-height'));
          textareaMaxHeight = textareaMaxHeight ? textareaMaxHeight: 100;

    // Textarea Clone block to define height of autoresizeable textarea
    if (!$textarea.next('div').length) {
        $('<div></div>').insertAfter($textarea);
    }
    $textareaClone = $textarea.next('div');

    function textareaScrolling(keyEvents) {
        var $textareaScrollBlock = $textarea.closest('.textarea-scroll'),
              $textareaCloneSpan,
              textareaContent = $textarea.val(),
              cursorPosition = $textarea.getCursorPosition(),
              jsp = $textareaScrollBlock.data('jsp'),
              viewLimitTop = 0,
              scrPos = 0,
              viewRatio = 0;

        // Set textarea height according to  textarea clone height
        textareaContent = '<span>'+textareaContent.substr(0, cursorPosition) +
                          '</span>' + textareaContent.substr(cursorPosition, textareaContent.length);

        // try NOT to update the DOM twice if nothing had changed (and this is NOT a resize event).
        if (keyEvents && $textareaClone.data('lastContent') === textareaContent) {
            return;
        }
        else {
            $textareaClone.data('lastContent', textareaContent);
            textareaContent = textareaContent.replace(/\n/g, '<br />');
            $textareaClone.safeHTML(textareaContent + '<br />');
        }

        var textareaCloneHeight = $textareaClone.height();
        $textarea.height(textareaCloneHeight);
        $textareaCloneSpan = $textareaClone.children('span');
        var textareaCloneSpanHeight = $textareaCloneSpan.height();
        scrPos = jsp ? $textareaScrollBlock.find('.jspPane').position().top : 0;
        viewRatio = Math.round(textareaCloneSpanHeight + scrPos);

        // Textarea wrapper scrolling init
        if (textareaCloneHeight > textareaMaxHeight) {
            $textareaScrollBlock.jScrollPane(
                {enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: false});
            if (!jsp && keyEvents) {
                $textarea.trigger("focus");
            }
        }
        else if (jsp) {
            jsp.destroy();
            if (keyEvents) {
                $textarea.trigger("focus");
            }
        }

        // Scrolling according cursor position
        if (viewRatio > textareaLineHeight || viewRatio < viewLimitTop) {
            jsp = $textareaScrollBlock.data('jsp');
            if (textareaCloneSpanHeight > 0 && jsp) {
                jsp.scrollToY(textareaCloneSpanHeight - textareaLineHeight);
            }
            else if (jsp) {
                jsp.scrollToY(0);
            }
        }
        $textarea.trigger('autoresized');
    }

    // Init textarea scrolling
    textareaScrolling();

    // Reinit scrolling after keyup/keydown/paste events
    $textarea.off('keyup keydown paste');
    $textarea.on('keyup keydown paste', function() {
        textareaScrolling(1);
    });

    // Bind window resize if textarea is resizeable
    if (resizeEvent) {
        var eventName = textareaWrapperClass.replace(/[_\s]/g, '');
        $(window).rebind('resize.' + eventName, function () {
            textareaScrolling();
        });
    }
}


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
    var $textarea = $addButton.parents('.fm-dialog').find('textarea');
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
                    if (currentContactsEmails.indexOf(email) === -1) {
                        // if invitation is sent, push as added Emails.
                        promises.push(M.inviteContact(M.u[u_handle].m, email, emailText).done(function(res) {
                            addedEmails.push(res);
                        }));
                    }
                });
            }

            // after all process is done, and there is added email(s), show invitation sent dialog.
            MegaPromise.allDone(promises).always(function() {
                if (addedEmails.length > 0) {
                    // Singular or plural
                    if (addedEmails.length === 1) {
                        title = l[150];
                        msg = l[5898];
                    }
                    else {
                        title = l[165] + ' ' + l[5859];
                        msg = l[5899];
                    }
                    contactsInfoDialog(title, addedEmails[0], msg);
                }

                if (cd) {
                    closeDialog();
                    $('.token-input-token-mega').remove();
                }

                loadingDialog.phide();

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
 */
function sharedUInode(nodeHandle) {

    var oShares;
    var bExportLink = false;
    var bAvailShares = false;
    var UiExportLink = new mega.UI.Share.ExportLink();
    var share = new mega.Share();

    if (!fminitialized) {
        if (d) {
            UiExportLink.logger.warn('Skipping sharedUInode call...');
        }
        return;
    }
    if (d) {
        UiExportLink.logger.debug('Entering sharedUInode...');
    }

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
            $('#treea_' + nodeHandle + ' .nw-fm-tree-folder').addClass('shared-folder');

            bAvailShares = true;
        }
    }

    // t === 1, folder
    if (M.d[nodeHandle] && M.d[nodeHandle].t) {
        var icon = fileIcon(M.d[nodeHandle]);

        // Update right panel selected node with appropriate icon for list view
        $('.grid-table.fm #' + nodeHandle + ' .transfer-filetype-icon').addClass(icon);

        // Update right panel selected node with appropriate icon for block view
        $('#' + nodeHandle + '.data-block-view .block-view-file-type').addClass(icon);
    }

    // If no shares are available, remove share icon from left panel, right panel (list and block view)
    if (!bAvailShares) {

        // Left panel
        $('#treea_' + nodeHandle + ' .nw-fm-tree-folder').removeClass('shared-folder');

        // Right panel list view
        $('.grid-table.fm #' + nodeHandle + ' .transfer-filetype-icon').removeClass('folder-shared');

        // Right panel block view
        $('#' + nodeHandle + '.data-block-view .block-view-file-type').removeClass('folder-shared');
    }

    // If no export link is available, remove export link from left and right panels (list and block view)
    if (!bExportLink) {
        UiExportLink.removeExportLinkIcon(nodeHandle);
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
    var $addButton = $scope.find('.add-user-popup-button');

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
        onEmailCheck: function() {
            errorMsg(l[7415]);
        },
        onDoublet: function (u, iType) {
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

                if (itemNum > 1) {
                    $addButton.text(l[19113].replace('%1', itemNum)).removeClass('disabled');
                }
                else if (itemNum === 1) {
                    $addButton.text(l[19112]).removeClass('disabled');
                }
                else {
                    $addButton.text(l[19112]).addClass('disabled');
                }

            });
        },
        onAdd: function() {
            var $inputTokens = $scope.find('.share-added-contact');
            var itemNum = $inputTokens.length;

            if (itemNum === 0) {
                $addButton.text(l[19112]).addClass('disabled');
            }
            else if (itemNum === 1) {
                $addButton.text(l[19112]).removeClass('disabled');
            }
            else {
                var $multiInput = $scope.find('.multiple-input');

                $addButton.text(l[19113].replace('%1', itemNum)).removeClass('disabled');
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
                $addButton.text(l[148]).addClass('disabled');
            }
            else if (itemNum === 1) {
                $addButton.text(l[19112]).removeClass('disabled');
            }
            else {
                $addButton.text(l[19113].replace('%1', itemNum)).removeClass('disabled');
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
 * newContactDialog
 *
 * Handle add new contact dialog UI
 * @param {String} ipcid ipc user id
 * @param {Boolean} close dialog parameter
 */
function newContactDialog(ipcId, close) {
    var $d = $('.fm-dialog.new-contact');
    var $msg = $d.find('.new-user-message');
    var ipc = M.ipc[ipcId];
    var username = ipc.m;

    // Hide
    if (close) {
        closeDialog();
        return true;
    }

    M.safeShowDialog('new-contact', $d);

    // Set default
    $msg.addClass('hidden').find('span').text('');

    $d.find('.new-contact-info span').text(username);

    $d.find('.new-contact-avatar')
        .safeHTML(useravatar.contact(username, 'semi-mid-avatar'));

    if (ipc.msg) {
        $msg.removeClass('hidden').find('span').text(ipc.msg);
    }

    $d.find('.contact-request-button').rebind('click', function() {
        var $self = $(this);
        var $reqRow = $('tr#ipc_' + ipcId);

        if ($self.is('.accept')) {
            if (M.acceptPendingContactRequest(ipcId) === 0) {
                $reqRow.remove();
            }
        }
        else if ($self.is('.delete')) {
            if (M.denyPendingContactRequest(ipcId) === 0) {
                $reqRow.remove();
            }
        }
        else if ($self.is('.ignore')) {
            if (M.ignorePendingContactRequest(ipcId) === 0) {
                $reqRow.remove();
            }
        }

        newContactDialog(ipcId, 1);
    });

    $d.find('.fm-dialog-close').rebind('click', function() {
        newContactDialog(ipcId, 1);
    });
}

/**
 * contactsInfoDialog
 *
 * Handle add new contact dialog UI
 * @param {String} title Dialog title
 * @param {String} username User name/email
 * @param {Boolean} close Dialog parameter
 */
function contactsInfoDialog(title, username, msg, close) {
    var $d = $('.fm-dialog.contact-info');
    var $msg = $d.find('.new-contact-info');

    // Hide
    if (close) {
        closeDialog();
        return true;
    }

    if (title) {
        $d.find('.nw-fm-dialog-title').text(title);
    }
    else {
        $d.find('.nw-fm-dialog-title').text('');
    }

    if (username && msg) {
        $msg.safeHTML(msg.replace(/%1|\[X\]/g, '<span>' + username + '</span>'));
    }
    else if (msg) {
        $msg.text(msg);
    }

    M.safeShowDialog('contact-info', $d);

    $d.find('.fm-dialog-close, .default-white-button.ok').rebind('click', function() {
        contactsInfoDialog(undefined, undefined, undefined, 1);
    });
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
        api_req({ a: 'clc' }, {
            callback: function(res) {
                if (typeof res === 'string') {
                    contactPrefix =  res.match('^C!') ? '' : 'C!';
                    res = 'https://mega.nz/' + contactPrefix + res;
                    $publicLink.attr('data-lnk', res);
                }
            }
        });
    }

    $publicLink.rebind('mouseover.publiclnk', function() {
        var $this = $(this);
        var $tooltip = $('.dropdown.tooltip.small');
        var leftPos = $this.offset().left + $this.width() / 2 - $tooltip.outerWidth() / 2;
        var topPos = $this.offset().top - $tooltip.outerHeight() - 10;

        $tooltip
            .addClass('visible')
            .removeClass('hidden')
            .css({
                'left': leftPos,
                'top': topPos
            });
    });

    $publicLink.rebind('mouseout.publiclnk', function() {
        $('.dropdown.tooltip.small')
            .removeClass('visible')
            .addClass('hidden');
    });

    $publicLink.rebind('click.publiclnk', function() {
        var linkData = $(this).attr('data-lnk') || '';

        if (linkData.length) {
            copyToClipboard(linkData, l[371] + '<span>' + linkData + '</span>', 'short');
        }
    });
}

/**Show Contact VS User difference dialog */
function contactVsUserDialog() {
    "use strict";
    var $dialog = $('.add-reassign-dialog.user-management-dialog');

    $dialog.find('.dif-dlg-contact-add-btn').rebind('click.dlg', function addContactClickHandler() {
        closeDialog();
        return contactAddDialog(null, true);
    });

    $dialog.find('.dif-dlg-close').rebind('click.dlg', function closeClickHandler() {
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
 * @param {Boolean} dontWarnBusiness    if true, then porceed to show the dialog
 */
function contactAddDialog(close, dontWarnBusiness) {
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
    initTokenInputsScroll($('.multiple-input', $d));
    Soon(function() {
        $('.token-input-input-token-mega input', $d).trigger("focus");
    });

    $d.find('.add-user-popup-button').text(l[19112]).addClass('disabled');

    initTextareaScrolling($textarea, 72);
    $d.find('.token-input-input-token-mega input').trigger("focus");
    focusOnInput();

    $d.find('.hidden-textarea-info span').rebind('click', function() {
        $d.addClass('private');
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

    $('.add-user-popup .fm-dialog-close').rebind('click', function() {
        showWarningTokenInputLose().done(closeDialog);
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

    var $contactsTabBlock = $('.contacts-tabs-bl');
    var $sharesTabBlock = $('.shares-tabs-bl');

    $contactsTabBlock.add($sharesTabBlock).addClass('hidden');
    $contactsTabBlock.find('.contacts-tab-lnk.active').removeClass('active');
    $sharesTabBlock.find('.shares-tab-lnk.active').removeClass('active');

    $('.fm-clearbin-button,.fm-add-user,.fm-new-folder,.fm-file-upload,.fm-folder-upload')
        .add('.fm-new-shared-folder,.fm-new-link').addClass('hidden');
    $('.fm-new-folder').removeClass('filled-input');
    $('.fm-right-files-block').removeClass('visible-notification rubbish-bin');
    $('.fm-right-header').removeClass('requests-panel');
    $('.fm-breadcrumbs-block').removeClass('hidden');
    $('.button.link-button.accept-all').addClass('hidden');

    var showUploadBlock = function _showUploadBlock() {
        $('.fm-new-folder').removeClass('hidden');
        $('.fm-file-upload').removeClass('hidden');
        if ((is_chrome_firefox & 2) || 'webkitdirectory' in document.createElement('input')) {
            $('.fm-folder-upload').removeClass('hidden');
        }
        else if (ua.details.engine === 'Gecko') {
            $('.fm-folder-upload').removeClass('hidden');
        }
        else {
            $('.fm-file-upload').addClass('last-button');
        }
    };

    if (M.currentrootid === M.RubbishID) {
        if (M.v.length) {
            $('.fm-clearbin-button').removeClass('hidden');
        }
        $('.fm-right-files-block').addClass('rubbish-bin visible-notification');
    }
    else {
        if (M.currentrootid === M.InboxID) {
            if (d) {
                console.log('Inbox');
            }
        }
        else if (M.currentdirid === 'contacts'
                || M.currentdirid === 'ipc'
                || M.currentdirid === 'opc'
                || (String(M.currentdirid).length === 11
                    && M.currentdirid.substr(0, 6) !== 'search')) {

            M.contactsUI();

            // Update IPC indicator
            delay('updateIpcRequests', updateIpcRequests);

            $('.fm-add-user').removeClass('hidden');
            $contactsTabBlock.removeClass('hidden');

            // Show Accept All button
            if (M.currentdirid === 'ipc' && Object.keys(M.ipc).length > 0) {
                $('.button.link-button.accept-all').removeClass('hidden');
            }

            // Show set active tab, Hide grid/blocks/view buttons
            if (M.currentdirid === 'ipc') {
                $('.fm-right-header').addClass('requests-panel');
                $contactsTabBlock.find('.ipc').addClass('active');
            }
            else if (M.currentdirid === 'opc') {
                $('.fm-right-header').addClass('requests-panel');
                $contactsTabBlock.find('.opc').addClass('active');
            }
            else if (M.currentdirid === 'contacts') {
                $contactsTabBlock.find('.contacts').addClass('active');
            }
            else {
                $('.fm-breadcrumbs-block').addClass('hidden');
                $contactsTabBlock.find('.contacts').addClass('active');
            }

        }
        else if (M.currentrootid === 'shares') {

            M.sharesUI();
            $sharesTabBlock.removeClass('hidden');
            $sharesTabBlock.find('.in-shares').addClass('active');
            $('.fm-right-files-block').addClass('visible-notification');

            if (M.currentdirid !== 'shares' && M.getNodeRights(M.currentdirid) > 0) {
                showUploadBlock();
            }
        }
        else if (M.currentrootid === 'out-shares' || M.currentrootid === 'public-links') {

            M.sharesUI();
            $sharesTabBlock.removeClass('hidden');
            $sharesTabBlock.find('.' + M.currentrootid).addClass('active');
            $('.fm-right-files-block').addClass('visible-notification');

            if (M.currentdirid !== M.currentrootid) {
                showUploadBlock();
            }
            else if (M.currentrootid === 'out-shares') {
                $('.fm-new-shared-folder').removeClass('hidden');
            }
            else {
                $('.fm-new-link').removeClass('hidden');
            }
        }
        else if (String(M.currentdirid).length === 8
            && M.getNodeRights(M.currentdirid) > 0) {

            $('.fm-right-files-block').addClass('visible-notification');
            showUploadBlock();
        }
    }
    $('.fm-clearbin-button').rebind('click', function() {
        doClearbin(true);
    });
}

function fmLeftMenuUI() {

    "use strict";

    // handle the Inbox section use cases
    if (M.hasInboxItems()) {
        $('.nw-fm-left-icon.inbox').removeClass('hidden');
    }
    else {
        $('.nw-fm-left-icon.inbox').addClass('hidden');

        if (M.InboxID && M.currentrootid === M.InboxID) {
            M.openFolder(M.RootID);
        }
    }

    // handle the RubbishBin icon changes
    var $icon = $('.nw-fm-left-icon.rubbish-bin');
    var rubNodes = Object.keys(M.c[M.RubbishID] || {});

    if (rubNodes.length) {

        if (!$icon.hasClass('filled')) {
            $icon.addClass('filled');
        }
        else if (!$icon.hasClass('glow')) {
            $icon.addClass('glow');
        }
        else {
            $icon.removeClass('glow');
        }
    }
    else {
        $icon.removeClass('filled glow');
    }

    if (mega.flags.refpr) {
        $('.nw-fm-left-icon.affiliate').removeClass('hidden');
    }
    else {
        $('.nw-fm-left-icon.affiliate').addClass('hidden');
    }
}

function doClearbin(all) {
    "use strict";

    msgDialog('clear-bin', l[14], l[15], l[1007], function(e) {
        if (e) {
            M.clearRubbish(all);
        }
    });
}

function handleResetSuccessDialogs(dialog, txt, dlgString) {

    $('.fm-dialog' + dialog + ' .reg-success-txt').text(txt);

    $('.fm-dialog' + dialog + ' .default-white-button').rebind('click', function() {
        $('.fm-dialog-overlay').addClass('hidden');
        $('body').removeClass('overlayed');
        $('.fm-dialog' + dialog).addClass('hidden');
        delete $.dialog;
    });

    $('.fm-dialog-overlay').removeClass('hidden');
    $('body').addClass('overlayed');
    $('.fm-dialog' + dialog).removeClass('hidden');

    $.dialog = dlgString;
}

function avatarDialog(close) {
    'use strict';

    var $dialog = $('.fm-dialog.avatar-dialog');

    if (close) {
        closeDialog();
        return true;
    }

    M.safeShowDialog('avatar', $dialog);

    $('.avatar-body').safeHTML(
        '<div id="avatarcrop">' +
            '<div class="image-upload-and-crop-container">' +
                '<div class="image-explorer-container empty">' +
                    '<div class="image-explorer-image-view">' +
                        '<img class="image-explorer-source" />' +
                        '<div class="avatar-white-bg"></div>' +
                        '<div class="image-explorer-mask circle-mask"></div>' +
                        '<div class="image-explorer-drag-delegate"></div>' +
                    '</div>' +
                    '<div class="image-explorer-scale-slider-wrapper">' +
                        '<div class="image-explorer-scale-slider-minus"></div>' +
                        '<input class="image-explorer-scale-slider disabled" type="range" ' +
                            'min="0" max="100" step="1" value="0" disabled="" />' +
                        '<div class="image-explorer-scale-slider-plus"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="fm-notifications-bottom">' +
                    '<input type="file" id="image-upload-and-crop-upload-field" class="image-upload-field" ' +
                        'accept="image/jpeg, image/gif, image/png" />' +
                    '<label for="image-upload-and-crop-upload-field" ' +
                        'class="image-upload-field-replacement default-white-button right">' +
                        '<span>@@</span>' +
                    '</label>' +
                    '<div class="default-white-button right" id="fm-change-avatar">' +
                        '<span>@@</span>' +
                    '</div>' +
                    '<div  class="default-white-button right" id="fm-cancel-avatar">' +
                        '<span>@@</span>' +
                    '</div>' +
                    '<div  class="default-white-button right" id="fm-remove-avatar">' +
                    '<span>@@</span>' +
                    '</div>' +
                    '<div class="clear"></div>' +
                '</div>' +
            '</div>' +
        '</div>', l[1016], l[1017], l[82], l[6974]);
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
    $('#fm-cancel-avatar,.fm-dialog.avatar-dialog .fm-dialog-close').rebind('click', function(e)
    {
        avatarDialog(1);
    });

    $("#fm-remove-avatar").rebind('click', function()
    {
        msgDialog('confirmation', "confirm-remove-avatar", l[18699], l[6973], function(response) {
            if (response){
                mega.attr.set('a', "none", true, false);
                avatarDialog(1);
            }
        });
    });
}


/**
 * Really simple shortcut logic for select all, copy, paste, delete
 * Note: there is another key binding on initUIKeyEvents() for filemanager.
 *
 * @constructor
 */
function FMShortcuts() {

    var current_operation = null;

    $(window).rebind('keydown.fmshortcuts', function(e) {
        var isContactRootOrShareRoot = false;
        if (
            !is_fm() ||
            !selectionManager ||
            M.currentrootid === 'chat' || // prevent shortcut for chat
            M.currentrootid === undefined // prevent shortcut for file transfer, dashboard, settings
        ) {
            return true;
        }
        else if (M.currentdirid === 'contacts' || M.currentdirid === 'shares') {
            isContactRootOrShareRoot = true;
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
                if (M.currentdirid === 'ipc' || M.currentdirid === 'opc') {
                    return;
                }
                selectionManager.select_all();
            }
            return false; // stop prop.
        }
        else if (
            (charTyped === "c" || charTyped === "x") &&
            (e.ctrlKey || e.metaKey) &&
            !isContactRootOrShareRoot
        ) {
            var items = clone(selectionManager.get_selected());
            if (items.length === 0 || M.currentdirid === 'ipc' || M.currentdirid === 'opc') {
                return; // dont do anything.
            }

            current_operation = {
                'op': charTyped == "c" ? 'copy' : 'cut',
                'src': items
            };

            return false; // stop prop.
        }
        else if (
            charTyped === "v" &&
            (e.ctrlKey || e.metaKey) &&
            !isContactRootOrShareRoot
        ) {
            if (!current_operation || (M.getNodeRights(M.currentdirid || '') | 0) < 1
                || M.currentdirid === 'ipc' || M.currentdirid === 'opc') {
                return false; // stop prop.
            }

            var handles = [];
            $.each(current_operation.src, function(k, v) {
                handles.push(v);
            });

            if (current_operation.op == "copy") {
                M.copyNodes(handles, M.currentdirid);
            } else if (current_operation.op == "cut") {
                M.moveNodes(handles, M.currentdirid);
                current_operation = null;
            }

            return false; // stop prop.
        }
        else if (
            charCode === 8 &&
            !isContactRootOrShareRoot
        ) {
            var remItems = selectionManager.get_selected();
            if (remItems.length === 0 || (M.getNodeRights(M.currentdirid || '') | 0) < 2) {
                return; // dont do anything.
            }

            fmremove(remItems);

            // force remove, no confirmation
            if (e.ctrlKey || e.metaKey) {
                $('#msgDialog:visible .fm-dialog-button.confirm').trigger('click');
            }

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
 * Looking for a already existing name of URL (M.v)
 * @param {String} value New file/folder name
 * @param {String} target {optional}Target handle to check the duplication inside. if not provided M.v will be used
 */
function duplicated(value, target) {
    "use strict";
    if (!target) {
        var items = M.v.filter(function (item) {
            return item.name === value;
        });

        return items.length !== 0;
    }
    else {
        if (M.c[target]) {
            // Check if a folder/file with the same name already exists.
            for (var handle in M.c[target]) {
                if (M.d[handle] && M.d[handle].name === value) {
                    return true;
                }
            }
        }
        return false;
    }
}

function renameDialog() {
    "use strict";

    if ($.selected.length > 0) {
        var n = M.d[$.selected[0]] || false;
        var nodeType = n.t;// file: 0, folder: 1
        var ext = fileext(n.name);
        var $dialog = $('.fm-dialog.rename-dialog');
        var $input = $('input', $dialog);
        var errMsg = '';

        M.safeShowDialog('rename', function() {
            $dialog.removeClass('hidden').addClass('active');
            $input.trigger("focus");
            return $dialog;
        });

        $('.fm-dialog-close, .rename-dialog-button.cancel', $dialog).rebind('click', closeDialog);

        $('.rename-dialog-button.rename').rebind('click', function() {
            if ($dialog.hasClass('active')) {
                var value = $input.val();
                errMsg = '';

                if (n.name && value !== n.name) {
                    if (!value) {
                        errMsg = l[5744];
                    }
                    else if (M.isSafeName(value)) {
                        var targetFolder = n.p;
                        if (duplicated(value, targetFolder)) {
                            errMsg = l[23219];
                        }
                        else {
                            M.rename(n.h, value);
                        }
                    }
                    else {
                        errMsg = l[7436];
                    }

                    if (errMsg) {
                        $dialog.find('.duplicated-input-warning span').text(errMsg);
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

        $('.fm-dialog-title', $dialog).text(n.t ? l[425] : l[426]);
        $input.val(n.name);

        $('.transfer-filetype-icon', $dialog)
            .attr('class', 'transfer-filetype-icon ' + fileIcon(n));

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

        $input.rebind('keydown', function (event) {
            // distingushing only keydown evet, then checking if it's Enter in order to preform the action'
            if (event.keyCode === 13) { // Enter
                $('.rename-dialog-button.rename').click();
                return;
            }
            else if (event.keyCode === 27){ // ESC
                closeDialog();
            }
            else {
                $dialog.removeClass('duplicate').addClass('active');
                $input.removeClass('error');
            }
        });
    }
}

function msgDialog(type, title, msg, submsg, callback, checkbox) {
    var doneButton  = l[81];
    var extraButton = String(type).split(':');
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
    $.msgDialog = type;
    $.warningCallback = callback;

    $('#msgDialog').removeClass('clear-bin-dialog confirmation-dialog warning-dialog-b warning-dialog-a ' +
        'notification-dialog remove-dialog delete-contact loginrequired-dialog multiple wide with-close-btn');
    $('#msgDialog .icon').removeClass('fm-bin-clear-icon .fm-notification-icon');
    $('#msgDialog .confirmation-checkbox').addClass('hidden');

    if (type === 'clear-bin') {
        $('#msgDialog').addClass('clear-bin-dialog');
        $('#msgDialog .icon').addClass('fm-bin-clear-icon');
        $('#msgDialog .fm-notifications-bottom')
            .safeHTML(
                '<div class="button default-green-button semi-big right confirm">' +
                    '<span>@@</span>' +
                '</div>' +
                '<div class="button default-white-button semi-big right cancel"><span>@@</span></div>' +
                '<div class="clear"></div>', extraButton || l[1018], l[82]);

        $('#msgDialog .default-green-button').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
                $.warningCallback = null;
            }
        });
        $('#msgDialog .default-white-button').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
                $.warningCallback = null;
            }
        });
    }
    else if (type === 'delete-contact') {
        $('#msgDialog').addClass('delete-contact');
        $('#msgDialog .fm-notifications-bottom')
            .safeHTML('<div class="button default-green-button semi-big right confirm">' +
                '<span>@@</span></div>' +
                '<div class="button default-white-button semi-big right cancel"><span>@@</span></div>' +
                '<div class="clear"></div>', l[78], l[79]);

        $('#msgDialog .default-green-button').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
                $.warningCallback = null;
            }
        });
        /*!1*/
        $('#msgDialog .default-white-button').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
                $.warningCallback = null;
            }
        });
    }
    else if (type === 'warninga' || type === 'warningb' || type === 'info') {
        if (extraButton) {
            $('#msgDialog .fm-notifications-bottom')
                .safeHTML(
                    '<div class="button default-green-button semi-big right confirm">' +
                        '<span>@@</span>' +
                    '</div>' +
                    '<div class="button default-white-button semi-big right cancel">' +
                        '<span>@@</span>' +
                    '</div>' +
                    '<div class="clear"></div>', doneButton, extraButton
                );

            $('#msgDialog .default-green-button').rebind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(false);
                    $.warningCallback = null;
                }
            });
            /*!2*/
            $('#msgDialog .default-white-button').rebind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(true);
                    $.warningCallback = null;
                }
            });
        }
        else {
            $('#msgDialog .fm-notifications-bottom')
                .safeHTML(
                    '<div class="button default-white-button semi-big right"><span>@@</span></div>' +
                    '<div class="clear"></div>', l[81]
                );

            $('#msgDialog .default-white-button').rebind('click', function() {
                closeMsg();
                if ($.warningCallback) {
                    $.warningCallback(true);
                    $.warningCallback = null;
                }
            });
        }

        $('#msgDialog .icon').addClass('fm-notification-icon');
        if (type === 'warninga') {
            $('#msgDialog').addClass('warning-dialog-a');
        }
        else if (type === 'warningb') {
            $('#msgDialog').addClass('warning-dialog-b');
        }
        else if (type === 'info') {
            $('#msgDialog').addClass('notification-dialog');
        }
    }
    else if (type === 'confirmation' || type === 'remove') {
        if (doneButton === l[81]) {
            doneButton = false;
        }
        $('#msgDialog .fm-notifications-bottom')
            .safeHTML('<div class="checkbox-block top-pad hidden">' +
                '<div class="checkdiv checkboxOff">' +
                    '<input type="checkbox" name="confirmation-checkbox" ' +
                        'id="confirmation-checkbox" class="checkboxOff">' +
                '</div>' +
                '<label for="export-checkbox" class="radio-txt">@@</label></div>' +
                '<div class="button default-green-button semi-big right confirm">' +
                    '<span>@@</span>' +
                '</div>' +
                '<div class="button default-white-button semi-big right cancel"><span>@@</span></div>' +
                '<div class="clear"></div>', l[229], doneButton || l[78], extraButton || l[79]);

        $('#msgDialog .default-green-button').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(true);
                $.warningCallback = null;
            }
        });
        /*!3*/
        $('#msgDialog .default-white-button').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback(false);
                $.warningCallback = null;
            }
        });
        $('#msgDialog .icon').addClass('fm-notification-icon');
        $('#msgDialog').addClass('confirmation-dialog');
        if (type === 'remove') {
            $('#msgDialog').addClass('remove-dialog');
        }

        if (checkbox) {
            $('#msgDialog .checkbox-block .checkdiv,' +
                '#msgDialog .checkbox-block input')
                    .removeClass('checkboxOn').addClass('checkboxOff');

            $.warningCheckbox = false;
            $('#msgDialog .checkbox-block').removeClass('hidden');
            $('#msgDialog .checkbox-block').rebind('click', function() {
                var $o = $('#msgDialog .checkbox-block .checkdiv, #msgDialog .checkbox-block input');
                if ($('#msgDialog .checkbox-block input').hasClass('checkboxOff')) {
                    $o.removeClass('checkboxOff').addClass('checkboxOn');
                    localStorage.skipDelWarning = 1;
                }
                else {
                    $o.removeClass('checkboxOn').addClass('checkboxOff');
                    delete localStorage.skipDelWarning;
                }
            });
        }
    }
    else if (type === 'import_login_or_register') {
        // Show import confirmation dialog if a user isn't logged in
        $('#msgDialog').addClass('warning-dialog-a wide with-close-btn');
        $('#msgDialog .fm-notifications-bottom')
            .safeHTML('<div class="bottom-bar-link">@@</div>' +
                '<div class="button default-green-button semi-big right confirm">' +
                    '<span>@@</span>' +
                '</div>' +
                '<div class="button default-white-button semi-big right cancel">' +
                    '<span>@@</span>' +
                '</div>' +
                '<div class="clear"></div></div>', l[20754], l[170], l[171]);

        // Register a new account to complete the import
        $('#msgDialog .default-green-button').rebind('click', function() {
            closeMsg();
            if ($.warningCallback) {
                $.warningCallback('register');
                $.warningCallback = null;
            }
        });
        // Login to complete the import
        $('#msgDialog .default-white-button').rebind('click', function() {
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

    $('#msgDialog .fm-dialog-title span').text(title);

    $('#msgDialog .fm-notification-info h1').safeHTML(msg);
    clickURLs();
    if (submsg) {
        $('#msgDialog .fm-notification-info p').safeHTML(submsg);
        $('#msgDialog .fm-notification-info p').removeClass('hidden');
    }
    else {
        $('#msgDialog .fm-notification-info p').addClass('hidden');
    }

    $('#msgDialog .fm-dialog-close').rebind('click', function() {
        closeMsg();
        if ($.warningCallback) {
            $.warningCallback(false);
            $.warningCallback = null;
        }
    });
    $('#msgDialog').removeClass('hidden');
    fm_showoverlay();

    if ($.dialog) {
        $('.fm-dialog:not(#msgDialog)').addClass('arrange-to-back');
    }
}

function closeMsg() {
    $('#msgDialog').addClass('hidden');

    if ($.dialog) {
        $('.fm-dialog').removeClass('arrange-to-back');
    }
    else {
        fm_hideoverlay();
    }

    delete $.msgDialog;
}

function dialogPositioning(s) {
    $(s).css('margin-left', '-' + $(s).outerWidth() / 2 + 'px');
    $(s).css('margin-top', '-' + $(s).outerHeight() / 2 + 'px');
}

/**
 * opens a contact link dialog, after getting all needed info from API
 *
 * @param {String} contactLink, user contact link, the link we want to get.
 * @returns {null} no return value
 */
function openContactInfoLink(contactLink) {
    var $dialog = $('.fm-dialog.qr-contact');
    var QRContactDialogPrepare = function QRContactDialogPrepare(em, fullname, ctHandle) {
        $('.qr-contact-name', $dialog).text(fullname);
        $('.qr-contact-email', $dialog).text(em);

        var curAvatar = useravatar.contact(em);
        $('.avatar-container-qr-contact', $dialog).html(curAvatar);

        var contactStatus = 1;
        if (u_handle) {
            if (ctHandle === u_handle) {
                $('#qr-ctn-add', $dialog).addClass('disabled');
                $('#qr-ctn-add', $dialog).off('click');
                $('.qr-ct-exist', $dialog).text(l[18514]).removeClass('hidden');
            }
            else if (M.u[ctHandle] && M.u[ctHandle]._data.c) {
                contactStatus = 2;
                $('#qr-ctn-add', $dialog).addClass('disabled');
                $('.qr-ct-exist', $dialog).text(l[17886]).removeClass('hidden');
                $('#qr-ctn-add', $dialog).off('click');
            }
            else {
                $('.big-btn-txt', $dialog).text(l[101]);
                $('#qr-ctn-add', $dialog).removeClass('disabled');
                $('.qr-ct-exist', $dialog).addClass('hidden');
                $('#qr-ctn-add', $dialog).rebind('click', function () {
                    if (contactStatus === 1) {
                        M.inviteContact(u_attr.email, em, null, contactLink);
                    }
                    $('#qr-ctn-add', $dialog).off('click');
                    closeDialog();

                    return false;
                });

                // This contact link is valid to be affilaited
                M.affiliate.storeAffiliate(contactLink, 4);
            }
        }
        else {
            $('.big-btn-txt', $dialog).text(l[101]);
            $('#qr-ctn-add', $dialog).removeClass('disabled');
            $('.qr-ct-exist', $dialog).addClass('hidden');
            $('#qr-ctn-add', $dialog).rebind('click', function () {
                closeDialog();
                var page = 'fm/contacts';
                mBroadcaster.once('fm:initialized', function () {
                    openContactInfoLink(contactLink);
                });

                // This contact link is not checked but stored for register case
                // and also user click `add contact` anyway so it's user's call
                M.affiliate.storeAffiliate(contactLink, 4);

                login_next = page;
                login_txt = l[1298];
                return loadSubPage('login');
            });
        }
        $dialog.removeClass('hidden');
    };
    $dialog.find('.fm-dialog-close')
        .rebind('click', function () {
            closeDialog();
            return false;
        });
    var req = { a: 'clg', cl: contactLink };
    api_req(req, {
        callback: function (res, ctx) {
            if (typeof res === 'object') {
                M.safeShowDialog('qr-contact', function () {
                    QRContactDialogPrepare(res.e, res.fn + ' ' + res.ln, res.h);
                    return $dialog;
                });

            }
            else {
                msgDialog('warningb', l[8531], l[17865]);
            }
        }
    });
}

/**
 * IFunction to open QR customization dialog.
 * Access QR Code Dialog, can be accessed from dashboard -> QR widget, and from settings -> security
 *
 * @returns {null} no returned value
 */
function openAccessQRDialog() {
    "use strict";

    var $dialog = $('.fm-dialog.qr-dialog');

    var QRdialogPrepare = function _QRdialogPrepare() {

        var curAvatar;

        $dialog.removeClass('hidden');
        $dialog.removeClass('disabled');

        if (M.account.contactLink && M.account.contactLink.length) {

            var myHost = getBaseUrl() + '/' + M.account.contactLink;
            var QRoptions = {
                width: 222,
                height: 222,
                correctLevel: QRErrorCorrectLevel.H,    // high
                foreground: '#D90007',
                text: myHost
            };

            $('.qr-icon-big', $dialog).text('').qrcode(QRoptions);
            $('.qr-http-link', $dialog).text(myHost);

            curAvatar = useravatar.contact(u_handle);
            $('.avatar-container-qr', $dialog).html(curAvatar);

            var handleAutoAccept = function _handleAutoAccept(autoAcc) {

                if (autoAcc === '0') {

                    $('.qr-dialog-label .dialog-feature-toggle', $dialog).removeClass('toggle-on');
                }
                else {

                    // if  it's 1 or not set
                    $('.qr-dialog-label .dialog-feature-toggle', $dialog).addClass('toggle-on');
                }
            };

            mega.attr.get(u_handle, 'clv', -2, 0).always(handleAutoAccept);
        }
    };

    $('.fm-dialog-close, #qr-dlg-close', $dialog).rebind('click', function() {

        closeDialog();
        return false;
    });

    $('.qr-dialog-label .dialog-feature-toggle', $dialog).rebind('click', function() {

        var $this = $(this);

        if ($this.hasClass('toggle-on')) {

            $this.removeClass('toggle-on');
            mega.attr.set('clv', 0, -2, 0);
        }
        else {

            $this.addClass('toggle-on');
            mega.attr.set('clv', 1, -2, 0);
        }
    });

    $('.reset-qr-label', $dialog).rebind('click', function() {

        // QR Code Regenerate
        var msgTitle = l[18227];
        // You are about to generate a new QR code.
        // Your <b>existing</b> QR code and invitation link will no longer work.
        var msgMsg = l[18228] + ' ';
        // Do you want to proceed?
        var msgQuestion = l[18229];

        msgDialog('confirmation', msgTitle, msgMsg, msgQuestion, function(regenQR) {

            if (regenQR) {
                $dialog.addClass('disabled');
                var delQR = {
                    a: 'cld',
                    cl: M.account.contactLink.substring(2, M.account.contactLink.length)
                };
                var reGenQR = { a: 'clc' };

                api_req(delQR, {
                    callback: function(res) {
                        // success
                        if (res === 0) {

                            api_req(reGenQR, {
                                callback: function(res2) {

                                    if (typeof res2 === 'string') {
                                        res2 = 'C!' + res2;
                                    }
                                    else {
                                        res2 = '';
                                    }

                                    M.account.contactLink = res2;
                                    QRdialogPrepare();
                                }
                            });
                        }
                        else {
                            $dialog.removeClass('disabled');
                        }
                    }
                });
            }
        });
    });

    if (is_extension || M.execCommandUsable()) {

        $('#qr-dlg-cpy-lnk').removeClass('hidden').rebind('click', function() {
            var links = $.trim($('.qr-http-link', $dialog).text());
            var toastTxt = l[7654];

            copyToClipboard(links, toastTxt);
        });
    }
    else {
        $('#qr-dlg-cpy-lnk').addClass('hidden');
    }

    if (ua.details.browser === "Chrome") {

        $('#qr-dlg-sv-img', $dialog).removeClass('hidden').rebind('click', function() {
            var canvasQR = $('.qr-icon-big canvas', $dialog)[0];
            var genImageURL = canvasQR.toDataURL();
            var link = document.createElement("a");

            link.setAttribute("href", genImageURL);
            link.setAttribute("download", M.account.contactLink);
            //link.addClass('hidden');
            link.click();
        });
    }
    else {

        $('#qr-dlg-sv-img', $dialog).addClass('hidden');
    }

    M.safeShowDialog('qr-dialog', function() {

        QRdialogPrepare();
        return $dialog;
    });

}




/**
 * shareDialogContentCheck
 *
 * Taking care about share dialog button 'Done'/share enabled/disabled and scroll
 *
 */
function shareDialogContentCheck() {

    var dc = '.share-dialog',
        itemsNum = 0,
        newItemsNum = 0,
        $btn = $('.default-green-button.dialog-share-button');
    var $groupPermissionDropDown = $('.share-dialog .permissions-icon');

    newItemsNum = $(dc + ' .token-input-token-mega').length;
    itemsNum = $(dc + ' .share-dialog-contacts .share-dialog-contact-bl').length;

    if (itemsNum) {

        $(dc + ' .share-dialog-img').addClass('hidden');
        $(dc + ' .share-dialog-contacts').removeClass('hidden');
        handleDialogScroll(itemsNum, dc);
    }
    else {
        $(dc + ' .share-dialog-img').removeClass('hidden');
        $(dc + ' .share-dialog-contacts').addClass('hidden');
    }

    // If new items are availble in multiInput box
    // or permission is changed on some of existing items
    if (newItemsNum || $.changedPermissions.length || $.removedContactsFromShare.length) {
        $btn.removeClass('disabled');
    }
    else {
        $btn.addClass('disabled');
    }

    if (newItemsNum) {
        $groupPermissionDropDown.removeClass('disabled');
    }
    else {
        $groupPermissionDropDown.addClass('disabled');
    }
}

function addShareDialogContactToContent(userEmail, type, id, av, userName, permClass, permText) {

    var html = '',
        htmlEnd = '',
        item = '',
        exportClass = '';

    var contactEmailHtml = '';

    if (userEmail !== userName) {
        contactEmailHtml = '<div class="contact-email">'
            + htmlentities(userEmail)
            + '</div>';
    }

    item = av
        + '<div class="fm-share-user-info">'
        + '<div class="fm-share-centered">'
        + '<div class="fm-chat-user">' + htmlentities(userName) + '</div>'
        + contactEmailHtml
        + '</div>'
        + '</div>';

    html = '<div class="share-dialog-contact-bl ' + type + '" id="sdcbl_' + id + '">'
           + item
           + '<div class="share-dialog-remove-button"></div>'
           + '<div class="share-dialog-permissions ' + permClass + '">'
           + '<span></span>' + permText
           +  '</div>';


    htmlEnd = '<div class="clear"></div>'
              + '</div>';

    return html + htmlEnd;
}

function fillShareDialogWithContent() {

    $.sharedTokens = [];// GLOBAL VARIABLE, Hold items currently visible in share folder content (above multi-input)
    $.changedPermissions = [];// GLOBAL VAR, changed permissions shared dialog
    $.removedContactsFromShare = [];// GLOBAL VAR, removed contacts from a share

    var pendingShares = {};
    var nodeHandle    = String($.selected[0]);
    var node          = M.getNodeByHandle(nodeHandle);
    var userHandles   = M.getNodeShareUsers(node, 'EXP');

    if (M.ps[nodeHandle]) {
        pendingShares = Object(M.ps[nodeHandle]);
        userHandles   = userHandles.concat(Object.keys(pendingShares));
    }
    var seen = Object.create(null);

    userHandles.forEach(function(handle) {
        var user = M.getUser(handle) || Object(M.opc[handle]);

        if (!user.m) {
            console.warn('Unknown user "%s"!', handle);
        }
        else if (!seen[user.m]) {
            var name  = M.getNameByHandle(handle) || user.m;
            var share = M.getNodeShare(node, handle) || Object(pendingShares[handle]);

            generateShareDialogRow(name, user.m, share.r | 0, handle);
            seen[user.m] = 1;
        }
    });
}

/**
 * Generates and inserts a share or pending share row into the share dialog
 * @param {String} displayNameOrEmail
 * @param {String} email
 * @param {Number} shareRights
 * @param {String} userHandle Optional
 */
function generateShareDialogRow(displayNameOrEmail, email, shareRights, userHandle) {

    var rowId = '',
        html = '',
        av =  useravatar.contact(email, 'small-rounded-avatar square'),
        perm = '',
        permissionLevel = 0;

    if (typeof shareRights != 'undefined') {
        permissionLevel = shareRights;
    }

    // Permission level
    if (permissionLevel === 1) {
        perm = ['read-and-write', l[56]];
    } else if (permissionLevel === 2) {
        perm = ['full-access', l[57]];
    } else {
        perm = ['read-only', l[55]];
    }

    // Add contact
    $.sharedTokens.push(email);

    // Update token.input plugin
    removeFromMultiInputDDL('.share-multiple-input', {id: email, name: email});

    rowId = (userHandle) ? userHandle : email;
    html = addShareDialogContactToContent(email, '', rowId, av, displayNameOrEmail, perm[0], perm[1]);

    $('.share-dialog .share-dialog-contacts').safeAppend(html);
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
 * sharedPermissionLevel
 *
 * Translate class name to numeric permission level.
 * @param {String} value Permission level as a string i.e. 'read-and-write', 'full-access', 'read-only'.
 * @returns {Number} integer value of permission level.
 */
function sharedPermissionLevel(value) {

    var permissionLevel = 0;

    if (value === 'read-and-write') {
        permissionLevel = 1; // Read and Write access
    }
    else if (value === 'full-access') {
        permissionLevel = 2; // Full access
    }
    else {
        permissionLevel = 0; // read-only
    }

    return permissionLevel;
}

/**
 * initShareDialogMultiInputPlugin
 *
 * Initialize share dialog multi input plugin
 */
function initShareDialogMultiInputPlugin() {
    "use strict";

    // Plugin configuration
    var contacts = M.getContactsEMails();

    var errorMsg = function(msg) {

        var $shareDialog = $('.share-dialog');
        var $warning = $shareDialog.find('.multiple-input-warning span');

        $warning.text(msg);
        $shareDialog.addClass('error');

        setTimeout(function() {
            $shareDialog.removeClass('error');
        }, 3000);
    };

    var $scope = $('.share-dialog');
    var $input = $('.share-multiple-input', $scope);

    // Clear old values in case the name/nickname updated since last opening
    $input.tokenInput('destroy');

    $input.tokenInput(contacts, {
        theme: "mega",
        placeholder: l[19108],// Enter one or more email address
        searchingText: "",
        noResultsText: "",
        addAvatar: true,
        autocomplete: null,
        searchDropdown: true,
        emailCheck: true,
        preventDoublet: false,
        tokenValue: "id",
        propertyToSearch: "name",
        resultsLimit: 5,
        minChars: 1,
        accountHolder: (M.u[u_handle] || {}).m || '',
        scrollLocation: 'share',
        // Exclude from dropdownlist only emails/names which exists in multi-input (tokens)
        excludeCurrent: true,

        onEmailCheck: function() {
            errorMsg(l[7415]); // Looks like there's a malformed email
        },
        onReady: function() {
            dialogPositioning($scope);
        },
        onDoublet: function(u) {
            errorMsg(l[7413]); // You already have a contact with that email
        },
        onHolder: function() {
            errorMsg(l[7414]); // There's no need to add your own email address
        },
        onAdd: function(item) {
            var $scope = $('.share-dialog');
            // If the user is not already a contact, then show a text area
            // where they can add a custom message to the pending share request
            if (checkIfContactExists(item.id) === false) {
                $('.share-message', $scope).show();
                initTextareaScrolling($('.share-message-textarea textarea', $scope), 72);
            }

            $('.dialog-share-button', $scope).removeClass('disabled');

            // Enable group permission change drop down list
            $('.permissions-icon', $scope).removeClass('disabled');

            dialogPositioning($scope);
        },
        onDelete: function() {
            var $scope = $('.share-dialog');
            var $btn = $('.dialog-share-button', $scope);
            var iNewItemsNum;
            var iItemsNum;

            setTimeout(function() {
                $scope.find('.token-input-input-token-mega input').trigger("blur");
            }, 0);

            iNewItemsNum = $scope.find('.token-input-list-mega .token-input-token-mega').length;
            iItemsNum = $scope.find('.share-dialog-contacts .share-dialog-contact-bl').length;

            // If new items are still availble in multiInput box
            // or permission is changed on some of existing items
            if (iNewItemsNum  || $.changedPermissions.length || $.removedContactsFromShare.length) {
                $btn.removeClass('disabled');
            }
            else {
                $btn.addClass('disabled');
            }

            if (!iNewItemsNum) {

                // Disable group permission change drop down list
                $('.permissions-icon', $scope).addClass('disabled');
            }

            dialogPositioning($scope);
        }
    });
}


function initShareDialog() {
    "use strict";

    var $dialog = $('.share-dialog');

    $.shareTokens = [];

    /*if (!u_type) {
        return; // not for ephemeral
    }*/

    // Prevents double initialization of token input
    if (!$('.share-multiple-input', $dialog).tokenInput("getSettings")) {

        initShareDialogMultiInputPlugin();
    }

    var menuPermissionState = function($this) {

        var mi = '.permissions-menu .permissions-menu-item';
        var cls = checkMultiInputPermission($this);

        $(mi, $dialog).removeClass('active');

        $(mi + '.' + cls[0], $dialog).addClass('active');
    };

    var handlePermissionMenu = function($this, m, x, y) {

        m.css('left', x + 'px');
        m.css('top', y + 'px');
        menuPermissionState($this);
        $this.addClass('active');
        m.fadeIn(200);
    };

    $dialog.rebind('click', function(e) {

        var hideMenus = function() {

            // share dialog permission menu
            $('.permissions-menu', $this).fadeOut(200);
            $('.import-contacts-dialog').fadeOut(200);
            $('.permissions-icon', $this).removeClass('active');
            $('.share-dialog-permissions', $this).removeClass('active');
            closeImportContactNotification('.share-dialog');
            $('.import-contacts-service', $this).removeClass('imported');
        };

        var $this = $(this);

        if (typeof e.originalEvent.path !== 'undefined') {

            // This's sensitive to dialog DOM element positioning
            var trg = e.originalEvent.path[0];
            var trg1 = e.originalEvent.path[1];
            var trg2 = e.originalEvent.path[2];

            if (!$(trg).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions')
                && !$(trg1).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions')
                && !$(trg2).is('.permissions-icon,.import-contacts-link,.share-dialog-permissions'))
            {
                hideMenus();
            }
        }
        else if ($this.get(0) === e.currentTarget) {
            hideMenus();
        }
    });

    $('.fm-dialog-close, .dialog-cancel-button', $dialog).rebind('click', function() {
        $('.export-links-warning').addClass('hidden');
        showWarningTokenInputLose().done(closeDialog);
    });

    /*
     * On share dialog, done/share button
     *
     * Adding new contacts to shared item
     */
    $('.dialog-share-button', $dialog).rebind('click', function(e) {
        e.stopPropagation();
        // since addNewContact goes by itself and fetch data from HTML. we cant intercept exited
        // contacts here.
        addNewContact($(this), false).done(function() {
            var share = new mega.Share();
            share.updateNodeShares().always(function() {
                $('.token-input-token-mega').remove();
            });
        });
    });

    $dialog.off('click', '.share-dialog-remove-button');
    $dialog.on('click', '.share-dialog-remove-button', function() {

        var $this = $(this);

        var handleOrEmail = $this.parent().attr('id').replace('sdcbl_', '');

        $this.parent()
            .fadeOut(200)
            .remove();

        var selectedNodeHandle = $.selected[0];
        if (handleOrEmail !== '') {

            // Due to pending shares, the id could be an email instead of a handle
            var userEmail = Object(M.opc[handleOrEmail]).m || handleOrEmail;

            $.removedContactsFromShare.push({
                'selectedNodeHandle': selectedNodeHandle,
                'userEmail': userEmail,
                'handleOrEmail': handleOrEmail
            });

            $.sharedTokens.splice($.sharedTokens.indexOf(userEmail), 1);
        }

        shareDialogContentCheck();
    });

    // related to specific contact
    $dialog.off('click', '.share-dialog-permissions');
    $dialog.on('click', '.share-dialog-permissions', function(e) {

        var $this = $(this);
        var $m = $('.permissions-menu', $dialog);
        var scrollBlock = $('.share-dialog-contacts .jspPane', $dialog);
        var scrollPos = 0;
        var x = 0;
        var y = 0;

        $m.removeClass('search-permissions');

        if (scrollBlock.length) {
            scrollPos = scrollBlock.position().top;
        }

        // fadeOut this popup
        if ($this.is('.active')) {
            $m.fadeOut(200);
            $this.removeClass('active');
        }
        else {
            $('.share-dialog-permissions', $dialog).removeClass('active');
            $('.permissions-icon', $dialog).removeClass('active');
            closeImportContactNotification('.share-dialog');

            x = $this.position().left;
            y = $this.position().top + 3 + scrollPos;

            handlePermissionMenu($this, $m, x, y);
        }

        e.stopPropagation();
    });

    // related to multi-input contacts
    $('.permissions-icon', $dialog).rebind('click', function(e) {

        var $this = $(this);
        var $m = $('.permissions-menu');
        var x = 0;
        var y = 0;

        if (!$this.is('.disabled')) {

            // fadeOut permission menu for this icon
            if ($this.is('.active')) {
                $m.fadeOut(200);
                $this.removeClass('active');
            }
            else {
                $('.share-dialog-permissions', $dialog).removeClass('active');
                $('.permissions-icon', $dialog).removeClass('active');
                $m.addClass('search-permissions');
                closeImportContactNotification('.share-dialog');

                x = $this.position().left - 28;
                y = $this.position().top - 57;

                handlePermissionMenu($this, $m, x, y);
            }
        }

        e.stopPropagation();
    });

    /* Handles permission changes
     * 1. Group permission change '.share-dialog .permissions-icon.active'
     * 2. Specific perm. change '.share-dialog .share-dialog-permissions.active'
    */
    $('.permissions-menu-item', $dialog).rebind('click', function(e) {

        var $this = $(this);
        var id;
        var perm;
        var $existingContacts;
        var shares = M.d[$.selected[0]].shares;
        var newPermLevel = checkMultiInputPermission($this);
        var $itemPermLevel = $('.share-dialog-permissions.active', $dialog);
        var $groupPermLevel = $('.permissions-icon.active', $dialog);
        var currPermLevel = [];

        $('.permissions-menu', $dialog).fadeOut(200);

        // Single contact permission change, .share-dialog-permissions
        if ($itemPermLevel.length) {

            currPermLevel = checkMultiInputPermission($itemPermLevel);
            id = $itemPermLevel.parent().attr('id').replace('sdcbl_', '');

            if (id !== '') {
                perm = sharedPermissionLevel(newPermLevel[0]);

                $.changedPermissions = $.changedPermissions.filter(function(item) {
                    return item.u !== id;
                });

                if (!shares || !shares[id] || shares[id].r !== perm) {
                    if (M.opc[id]) {
                        // it's a pending contact, provide back the email
                        id = M.opc[id].m || id;
                    }
                    $.changedPermissions.push({ u: id, r: perm });
                }
            }

            $itemPermLevel
                .removeClass(currPermLevel[0])
                .removeClass('active')
                .safeHTML('<span></span>@@', newPermLevel[1])
                .addClass(newPermLevel[0]);
        }
        else if ($groupPermLevel.length) {// Group permission change, .permissions-icon

            // $.changedPermissions = [];// Reset global var

            currPermLevel = checkMultiInputPermission($groupPermLevel);

            // Get all items from dialog content block (avatar, name/email, permission)
            /*$existingContacts = $('.share-dialog-contact-bl');
            $.each($existingContacts, function(index, value) {

                extract id of contact
                id = $(value).attr('id').replace('sdcbl_', '');

                if (id !== '') {
                    perm = sharedPermissionLevel(newPermLevel[0]);

                    if (!shares || !shares[id] || shares[id].r !== perm) {
                        $.changedPermissions.push({ u: id, r: perm });
                    }
                }
            });*/

            $groupPermLevel
                .removeClass(currPermLevel[0])
                .removeClass('active')
                .safeHTML('<span></span>@@', newPermLevel[1])
                .addClass(newPermLevel[0]);

            /*$('.share-dialog-contact-bl .share-dialog-permissions')
                .removeClass('read-only')
                .removeClass('read-and-write')
                .removeClass('full-access')
                .safeHTML('<span></span>@@', newPermLevel[1])
                .addClass(newPermLevel[0]);*/
        }

        if ($.changedPermissions.length > 0) {// Enable Done button
            $dialog.find('.default-green-button.dialog-share-button').removeClass('disabled');
        }

        $dialog.find('.permissions-icon.active').removeClass('active');
        $dialog.find('.share-dialog-permissions.active').removeClass('active');

        e.stopPropagation();
        return false;
    });

    //Pending info block
    $dialog.find('.pending-indicator').rebind('mouseover', function() {
        var x = $(this).position().left;
        var y = $(this).position().top;
        var infoBlock = $('.share-pending-info', $dialog);
        var scrollPos = 0;
        if ($('.share-dialog-contacts .jspPane', $dialog)) {
            scrollPos = $dialog.find('.share-dialog-contacts .jspPane').position().top;
        }
        var infoHeight = infoBlock.outerHeight();
        infoBlock.css({
            'left': x,
            'top': y - infoHeight + scrollPos
        });
        infoBlock.fadeIn(200);
    });
    $dialog.find('.pending-indicator').rebind('mouseout', function() {
        $dialog.find('.share-pending-info').fadeOut(200);
    });

    // Personal message
    $dialog.find('.share-message textarea').rebind('focus', function() {

        var $this = $(this);
        $dialog.find('.share-message').addClass('focused');

        if ($this.val() === l[6853]) {

            // Clear the default message
            $this.val('');

            onIdle(function() {
                $this.select();
            });

            $this.mouseup(function mouseUpHandler() {
                $this.off("mouseup", mouseUpHandler);
                return false;
            });
        }
    });

    $dialog.find('.share-message textarea').rebind('blur', function() {
        $dialog.find('.share-message').removeClass('focused');
    });
}

function addImportedDataToSharedDialog(data) {
    $.each(data, function(ind, val) {
        $('.share-dialog .share-multiple-input').tokenInput("add", {id: val, name: val});
    });

    closeImportContactNotification('.share-dialog');
}

function addImportedDataToAddContactsDialog(data) {
    $.each(data, function(ind, val) {
        $('.add-user-popup .add-contact-multiple-input').tokenInput("add", {id: val, name: val});
    });

    closeImportContactNotification('.add-user-popup');
}

function closeImportContactNotification(c) {
    loadingDialog.hide();
    if (!$('.imported-contacts-notification').is(".hidden")) {
        $('.imported-contacts-notification').fadeOut(200);
    }

    if (!$(c + ' .import-contacts-dialog').is(".hidden")) {
        $(c + ' .import-contacts-dialog').fadeOut(200);
    }
    $('.import-contacts-link.active').removeClass('active');

    // Remove focus from input element, related to tokeninput plugin
    if ($(c + ' input#token-input-').is(":focus")) {
        $(c + ' input#token-input-').trigger("blur");
    }
}

/**
 * Check the dialog has token input that is already filled up by user.
 * Warn user closing dialog will lose all inserted input.
 */

function showWarningTokenInputLose() {
    "use strict";

    var $dialog = $('.fm-dialog:visible');
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
        msgDialog('confirmation', '', l[20474], l[18229], function(e) {
            if (e) {
                $tokenItems.remove();
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

    if (!$('.fm-dialog.registration-page-success').hasClass('hidden')) {
        fm_hideoverlay();
        $('.fm-dialog.registration-page-success').addClass('hidden').removeClass('special');
    }

    if ($('.fm-dialog.incoming-call-dialog').is(':visible') === true || $.dialog === 'download-pre-warning') {
        // managing dialogs should be done properly in the future, so that we won't need ^^ bad stuff like this one
        return false;
    }

    if ($.dialog === 'passwordlink-dialog') {
        if (String(page).substr(0, 2) === 'P!') {
            // do nothing while on the password-link page
            return false;
        }
        $('.fm-dialog.password-dialog').addClass('hidden');
    }

    // business account, add sub-user dialog. we wont allow closing before copying password
    if ($.dialog === 'sub-user-adding-dlg') {
        if ($('.user-management-add-user-dialog.user-management-dialog .dialog-button-container .add-sub-user')
            .hasClass('disabled')) {
            return false;
        }
    }

    if ($.dialog === 'prd') {
        // PasswordReminderDialog manages its own states, so don't do anything.
        return;
    }

    if ($.dialog === 'terms' && $.registerDialog) {
        $('.fm-dialog.bottom-pages-dialog').addClass('hidden');
    }
    else if ($.dialog === 'createfolder' && ($.copyDialog || $.moveDialog || $.selectFolderDialog || $.saveAsDialog)) {
        $('.fm-dialog.create-folder-dialog').addClass('hidden');
        $('.fm-dialog.create-folder-dialog .create-folder-size-icon').removeClass('hidden');
    }
    else if (($.dialog === 'slideshow') && $.copyrightsDialog) {
        $('.copyrights-dialog').addClass('hidden');

        delete $.copyrightsDialog;
    }
    else {
        if ($.dialog === 'properties') {
            propertiesDialog(2);
        }
        else {
            fm_hideoverlay();
        }
        $('.fm-dialog' + ($.propertiesDialog ? ':not(.properties-dialog)' : ''))
            .trigger('dialog-closed')
            .addClass('hidden');
        $('.dialog-content-block').empty();

        // add contact popup
        $('.add-user-popup').addClass('hidden');
        $('.fm-add-user').removeClass('active');

        $('.add-contact-multiple-input').tokenInput("clearOnCancel");
        $('.share-multiple-input').tokenInput("clearOnCancel");

        // share dialog
        $('.share-dialog-contact-bl').remove();
        $('.import-contacts-service').removeClass('imported');

        // share dialog permission menu
        $('.permissions-menu').hide();
        $('.permissions-icon').removeClass('active');
        closeImportContactNotification('.share-dialog');
        closeImportContactNotification('.add-user-popup');

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

        /* copy/move dialog - save to */
        delete $.saveToDialogCb;
        delete $.saveToDialogNode;
        delete $.saveToDialog;

        if ($.saveToDialogPromise) {
            if (typeof $.saveToDialogPromise === 'function') {
                $.saveToDialogPromise(EEXPIRED);
            }
            else {
                $.saveToDialogPromise.reject(EEXPIRED);
            }
            delete $.saveToDialogPromise;
        }

        if ($(ev && ev.target).is('.fm-dialog-overlay, .dialog-cancel-button, .fm-dialog-close')) {
            delete $.onImportCopyNodes;
        }

        if ($.msgDialog) {
            if ($.warningCallback) {
                onIdle($.warningCallback.bind(null, null));
                $.warningCallback = null;
            }
            delete $.msgDialog;
        }
    }
    $('.fm-dialog, .overlay.arrange-to-back').removeClass('arrange-to-back');
    // $('.fm-dialog .dialog-sorting-menu').remove();

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
    else {
        delete $.mcImport;
    }

    if ($.dialog === 'selectFolder') {
        delete $.selectFolderCallback;
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

        $('.fm-dialog').addClass('arrange-to-back');
        $('.fm-dialog.fm-picker-dialog').removeClass('arrange-to-back');
    }

    mBroadcaster.sendMessage('closedialog');
}

function createFolderDialog(close) {
    "use strict";

    if (M.isInvalidUserStatus()) {
        return;
    }

    var $dialog = $('.fm-dialog.create-folder-dialog');
    var $input = $('input', $dialog);
    $input.val('');

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

        if (!M.isSafeName(v, true)) {
            $dialog.removeClass('active');
            $input.addClass('error');
            return;
        }
        else {
            var specifyTarget = null;
            if ($.cftarget) {
                specifyTarget = $.cftarget;
            }
            if (duplicated(v, specifyTarget)) {
                $dialog.addClass('duplicate');
                $input.addClass('error');

                setTimeout(
                    function() {
                        $input.removeClass('error');
                        $dialog.removeClass('duplicate');
                        $input.trigger("focus");
                    },
                    2000
                );

                return;
            }
        }

        var target = $.cftarget = $.cftarget || M.currentCustomView.nodeID || M.currentdirid;
        var awaitingPromise = $.cfpromise;
        delete $.cfpromise;

        closeDialog();
        loadingDialog.pshow();

        M.createFolder(target, v.split(/[/\\]/))
            .then(function(h) {
                if (d) {
                    console.log('Created new folder %s->%s', target, h);
                }
                loadingDialog.phide();

                if (awaitingPromise) {
                    // dispatch an awaiting promise expecting to perform its own action instead of the default one
                    awaitingPromise.resolve(h);
                }
                else {
                    // By default auto-select the newly created folder as long no awaiting promise
                    M.openFolder(Object(M.d[h]).p || target)
                        .always(function() {
                            $.selected = [h];
                            reselect(1);
                        });
                }
                createFolderDialog(1);
            })
            .catch(function(ex) {
                loadingDialog.phide();

                msgDialog('warninga', l[135], l[47], ex < 0 ? api_strerror(ex) : ex, function() {
                    if (awaitingPromise) {
                        awaitingPromise.reject(ex);
                    }
                });
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

    $input.rebind('keyup', function() {
        if ($input.val() === '' || $input.val() === l[157]) {
            $dialog.removeClass('active');
        }
        else {
            $dialog.addClass('active');
            $input.removeClass('error');
        }
    });

    $input.rebind('keypress', function(e) {

        if (e.which === 13 && $(this).val() !== '') {
            doCreateFolder($(this).val());
        }
    });

    $('.fm-dialog-close, .create-folder-button-cancel', $dialog).rebind('click', createFolderDialog);

    $('.fm-dialog-input-clear').rebind('click', function() {
        $input.val('');
        $dialog.removeClass('active');
    });

    $('.fm-dialog-new-folder-button').rebind('click', function() {
        var v = $input.val();

        if (v === '' || v === l[157]) {
            alert(l[1024]);
        }
        else {
            doCreateFolder(v);
        }
    });

    M.safeShowDialog('createfolder', function() {
        $dialog.removeClass('hidden');
        $('.create-folder-input-bl input').trigger("focus");
        $dialog.removeClass('active');
        return $dialog;
    });
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

                        var jsp = $grid.data('jsp');
                        if (jsp) {
                            jsp.scrollToElement($newElement);
                        }
                        else if (M.megaRender && M.megaRender.megaList && M.megaRender.megaList._wasRendered) {
                            M.megaRender.megaList.scrollToItem(nh);
                            $newElement = $('#' + nh, $grid);
                        }

                        // now let's select the item. we can not use the click handler due
                        // to redraw if element was out of viewport.
                        $($.selectddUIgrid + ' ' + $.selectddUIitem).removeClass('ui-selected');
                        $newElement.addClass('ui-selected');
                        $.gridLastSelected = $newElement;
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
    var $dialog = $('.fm-dialog.create-file-dialog');
    var $input = $('input', $dialog);
    $input.val('.txt')[0].setSelectionRange(0, 0);

    var doCreateFile = function(v) {
        var target = $.cftarget = $.cftarget || M.currentdirid;

        v = $.trim(v);

        if (!M.isSafeName(v)) {
            $dialog.removeClass('active');
            $input.addClass('error');
            return;
        }
        else if (duplicated(v, target)) {
            $dialog.addClass('duplicate');
            $input.addClass('error');

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
        if ($input.val() === '' || $input.val() === l[17506]) {
            $dialog.removeClass('active');
        }
        else {
            $dialog.addClass('active');
            $input.removeClass('error');
        }
    });

    $input.rebind('keypress.fileDialog', function(e) {

        if (e.which === 13 && $(this).val() !== '') {
            doCreateFile($(this).val());
        }
        else {
            $input.removeClass('error');
            $dialog.removeClass('duplicate');
        }
    });

    // eslint-disable-next-line sonarjs/no-duplicate-string
    $('.fm-dialog-close, .cancel-create-file', $dialog).rebind('click.fileDialog', closeFunction);

    $('.fm-dialog-input-clear', $dialog).rebind('click.fileDialog', function() {
        $input.val('');
        $dialog.removeClass('active');
    });

    $('.create-file', $dialog).rebind('click.fileDialog', function() {
        var v = $input.val();

        if (v === '' || v === l[17506]) {
            msgDialog('warninga', '', l[8566]);
        }
        else {
            doCreateFile(v);
        }
    });

    M.safeShowDialog('createfile', function() {
        $dialog.removeClass('hidden');
        $('.fm-dialog-body.mid-pad input', $dialog).focus();
        $dialog.removeClass('active');
        return $dialog;
    });
}

function browserDialog(close) {
    'use strict';

    var $dialog = $('.fm-dialog.browsers-dialog');

    if (close) {
        closeDialog();
        return true;
    }

    M.safeShowDialog('browser', function() {
        $.browserDialog = 1;
        return $dialog;
    });

    $('.browsers-dialog .browsers-button,.browsers-dialog .fm-dialog-close').rebind('click', function() {
        browserDialog(1);
    });

    $('#browsers-checkbox').rebind('click', function() {
        if (!$(this).hasClass('checkboxOn')) {
            localStorage.browserDialog = 1;
            $(this).attr('class', 'checkboxOn');
            $(this).parent().attr('class', 'checkboxOn');
            $(this).prop('checked', true);
        }
        else {
            delete localStorage.chromeDialog;
            $(this).attr('class', 'checkboxOff');
            $(this).parent().attr('class', 'checkboxOff');
            $(this).prop('checked', false);
        }
    });

    $('.browsers-top-icon').removeClass('ie9 ie10 safari');
    var bc, bh, bt;
    var type = browserDialog.isWeak();
    if (type && type.ie11)
    {
        if (page !== 'download' && ('' + page).split('/').shift() !== 'fm')
        {
            browserDialog(1);
            return false;
        }
        // IE11
        bc = 'ie10';
        bh = l[884].replace('[X]', type.edge ? 'Edge' : 'IE 11');
        // if (page == 'download') bt = l[1933];
        // else bt = l[886];
        bt = l[1933];
    }
    else if (type && type.ie10)
    {
        bc = 'ie10';
        bh = l[884].replace('[X]', 'Internet Explorer 10');
        if (page === 'download')
            bt = l[1933];
        else
            bt = l[886];
    }
    else if (type && type.safari)
    {
        bc = 'safari';
        bh = l[884].replace('[X]', 'Safari');
        if (page === 'download')
            bt = l[1933];
        else
            bt = l[887].replace('[X]', 'Safari');
    }
    else
    {
        bc = 'safari';
        bh = l[884].replace('[X]', l[885]);
        bt = l[887].replace('[X]', 'Your browser');
    }
    $('.browsers-top-icon').addClass(bc);
    $('.browsers-info-block p').text(bt);
    $('.browsers-info-header').text(bh);
    $('.browsers-info-header p').text(bt);
}

browserDialog.isWeak = function() {
    var result = {};
    var ua = String(navigator.userAgent);
    var style = document.documentElement.style;

    result.ie10 = (ua.indexOf('MSIE 10') > -1);
    result.ie11 = ('-ms-scroll-limit' in style) && ('-ms-ime-align' in style);
    result.edge = /\sEdg(?:e|A|iOS)?\/\d/.test(ua);
    result.safari = (ua.indexOf('Safari') > -1) && (ua.indexOf('Chrome') === -1);

    result.weak = result.edge || result.ie11 || result.ie10 || result.safari;

    return result.weak && result;
};

/**
 * Show bottom pages dialog
 * @param {Boolean} close dialog parameter
 * @param {String} bottom page title
 * @param {String} dialog header
 * @param {Boolean} tickbox tickbox existency to let user agree this dialog
 */
function bottomPageDialog(close, pp, hh, tickbox) {
    "use strict";

    var $dialog = $('.fm-dialog.bottom-pages-dialog');
    var closeDialog = function() {
        $dialog.off('dialog-closed');
        // reset scroll position to top for re-open
        var jsp = $dialog.find('.bp-body').data('jsp');
        if (jsp) {
            jsp.scrollToY(0);
        }
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
        $('.fm-dialog-title', $dialog).text(l[385]);

        $('.fm-bp-cancel', $dialog).rebind('click', function()
        {
            if ($.termsDeny) {
                $.termsDeny();
            }
            bottomPageDialog(1);
        });

        $('.fm-bp-agree', $dialog).rebind('click', function()
        {
            if ($.termsAgree) {
                $.termsAgree();
            }
            bottomPageDialog(1);
        });

        $('.fm-dialog-close', $dialog).rebind('click', function()
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
            $('.fm-dialog-title', $dialog).text(hh)
        }

        $('.fm-dialog-close, .fm-bp-close', $dialog).rebind('click', function()
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

        $('.bp-main', $dialog)
            .safeHTML(translate(String(pages[pp])
                .split('((TOP))')[1]
                .split('((BOTTOM))')[0]
                .replace('main-mid-pad new-bottom-pages', ''))
            );

        $('.bp-body', $dialog).jScrollPane({
            showArrows: true,
            arrowSize: 5,
            animateScroll: true,
            verticalDragMinHeight: 50
        });
        jScrollFade('.bp-body');
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
    $('.fm-dialog.download-dialog').addClass('hidden');
    fm_hideoverlay();
    if (!$.dialog)
        $('#dlswf_' + id).remove();
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

    if (ulmanager.isUploading || dlmanager.isDownloading) {
        var tfse = M.getTransferElements();

        if (tfse) {
            tfse.domScrollingTable.style.height = (
                    $(tfse.domTransfersBlock).outerHeight() -
                    $(tfse.domTableHeader).outerHeight() -
                    $(tfse.domTransferHeader).outerHeight()
                ) + "px";
        }
    }

    if (M.currentdirid !== 'transfers') {
        $('.files-grid-view .grid-scrolling-table, .file-block-scrolling,' +
            ' .contacts-grid-view .contacts-grid-scrolling-table')
            .css({
                'width': $(document.body).outerWidth() - $('.fm-left-panel').outerWidth() - 46 /* margins of icons */
            });

        // Lets make manually matching width of the header table with the contents table, due to width mismatching bug.
        var $fNameTh = $('.files-grid-view .grid-table-header:visible th[megatype="fname"]');
        var fNameThStyle = $fNameTh.length && $fNameTh.attr('style') || '';

        if (fNameThStyle.indexOf('calc(100% -') === -1) {
            delete M.columnsWidth.cloud.fname.currpx;
        }
        else {
            var fNameThWidth = $fNameTh.outerWidth();

            $('.files-grid-view .grid-table:visible td[megatype="fname"]').css('width', fNameThWidth);
            M.columnsWidth.cloud.fname.currpx = fNameThWidth;
        }

        initTreeScroll();
    }

    if (M.currentdirid === 'contacts') {
        if (M.viewmode) {
            initContactsBlocksScrolling();
        }
        else {
            if ($.contactGridHeader) {
                $.contactGridHeader();
            }
            initContactsGridScrolling();
        }
    }
    else if (M.currentdirid === 'ipc') {
        initIpcGridScrolling();
        M.addGridUIDelayed(true);
        if ($.ipcGridHeader) {
            $.ipcGridHeader();
        }
    }
    else if (M.currentdirid === 'opc') {
        initOpcGridScrolling();
        M.addGridUIDelayed(true);
        if ($.opcGridHeader) {
            $.opcGridHeader();
        }
    }
    else if (M.currentdirid === 'shares') {
        if (M.viewmode) {
            initShareBlocksScrolling();
        }
        else {
            initGridScrolling();
            if ($.sharedGridHeader) {
                $.sharedGridHeader();
            }
        }
    }
    else if (M.currentdirid === 'out-shares') {
        if (M.viewmode) {
            initOutShareBlocksScrolling();
        }
        else {
            initGridScrolling();
            if ($.outSharedGridHeader) {
                $.outSharedGridHeader();
            }
        }
    }
    else if (M.currentdirid === 'transfers') {
        fm_tfsupdate(); // this will call $.transferHeader();
    }
    else if (M.currentdirid && M.currentdirid.substr(0, 7) === 'account') {
        var $mainBlock = $('.fm-account-main');

        $mainBlock.removeClass('low-width hi-width');

        if ($mainBlock.width() > 1675) {
            $mainBlock.addClass('hi-width');
        }
        else if ($mainBlock.width() < 920) {
            $mainBlock.addClass('low-width');
        }
        initAccountScroll();
    }
    else if (M.currentdirid && M.currentdirid.substr(0, 9) === 'dashboard') {
        var $mainBlock = $('.fm-right-block.dashboard');

        $mainBlock.removeClass('hidden ultra low-width hi-width');
        if ($mainBlock.width() > 1675) {
            $mainBlock.addClass('hi-width');
        }
        else if ($mainBlock.width() < 880 && $mainBlock.width() > 850) {
            $mainBlock.addClass('low-width');
        }
        else if ($mainBlock.width() < 850) {
            $mainBlock.addClass('ultra low-width');
        }
        initDashboardScroll();
    }
    else if (M.currentdirid === 'refer') {
        initAffiliateScroll();
    }
    else if (!M.chat) {
        if (M.viewmode) {
            initFileblocksScrolling();
        }
        else {
            initGridScrolling();
            if ($.gridHeader) {
                $.gridHeader();
                $.detailsGridHeader();
            }
        }
    }

    if (M.currentdirid !== 'transfers') {
        var treePaneWidth = Math.round($('.fm-left-panel:visible').outerWidth());
        var leftPaneWidth = Math.round($('.nw-fm-left-icons-panel:visible').outerWidth());

        if (megaChatIsReady && megaChat.resized) {
            megaChat.resized();
        }

        $('.fm-right-files-block, .fm-right-account-block, .fm-right-block.dashboard').css({
            'margin-left': (treePaneWidth + leftPaneWidth) + "px"
        });

        $('.popup.transfer-widget').outerWidth(treePaneWidth - 9);
    }

    if (M.currentrootid === 'shares') {
        var $sharedDetailsBlock = $('.shared-details-block', '.fm-main');
        var sharedDetailsHeight = Math.round($sharedDetailsBlock.outerHeight());
        var sharedHeaderHeight = Math.round($('.shared-top-details').outerHeight());
        var sharedBlockHeight = sharedDetailsHeight - sharedHeaderHeight;

        if ($sharedDetailsBlock.closest('.fm-main').hasClass('fm-notification')) {
            sharedBlockHeight -= 24;
        }

        if (sharedBlockHeight > 0) {
            $('.files-grid-view, .fm-blocks-view', $sharedDetailsBlock).css({
                'height': sharedBlockHeight + "px",
                'min-height': sharedBlockHeight + "px"
            });
        }
    }

    if (M.currentdirid && M.currentdirid.indexOf('user-management') > -1) {
        var $businessAccountContainer = $('.files-grid-view.user-management-view');
        var $subAccountContainer = $('.user-management-subaccount-view-container', $businessAccountContainer);
        // sub-user info pgae
        if (!$subAccountContainer.hasClass('hidden')) {
            $subAccountContainer.jScrollPane({
                enableKeyboardNavigation: false, showArrows: true,
                arrowSize: 8, animateScroll: true
            });
        }
        // overview page
        else if (!$('.user-management-overview-container', $businessAccountContainer).hasClass('hidden')) {
            $('.user-management-overview-container', $businessAccountContainer).jScrollPane(
                { enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true }
            );
        }
        else if (!$('.user-management-account-settings .invoice-detail', $businessAccountContainer)
            .hasClass('hidden')) {
            $('.user-management-account-settings .invoice-detail', $businessAccountContainer)
                .jScrollPane({ enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true });
        }
        else if (!$('.user-management-account-settings .invoice', $businessAccountContainer)
            .hasClass('hidden')) {
            $('.user-management-account-settings .invoice .invoice-table-list-container', $businessAccountContainer)
                .jScrollPane({ enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true });
        }
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
        $('.shared-top-details').remove();
        browsingSharedContent = true;
    }

    // are we in an inshare?
    while (nodeData && !nodeData.su) {
        nodeData = M.d[nodeData.p];
    }

    if (nodeData) {

        var rights = l[55];
        var rightsclass = ' read-only';
        var rightPanelView = '.files-grid-view.fm';

        // Handle of initial share owner
        var ownersHandle = nodeData.su;
        var folderName = (M.d[M.currentdirid] || nodeData).name;
        var displayName = htmlentities(M.getNameByHandle(ownersHandle));
        var avatar = useravatar.contact(M.d[ownersHandle]);

        if (Object(M.u[ownersHandle]).m) {
            displayName += ' &nbsp;&lt;' + htmlentities(M.u[ownersHandle].m) + '&gt;';
        }

        // Access rights
        if (nodeData.r === 1) {
            rights = l[56];
            rightsclass = ' read-and-write';
        }
        else if (nodeData.r === 2) {
            rights = l[57];
            rightsclass = ' full-access';
        }

        if (M.viewmode === 1) {
            rightPanelView = '.fm-blocks-view.fm';
        }

        $(rightPanelView).wrap('<div class="shared-details-block"></div>');

        $('.shared-details-block').prepend(
            '<div class="shared-top-details">'
                + '<div class="shared-details-icon"></div>'
                + '<div class="shared-details-info-block">'
                    + '<div class="shared-details-pad">'
                        + '<div class="shared-details-folder-name">' + htmlentities(folderName) + '</div>'
                        + '<a href="javascript:;" class="grid-url-arrow"></a>'
                        + '<div class="shared-folder-access' + rightsclass + '">' + rights + '</div>'
                        + '<div class="clear"></div>'
                        + avatar
                        + '<div class="fm-chat-user-info">'
                            + '<div class="fm-chat-user">' + displayName + '</div>'
                        + '</div>'
                    + '</div>'
                    + '<div class="shared-details-buttons">'
                        + '<div class="fm-leave-share default-white-button right small grey-txt"><span>' + l[5866] + '</span></div>'
                        + '<div class="fm-share-copy default-white-button right small grey-txt"><span>' + l[63] + '</span></div>'
                        + '<div class="fm-share-download default-white-button right small grey-txt"><span class="fm-chatbutton-arrow">' + l[58] + '</span></div>'
                        + '<div class="clear"></div>'
                    + '</div>'
                    + '<div class="clear"></div>'
                + '</div>'
            + '</div>');

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

function fingerprintDialog(userid) {

    // Add log to see how often they open the verify dialog
    api_req({ a: 'log', e: 99601, m: 'Fingerprint verify dialog opened' });

    userid = userid.u || userid;
    var user = M.u[userid];
    if (!user || !user.u) {
        return;
    }

    var $dialog = $('.fingerprint-dialog');
    var closeFngrPrntDialog = function() {
        closeDialog();
        $('.fm-dialog-close', $dialog).off('click');
        $('.dialog-approve-button').off('click');
        $('.dialog-skip-button').off('click');
        mega.ui.CredentialsWarningDialog.rendernext();
    };

    $dialog.find('.fingerprint-avatar').empty()
        .append($(useravatar.contact(userid, 'semi-mid-avatar')));

    $dialog.find('.contact-details-user-name')
        .text(M.getNameByHandle(user.u)) // escape HTML things
        .end()
        .find('.contact-details-email')
        .text(user.m); // escape HTML things

    $dialog.find('.fingerprint-txt').empty();
    userFingerprint(u_handle, function(fprint) {
        var target = $('.fingerprint-bott-txt .fingerprint-txt');
        fprint.forEach(function(v) {
            $('<span>').text(v).appendTo(target);
        });
    });

    userFingerprint(user, function(fprint) {
        var offset = 0;
        $dialog.find('.fingerprint-code .fingerprint-txt').each(function() {
            var that = $(this);
            fprint.slice(offset, offset + 5).forEach(function(v) {
                $('<span>').text(v).appendTo(that);
                offset++;
            });
        });
    });

    $('.fm-dialog-close', $dialog).rebind('click', function() {
        closeFngrPrntDialog();
    });

    $('.dialog-approve-button').rebind('click', function() {

        // Add log to see how often they verify the fingerprints
        api_req({ a: 'log', e: 99602, m: 'Fingerprint verification approved' });

        loadingDialog.show();
        // Generate fingerprint
        crypt.getFingerprintEd25519(userid, 'string')
            .done(function(fingerprint) {

                // Authenticate the contact
                var result = authring.setContactAuthenticated(
                    userid,
                    fingerprint,
                    'Ed25519',
                    authring.AUTHENTICATION_METHOD.FINGERPRINT_COMPARISON,
                    authring.KEY_CONFIDENCE.UNSURE
                );

                // Change button state to 'Verified'
                $('.fm-verify').off('click').addClass('verified').find('span').text(l[6776]);

                closeFngrPrntDialog();

                if (M.u[userid]) {
                    M.u[userid].trackDataChange(M.u[userid], "fingerprint");
                }

                if (result && result.always) {
                    // wait for the setContactAuthenticated to finish and then trigger re-rendering.
                    result.always(function() {
                        if (M.u[userid]) {
                            M.u[userid].trackDataChange(M.u[userid], "fingerprint");
                        }
                    });
                }
            })
            .always(function() {
                loadingDialog.hide();
            });
    });

    $('.dialog-skip-button').rebind('click', function() {
        closeFngrPrntDialog();
    });

    M.safeShowDialog('fingerprint-dialog', $dialog);
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
        'persistanceKey': 'transferPanelHeight',
        'minHeight': undefined,
        'minWidth': undefined,
        'handle': '.transfer-drag-handle'
    };

    var size_attr = 'height';

    opts = $.extend(true, {}, defaults, opts);

    self.options = opts; //expose as public

    /**
     * Depending on the selected direction, pick which css attr should we be changing - width OR height
     */
    if (opts.direction === 'n' || opts.direction === 's') {
        size_attr = 'height';
    } else if (opts.direction === 'e' || opts.direction === 'w') {
        size_attr = 'width';
    } else if (opts.direction.length === 2) {
        size_attr = 'both';
    }

    /**
     * Already initialized.
     */
    if ($element.data('fmresizable')) {
        return;
    }

    self.destroy = function() {
        // some optimizations can be done here in the future.
    };

    /**
     * Basic init/constructor code
     */
    {
        var $handle = $(opts.handle, $element);

        if (d) {
            if (!$handle.length) {
                console.warn('FMResizablePane: Element not found: ' + opts.handle);
            }
        }

        $handle.addClass('ui-resizable-handle ui-resizable-' + opts.direction);

        var resizable_opts = {
            'handles': {
            },
            minHeight: opts.minHeight,
            minWidth: opts.minWidth,
            maxHeight: opts.maxHeight,
            maxWidth: opts.maxWidth,
            start: function(e, ui) {

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

                $self.trigger('resize', [e, ui]);
            },
            'stop': function(e, ui) {
                $self.trigger('resizestop', [e, ui]);
                $(window).trigger('resize');
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

/**
 * bindDropdownEvents Bind custom select event
 *
 * @param {Selector} $select  Class .dropdown elements selector
 * @param {String}   saveOption Addition option for account page only. Allows to show "Show changes" notification
 * @param {String}   classname/id of  content block for dropdown aligment
 */
function bindDropdownEvents($select, saveOption, contentBlock) {
    'use strict';

    var $dropdownsItem = $('.default-dropdown-item', $select);
    var $contentBlock = contentBlock ? $(contentBlock) : $('body');
    var $hiddenInput = $('.dropdown-hidden-input', $select);

    // hidden input for keyboard search
    if (!$hiddenInput.length) {

        // Skip tab action for hidden input by tabindex="-1"
        $select.safePrepend('<input class="dropdown-hidden-input" tabindex="-1" autocomplete="disabled">');
        $hiddenInput = $('input.dropdown-hidden-input', $select);
    }

    $select.rebind('click.defaultselect', function(e) {

        var $this = $(this);
        var $dropdown = $('.default-select-dropdown', $this);
        var $outsideArea = $('.fmholder, .fm-dialog:not(.hidden)', 'body');

        if (!$this.hasClass('active')) {
            var jsp;
            var scrollBlock = ('#' + $this.attr('id')).replace(/\./g, '\\.') + ' .default-select-scroll';
            var $activeDropdownItem = $('.default-dropdown-item.active', $this);
            var dropdownOffset;
            var dropdownBottPos;
            var dropdownHeight;
            var contentBlockHeight;

            //Show select dropdown
            $('.default-select.active', 'body').removeClass('active');
            $('.active .default-select-dropdown', 'body').addClass('hidden');
            $this.addClass('active');
            $dropdown.removeAttr('style');
            $dropdown.removeClass('hidden');

            //Dropdown position relative to the window
            dropdownOffset = $dropdown.offset().top - $contentBlock.offset().top;
            contentBlockHeight = $contentBlock.height();
            dropdownHeight = $dropdown.outerHeight();
            dropdownBottPos = contentBlockHeight - (dropdownOffset + dropdownHeight);

            if (contentBlockHeight < (dropdownHeight + 20)) {
                $dropdown.css({
                    'margin-top': '-' + (dropdownOffset - 10) + 'px',
                    'height': (contentBlockHeight - 20) + 'px'
                });
            }
            else if (dropdownBottPos < 10) {
                $dropdown.css({
                    'margin-top': '-' + (10 - dropdownBottPos) + 'px'
                });
            }

            //Dropdown scrolling initialization
            if ($(scrollBlock).length) {
                initSelectScrolling(scrollBlock);
                jsp = $(scrollBlock).data('jsp');

                if (jsp && $activeDropdownItem.length) {
                    jsp.scrollToElement($activeDropdownItem);
                }
            }

            $hiddenInput.trigger('focus');

            $outsideArea.rebind('mousedown.defaultselect', function(e) {

                if (!$this.has($(e.target)).length && !$this.is(e.target)) {
                    $this.removeClass('active');
                    $dropdown.addClass('hidden');
                    $outsideArea.unbind('mousedown.defaultselect');
                }
            });
        }
        else if (!$(e.target).closest('.jspVerticalBar').length) {
            $this.removeClass('active');
            $dropdown.addClass('hidden');
            $outsideArea.unbind('mousedown.defaultselect');
        }
    });

    $dropdownsItem.rebind('click.settingsGeneral', function() {
        var $this = $(this);

        var $select = $(this).closest('.default-select');

        // Select dropdown item
        $('.default-dropdown-item', $select).removeClass('active');
        $this.addClass('active');
        $('span', $select).text($this.text());
        $hiddenInput.trigger('focus');

        if (saveOption) {
            var nameLen = String($('#account-firstname').val() || '').trim().length;

            // Save changes for account page
            if (nameLen) {
                $('.save-block', $this.closest('.settings-right-block')).removeClass('hidden');
            }
        }
    });

    $dropdownsItem.rebind('mouseenter.settingsGeneral', function() {

        var $this = $(this);

        // If contents width is bigger than size of dropdown
        if (this.offsetWidth < this.scrollWidth) {
            $this.addClass('simpletip').attr('data-simpletip', $this.text());
        }
    });

    // Typing search and arrow key up and down features for dropdowns
    $hiddenInput.rebind('keyup.defaultselect', function(e) {
        var charCode = e.which || e.keyCode; // ff
        if ((charCode > 64 && charCode < 91) || (charCode > 96 && charCode < 123)) {
            var inputValue = $hiddenInput.val();
            var $filteredItem = $dropdownsItem.filter(function() {
                return $(this).text().slice(0, inputValue.length).toLowerCase() === inputValue.toLowerCase();
            });

            if ($filteredItem[0]) {
                var jsp = $('.default-select-scroll', $select).data('jsp');
                $('.default-dropdown-item.active', $select).removeClass('active');
                jsp.scrollToElement($($filteredItem[0]), 1);
                $($filteredItem[0]).addClass('active');
            }
        }
        else {
            e.preventDefault();
            e.stopPropagation();

            var $current = $('.default-dropdown-item.active',  $select);

            if (charCode === 38) { // Up key
                $current.removeClass('active').prev().addClass('active');
            }
            else if (charCode === 40) { // Down key
                $current.removeClass('active').next().addClass('active');
            }
            else if (charCode === 13) {// Enter
                $current.trigger('click');
            }
        }
    });

    $hiddenInput.rebind('keydown.defaultselect', function() {
        delay('dropbox:clearHidden', function() {
            // Combination language bug fixs for MacOS.
            $hiddenInput.val('').trigger('blur').trigger('focus');
        }, 750);
    });
    // End of typing search for dropdowns
}

/**
 * addToMultiInputDropDownList
 *
 * Add item from token.input plugin drop down list.
 *
 * @param {String} dialog, The class name.
 * @param {Array} item An array of JSON objects e.g. { id, name }.
 *
 */
function addToMultiInputDropDownList(dialog, item) {

    if (dialog) {
        $(dialog).tokenInput("addToDDL", item);
    }
}

/**
 * removeFromMultiInputDDL
 *
 * Remove item from token.input plugin drop down list.
 *
 * @param {String} dialog, The class name.
 * @param {Array} item An array of JSON objects e.g. { id, name }.
 *
 */
function removeFromMultiInputDDL(dialog, item) {

    if (dialog) {
        $(dialog).tokenInput("removeFromDDL", item);
    }
}
