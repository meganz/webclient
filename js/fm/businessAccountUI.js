
/**
 * A UI control Class to perform Business Account related UI
 */
function BusinessAccountUI() {
    "use strict";
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
    "use strict";
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

    // view left panel tabs headers [enabled and disabled] account
    $('.fm-left-panel .nw-tree-panel-header').addClass('hidden');
    $('.fm-left-panel .user-management-tree-panel-header.enabled-accounts').removeClass('hidden');
    $('.fm-left-panel .user-management-tree-panel-header.disabled-accounts').removeClass('hidden');
    
    // hide any possible grid or block view.
    $('.files-grid-view, .fm-blocks-view').addClass('hidden');
    M.megaRender.cleanupLayout(false, [], '');

    var subAccountsView;
    if (!isBlockView) {
        subAccountsView = $('.files-grid-view.user-management-view');
    }
    else {
        subAccountsView = $('.fm-blocks-view.user-management-view');
    }
    $('.fm-right-files-block').removeClass('hidden');

    if (subAccounts.length) { // no subs, some new UI

        return;
    }
    
    subAccountsView.removeClass('hidden');

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
    var fillSubUsersTable = function (subUsers, uiBusiness) {
        var $usersTable = $('.user-management-list-table', subAccountsView).removeClass('hidden');
        var $tr = $('tr', $usersTable);
        var $tr_user = $($tr.get(1)).clone(true); // the first one is the table header

        var $usersLeftPanel = $('.fm-tree-panel .content-panel.user-management');
        var $userLaeftPanelItems = $('.nw-user-management-item ', $usersLeftPanel);
        var $userLaeftPanelRow = $($userLaeftPanelItems.get(0)).clone(true);
        $userLaeftPanelItems.remove();

        // remove all elements from template on HTML file
        for (var k = 1; k < $tr.length; k++) {
            $tr.get(k).remove();
        }

        // now let's fill the table with sub-users data
        for (var h in subUsers) {
            var $currUser = $tr_user.clone(true); // sub-users table
            var $currUserLeftPane = $userLaeftPanelRow.clone(true); // left pane list

            $currUser.attr('id', subUsers[h].u);
            $currUserLeftPane.attr('id', subUsers[h].u);
            // now we will hide icon and role, since we are not ready to support yet.
            // $currUser.find('.fm-user-management-user .admin-icon .tooltip').text('Sub-Account');
            $currUser.find('.fm-user-management-user .admin-icon').addClass('hidden');

            $currUserLeftPane.removeClass('selected');
            var uName = a32_to_str(base64_to_a32(subUsers[h].firstname)) + ' ' +
                a32_to_str(base64_to_a32((subUsers[h].lastname || '')));
            $currUser.find('.fm-user-management-user .user-management-name').text(uName);
            $currUserLeftPane.find('.nw-user-management-name').text(uName);

            $currUser.find('.user-management-email').text(subUsers[h].e);
            $currUser.find('.user-management-status').removeClass('enabled pending disable');
            if (subUsers[h].s === 0) {
                $currUser.find('.user-management-status').addClass('enabled');
                $currUserLeftPane.find('.user-management-status').removeClass('pending disable')
                    .addClass('enabled');
            }
            else if (subUsers[h].s === 10) {
                $currUser.find('.user-management-status').addClass('pending');
                $currUserLeftPane.find('.user-management-status').removeClass('enabled disable')
                    .addClass('pending');
            }
            else {
                $currUser.find('.user-management-status').addClass('disable');
                $currUser.addClass('hidden');
                $currUserLeftPane.find('.user-management-status').removeClass('enabled pending')
                    .addClass('disable');
                $currUserLeftPane.addClass('hidden');
            }
            $currUser.find('.user-management-status-txt').text(uiBusiness.subUserStatus(subUsers[h].s));
            // still usage data.
            $usersTable.append($currUser);

            // left pane part
            $usersLeftPanel.append($currUserLeftPane);
        }


        /// events handlers
        // 1- check boxes
        $('.business-sub-checkbox-td, .business-sub-checkbox-th', $usersTable).off('click.subuser');
        $('.business-sub-checkbox-td, .business-sub-checkbox-th', $usersTable).on('click.subuser',
            function subUserCheckBoxHandler() {
                var $me = $(this).find('.checkdiv');
                if ($me.hasClass('checkboxOff-user-management')) {
                    $me.removeClass('checkboxOff-user-management').addClass('checkboxOn-user-management');
                    if ($(this).hasClass('business-sub-checkbox-th')) {
                        $('.business-sub-checkbox-td .checkdiv', $usersTable).
                            removeClass('checkboxOff-user-management').addClass('checkboxOn-user-management');
                    }
                }
                else {
                    $me.addClass('checkboxOff-user-management').removeClass('checkboxOn-user-management');
                    if ($(this).hasClass('business-sub-checkbox-th')) {
                        $('.business-sub-checkbox-td .checkdiv', $usersTable).
                            addClass('checkboxOff-user-management').removeClass('checkboxOn-user-management');
                    }
                    else {
                        $('.business-sub-checkbox-th .checkdiv', $usersTable).
                            addClass('checkboxOff-user-management').removeClass('checkboxOn-user-management');
                    }
                }
            });

        // 2- left pane headers (enabled,disabled) sub-users
        $('.user-management-tree-panel-header').off('click.subuser');
        $('.user-management-tree-panel-header').on('click.subuser', function subUserLeftPanelHeaderClickHandler() {
            var me = $(this);

            $('.user-management-tree-panel-header').removeClass('active');
            me.addClass('active');

            var $subUsers = $('.fm-tree-panel .content-panel.user-management .nw-user-management-item');

            for (var k = 0; k < $subUsers.length; k++) {
                if (me.hasClass('enabled-accounts')) {
                    if (!$($subUsers[k]).find('.user-management-status').hasClass('disable')) {
                        $($subUsers[k]).removeClass('hidden');
                    }
                    else {
                        $($subUsers[k]).addClass('hidden');
                    }
                }
                else {
                    if ($($subUsers[k]).find('.user-management-status').hasClass('disable')) {
                        $($subUsers[k]).removeClass('hidden');
                    }
                    else {
                        $($subUsers[k]).addClass('hidden');
                    }
                }
            }

            var $subUsersTableRow = $('tr', $usersTable);

            for (var h = 1; h < $subUsersTableRow.length; h++) {
                if (me.hasClass('enabled-accounts')) {
                    if (!$($subUsersTableRow[h]).find('.user-management-status').hasClass('disable')) {
                        $($subUsersTableRow[h]).removeClass('hidden');
                    }
                    else {
                        $($subUsersTableRow[h]).addClass('hidden');
                    }
                }
                else {
                    if ($($subUsersTableRow[h]).find('.user-management-status').hasClass('disable')) {
                        $($subUsersTableRow[h]).removeClass('hidden');
                    }
                    else {
                        $($subUsersTableRow[h]).addClass('hidden');
                    }
                }
            }
            
        });

    };


    // private function to get users quota usage
    var fillSubUsersUsage = function (st, quotas) {
        if (!quotas) {
            return;
        }

        var numberOfSubs = 0;
        var totalStorage = 0;
        var totalBandwidth = 0;

        var $usersTable = $('.user-management-list-table', subAccountsView);
        for (var sub in quotas) {
            if (sub === 'timestamp') {
                continue; // embedded attribute 
            }
            numberOfSubs++;
            totalStorage += quotas[sub][0] || 0;
            totalBandwidth += quotas[sub][3] || 0;
            var $subTr = $('#' + sub, $usersTable);
            if ($subTr.length) {
                var storage = numOfBytes(quotas[sub][0] || 0, 2);
                var bandwidth = numOfBytes(quotas[sub][3] || 0, 2);
                $('.business-sub-storage-use span', $subTr).text(storage.size + ' ' + storage.unit);
                $('.business-sub-transfer-use span', $subTr).text(bandwidth.size + ' ' + bandwidth.unit);
            }
        }
        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);

        $('.info-block.nb-sub-users .number', '.user-management-overview-bar').text(numberOfSubs);

        $('.info-block.storage-sub-users .number', '.user-management-overview-bar').text(totalStorageFormatted.size);
        $('.info-block.storage-sub-users .title2', '.user-management-overview-bar').text(totalStorageFormatted.unit);

        $('.info-block.bandwidth-sub-users .number', '.user-management-overview-bar')
            .text(totalBandwidthFormatted.size);
        $('.info-block.bandwidth-sub-users .title2', '.user-management-overview-bar')
            .text(totalBandwidthFormatted.unit);
        $('.user-management-overview-bar').removeClass('hidden');
    };

    var reDraw = isRedrawNeeded(subAccounts, this.business.previousSubList);

    if (reDraw) {
        fillSubUsersTable(subAccounts, this);
        this.business.previousSubList = subAccounts; // storing current drawn sub-users to prevent not needed redraw
    }

    // getting quotas
    var quotasPromise = this.business.getQuotaUsage();
    quotasPromise.done(fillSubUsersUsage);

};


BusinessAccountUI.prototype.subUserStatus = function (statusCode) {
    "use strict";
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
    "use strict";
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