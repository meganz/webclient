
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
BusinessAccountUI.prototype.viewSubAccountListUI = function (subAccounts, isBlockView) {
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




BusinessAccountUI.prototype.showLinkPasswordDialog = function (invitationLink) {
    var $dialog = $('.fm-dialog.sub-account-link-password');
    var prepareSubAccountLinkDialog = function () {

        $('.default-dialog-bottom', $dialog).off('click');
        $('.dialog-link-pwd', $dialog).off('keydown');

        $('.fm-dialog-link-pwd-pad input', $dialog).on('keydown', function (e) {
            $('.dialog-link-pwd-empty', $dialog).addClass('hidden');
            if (e.keyCode === 13 || e.code === 'Enter' || e.key === 'Enter') {
                return $('.fm-dialog-link-pwd-button', $dialog).trigger('click');
            }
            
        });
        $('.fm-dialog-link-pwd-button', $dialog).on('click', function () {
            var enteredPassword = $('.fm-dialog-link-pwd-pad input', $dialog).val();
            $('.fm-dialog-link-pwd-pad input', $dialog).val('');
            if (!enteredPassword.length) {
                $('.dialog-link-pwd-empty', $dialog).removeClass('hidden');
                return false;
            }
            else {
                var business = new BusinessAccount();

                var failureAction = function (st, res, desc) {
                    closeDialog();
                    var msg = l[17920]; // not valid password
                    if (res) {
                        msg = l[1290]; // not valid link
                        console.error(st, res, desc);
                    }
                    msgDialog('warninga', '', msg, '', function () {
                        loadSubPage('start');
                    });
                };

                var decryptedTokenBase64 = business.decryptSubAccountInvitationLink(invitationLink, enteredPassword);
                if (decryptedTokenBase64) {
                    var getInfoPromise = business.getSignupCodeInfo(decryptedTokenBase64);
                    
                    getInfoPromise.fail(failureAction);

                    getInfoPromise.done(function (status, res) {
                        if (localStorage.d) {
                            console.log(res);
                        }
                        if (!res.e || !res.firstname || !res.mpubk || !res.mu) {
                            failureAction(1, res, 'uv2 not complete response');
                        }
                        else {
                            if (u_type === false) {
                                res.signupcode = decryptedTokenBase64;
                                localStorage.businessSubAc = JSON.stringify(res);
                                loadSubPage('register');
                            }
                            else {
                                var msgTxt = l[18795];
                                // 'You are currently logged in. ' +
                                //  'Would you like to log out and proceed with business account registration ? ';
                                closeDialog();
                                msgDialog('confirmation', l[968], msgTxt, '', function (e) {
                                    if (e) {
                                        mLogout();
                                    }
                                    else {
                                        loadSubPage('');
                                    }
                                });
                            }
                        }
                        // a32_to_str(base64_to_a32('a2QrNHNhbmQgbWVnYQ'))
                        // if(res.e && res.)
                    });

                }
                else {
                    failureAction();
                }
            }
            return false;
        });
        return $dialog;
    };

    M.safeShowDialog('invite-link-pwd', prepareSubAccountLinkDialog);

};