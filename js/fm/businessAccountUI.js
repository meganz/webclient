
/**
 * A UI control Class to perfrom Business Account related UI
 */
function BusinessAccountUI() {
    
}

/**
 * Function to view the right pane of "Users Management" used by master users to manage sub-accounts
 * @param {string[]} subAccounts    optional list of subAccount, Default is M.suba
 * @param {boolean} isBlockView     by default "Grid" view will be used, this param when True will change to "Block"
 * @returns {boolean}               true if OK, false if something went wrong
 */
BusinessAccountUI.prototype.viewSubAccountListUI = function _viewSubAccountListUI(subAccounts, isBlockView) {
    if (!M.isBusinessAccountMaster) {
        return false;
    }
    if (!subAccounts) {
        if (M.suba) {
            subAccounts = M.suba;
        }
        else {
            return false;
        }
    }

    // hide any possible grid or block view.
    $('.files-grid-view, .fm-blocks-view').addClass('hidden');

    var subAccountsView;
    if (!isBlockView) {
        subAccountsView = $('.files-grid-view.user-management-view');
    }
    else {
        subAccountsView = $('.fm-blocks-view.user-management-view');
    }

    subAccountsView.removeClass('hidden');
    $('.grid-table-user-management', subAccountsView).removeClass('hidden');
};




BusinessAccountUI.prototype.showLinkPasswordDialog = function _showLinkPasswordDialog(invitationLink) {
    var $dialog = $('.fm-dialog.sub-account-link-password');
    var prepareSubAccountLinkDialog = function () {

        $('.default-dialog-bottom', $dialog).off('click');
        $('.dialog-link-pwd', $dialog).off('keydown');

        $('.fm-dialog-link-pwd-pad input', $dialog).on('keydown', function () {
            $('.dialog-link-pwd-empty', $dialog).addClass('hidden');
        });
        $('.fm-dialog-link-pwd-button', $dialog).on('click', function () {
            if (!$('.fm-dialog-link-pwd-pad input', $dialog).val().length) {
                $('.dialog-link-pwd-empty', $dialog).removeClass('hidden');
                return false;
            }
        });
        return $dialog;
    };

    M.safeShowDialog('invite-link-pwd', prepareSubAccountLinkDialog);

};