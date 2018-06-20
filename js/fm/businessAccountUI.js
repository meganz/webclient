
/**
 * A UI control Class to perform Business Account related UI
 */
function BusinessAccountUI() {
    if (!mega.buinsessController) {
        this.business = new BusinessAccount();
        mega.buinsessController = this.business;
    }
    else {
        this.business = mega.buinsessController;
    }
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

    //if (subAccounts.length) { // no subs, some new UI

    //    return;
    //}
    subAccountsView.removeClass('hidden');
    var $usersTable = $('.grid-table-user-management', subAccountsView).removeClass('hidden');

    // private function to check if new drawing is needed
    var isRedrawNeeded = function (subs, previousSubs) {
        if (!previousSubs) {
            return true;
        }
        if (Object.keys(subs).length !== Object.keys(previousSubs).length) {
            return true;
        }
        for (var k in subs) {
            if (!previousSubs[k]) {
                return true;
            }
            for (var h in subs[k]) {
                if (subs[k][h] !== previousSubs[k][h]) {
                    return true;
                }
            }
        }
        return false;
    };

    // private function to fill HTML table for sub users
    var fillSubUsersTable = function (subUsers,uiBusiness) {
        var $tr = $('tr', $usersTable);
        var $tr_user = $($tr.get(1)).clone(true); // the first one is the table header

        // remove all elements from template on HTML file
        for (var k = 1; k < $tr.length; k++) {
            $tr.get(k).remove();
        }

        // now let's fill the table with sub-users data
        for (var h in subUsers) {
            var $currUser = $tr_user.clone(true);
            $currUser.attr('id', subUsers[h].u);
            $currUser.find('.fm-user-management-user .admin-icon .tooltip').text('Sub-Account');
            $currUser.find('.fm-user-management-user span').text(a32_to_str(base64_to_a32(subUsers[h].firstname)) + ' ' +
                a32_to_str(base64_to_a32((subUsers[h].lastname || ''))));
            $currUser.find('.user-management-email').text(subUsers[h].e);
            $currUser.find('.user-management-status').removeClass('enabled pending disable');
            if (subUsers[h].s === 0) {
                $currUser.find('.user-management-status').addClass('enabled');
            }
            else if (subUsers[h].s === 10) {
                $currUser.find('.user-management-status').addClass('pending');
            }
            else {
                $currUser.find('.user-management-status').addClass('disable');
            }
            $currUser.find('.user-management-status-txt').text(uiBusiness.subUserStatus(subUsers[h].s));
            // still usage data.
            $usersTable.append($currUser);
        }
    };

    var reDraw = isRedrawNeeded(subAccounts, this.business.previousSubList);
    if (!reDraw) {
        return true; // OK
    }
    
    fillSubUsersTable(subAccounts, this);
    this.business.previousSubList = subAccounts; // storing current drawn sub-users to prevent not needed redraw
};


BusinessAccountUI.prototype.subUserStatus = function (statusCode) {
    if (statusCode === 0) {
        return l[7666]; // active
    }
    else if (statusCode === 10) {
        return l[7379]; // pending
    }
    else if (statusCode === 11) {
        return l[7070]; // disabled
    }
    else if (statusCode === 12) {
        return l[7376]; // deleted
    }
    else {
        return l[7381]; // unknown
    }
};

/**
 * show the password dialog for invitation link
 * @param {string} invitationLink :         sub-user invitation link
 */
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