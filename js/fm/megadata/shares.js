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
 * Open Sharing Dialog...
 */
MegaData.prototype.openSharingDialog = function() {
    'use strict';

    if (M.isInvalidUserStatus()) {
        return;
    }
    if (u_type === 0) {
        return ephemeralDialog(l[1006]);
    }
    var $dialog = $('.fm-dialog.share-dialog');

    var showShareDlg = function() {
        $.hideContextMenu();
        clearScrollPanel($('.share-dialog-contacts', $dialog));

        // Show the share dialog
        $dialog.removeClass('hidden');

        // Hide the optional message by default.
        // This gets enabled if user want to share
        $dialog.find('.share-message').hide();

        $dialog.find('.dialog-share-button').addClass('disabled');

        fillShareDialogWithContent();

        // Taking care about share dialog button 'Done'/share and scroll
        shareDialogContentCheck();

        // Clear text area message
        $('.share-message textarea', $dialog).val(l[6853]);

        // Update drop down list / token input details
        initShareDialogMultiInputPlugin();

        $('.share-dialog-icon.permissions-icon')
            .removeClass('active full-access read-and-write')
            .safeHTML('<span></span>' + l[55])
            .addClass('read-only');

        // Update dialog title text
        var shareDialogTitle = l[23246].replace('[X]', M.d[$.selected].name);
        $('.fm-dialog-title', $dialog).text(shareDialogTitle);
        $('.multiple-input .token-input-token-mega', $dialog).remove();
        initTokenInputsScroll($('.multiple-input', $dialog));
        Soon(function() {
            $('.token-input-input-token-mega input', $dialog).trigger("focus");
        });

        dialogPositioning($dialog);

        return $dialog;
    };

    var mdList = mega.megadrop.isDropExist($.selected);
    if (mdList.length) {
        mega.megadrop.showRemoveWarning(mdList).done(function() {
            M.safeShowDialog('share', showShareDlg);
        });
    }
    else {
        M.safeShowDialog('share', showShareDlg);
    }
};

