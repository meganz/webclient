
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

    // private function to hide all business accounts UI divs.
    this.initUItoRender = function () {
        var $businessAccountContianer = $('.files-grid-view.user-management-view');
        $('.user-management-list-table', $businessAccountContianer).addClass('hidden');
        $('.user-management-subaccount-view-container', $businessAccountContianer).addClass('hidden');
        $('.user-management-overview-container', $businessAccountContianer).addClass('hidden');

        // hide any possible grid or block view.
        $('.files-grid-view, .fm-blocks-view').addClass('hidden');
        M.megaRender.cleanupLayout(false, [], '');

        // view left panel tabs headers [enabled and disabled] account
        $('.fm-left-panel .nw-tree-panel-header').addClass('hidden');
        $('.fm-left-panel .user-management-tree-panel-header.enabled-accounts').removeClass('hidden');
        $('.fm-left-panel .user-management-tree-panel-header.disabled-accounts').removeClass('hidden');
        $('.fm-left-panel').addClass('user-management');

        // headers
        $('.fm-right-header-user-management .user-management-main-page-buttons').addClass('hidden');
        $('.fm-right-header-user-management .user-management-breadcrumb.subaccount').addClass('hidden');
        $('.fm-right-header-user-management .user-management-breadcrumb.overview').addClass('hidden');
        $('.fm-right-header-user-management .user-management-breadcrumb').addClass('hidden');
        $('.fm-right-header-user-management .user-management-overview-buttons').addClass('hidden');
    };
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
    
    this.initUItoRender();

    var mySelf = this;

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

    subAccountsView.removeClass('hidden'); // un-hide the container
    $('.user-management-list-table', subAccountsView).removeClass('hidden'); // unhide the list table
    $('.fm-right-header-user-management .user-management-main-page-buttons').removeClass('hidden'); // unhide header
    $('.content-panel.user-management .nw-user-management-item').removeClass('selected');

    // header events handlers
    $('.fm-right-header-user-management .user-management-main-page-buttons .ba-overview').off('click.subuser')
        .on('click.subuser', function overviewHeaderButtonHandler() {
            mySelf.viewBusinessAccountOverview();
        });

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
        var $detailListTable = $('.grid-table-user-management', $usersTable);

        var $usersLeftPanel = $('.fm-tree-panel .content-panel.user-management');
        var $userLaeftPanelItems = $('.nw-user-management-item ', $usersLeftPanel);
        var $userLaeftPanelRow = $($userLaeftPanelItems.get(0)).clone(true);
        $userLaeftPanelItems.remove();

        // remove all elements from template on HTML file
        for (var k = 1; k < $tr.length; k++) {
            $tr.get(k).remove();
        }

        // now let's fill the table with sub-users data
         for (var a = 0; a < 50; a++) {
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
                $currUser.find('.user-management-status').removeClass('enabled pending disabled');
                if (subUsers[h].s === 0) {
                    $currUser.find('.user-management-status').addClass('enabled');
                    $currUserLeftPane.find('.user-management-status').removeClass('pending disabled')
                        .addClass('enabled');
                }
                else if (subUsers[h].s === 10) {
                    $currUser.find('.user-management-status').addClass('pending');
                    $currUserLeftPane.find('.user-management-status').removeClass('enabled disabled')
                        .addClass('pending');
                }
                else {
                    $currUser.find('.user-management-status').addClass('disabled');
                    $currUser.addClass('hidden');
                    $currUserLeftPane.find('.user-management-status').removeClass('enabled pending')
                        .addClass('disabled');
                    $currUserLeftPane.addClass('hidden');
                }
                $currUser.find('.user-management-status-txt').text(uiBusiness.subUserStatus(subUsers[h].s));
                // still usage data.
                $detailListTable.append($currUser);

                // left pane part
                $usersLeftPanel.append($currUserLeftPane);
            }
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
                    if (!$($subUsers[k]).find('.user-management-status').hasClass('disabled')) {
                        $($subUsers[k]).removeClass('hidden');
                    }
                    else {
                        $($subUsers[k]).addClass('hidden');
                    }
                }
                else {
                    if ($($subUsers[k]).find('.user-management-status').hasClass('disabled')) {
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
                    if (!$($subUsersTableRow[h]).find('.user-management-status').hasClass('disabled')) {
                        $($subUsersTableRow[h]).removeClass('hidden');
                    }
                    else {
                        $($subUsersTableRow[h]).addClass('hidden');
                    }
                }
                else {
                    if ($($subUsersTableRow[h]).find('.user-management-status').hasClass('disabled')) {
                        $($subUsersTableRow[h]).removeClass('hidden');
                    }
                    else {
                        $($subUsersTableRow[h]).addClass('hidden');
                    }
                }
            }
            
        });

        // 3- on clicking on a sub-user to view his info (from left pane or row)
        $('.user-management-list-table .view-icon.icon, .content-panel.user-management .nw-user-management-item')
            .off('click.subuser');
        $('.user-management-list-table .view-icon.icon, .content-panel.user-management .nw-user-management-item')
            .on('click.subuser', function subUserViewInfoClickHandler() {

                $('.content-panel.user-management .nw-user-management-item').removeClass('selected');

                var userHandle = false;

                if ($(this).hasClass('nw-user-management-item')) { // left pane
                    userHandle = $(this).attr('id');
                }
                else if ($(this).hasClass('view-icon')) { // user row
                    userHandle = $(this).closest('tr').attr('id');
                }
                else {
                    console.error('click handler fired in business account pages on wrong element');
                    return;
                }
                if (!userHandle) {
                    console.error('click handler fired in business account pages on wrong element');
                    return;
                }
                $('.content-panel.user-management .nw-user-management-item#' + userHandle).addClass('selected');
                uiBusiness.viewSubAccountInfoUI(userHandle);

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

/**
 * A function to show the sub-user info page
 * @param {string} subUserHandle        sub-user handle to view the info page for
 */
BusinessAccountUI.prototype.viewSubAccountInfoUI = function (subUserHandle) {
    "use strict";
    this.initUItoRender();

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $subAccountContainer = $('.user-management-subaccount-view-container', $businessAccountContainer);

    var subUser = M.suba[subUserHandle];

    if (!subUser) {
        console.error('at view sub-user info, with a handle we cant find!');
        return;
    }

    var uName = a32_to_str(base64_to_a32(subUser.firstname)) + ' ' +
        a32_to_str(base64_to_a32((subUser.lastname || '')));

    $('.subuser-name', $subAccountContainer).text(uName);
    $('.subuser-email', $subAccountContainer).text(subUser.e);

    $subAccountContainer.find('.user-management-view-status').removeClass('enabled pending disabled');
    if (subUser.s === 0) {
        $subAccountContainer.find('div.user-management-view-status').addClass('enabled');
    }
    else if (subUser.s === 10) {
        $subAccountContainer.find('div.user-management-view-status').addClass('pending');
    }
    else {
        $subAccountContainer.find('div.user-management-view-status').addClass('disabled');
    }
    $subAccountContainer.find('.user-management-view-status.text').text(this.subUserStatus(subUser.s));
    
    var subUserDefaultAvatar = useravatar.contact(subUserHandle);
    $('.subaccount-img-big', $subAccountContainer).html(subUserDefaultAvatar);

    // private function to fill quota info
    var fillQuotaInfo = function (st, quotas) {
        if (!quotas) {
            return;
        }
        
        var totalStorage = 0;
        var totalBandwidth = 0;
        var inboxHandle = quotas[subUserHandle][2]["4"];
        var rootHandle = quotas[subUserHandle][2]["2"];
        var rubbishHandle = quotas[subUserHandle][2]["3"];
        var inboxTotal = quotas[subUserHandle][1][inboxHandle][0] || 0;
        var rootTotal = quotas[subUserHandle][1][rootHandle][0] || 0;
        var rubbishTotal = quotas[subUserHandle][1][rubbishHandle][0] || 0;
        var inshareTotal = 0;


        totalStorage = quotas[subUserHandle][0] || 0;
        totalBandwidth = quotas[subUserHandle][3] || 0;
            
        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);
        var inboxTotalFormatted = numOfBytes(inboxTotal, 2);
        var rootTotalFormatted = numOfBytes(rootTotal, 2);
        var rubbishTotalFormatted = numOfBytes(rubbishTotal, 2);
        var inshareTotalFormatted = numOfBytes(inshareTotal, 2);

        $('.user-management-view-data .user-management-storage .storage-transfer-data',
            $subAccountContainer).text(totalStorageFormatted.size + ' ' + totalStorageFormatted.unit);
        $('.user-management-view-data .user-management-transfer .storage-transfer-data',
            $subAccountContainer).text(totalBandwidthFormatted.size + ' ' + totalBandwidthFormatted.unit);
        //$('.user-management-view-data .subaccount-view-used-storage-transfer .folder-occupy.root',
        //    $subAccountContainer).text(rootTotalFormatted.size + ' ' + rootTotalFormatted.unit);
        //$('.user-management-view-data .subaccount-view-used-storage-transfer .folder-occupy.inbox',
        //    $subAccountContainer).text(inboxTotalFormatted.size + ' ' + inboxTotalFormatted.unit);
        //$('.user-management-view-data .subaccount-view-used-storage-transfer .folder-occupy.inshare',
        //    $subAccountContainer).text(inshareTotalFormatted.size + ' ' + inshareTotalFormatted.unit);
        //$('.user-management-view-data .subaccount-view-used-storage-transfer .folder-occupy.rubbish',
        //    $subAccountContainer).text(rubbishTotalFormatted.size + ' ' + rubbishTotalFormatted.unit);
    };

    // getting quotas
    var quotasPromise = this.business.getQuotaUsage();
    quotasPromise.done(fillQuotaInfo);
    

    $businessAccountContainer.removeClass('hidden'); // BA container
    $subAccountContainer.removeClass('hidden'); // sub-info container
    $('.fm-right-header-user-management .user-management-breadcrumb.subaccount').removeClass('hidden');
};


/** show business account over view page
 * */
BusinessAccountUI.prototype.viewBusinessAccountOverview = function () {
    "use strict";

    this.initUItoRender();

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $overviewContainer = $('.user-management-overview-container', $businessAccountContainer)
        .removeClass('hidden');

    // header
    $('.fm-right-header-user-management .user-management-breadcrumb.overview').removeClass('hidden');
    $('.fm-right-header-user-management .user-management-overview-buttons').removeClass('hidden');
    
};