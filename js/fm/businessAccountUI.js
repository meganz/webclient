
/**
 * A UI control Class to perform Business Account related UI
 */
function BusinessAccountUI() {
    "use strict";
    if (!mega.buinsessController) {
        this.business = new BusinessAccount();
        mega.buinsessController = this.business;
        mBroadcaster.addListener('business:subuserUpdate', this.UIEventsHandler);
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
        $('.user-management-overview-bar').addClass('hidden');
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
    $('.fm-right-header-user-management .user-management-main-page-buttons .add-sub-user').off('click.subuser')
        .on('click.subuser', function addSubUserHeaderButtonHandler() {
            mySelf.showAddSubUserDialog();
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
         //for (var a = 0; a < 50; a++) {
        var isGray = true;
        var colorBg = false;
            for (var h in subUsers) {
                var $currUser = $tr_user.clone(true); // sub-users table
                var $currUserLeftPane = $userLaeftPanelRow.clone(true); // left pane list
                colorBg = false;

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
                    colorBg = true;
                }
                else if (subUsers[h].s === 10) {
                    $currUser.find('.user-management-status').addClass('pending');
                    $currUserLeftPane.find('.user-management-status').removeClass('enabled disabled')
                        .addClass('pending');
                    colorBg = true;
                }
                else {
                    $currUser.find('.user-management-status').addClass('disabled');
                    $currUser.addClass('hidden');
                    $currUserLeftPane.find('.user-management-status').removeClass('enabled pending')
                        .addClass('disabled');
                    $currUserLeftPane.addClass('hidden');
                }
                $currUser.find('.user-management-status-txt').text(uiBusiness.subUserStatus(subUsers[h].s));

                if (colorBg) {
                    if (isGray) {
                        $currUser.addClass('tr-gray');
                    }
                    else {
                        $currUser.removeClass('tr-gray');
                    }
                    isGray = !isGray;
                }
                $currUser.find('.edit-icon.icon').off('click.subuser').on('click.subuser', function editSubUserClickHandler() {
                    mySelf.showEditSubUserDialog(subUsers[h].u);
                });

                $detailListTable.append($currUser);

                // left pane part
                $usersLeftPanel.append($currUserLeftPane);
            }
         //}


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
            var isGray = true;

            for (var h = 1; h < $subUsersTableRow.length; h++) {
                if (me.hasClass('enabled-accounts')) {
                    if (!$($subUsersTableRow[h]).find('.user-management-status').hasClass('disabled')) {
                        $($subUsersTableRow[h]).removeClass('hidden');
                        if (isGray) {
                            $($subUsersTableRow[h]).addClass('tr-gray');
                        }
                        else {
                            $($subUsersTableRow[h]).removeClass('tr-gray');
                        }
                        isGray = !isGray;
                        $($subUsersTableRow[h]).find('.dis-en-icon').removeClass('enable-icon')
                            .addClass('disabled-icon').find('.tooltip').text(l[19092]);
                    }
                    else {
                        $($subUsersTableRow[h]).addClass('hidden');
                    }
                }
                else {
                    if ($($subUsersTableRow[h]).find('.user-management-status').hasClass('disabled')) {
                        $($subUsersTableRow[h]).removeClass('hidden');
                        if (isGray) {
                            $($subUsersTableRow[h]).addClass('tr-gray');
                        }
                        else {
                            $($subUsersTableRow[h]).removeClass('tr-gray');
                        }
                        isGray = !isGray;
                        $($subUsersTableRow[h]).find('.dis-en-icon').removeClass('disabled-icon')
                            .addClass('enable-icon').find('.tooltip').text(l[16141]);
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
        // storing current drawn sub-users to prevent not needed redraw
        this.business.previousSubList = JSON.parse(JSON.stringify(subAccounts));
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
    var mySelf = this;

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $subAccountContainer = $('.user-management-subaccount-view-container', $businessAccountContainer);
    var $subHeader = $('.fm-right-header-user-management .user-management-breadcrumb.subaccount');

    var subUser = M.suba[subUserHandle];

    if (!subUser) {
        console.error('at view sub-user info, with a handle we cant find!');
        return;
    }

    var uName = a32_to_str(base64_to_a32(subUser.firstname)) + ' ' +
        a32_to_str(base64_to_a32((subUser.lastname || '')));

    $('.subuser-name', $subAccountContainer).text(uName);
    $('.user-management-subuser-name', $subHeader).text(uName);
    $('.subuser-email', $subAccountContainer).text(subUser.e);

    $subAccountContainer.find('.user-management-view-status').removeClass('enabled pending disabled');
    // $subAccountContainer.find('.profile-button-container .disable-account').removeClass('hidden');
    $subAccountContainer.find('.profile-button-container .disable-account').text(l[19092])
        .removeClass('default-green-button-user-management').addClass('default-gray-button-user-management')
        .addClass('sub-disable').removeClass('sub-enable');
    $subAccountContainer.find('.profile-button-container .edit-profile').text(l[16735]);
    $subAccountContainer.find('.profile-button-container .resend-verification').addClass('hidden');
    if (subUser.s === 0) {
        $subAccountContainer.find('div.user-management-view-status').addClass('enabled');
    }
    else if (subUser.s === 10) {
        $subAccountContainer.find('div.user-management-view-status').addClass('pending');
        $subAccountContainer.find('.profile-button-container .resend-verification').text(l[19097])
            .removeClass('hidden');
    }
    else {
        $subAccountContainer.find('div.user-management-view-status').addClass('disabled');

        $subAccountContainer.find('.profile-button-container .disable-account').text(l[19094])
            .removeClass('default-gray-button-user-management').addClass('default-green-button-user-management')
            .addClass('sub-enable').removeClass('sub-disable');
        $subAccountContainer.find('.profile-button-container .edit-profile').text(l[19095]);
    }
    $subAccountContainer.find('.user-management-view-status.text').text(this.subUserStatus(subUser.s));
    
    var subUserDefaultAvatar = useravatar.contact(subUserHandle);
    $('.subaccount-img-big', $subAccountContainer).html(subUserDefaultAvatar);
    $('.user-management-subuser-avatars', $subHeader).html(subUserDefaultAvatar);

    // event handler for clicking on the header
    $('.user-management-icon', $subHeader).off('click.subuser')
        .on('click.subuser', function navigationHeaderClickHandler() {
            mySelf.viewSubAccountListUI();
        });

    // event handler for enable/disable account
    $subAccountContainer.find('.profile-button-container .disable-account').off('click.subuser')
        .on('click.subuser', function enable_disableClickHandler() {
            if ($(this).hasClass('sub-disable')) { // button now in disable status

                var confirmationDlgResultHandler = function (adminAnswer) {
                    if (adminAnswer) {
                        var opPromise = mySelf.business.deActivateSubAccount(subUserHandle);
                        opPromise.done(
                            function () {
                                // action packet will update DB. [+ memory]
                                // subUser.s = 11; // disabled
                                mySelf.viewSubAccountInfoUI(subUserHandle);
                            }
                        ).fail(
                            function () {
                                msgDialog('warningb', '', l[19100]);
                            }
                        );
                    }
                };

                mySelf.showDisableAccountConfirmDialog(confirmationDlgResultHandler, uName);
            }
            else {
                // enable on
                var confirmationDlgResultHandler2 = function (adminAnswer) {
                    if (adminAnswer) {
                        var opPromise = mySelf.business.activateSubAccount(subUserHandle);
                        opPromise.done(
                            function (st,res,req) {
                                mySelf.viewSubAccountInfoUI(subUserHandle);
                            }
                        ).fail(
                            function () {
                                msgDialog('warningb', '', l[19128]);
                            }
                        );
                    }
                };

                mySelf.showDisableAccountConfirmDialog(confirmationDlgResultHandler2, uName, true);
            }
        });

    // private function to fill quota info
    var fillQuotaInfo = function (st, quotas) {

        return;

        if (!quotas) {
            return;
        }
        
        var totalStorage = 0;
        var totalBandwidth = 0;
        // var inboxHandle = quotas[subUserHandle][2]["4"];
        var rootHandle = quotas[subUserHandle][2]["2"];
        var rubbishHandle = quotas[subUserHandle][2]["3"];
        // var inboxTotal = quotas[subUserHandle][1][inboxHandle][0] || 0;
        var rootTotal = quotas[subUserHandle][1][rootHandle][0] || 0;
        var rubbishTotal = quotas[subUserHandle][1][rubbishHandle][0] || 0;
        var inshareTotal = 0;


        totalStorage = quotas[subUserHandle][0] || 0;
        totalBandwidth = quotas[subUserHandle][3] || 0;
            
        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);
        // var inboxTotalFormatted = numOfBytes(inboxTotal, 2);
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

    // viewing the right buttons


    // getting quotas
    var quotasPromise = this.business.getQuotaUsage();
    quotasPromise.done(fillQuotaInfo);
    

    $businessAccountContainer.removeClass('hidden'); // BA container
    $subAccountContainer.removeClass('hidden').attr('id', 'sub-' + subUserHandle); // sub-info container
    $subHeader.removeClass('hidden');
    $subAccountContainer.jScrollPane({ enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true });
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



    // private function to populate the dashboard
    var populateDashboard = function (st, quotas) {
        if (!quotas) {
            return;
        }

        var numberOfSubs = 0;
        var activeSubs = 0;
        var pendingSubs = 0;
        var disabledSubs = 0;
        var totalStorage = 0;
        var totalBandwidth = 0;
        var inshareTotal = 0;
        var rootTotal = 0;
        var rubbishTotal = 0;

        for (var sub in quotas) {
            if (sub === 'timestamp') {
                continue; // embedded attribute 
            }
            numberOfSubs++;
            if (sub === u_handle) {
                activeSubs++;
            }
            else if (M.suba[sub] && M.suba[sub].s === 0) {
                activeSubs++;
            }
            else if (M.suba[sub] && M.suba[sub].s === 10) {
                pendingSubs++;
            }
            else {
                disabledSubs++;
            }

            totalStorage += quotas[sub][0] || 0;
            totalBandwidth += quotas[sub][3] || 0;

            var rootHandle = quotas[sub][2]["2"];
            var rubbishHandle = quotas[sub][2]["3"];
            var inboxHandle = quotas[sub][2]["4"];
            var inshareHandle = '';

            rootTotal += (quotas[sub][1][rootHandle][0] || 0);
            rubbishTotal += (quotas[sub][1][rubbishHandle][0] || 0);

            for (var hh in quotas[sub][1]) {
                if (hh !== rootHandle && hh !== rubbishHandle && hh !== inboxHandle) {
                    inshareHandle = hh;
                    break;
                }
            }
            inshareTotal += (quotas[sub][1][inshareHandle][0] || 0);

        }

        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);
        var rootTotalFormatted = numOfBytes(rootTotal, 2);
        var rubbishTotalFormatted = numOfBytes(rubbishTotal, 2);
        var inshareTotalFormatted = numOfBytes(inshareTotal, 2);

        var rootPrecentage = rootTotal / totalStorage;
        var insharePrecentage = inshareTotal / totalStorage;
        var rubbishPrecentage = rubbishTotal / totalStorage;

        $overviewContainer.find('.user-segments-container.all-subs .user-segment-number').text(numberOfSubs);
        $overviewContainer.find('.user-segments-container.active-subs .user-segment-number').text(activeSubs);
        $overviewContainer.find('.user-segments-container.pending-sub .user-segment-number').text(pendingSubs);
        $overviewContainer.find('.user-segments-container.disabled-subs .user-segment-number').text(disabledSubs);

        $overviewContainer.find('.storage-small-circle .total-storage-number')
            .text(totalStorageFormatted.size + ' ' + totalStorageFormatted.unit);

        $overviewContainer.find('.storage-division-container.cloud-node .storage-division-num')
            .text(rootTotalFormatted.size + ' ' + rootTotalFormatted.unit);
        $overviewContainer.find('.storage-division-container.cloud-node .storage-division-per')
            .text(Math.round(rootPrecentage) + '%');
        $overviewContainer.find('.storage-division-container.inshare-node .storage-division-num')
            .text(inshareTotalFormatted.size + ' ' + inshareTotalFormatted.unit);
        $overviewContainer.find('.storage-division-container.inshare-node .storage-division-per')
            .text(Math.round(insharePrecentage) + '%');
        $overviewContainer.find('.storage-division-container.rubbish-node .storage-division-num')
            .text(rubbishTotalFormatted.size + ' ' + rubbishTotalFormatted.unit);
        $overviewContainer.find('.storage-division-container.rubbish-node .storage-division-per')
            .text(Math.round(rubbishPrecentage) + '%');
        $overviewContainer.find('.storage-division-container.inbox-node').addClass('hidden');


    };


    // getting quotas
    var quotasPromise = this.business.getQuotaUsage();
    quotasPromise.done(populateDashboard);
    
};

/**
 * Shows the confirmation dialog for sub-user disabling 
 * @param {function} actionFuncHandler      user response handler - function accepts 1 boolean parameter
 * @param {string} userName                 sub-user name
 * @param {boolean} isEnable                a flag to tell that we want enabling conformation
 */
BusinessAccountUI.prototype.showDisableAccountConfirmDialog = function (actionFuncHandler, userName, isEnable) {
    "use strict";
    var $dialog = $('.user-management-able-user-dialog.user-management-dialog');

    var dialogQuestion = l[19098];
    var note = l[19099];
    $dialog.find('.icon56').removeClass('re-enable-large-icon').addClass('disable-large-icon');
    if (isEnable) {
        dialogQuestion = l[19101];
        note = l[19102];
        $dialog.find('.icon56').removeClass('disable-large-icon').addClass('re-enable-large-icon');
    }
    dialogQuestion = dialogQuestion.replace('[B]', '<b>').replace('[/B]', '</b>')
        .replace('{0}', userName);
    $dialog.find('.dialog-text-one').html(dialogQuestion);
    $dialog.find('.dialog-text-two').text(note);

    // event handler for clicking on "Yes" or "Cancel" buttons
    $dialog.find('.dialog-button-container .dlg-btn').off('click.subuser')
        .on('click.subuser', function disableSubUserConfirmationDialogHandler() {
            closeDialog();
            if (actionFuncHandler && typeof actionFuncHandler === 'function') {
                if ($(this).hasClass('yes-answer')) {
                    return actionFuncHandler(true);
                }
                else {
                    return actionFuncHandler(false);
                }
            }
        });

    M.safeShowDialog('sub-user-disable-cnf-dlg', function () {
        return $dialog;
    });
};

/**
 *  showes the add sub-user dialog
 * */
BusinessAccountUI.prototype.showAddSubUserDialog = function () {
    var $dialog = $('.user-management-add-user-dialog.user-management-dialog');
    var mySelf = this;

    // set the "Add User" button to disabled
    // $('.default-green-button-user-management', $dialog).addClass('disabled');

    var clearDialog = function () {
        var $adduserContianer = $('.dialog-input-container', $dialog);
        // if (usersRows.length > 1) {
        //    for (var k = 1; k < usersRows.length; k++) {
        //        usersRows.get(k).remove();
        //    }
        // }
        $('input', $adduserContianer).val('');
        $adduserContianer.removeClass('hidden');
        $('.error-message', $adduserContianer).addClass('hidden');
        $('.verification-container', $dialog).addClass('hidden');
        $('.dialog-subtitle', $dialog).addClass('hidden');
        $('.dialog-button-container .add-more', $dialog).addClass('hidden');
        $('.dialog-button-container .add-sub-user', $dialog).text(l[19084]).removeClass('a-ok-btn');
        $('.licence-bar', $dialog).removeClass('hidden');
    };

    clearDialog(); // remove any previous data

    // event handler for "X" icon to close the dialog
    $('.delete-img.icon', $dialog).off('click.subuser')
        .on('click.subuser', function exitIconClickHandler() {
            closeDialog();
        });

    // event handler for clicking on "add more"
    $('.dialog-button-container .add-more', $dialog).off('click.subuser')
        .on('click.subuser', function addMoreClickHandler() {
            clearDialog();
        });

    // event handler for adding sub-users
    $('.dialog-button-container .add-sub-user', $dialog).off('click.subuser')
        .on('click.subuser', function addSubUserClickHandler() {
            if ($(this).hasClass('disabled')) {
                return;
            }
            if ($(this).hasClass('a-ok-btn')) {
                closeDialog();
                return;
            }

            var $uName = $('.input-user input.sub-n', $dialog);
            var $uEmail = $('.input-user input.sub-m', $dialog);

            if (!$uName.val().trim().length || $uName.val().trim().split(' ', 2).length < 2) {
                $uName.addClass('error');
                $('.dialog-input-container .error-message', $dialog).removeClass('hidden').text(l[1098]);
                return;
            }
            if (checkMail($uEmail.val().trim())) {
                $uEmail.addClass('error');
                $('.dialog-input-container .error-message', $dialog).removeClass('hidden').text(l[5705]);
                return;
            }

            loadingDialog.pshow();

            var subName = $uName.val().trim(); // i know it's 2 parts at least
            var subEmail = $uEmail.val().trim();
            var subFnLn = subName.split(' ');

            if (subFnLn.length < 2) {
                console.error('name does not consist of 2 parts, how did we get here?');
                return;
            }

            var subPromise = mySelf.business.addSubAccount(subEmail, subFnLn.shift(), subFnLn.join(' '));


            var finalizeOperation = function (st,res,req) {
                var $addContianer = $('.dialog-input-container', $dialog);
                var $resultContianer = $('.verification-container', $dialog);

                if (st === 1) {
                    var subUserDefaultAvatar = useravatar.contact(res.u);
                    $('.new-sub-user', $resultContianer).html(subUserDefaultAvatar);
                    $('.sub-e', $resultContianer).text(req.m);
                    $('.sub-p', $resultContianer).text(res.lp);

                    $addContianer.addClass('hidden');
                    $resultContianer.removeClass('hidden');
                    $('.dialog-button-container .add-more', $dialog).removeClass('hidden');
                    $('.dialog-button-container .add-sub-user', $dialog).text(l[81]).addClass('a-ok-btn'); // OK
                    $('.licence-bar', $dialog).addClass('hidden');
                    $('.dialog-subtitle', $dialog).removeClass('hidden');
                }
                else {
                    $('.dialog-input-container .error-message', $dialog).removeClass('hidden').text(l[1679]);
                }

                loadingDialog.phide();
            };

            subPromise.always(finalizeOperation);
            // subPromise.fail(function (args) {
            //    msgDialog('warninga', 'Error', l[1679]);
            //    console.error(args);
            // });
        });

    
    // event handler for key-down on inputs
    $('.input-user input', $dialog).off('keydown.subuserresd')
        .on('keydown.subuserresd', function inputFieldsKeyDoownHandler() {
            var $me = $(this);
            if ($me.hasClass('error')) {
                $me.removeClass('error');
                $('.dialog-input-container .error-message', $dialog).addClass('hidden')
            }
        });

    M.safeShowDialog('sub-user-adding-dlg', function () {
        return $dialog;
    });
};


BusinessAccountUI.prototype.showEditSubUserDialog = function (subUserHandle) {
    "use strict";
    if (!subUserHandle) {
        return;
    }
    if (!M.suba[subUserHandle]) {
        return;
    }
    var subUser = M.suba[subUserHandle];

    var $dialog = $('.user-management-edit-profile-dialog.user-management-dialog');
    var $usersContainer = $('.dialog-input-container', $dialog);
    var $nameInput = $('input.edit-sub-name', $usersContainer);
    var $emailInput = $('input.edit-sub-email', $usersContainer);

    var uName = a32_to_str(base64_to_a32(subUser.firstname)) + ' ' +
        a32_to_str(base64_to_a32((subUser.lastname || '')));

    $nameInput.val(uName);
    $emailInput.val(subUser.e);

    M.safeShowDialog('sub-user-editting-dlg', function () {
        return $dialog;
    });
};


/**
 * show the adding result for a list of sub-users
 * @param {object[]} results        array of sub-user object {email,status,initPass,handle}
 */
BusinessAccountUI.prototype.showAddSubUserResultDialog = function (results) {
    "use strict";
    var $dialog = $('.user-management-verification-dialog.user-management-dialog');

    if (!results || !results.length) {
        return;
    }
    var $usersContainer = $('.um-dialog-content-block.verification-container', $dialog);
    var $userRow = $('.um-dialog-content-block.verification-container .verification-user-container', $dialog);
    var $userTemplate;

    if ($userRow.length > 1) {
        $userTemplate = $($userRow[0]).clone(true);
    }
    else {
        $userTemplate = $userRow.clone(true);
    }
    $userRow.remove();

    for (var k = 0; k < results.length; k++) {
        var $currSubUser = $userTemplate.clone(true);
        if (results[k].status === 1) {
            var subUserDefaultAvatar = useravatar.contact(results[k].handle);
            $('.new-sub-user.avatar', $currSubUser).html(subUserDefaultAvatar);
            $('.sub-e', $currSubUser).text(results[k].email);
            $('.sub-p', $currSubUser).text(results[k].initPass);
        }
        else {
            $('.sub-e', $currSubUser).text(results[k].email);
            $('.sub-p', $currSubUser).text('Error - FAILED');
        }
        $usersContainer.append($currSubUser);
    }
    if (results.length > 3) {
        $usersContainer
            .jScrollPane({ enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true });
    }

    $('.dialog-button-container .ok-done', $dialog).off('click.subuser')
        .on('click.subuser', function addSubUserDoneClickHandler() {
            $('.dialog-button-container .ok-done', $dialog).off('keydown.subuserresd');
            closeDialog();
        });
    $('.dialog-button-container .ok-done', $dialog).off('keydown.subuserresd')
        .on('keydown.subuserresd', function addSubUserDoneKeydownHandler(key) {
            if (key.keyCode === 27 || key.key === 'Escape' || key.code === 'Escape' || key.which === 27) {
                return false;
            }
        });

    M.safeShowDialog('sub-user-adding-res-dlg', function () {
        return $dialog;
    });
};

BusinessAccountUI.prototype.UIEventsHandler = function (subuser) {
    "use strict";
    if (!subuser) {
        return;
    }

    // private function to update left panel
    var updateLeftSubUserPanel = function (subuser) {
        var $usersLeftPanel = $('.fm-tree-panel .content-panel.user-management');
        var $userRow = $('#' + subuser.u, $usersLeftPanel);
        if (!$userRow.length) {
            return;
        }
        if (subuser.s === 0) {
            $userRow.find('.user-management-status').removeClass('pending disabled')
                .addClass('enabled');
        }
        else if (subuser.s === 10) {
            $userRow.find('.user-management-status').removeClass('enabled disabled')
                .addClass('pending');
        }
        else {
            
            $userRow.find('.user-management-status').removeClass('enabled pending')
                .addClass('disabled');
            $userRow.addClass('hidden');
        }
        $('.user-management-tree-panel-header.disabled-accounts').trigger('click.subuser');
    };

    // if we are in table view
    if (!$('.user-management-list-table').hasClass('hidden')) {
        // safe to create new object.
        var busUI = new BusinessAccountUI();
        busUI.viewSubAccountListUI();
    }
    // if we are in sub-user view
    else if (!$('.files-grid-view.user-management-view .user-management-subaccount-view-container')
        .hasClass('hidden')) {
        var viewedUserId =
            $('.files-grid-view.user-management-view .user-management-subaccount-view-container').attr('id');
        var updatedUser = 'sub-' + subuser.u;
        if (viewedUserId === updatedUser) {
            // safe to create new object.
            var busUI = new BusinessAccountUI();
            busUI.viewSubAccountInfoUI(subuser.u);
            // update the left pane
            updateLeftSubUserPanel(subuser);
        }
    } 
};