
/**
 * A UI control Class to perform Business Account related UI
 */
function BusinessAccountUI() {
    "use strict";
    if (!mega.buinsessController) {
         /**@type {BusinessAccount} */
        this.business = new BusinessAccount();
        mega.buinsessController = this.business;
        mBroadcaster.addListener('business:subuserUpdate', this.UIEventsHandler);
        this.initialized = false;
    }
    else {
        this.business = mega.buinsessController;
        this.initialized = true;
    }

    // private function to hide all business accounts UI divs.
    this.initUItoRender = function () {
        var $businessAccountContianer = $('.files-grid-view.user-management-view');
        $('.user-management-list-table', $businessAccountContianer).addClass('hidden');
        $('.user-management-subaccount-view-container', $businessAccountContianer).addClass('hidden');
        $('.user-management-overview-container', $businessAccountContianer).addClass('hidden');
        $('.user-management-landing-page.user-management-view', $businessAccountContianer).addClass('hidden');

        // hide any possible grid or block view.
        $('.files-grid-view, .fm-blocks-view').addClass('hidden');
        if (M.megaRender) {
            M.megaRender.cleanupLayout(false, [], '');
        }

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
    if (!this.business.isBusinessMasterAcc()) {
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

    this.URLchanger('');

    if (subAccounts.length) { // no subs
        return this.viewLandingPage();
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
                $currUserLeftPane.removeClass('hidden');

                $currUser.attr('id', subUsers[h].u);
                $currUserLeftPane.attr('id', subUsers[h].u);
                // now we will hide icon and role, since we are not ready to support yet.
                // $currUser.find('.fm-user-management-user .admin-icon .tooltip').text('Sub-Account');
                $currUser.find('.fm-user-management-user .admin-icon').addClass('hidden');

                $currUserLeftPane.removeClass('selected');
                var uName = from8(base64urldecode(subUsers[h].firstname)) + ' ' +
                    from8(base64urldecode(subUsers[h].lastname));
                uName = uName.trim();
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
        $('.grid-table-user-management .view-icon.icon, .content-panel.user-management .nw-user-management-item')
            .off('click.subuser');
        $('.grid-table-user-management .view-icon.icon, .content-panel.user-management .nw-user-management-item')
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

        // 4- on clicking on a sub-user row to edit his info (edit  icon)
        $('.grid-table-user-management .edit-icon.icon').off('click.subuser').on('click.subuser',
            function editSubUserClickHandler() {
                var userHandle = $(this).closest('tr').attr('id');
                mySelf.showEditSubUserDialog(userHandle);
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

        var todayData = quotas[Object.keys(quotas)[0]];
        if (!todayData) {
            return;
        }

        var subUsersData = todayData.u;
        if (!subUsersData) {
            return;
        }

        for (var sub in subUsersData) {
            numberOfSubs++;
            var subStorage = subUsersData[sub].ts || 0;
            var subBandwidth = subUsersData[sub].dl || 0;

            totalStorage += subStorage;
            totalBandwidth += subBandwidth;

            var $subTr = $('#' + sub, $usersTable);
            if ($subTr.length) {
                var storage = numOfBytes(subStorage, 2);
                var bandwidth = numOfBytes(subBandwidth, 2);
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

/** Function to show landing page, for admins without sub-users yet */
BusinessAccountUI.prototype.viewLandingPage = function () {
    "use strict";
    this.initUItoRender();
    var mySelf = this;

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $landingContainer = $('.user-management-landing-page.user-management-view', $businessAccountContainer);

    $('.content-panel.user-management .nw-user-management-item').removeClass('selected').addClass('hidden');

    $('.landing-sub-container.adding-subuser', $landingContainer).off('click.subuser')
        .on('click.subuser', function addSubUserClickHandler() {
            mySelf.showAddSubUserDialog();
        });

    $businessAccountContainer.removeClass('hidden'); // BA container
    $landingContainer.removeClass('hidden');
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
    this.URLchanger(subUser.u);

    var uName = from8(base64urldecode(subUser.firstname)) + ' ' +
        from8(base64urldecode(subUser.lastname));
    uName = uName.trim();

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
    $subAccountContainer.find('.profile-button-container .migrate-data').addClass('hidden');
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
        $subAccountContainer.find('.profile-button-container .migrate-data').text(l[19095]).removeClass('hidden');
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
                            function (st, res, req) {
                                if (res === 0) {
                                    mySelf.viewSubAccountInfoUI(subUserHandle);
                                }
                                else if (typeof res === 'object') {
                                    res.m = subUser.e;
                                    mySelf.showAddSubUserDialog(res);
                                }
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

    // event handler for data-migration of a sub-user
    $subAccountContainer.find('.profile-button-container .migrate-data').off('click.subuser')
        .on('click.subuser', function migrateData_ClickHandler() {
            mySelf.migrateSubUserData(subUserHandle);
        });


    // private function to fill quota info
    var fillQuotaInfo = function (st, quotas) {
        if (!quotas) {
            return;
        }

        var todayData = quotas[Object.keys(quotas)[0]];
        if (!todayData) {
            return;
        }

        var subUsersData = todayData.u;
        if (!subUsersData) {
            return;
        }

        var subUserStats = subUsersData[subUserHandle];
        if (!subUserStats) {
            return;
        }
        
        var totalStorage = 0;
        var totalBandwidth = 0;
        
        var emptyArray = [0, 0, 0, 0, 0];

        var rootInfo = subUserStats["2"] || emptyArray;
        var rubbishInfo = subUserStats["4"] || emptyArray;
        var inshareInternalInfo = subUserStats["isi"] || emptyArray;
        var inshareExternalInfo = subUserStats["ise"] || emptyArray;
        var outshareInfo = subUserStats["os"] || emptyArray;

        totalStorage = subUserStats["ts"] || 0;
        totalBandwidth = subUserStats["dl"] || 0;
            
        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);
        var rootTotalFormatted = numOfBytes(rootInfo[0], 2);
        var rubbishTotalFormatted = numOfBytes(rubbishInfo[0], 2);
        var inshareInternalTotalFormatted = numOfBytes(inshareInternalInfo[0], 2);
        var inshareExternalTotalFormatted = numOfBytes(inshareExternalInfo[0], 2);
        var outshareTotalFormatted = numOfBytes(outshareInfo[0], 2);

        var versionsTotalFormatted = numOfBytes(rootInfo[3] + rubbishInfo[3]
            + inshareInternalInfo[3] + inshareExternalInfo[3] + outshareInfo[3], 2);

        // fill in UI
        $('.user-management-view-data .user-management-storage .storage-transfer-data',
            $subAccountContainer).text(totalStorageFormatted.size + ' ' + totalStorageFormatted.unit);
        $('.user-management-view-data .user-management-transfer .storage-transfer-data',
            $subAccountContainer).text(totalBandwidthFormatted.size + ' ' + totalBandwidthFormatted.unit);

        var $cloudDriveSection = $('.user-management-view-data .subaccount-view-used-data .used-storage-info.ba-root',
            $subAccountContainer);
        var $inShareSection = $('.user-management-view-data .subaccount-view-used-data .used-storage-info.ba-inshare',
            $subAccountContainer);
        var $inShareExSection = $('.user-management-view-data .subaccount-view-used-data' +
            ' .used-storage-info.ba-inshare-ex', $subAccountContainer);
        var $outShareSection = $('.user-management-view-data .subaccount-view-used-data' +
            ' .used-storage-info.ba-outshare', $subAccountContainer);
        var $rubbishSection = $('.user-management-view-data .subaccount-view-used-data' +
            ' .used-storage-info.ba-rubbish', $subAccountContainer);
        var $versionsSection = $('.user-management-view-data .subaccount-view-used-data' +
            ' .used-storage-info.ba-version', $subAccountContainer);

        $cloudDriveSection.find('.ff-occupy').text(rootTotalFormatted.size + ' ' + rootTotalFormatted.unit);
        $cloudDriveSection.find('.folder-number').text(rootInfo[2] + ' ' + l[2035]);
        $cloudDriveSection.find('.file-number').text(rootInfo[1] + ' ' + l[2034]);

        $inShareSection.find('.ff-occupy').text(inshareInternalTotalFormatted.size + ' ' +
            inshareInternalTotalFormatted.unit);
        $inShareSection.find('.folder-number').text(inshareInternalInfo[2] + ' ' + l[2035]);
        $inShareSection.find('.file-number').text(inshareInternalInfo[1] + ' ' + l[2034]);

        $inShareExSection.find('.ff-occupy').text(inshareExternalTotalFormatted.size + ' ' +
            inshareExternalTotalFormatted.unit);
        $inShareExSection.find('.folder-number').text(inshareExternalInfo[2] + ' ' + l[2035]);
        $inShareExSection.find('.file-number').text(inshareExternalInfo[1] + ' ' + l[2034]);

        $outShareSection.find('.ff-occupy').text(outshareTotalFormatted.size + ' ' +
            outshareTotalFormatted.unit);
        $outShareSection.find('.folder-number').text(outshareInfo[2] + ' ' + l[2035]);
        $outShareSection.find('.file-number').text(outshareInfo[1] + ' ' + l[2034]);

        $rubbishSection.find('.ff-occupy').text(rubbishTotalFormatted.size + ' ' + rubbishTotalFormatted.unit);
        $rubbishSection.find('.folder-number').text(rubbishInfo[2] + ' ' + l[2035]);
        $rubbishSection.find('.file-number').text(rubbishInfo[1] + ' ' + l[2034]);

        $versionsSection.find('.ff-occupy').text(versionsTotalFormatted.size + ' ' + versionsTotalFormatted.unit);
        $versionsSection.find('.file-number').text((rootInfo[4] + rubbishInfo[4]
            + inshareInternalInfo[4] + inshareExternalInfo[4] + outshareInfo[4]) + ' ' + l[2034]);
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
    var $overviewContainer = $('.user-management-overview-container', $businessAccountContainer);

    // header
    $('.fm-right-header-user-management .user-management-breadcrumb.overview').removeClass('hidden');
    $('.fm-right-header-user-management .user-management-overview-buttons').removeClass('hidden');



    // private function to populate the dashboard
    var populateDashboard = function (st, quotas) {
        if (!quotas) {
            return;
        }

        var todayStats = quotas[Object.keys(quotas)[0]];

        var numberOfSubs = todayStats.tu || 0;
        var activeSubs = 0;
        var pendingSubs = 0;
        var disabledSubs = 0;
        var totalStorage = todayStats.ts || 0;
        var totalBandwidth = todayStats.tdl || 0;
        var inshareTotal = 0;
        var rootTotal = 0;
        var rubbishTotal = 0;
        var outshareTotal = 0;

        var emptyArray = [0, 0, 0, 0, 0];
        var currRoot;
        var currInhare;
        var currInhareEx;
        var currOutshare;
        var currRubbish;


        for (var sub in todayStats.u) {
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

            currRoot = todayStats.u[sub]["2"] || emptyArray;
            currInhare = todayStats.u[sub]["isi"] || emptyArray;
            currInhareEx = todayStats.u[sub]["ise"] || emptyArray;
            currOutshare = todayStats.u[sub]["os"] || emptyArray;
            currRubbish = todayStats.u[sub]["4"] || emptyArray;

            rootTotal += currRoot[0];
            rubbishTotal += currRubbish[0];
            outshareTotal += currInhareEx[0];
            inshareTotal += currInhare[0];
        }

        totalStorage = rootTotal + rubbishTotal + outshareTotal + inshareTotal;

        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);
        var rootTotalFormatted = numOfBytes(rootTotal, 2);
        var rubbishTotalFormatted = numOfBytes(rubbishTotal, 2);
        var inshareTotalFormatted = numOfBytes(inshareTotal, 2);
        var outshareTotalFormatted = numOfBytes(outshareTotal, 2);

        var rootPrecentage = rootTotal / totalStorage;
        var rootPie = Math.round(rootPrecentage * 360);
        rootPrecentage = Number.parseFloat(rootPrecentage * 100).toPrecision(2);
        var insharePrecentage = inshareTotal / totalStorage;
        var insharePie = Math.round(insharePrecentage * 360);
        insharePrecentage = Number.parseFloat(insharePrecentage * 100).toPrecision(2);
        var rubbishPrecentage = rubbishTotal / totalStorage;
        var rubbishPie = Math.round(rubbishPrecentage * 360);
        rubbishPrecentage = Number.parseFloat(rubbishPrecentage * 100).toPrecision(2);
        var outsharePrecentage = outshareTotal / totalStorage;
        var outsharePie = Math.round(outsharePrecentage * 360);
        outsharePrecentage = Number.parseFloat(outsharePrecentage * 100).toPrecision(2);

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
        $overviewContainer.find('.storage-division-container.inbox-node .storage-division-num')
            .text(outshareTotalFormatted.size + ' ' + outshareTotalFormatted.unit);
        $overviewContainer.find('.storage-division-container.inbox-node .storage-division-per')
            .text(Math.round(outsharePrecentage) + '%');


        $businessAccountContainer.removeClass('hidden'); // BA container
        $overviewContainer.removeClass('hidden');

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
 * shows the add sub-user dialog, if result is passed, the result dialog will be shown
 * @param {object} result   an object contain password + sub-user handle
 */
BusinessAccountUI.prototype.showAddSubUserDialog = function (result) {
    "use strict";

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

    // checking if we are passing a valid result object
    if (result && result.lp && result.u && result.m) {
        var $addContianer = $('.dialog-input-container', $dialog);
        var $resultContianer = $('.verification-container', $dialog);

        var subUserDefaultAvatar = useravatar.contact(result.u);
        $('.new-sub-user', $resultContianer).html(subUserDefaultAvatar);
        $('.sub-e', $resultContianer).text(result.m);
        $('.sub-p', $resultContianer).text(result.lp);

        $addContianer.addClass('hidden');
        $resultContianer.removeClass('hidden');
        $('.dialog-button-container .add-sub-user', $dialog).text(l[81]).addClass('a-ok-btn'); // OK
        $('.licence-bar', $dialog).addClass('hidden');
        $('.dialog-subtitle', $dialog).removeClass('hidden');
    }


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
    var $positionInput = $('input.edit-sub-position', $usersContainer);
    var $subIDInput = $('input.edit-sub-id-nb', $usersContainer);
    var $phoneInput = $('input.edit-sub-phone', $usersContainer);
    var $locationInput = $('input.edit-sub-location', $usersContainer);

    var clearDialog = function () {
        $nameInput.val('');
        $emailInput.val('');
        $positionInput.val('');
        $subIDInput.val('');
        $phoneInput.val('');
        $locationInput.val('');
    };

    clearDialog();

    var uName = from8(base64urldecode(subUser.firstname)) + ' ' +
        from8(base64urldecode(subUser.lastname));
    uName = uName.trim();
    var subUserDefaultAvatar = useravatar.contact(subUserHandle);

    $nameInput.val(uName);
    $emailInput.val(subUser.e);
    $('.user-management-subuser-avatars', $dialog).html(subUserDefaultAvatar);

    $('.dialog-button-container .btn-edit-close, .delete-img.icon', $dialog).off('click.subuser')
        .on('click.subuser', closeDialog);

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


/**
 * Start data migration of a sub-user
 * @param {string} subUserHandle            sub-user's handle
 */
BusinessAccountUI.prototype.migrateSubUserData = function (subUserHandle) {
    "use strict";
    if (!subUserHandle || subUserHandle.length !== 11) {
        return;
    }
    if (!M.suba[subUserHandle]) {
        return;
    }
    var mySelf = this;
    loadingDialog.pshow();


    // all operations are done in BusinessAccount class level.
    // Here we only allow user interaction

    /** Steps:
     * 1- getting sub-user tree
     * 2- getting sub-user master-key
     * 3- decrypting
     * 4- copying to master account
     */
    // failed
    var failing = function (msg) {
        loadingDialog.phide();
        msgDialog('warningb', '', msg);
        return;
    };

    // getting sub-user tree.
    var gettingSubTreePromise = this.business.getSubUserTree(subUserHandle);

    gettingSubTreePromise.fail(
        function getTreefailed(st, res, m) {
            if (d) {
                console.error("getting sub-user tree has failed! " + res + " --" + m);
            }
            return failing(l[19146]);
        }
    );

    gettingSubTreePromise.done(
        function getTreeOk(st, treeResult) {
            // getting sub-user master-key
            var gettingSubMasterKey = mySelf.business.getSubAccountMKey(subUserHandle);

            gettingSubMasterKey.fail(
                function getMKeyfailed(mkSt, mkRes, mkM) {
                    if (d) {
                        console.error("getting sub-user Master key has failed! " + mkRes + " --" + mkM);
                    }
                    return failing(l[19146]);
                }
            );

            gettingSubMasterKey.done(
                function getMKeyOK(st2, MKeyResult) {
                    // sub-user tree decrypting
                    var treeObj = mySelf.business.decrypteSubUserTree(treeResult.f, MKeyResult.k);
                    if (!treeObj) {
                        if (d) {
                            console.error("decrypting sub-user tree with the Master key has failed! "
                                + "although the key and tree fetching succeeded");
                        }
                        return failing(l[19146]);
                    }
                    else {

                        var doMigrateSubUserDate = function (isOK) {
                            if (!isOK) {
                                return failing(l[19148].replace('{0}', M.suba[subUserHandle].e));
                            }

                            // name the folder as the sub-user email + timestamp.
                            var folderName = M.suba[subUserHandle].e;
                            folderName += '_' + Date.now();

                            var cpyPromise = mySelf.business.copySubUserTreeToMasterRoot(treeObj.tree, folderName);

                            cpyPromise.fail(
                                function copySubUserFailHandler(stF, errF, desF) {
                                    if (d) {
                                        console.error("copying sub-user data key has failed! " + errF + " --" + desF);
                                    }
                                    return failing(l[19146]);
                                }
                            );

                            cpyPromise.done(
                                function copySubUserSuccHandler() {
                                    loadingDialog.phide();
                                    msgDialog('info', '', l[19149].replace('{0}', M.suba[subUserHandle].e)
                                        .replace('{1}', folderName));
                                    return;
                                }
                            );

                        };

                        if (treeObj.errors.length || treeObj.warns.length) {
                            var msgMsg = l[19147]; // operation contains errors and/or warning
                            var msgQuestion = l[18229]; // Do you want to proceed?
                            msgMsg = msgMsg.replace('{0}', M.suba[subUserHandle].e)
                                .replace('{1}', treeObj.errors.length).replace('{2}', treeObj.warns.length);

                            msgDialog('confirmation', '', msgMsg, msgQuestion, doMigrateSubUserDate);
                        }
                        else {
                            doMigrateSubUserDate(true);
                        }


                    }
                }
            );

        }
    );
};


/**
 * a function will change the url location depending on opened sub-page in business account
 * @param {string} subLocation      the sub-location to be added after fm/user-management/
 */
BusinessAccountUI.prototype.URLchanger = function (subLocation) {
    "use strict";
    try {

        if (hashLogic) {
            var newHash = '#fm/user-management' + subLocation;
            if (document.location.hash !== newHash) {
                document.location.hash = newHash;
                page = newHash;
            }
        }
        else {
            var newSubPage = (subLocation) ? ('fm/user-management/' + subLocation)
                : 'fm/user-management';
            if (page !== newSubPage) {
                history.pushState({ subpage: newSubPage }, "", "/" + newSubPage);
                page = newSubPage;
            }
        }
    }
    catch (ex) {
        console.error(ex);
    }
};

/**
 * Event handler for sub-user changes, this handler will be invoked eventually when relate action-packet
 * is received
 * @param {object} subuser      the sub-user object
 */
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
        var leftPanelClass = 'disabled-accounts';
        if (subuser.s === 0) {
            $userRow.find('.user-management-status').removeClass('pending disabled')
                .addClass('enabled');
            leftPanelClass = 'enabled-accounts';
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
        $('.user-management-tree-panel-header.' + leftPanelClass).trigger('click.subuser');
    };

    // if we are in table view
    if (!$('.user-management-list-table').hasClass('hidden')
        || !$('.user-management-landing-page.user-management-view').hasClass('hidden')) {
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