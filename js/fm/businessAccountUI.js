
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
        var $accountContainer = $('.user-management-account-settings', $businessAccountContianer).addClass('hidden');
        $('.invoice', $accountContainer).addClass('hidden');
        $('.profile', $accountContainer).addClass('hidden');
        $('.invoice .invoice-list', $accountContainer).addClass('hidden');
        $('.invoice .invoice-detail', $accountContainer);

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
        //$('.fm-right-header-user-management .user-management-breadcrumb.subaccount').addClass('hidden');
        //$('.fm-right-header-user-management .user-management-breadcrumb.overview').addClass('hidden');
        //$('.fm-right-header-user-management .user-management-breadcrumb.account').addClass('hidden');
        $('.fm-right-header-user-management .user-management-breadcrumb').addClass('hidden');
        $('.inv-det-arrow, .inv-det-id',
            '.fm-right-header-user-management .user-management-breadcrumb.account').addClass('hidden');
        $('.fm-right-header-user-management .user-management-overview-buttons').addClass('hidden');
        $('.user-management-overview-bar').addClass('hidden');
    };
}

/**
 * Function to view the right pane of "Users Management" used by master users to manage sub-accounts
 * @param {string[]} subAccounts    optional list of subAccount, Default is M.suba
 * @param {boolean} isBlockView     by default "Grid" view will be used, this param when True will change to "Block"
 * @param {boolean} quickWay        by default false, if true method will skip some ui operations
 * @returns {boolean}               true if OK, false if something went wrong
 */
BusinessAccountUI.prototype.viewSubAccountListUI = function (subAccounts, isBlockView, quickWay) {
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

    if (!Object.keys(subAccounts).length) { // no subs
        return this.viewLandingPage();
    }

    loadingDialog.pshow();

    var unhideUsersListSection = function () {
        subAccountsView.removeClass('hidden'); // un-hide the container
        $('.user-management-list-table', subAccountsView).removeClass('hidden'); // unhide the list table
        $('.fm-right-header-user-management .user-management-main-page-buttons').removeClass('hidden'); // unhide header
        $('.content-panel.user-management .nw-user-management-item').removeClass('selected');
        loadingDialog.phide();
    };

    // header events handlers
    $('.fm-right-header-user-management .user-management-main-page-buttons .ba-overview').off('click.subuser')
        .on('click.subuser', function overviewHeaderButtonHandler() {
            mySelf.viewBusinessAccountOverview();
        });
    $('.fm-right-header-user-management .user-management-main-page-buttons .add-sub-user').off('click.subuser')
        .on('click.subuser', function addSubUserHeaderButtonHandler() {
            mySelf.showAddSubUserDialog();
        });
    $('.fm-right-header-user-management .user-management-main-page-buttons .ba-account').off('click.subuser')
        .on('click.subuser', function addSubUserHeaderButtonHandler() {
            mySelf.viewBusinessAccountPage();
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
            var uName = 'Error';
            try {
                var uName = from8(base64urldecode(subUsers[h].firstname)) + ' ' +
                    from8(base64urldecode(subUsers[h].lastname));
            }
            catch (e) { }
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
        // $('.business-sub-checkbox-td, .business-sub-checkbox-th', $usersTable).off('click.subuser');
        // $('.business-sub-checkbox-td, .business-sub-checkbox-th', $usersTable).on('click.subuser',
        //    function subUserCheckBoxHandler() {
        //        var $me = $(this).find('.checkdiv');
        //        if ($me.hasClass('checkboxOff-user-management')) {
        //            $me.removeClass('checkboxOff-user-management').addClass('checkboxOn-user-management');
        //            if ($(this).hasClass('business-sub-checkbox-th')) {
        //                $('.business-sub-checkbox-td .checkdiv', $usersTable).
        //                    removeClass('checkboxOff-user-management').addClass('checkboxOn-user-management');
        //            }
        //        }
        //        else {
        //            $me.addClass('checkboxOff-user-management').removeClass('checkboxOn-user-management');
        //            if ($(this).hasClass('business-sub-checkbox-th')) {
        //                $('.business-sub-checkbox-td .checkdiv', $usersTable).
        //                    addClass('checkboxOff-user-management').removeClass('checkboxOn-user-management');
        //            }
        //            else {
        //                $('.business-sub-checkbox-th .checkdiv', $usersTable).
        //                    addClass('checkboxOff-user-management').removeClass('checkboxOn-user-management');
        //            }
        //        }
        //    });

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
                var dd = subUsersData[sub].ad === '00000000' ? null : subUsersData[sub].ad;
                var activeDate = '--------';
                if (dd) {
                    activeDate = new Date(dd.substr(0, 4), dd.substr(4, 2), dd.substr(6, 2));
                    activeDate = activeDate.toLocaleDateString();
                }
                $('.business-sub-last-active span', $subTr).text(activeDate);
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

        // handler for clicking on overview bar at the bottom
        $('.user-management-overview-bar').off('click.suba').on('click.suba', function overviewBarClickHandler() {
            mySelf.viewBusinessAccountOverview();
        });

        unhideUsersListSection();
    };

    var reDraw = isRedrawNeeded(subAccounts, this.business.previousSubList);

    if (reDraw) {
        fillSubUsersTable(subAccounts, this);
        // storing current drawn sub-users to prevent not needed redraw
        this.business.previousSubList = JSON.parse(JSON.stringify(subAccounts));
    }
    else {
        unhideUsersListSection();
    }

    if (!quickWay) {
        // getting quotas
        var quotasPromise = this.business.getQuotaUsage();
        quotasPromise.done(fillSubUsersUsage);
    }

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
        $('.fm-dialog-link-pwd-button', $dialog).on('click', function decryptOkBtnHandler () {
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

                    getInfoPromise.done(function signupCodeGettingSuccessHandler (status, res) {
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

    // handler for add users button
    $('.landing-sub-container.adding-subuser', $landingContainer).off('click.subuser')
        .on('click.subuser', function addSubUserClickHandler() {
            mySelf.showAddSubUserDialog();
        });

    // handler account setting page
    $('.landing-sub-container.adding-subuser', $landingContainer).off('click.subuser')
        .on('click.subuser', function addSubUserClickHandler() {
            mySelf.showAddSubUserDialog(null, mySelf.viewSubAccountListUI);
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

    var sUserId = '';
    var sUserPos = '';
    var sUserTel = '';
    var sUserLoc = '';

    if (subUser.idnum) {
        sUserId = from8(base64urldecode(subUser.idnum));
    }
    if (subUser.position) {
        sUserPos = from8(base64urldecode(subUser.position));
    }
    if (subUser.phonenum) {
        sUserTel = from8(base64urldecode(subUser.phonenum));
    }
    if (subUser.location) {
        sUserLoc = from8(base64urldecode(subUser.location));
    }


    var $extrasContainer = $('.subuser-sec-profile-container', $subAccountContainer);
    $extrasContainer.find('.sub-info-idnum').text(sUserId);
    $extrasContainer.find('.sub-info-pos').text(sUserPos);
    $extrasContainer.find('.sub-info-phone').text(sUserTel);
    $extrasContainer.find('.sub-info-loc').text(sUserLoc);


    $subAccountContainer.find('.user-management-view-status').removeClass('enabled pending disabled');
    // $subAccountContainer.find('.profile-button-container .disable-account').removeClass('hidden');
    $subAccountContainer.find('.profile-button-container .disable-account').text(l[19092])
        .removeClass('default-green-button-user-management').addClass('default-red-button-user-management')
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
            .removeClass('default-red-button-user-management').addClass('default-green-button-user-management')
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

    // event handler for edit sub-user button
    $subAccountContainer.find('.profile-button-container .edit-profile').off('click.subuser').on('click.subuser',
        function editSubUserClickHandler() {
            mySelf.showEditSubUserDialog(subUserHandle);
        });


    // event handler for re-send invitation
    $subAccountContainer.find('.profile-button-container .resend-verification').off('click.subuser')
        .on('click.subuser', function resendInvitation_ClickHandler() {
            if ($(this).hasClass('hidden')) {
                return;
            }
            var resendPromise = mySelf.business.resendInvitation(subUserHandle);
            // success
            resendPromise.done(
                function resendSuccess(st, res) {
                    if (st === 1) {
                        res.m = M.suba[subUserHandle].e;
                        mySelf.showAddSubUserDialog(res);
                    }
                }
            );
            // failure
            resendPromise.fail(
                function resendFail() {
                    msgDialog('warningb', '', l[19527]);
                }
            );
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
        var outshareInfo = subUserStats["ose"] || emptyArray;
        var outshareInternalInfo = subUserStats["osi"] || emptyArray;

        totalStorage = subUserStats["ts"] || 0;
        totalBandwidth = subUserStats["dl"] || 0;
            
        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);
        var rootTotalFormatted = numOfBytes(rootInfo[0], 2);
        var rubbishTotalFormatted = numOfBytes(rubbishInfo[0], 2);
        var inshareInternalTotalFormatted = numOfBytes(inshareInternalInfo[0], 2);
        var inshareExternalTotalFormatted = numOfBytes(inshareExternalInfo[0], 2);
        var outshareTotalFormatted = numOfBytes(outshareInfo[0], 2);
        var outshareTotalInternalFormatted = numOfBytes(outshareInternalInfo[0], 2);

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
        var $outShareExternalSection = $('.user-management-view-data .subaccount-view-used-data' +
            ' .used-storage-info.ba-outshare-ex', $subAccountContainer);
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

        $outShareExternalSection.find('.ff-occupy').text(outshareTotalInternalFormatted.size + ' ' +
            outshareTotalInternalFormatted.unit);
        $outShareExternalSection.find('.folder-number').text(outshareInternalInfo[2] + ' ' + l[2035]);
        $outShareExternalSection.find('.file-number').text(outshareInternalInfo[1] + ' ' + l[2034]);

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


/** show business account overview page
 * */
BusinessAccountUI.prototype.viewBusinessAccountOverview = function () {
    "use strict";

    this.initUItoRender();
    var mySelf = this;
    this.URLchanger('overview');

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $overviewContainer = $('.user-management-overview-container', $businessAccountContainer);

    // header
    var $overviewHeader = $('.fm-right-header-user-management .user-management-breadcrumb.overview');
    $overviewHeader.removeClass('hidden');
    var $overviewHeaderBtns = $('.fm-right-header-user-management .user-management-overview-buttons');
    $overviewHeaderBtns.removeClass('hidden');
    $overviewHeader.find('.user-management-icon').off('click.subuser').on('click.subuser',
        function overviewHeaderClickHandler() {
            mySelf.viewSubAccountListUI();
        }
    );
    $overviewHeaderBtns.find('.pdf-exp').off('click.subuser').on('click.subuser',
        function overviewHeaderClickHandler() {
            M.require('jspdf_js').done(
                function exportOverviewPageToPDF() {
                    var doc = new jsPDF();
                    var specialElementHandlers = {
                        '.hidden': function (element, renderer) {
                            return true;
                        }
                    };

                    doc.addHTML($overviewContainer[0], function () {
                        doc.save('accountDashboard.pdf');
                    });

                }
            );
        }
    );


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
            currOutshare = todayStats.u[sub]["ose"] || emptyArray;
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
        var rootPie = rootPrecentage * 360;
        rootPrecentage = Number.parseFloat(rootPrecentage * 100).toFixed(2);
        var insharePrecentage = inshareTotal / totalStorage;
        var insharePie = insharePrecentage * 360;
        insharePrecentage = Number.parseFloat(insharePrecentage * 100).toFixed(2);
        var rubbishPrecentage = rubbishTotal / totalStorage;
        var rubbishPie = rubbishPrecentage * 360;
        rubbishPrecentage = Number.parseFloat(rubbishPrecentage * 100).toFixed(2);
        var outsharePrecentage = outshareTotal / totalStorage;
        var outsharePie = outsharePrecentage * 360;
        outsharePrecentage = Number.parseFloat(outsharePrecentage * 100).toFixed(2);

        $overviewContainer.find('.user-segments-container.all-subs .user-segment-number').text(numberOfSubs);
        $overviewContainer.find('.user-segments-container.active-subs .user-segment-number').text(activeSubs);
        $overviewContainer.find('.user-segments-container.pending-subs .user-segment-number').text(pendingSubs);
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

        $overviewContainer.find('.transfer-analysis-summary .total-transfer-number')
            .text(totalBandwidthFormatted.size + ' ' + totalBandwidthFormatted.unit);

        $businessAccountContainer.removeClass('hidden'); // BA container
        $overviewContainer.removeClass('hidden');

        var $chartContainer = $('#pie-chart-contianer');
        $chartContainer.empty();
        $chartContainer.html('<canvas id="usage-pie-chart"></canvas>');
        var $pieChart = $('#usage-pie-chart', $chartContainer);

        M.require('charts_js').done(function usagePieChartDataPopulate() {

            var tooltipLabeling = function (tooltipItem, data) {
                var label = data.labels[tooltipItem.index] || '';
                var perc = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

                if (label) {
                    label += ': ';
                }
                var sizeInfo = numOfBytes(perc);
                label += sizeInfo.size + ' ' + sizeInfo.unit;
                return label;
            };

            var usagePieChart = new Chart($pieChart, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [rootTotal, outshareTotal, inshareTotal, rubbishTotal],
                        backgroundColor: [
                            'rgba(88,103,195,1)',
                            'rgba(0,191,165,1)',
                            'rgba(245,166,35,1)',
                            '#bbbbbb'
                        ]
                    }],
                    // These labels appear in the legend and in the tooltips when hovering different arcs
                    labels: [
                        l[164],
                        l[19223],
                        l[16770],
                        l[167]
                    ]
                },
                options: {
                    legend: {
                        display: false
                    },
                    tooltips: {
                        callbacks: {
                            label: tooltipLabeling
                        }
                    },
                    cutoutPercentage: 85
                }
            });

            var $customCharLegend = $('.storage-analysis-container .storage-division-container', $overviewContainer)
                .off('click.subuser').on('click.subuser', function chartLegendClickHandler(e) {
                    var $me = $(this);
                    var ix = 0;
                    if ($me.hasClass('inbox-node')) {
                        ix = 1;
                    }
                    else if ($me.hasClass('inshare-node')) {
                        ix = 2;
                    }
                    else if ($me.hasClass('rubbish-node')) {
                        ix = 3;
                    }

                    if ($me.hasClass('disabled')) {
                        $me.removeClass('disabled');
                    }
                    else {
                        $me.addClass('disabled');
                    }

                    var item = usagePieChart.legend.legendItems[ix];
                    usagePieChart.legend.options.onClick.call(usagePieChart.legend, e, item);
                });
            $customCharLegend.removeClass('disabled');
        });


        /*
        $overviewContainer.find('.storage-big-chart .pie').removeClass('big').removeClass('highlight');
        $overviewContainer.find('.storage-big-chart .pie .pie-internal2').remove();

        var getPiePartStyle = function (startVal) {
            var sStyle = '-moz-transform: rotate({0}deg); -ms-transform: rotate({0}deg);'
                + '-webkit-transform: rotate({0}deg); -o-transform: rotate({0}deg);'
                + 'transform:rotate({0}deg);';
            return sStyle.replace(/\{0\}/g, startVal);
        };

        var start = 0;
        var curStyle = '';
        var $currElement;
        // testing
        //rootPie = 100, insharePie = 80, outsharePie = 60, rubbishPie = 120;

        $currElement = $overviewContainer.find('.storage-big-chart .pie.nb1');
        $currElement.attr('data-start', start).attr('data-value', outsharePie);
        if (outsharePie > 180) {
            $currElement.addClass('big');
            $currElement.append('<div class="pie-internal2"></div>');
        }
        curStyle = getPiePartStyle(start);
        $currElement.attr('style', curStyle);
        curStyle = getPiePartStyle(outsharePie + 1);
        $currElement.find('.pie-internal').attr('style', curStyle);
        start += outsharePie;
        ////////////////
        $currElement = $overviewContainer.find('.storage-big-chart .pie.nb2');
        $currElement.attr('data-start', start).attr('data-value', insharePie);
        if (insharePie > 180) {
            $currElement.addClass('big');
            $currElement.append('<div class="pie-internal2"></div>');
        }
        curStyle = getPiePartStyle(start);
        $currElement.attr('style', curStyle);
        curStyle = getPiePartStyle(insharePie + 1);
        $currElement.find('.pie-internal').attr('style', curStyle);
        start += insharePie;
        ////////////////
        $currElement = $overviewContainer.find('.storage-big-chart .pie.nb3');
        $currElement.attr('data-start', start).attr('data-value', rubbishPie);
        if (rubbishPie > 180) {
            $currElement.addClass('big');
            $currElement.append('<div class="pie-internal2"></div>');
        }
        curStyle = getPiePartStyle(start);
        $currElement.attr('style', curStyle);
        curStyle = getPiePartStyle(rubbishPie + 1);
        $currElement.find('.pie-internal').attr('style', curStyle);
        start += rubbishPie;
        ////////////////
        $currElement = $overviewContainer.find('.storage-big-chart .pie.nb4');
        $currElement.attr('data-start', start).attr('data-value', rootPie);
        if (rootPie > 180) {
            $currElement.addClass('big');
            $currElement.append('<div class="pie-internal2"></div>');
        }
        curStyle = getPiePartStyle(start);
        $currElement.attr('style', curStyle);
        curStyle = getPiePartStyle(rootPie);
        $currElement.find('.pie-internal').attr('style', curStyle);
        //start += rootPie;
        */
        
        $overviewContainer.jScrollPane({ enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true });
    };

    // private function to format start and end dates
    var getReportDates = function (leadingDate) {
        var today = leadingDate || new Date();
        var currMonth = '' + (today.getMonth() + 1);
        if (currMonth.length < 2) {
            currMonth = '0' + currMonth;
        }
        var currYear = today.getFullYear();

        var startDate = currYear + '' + currMonth + '01';

        var endDate = getLastDayofTheMonth(today);
        if (!endDate) {
            return;
        }
        var endDateStr = endDate.getFullYear() + '' + currMonth + endDate.getDate();
        return { fromDate: startDate, toDate: endDateStr };
    };

    // private function to populate the reporting bar chart
    var populateBarChart = function (st, res) {
        M.require('charts_js').done(function () {
            var $charContainer = $("#chartcontainer");
            $charContainer.empty();
            $charContainer.html('<canvas id="usage-bar-chart" class="daily-transfer-flow-container"></canvas>');
            var chartCanvas = $("#usage-bar-chart");

            var availableLabels = Object.keys(res);
            availableLabels.sort();

            var chartData = [];
            var divider = 1024 * 1024 * 1024;
            var totalMonthTransfer = 0;
            var randVal;

            // if statement only for testing, can be removed after deploy.
            if (d && localStorage.bTest) {
                availableLabels = [];
                for (var h2 = 0; h2 < 30; h2++) {
                    randVal = Math.random() * 100;
                    chartData.push(randVal);
                    availableLabels.push(h2 + 1);
                    totalMonthTransfer += randVal;
                }
            }
            // building bars data + total transfer
            else {
                for (var h = 0; h < availableLabels.length; h++) {
                    chartData.push(res[availableLabels[h]].tdl / divider);
                    totalMonthTransfer += res[availableLabels[h]].tdl;

                    // keeping the day number only
                    availableLabels[h] = availableLabels[h].substr(6, 2);
                }
            }

            var allTransferFormatted = numOfBytes(totalMonthTransfer, 2);
            $overviewContainer.find('.transfer-analysis-container .transfer-analysis-summary .total-transfer-number')
                .text(allTransferFormatted.size + ' ' + allTransferFormatted.unit);

            var tooltipBarLabeling = function (tooltipItem, data) {
                var perc = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

                var sizeInfo = numOfBytes(perc);
                var label = sizeInfo.size + ' ' + sizeInfo.unit;
                return label;
            }; 

            var myChart = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: availableLabels, // ["Red", "Green", "Orange"],
                    datasets: [{
                        label: '',
                        data: chartData,
                        backgroundColor: 'rgba(88, 103, 195, 1)',
                        borderColor: 'rgba(88, 103, 195, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            },
                            gridLines: {
                                display: false
                            }
                        }],
                        xAxes: [{
                            gridLines: {
                                display: false
                            }
                        }]
                    },
                    legend: {
                        display: false
                    },
                    tooltips: {
                        callbacks: {
                            label: tooltipBarLabeling
                        }
                    }
                }
            });
        });
        $overviewContainer.jScrollPane({ enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true });
    };

    // getting quotas
    var quotasPromise = this.business.getQuotaUsage();
    quotasPromise.done(populateDashboard);

    var initialBarReport = getReportDates();
    var reportPromise = this.business.getQuotaUsageReport(false, initialBarReport);
    reportPromise.done(populateBarChart);

    var populateMonthDropDownList = function () {
        var monthNames = [l[408], l[409], l[410], l[411], l[412], l[413], l[414], l[415], l[416],
        l[417], l[418], l[419]];

        var adminCreationDate = new Date(u_attr['since'] * 1000);

        var nowDate = new Date();
        var monthLimit = 12; // 1 year back max

        var $monthSelector = $('#chart-month-selector');
        $monthSelector.empty();



        for (var a = 0; a < 12; a++) {
            var $currOprion = $('<option>', {
                value: nowDate.getTime(),
                text: monthNames[nowDate.getMonth()] + ' ' + nowDate.getFullYear()
            });
            $monthSelector.append($currOprion);

            nowDate.setMonth(nowDate.getMonth() - 1);

            if (nowDate < adminCreationDate) {
                break;
            }
        }

        $monthSelector.off('change.subuser').on('change.subuse', function transferChartDropDownChangeHandler() {
            var selectedDate = new Date(Number.parseFloat(this.value));
            var report = getReportDates(selectedDate);

            var reportPromise2 = mySelf.business.getQuotaUsageReport(false, report);
            reportPromise2.done(populateBarChart);
        });
    };

    populateMonthDropDownList();
    
};


BusinessAccountUI.prototype.viewBusinessAccountPage = function () {
    "use strict";
    this.initUItoRender();
    var mySelf = this;
    this.URLchanger('account');

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $accountContainer = $('.user-management-account-settings', $businessAccountContainer);
    var $profileContainer = $('.profile', $accountContainer);
    var $invoiceContainer = $('.invoice', $accountContainer);
    var $accountPageHeader = $('.fm-right-header-user-management .user-management-breadcrumb.account');

    var unhideSection = function () {
        $businessAccountContainer.removeClass('hidden');
        $accountContainer.removeClass('hidden');
        $profileContainer.removeClass('hidden');
        $accountPageHeader.removeClass('hidden');
    };

    // event handler for header clicking
    $('.settings-menu-bar .settings-menu-item', $accountContainer).off('click').on('click.suba',
        function settingHeaderClickHandler() {
            var $me = $(this);
            $('.settings-menu-bar .settings-menu-item', $accountContainer).removeClass('selected');
            if ($me.hasClass('suba-setting-profile')) {
                $me.addClass('selected');
                if ($profileContainer.hasClass('hidden')) {
                    mySelf.viewBusinessAccountPage();
                }
            }
            else if ($me.hasClass('suba-setting-inv')) {
                $me.addClass('selected');
                if ($invoiceContainer.hasClass('hidden')) {
                    mySelf.viewBusinessInvoicesPage();
                }
            }
        }
    );

    // function to fill dropdown list of countries
    var loadCountries = function () {
        var countries = M.getCountries();

        var optionHtml = '<option value="{0}">{1}</option>';

        var $countriesSelect = $('#cnt-ddl', $profileContainer);
        $countriesSelect.empty();

        var ctnKeys = Object.keys(countries);

        for (var k = 0; k < ctnKeys.length; k++) {
            var currOption = optionHtml.replace('{0}', ctnKeys[k]).replace('{1}', countries[ctnKeys[k]]);
            $countriesSelect.append(currOption);
        }
    };

    // collecting info
    var cName = '';
    var cTel = '';
    var cEmail = '';
    var cVat = '';
    var cAddress = '';
    var cAddress2 = '';
    var cCity = '';
    var cState = '';
    var cCountry = '';
    var cZip = '';

    loadCountries();

    if (u_attr['^companyname']) {
        cName = u_attr['^companyname'];
    }
    if (u_attr['^companyphone']) {
        cTel = u_attr['^companyphone'];
    }
    if (u_attr['^companyemail']) {
        cEmail = u_attr['^companyemail'];
    }
    if (u_attr['^companytaxnum']) {
        cVat = u_attr['^companytaxnum'];
    }
    if (u_attr['^companyaddress1']) {
        cAddress = u_attr['^companyaddress1'];
    }
    if (u_attr['^companyaddress2']) {
        cAddress2 = u_attr['^companyaddress2'];
    }
    if (u_attr['^companycity']) {
        cCity = u_attr['^companycity'];
    }
    if (u_attr['^companystate']) {
        cState = u_attr['^companystate'];
    }
    if (u_attr['^companycountry']) {
        cCountry = u_attr['^companycountry'];
    }
    if (u_attr['^companyzip']) {
        cZip = u_attr['^companyzip'];
    }

    var $cNameInput = $('input#prof-cname', $profileContainer).val(cName);
    var $cTelInput = $('input#prof-phone', $profileContainer).val(cTel);
    var $cEmailInput = $('input#prof-email', $profileContainer).val(cEmail);
    var $cVatInput = $('input#prof-vat', $profileContainer).val(cVat);
    var $cAddressInput = $('input#prof-addr1', $profileContainer).val(cAddress);
    var $cAddress2Input = $('input#prof-addr2', $profileContainer).val(cAddress2);
    var $cCityInput = $('input#prof-city', $profileContainer).val(cCity);
    var $cStateInput = $('input#prof-state', $profileContainer).val(cState);
    var $cCountryInput = $('select#cnt-ddl', $profileContainer).val(cCountry);
    var $cZipInput = $('input#prof-zip', $profileContainer).val(cZip);

    $('.saving-btn-profile', $profileContainer).off('click.suba').on('click.suba',
        function companyProfileSaveButtonClick() {
            var attrsToChange = [];
            var valid = true;
            if ($cNameInput.val() !== cName) {
                if (!$cNameInput.val().length) {
                    $cNameInput.parent().addClass('error').find('.error-message').text(l[19507]);
                    $cNameInput.focus();
                    valid = false;
                }
                attrsToChange.push({ key: '^companyname', val: $cNameInput.val() });
            }
            if ($cTelInput.val() !== cTel) {
                if (!$cTelInput.val().length) {
                    $cTelInput.parent().addClass('error').find('.error-message').text(l[8814]);
                    $cTelInput.focus();
                    valid = false;
                }
                attrsToChange.push({ key: '^companyphone', val: $cTelInput.val() });
            }
            if ($cEmailInput.val() !== cEmail) {
                attrsToChange.push({ key: '^companyemail', val: $cEmailInput.val() });
            }
            if ($cVatInput.val() !== cVat) {
                attrsToChange.push({ key: '^companytaxnum', val: $cVatInput.val() });
            }
            if ($cAddressInput.val() !== cAddress) {
                attrsToChange.push({ key: '^companyaddress1', val: $cAddressInput.val() });
            }
            if ($cAddress2Input.val() !== cAddress2) {
                attrsToChange.push({ key: '^companyaddress2', val: $cAddress2Input.val() });
            }
            if ($cCityInput.val() !== cCity) {
                attrsToChange.push({ key: '^companycity', val: $cCityInput.val() });
            }
            if ($cStateInput.val() !== cState) {
                attrsToChange.push({ key: '^companystate', val: $cStateInput.val() });
            }
            if ($cCountryInput.val() !== cCountry) {
                attrsToChange.push({ key: '^companycountry', val: $cCountryInput.val() });
            }
            if ($cZipInput.val() !== cZip) {
                attrsToChange.push({ key: '^companyzip', val: $cZipInput.val() });
            }

            var settingPromise = mySelf.business.updateBusinessAttrs(attrsToChange);
        }
    );

    unhideSection();
    
};


/** show business account page (Settings and invoices)
 * */
BusinessAccountUI.prototype.viewBusinessInvoicesPage = function () {
    "use strict";

    this.initUItoRender();
    var mySelf = this;
    this.URLchanger('invoices');

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $accountContainer = $('.user-management-account-settings', $businessAccountContainer);
    var $invoiceContainer = $('.invoice', $accountContainer);
    var $invoiceListContainer = $('.invoice-list', $invoiceContainer);
    var $accountPageHeader = $('.fm-right-header-user-management .user-management-breadcrumb.account');

    // private function to determine if we need to re-draw
    var isInvoiceRedrawNeeded = function (invoiceList, savedList) {
        if (!invoiceList) {
            return true;
        }
        if (!savedList) {
            return true;
        }
        if (savedList.length !== invoiceList.length) {
            return true;
        }
        for (var h = 0; h < invoiceList.length; h++) {
            if (invoiceList[h].n !== savedList[h].n) {
                return true;
            }
        }
        return false;
    };

    // private function to fill the list of invoices on UI
    var prepareInvoiceListSection = function (st, invoicesList) {

        var unhideSection = function () {
            $businessAccountContainer.removeClass('hidden');
            $accountContainer.removeClass('hidden');
            $invoiceContainer.removeClass('hidden');
            $invoiceListContainer.removeClass('hidden');
            $accountPageHeader.removeClass('hidden');
        };

        // check if we need to re-draw
        if (!isInvoiceRedrawNeeded(invoicesList, (this.business) ? this.business.previousInvoices : null)) {
            return unhideSection();
        }

        var $invoicesTable = $('.invoice .invoice-list .invoice-table', $accountContainer);
        var $invoiceRows = $('.invocie-row-data', $invoicesTable);
        var $invoiceRowTemplate = $($invoiceRows.get(0)).clone(true); // cloning the first one
        if (st === 1) {
            $invoiceRows.remove();
        }
        else {
            $invoiceRows.addClass('hidden');
            invoicesList = Object.create(null); // so the for loop below does nothing
        }

        // store what we will draw now
        mySelf.business.previousInvoices = JSON.parse(JSON.stringify(invoicesList));


        for (var k = 0; k < invoicesList.length; k++) {
            var invoiceDate = new Date(invoicesList[k].ts * 1000);
            var $newInvoiceRow = $invoiceRowTemplate.clone(true);
            var invId = invoicesList[k].n;

            $newInvoiceRow.attr('id', invId);
            $newInvoiceRow.find('.inv-date').text(invoiceDate.toLocaleDateString());
            $newInvoiceRow.find('.inv-desc').text(invoicesList[k].d);
            $newInvoiceRow.find('.inv-total').text('€' + invoicesList[k].tot);
            $newInvoiceRow.removeClass('hidden'); // if it was hidden
            $newInvoiceRow.off('click.suba').on('click.suba', function invoiceDetailButtonClick() {
                var clickedInvoiceId = $(this).closest("tr").attr('id');
                if (!clickedInvoiceId) {
                    console.error("Cant Find the id of the clicked invoice!");
                    return;
                }
                mySelf.viewInvoiceDetail(clickedInvoiceId);
            });

            $invoicesTable.append($newInvoiceRow);
        }

        unhideSection();
    };

    $accountPageHeader.find('.acc-home').off('click.suba').on('click.suba',
        function invoiceListHeaderClick() {
            var $me = $(this);
            if ($me.hasClass('acc-home')) {
                return mySelf.viewSubAccountListUI();
            }
        });

    var getInvoicesPromise = this.business.getAccountInvoicesList();
    getInvoicesPromise.always(prepareInvoiceListSection);
};


BusinessAccountUI.prototype.viewInvoiceDetail = function (invoiceID) {
    "use strict";

    this.initUItoRender();
    var mySelf = this;
    this.URLchanger('invdet!' + invoiceID);

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $accountContainer = $('.user-management-account-settings', $businessAccountContainer);
    var $invoiceContainer = $('.invoice', $accountContainer);
    var $invoiceDetailContainer = $('.invoice-detail', $invoiceContainer);
    var $accountPageHeader = $('.fm-right-header-user-management .user-management-breadcrumb.account');

    var unhideSection = function () {
        $businessAccountContainer.removeClass('hidden');
        $accountContainer.removeClass('hidden');
        $invoiceContainer.removeClass('hidden');
        $invoiceDetailContainer.removeClass('hidden');
        $accountPageHeader.removeClass('hidden');
        $accountPageHeader.find('.inv-det-arrow, .inv-det-id').removeClass('hidden');
    };

    var validateInvoice = function (invoice) {
        // top level validate
        if (!invoice || !invoice.mega || !invoice.u || !invoice.items || !invoice.ts
            || !invoice.tot || !invoice.taxrate) {
            return false;
        }

        // mega object validation
        if (!invoice.mega.cnum || !invoice.mega.taxnum || !invoice.mega.cname
            || !invoice.mega.phaddr || !invoice.mega.poaddr) {
            return false
        }
        // billed object validate
        if (!invoice.u.e || !invoice.u.cname || !invoice.u.addr ) {
            return false;
        }

        // items validation
        if (!invoice.items.length) {
            return false;
        }
        for (var k = 0; k < invoice.items.length; k++) {
            if (typeof invoice.items[k].ts === 'undefined' || typeof invoice.items[k].gross === 'undefined'
                || typeof invoice.items[k].net === 'undefined' || typeof invoice.items[k].tax === 'undefined'
                || !typeof invoice.items[k].d === 'undefined') {
                return false;
            }
        }

        return true;
    };

    var fillInvoiceDetailPage = function (st, invoiceDetail) {
        

        if (st !== 1 || !validateInvoice(invoiceDetail)) {
            msgDialog('warningb', '', l[19302]);
            mySelf.viewBusinessAccountPage();
            return;
        }

        // navigation bar
        $accountPageHeader.find('.inv-det-id').text(invoiceDetail.n);

        // mega section on the top of the invoice and receipt
        var $megaContainer = $('.mega-contact-container', $invoiceDetailContainer);
        $megaContainer.find('.inv-subtitle').text(invoiceDetail.mega.cname);
        $megaContainer.find('.biller-email').text(invoiceDetail.mega.e);
        $megaContainer.find('.biller-address').text(invoiceDetail.mega.phaddr.join(', '));
        $megaContainer.find('.biller-post').text(invoiceDetail.mega.poaddr.join(', '));

        // invoice top details
        var $invoiceTopTitle = $('.inv-title-container .inv-right', $invoiceDetailContainer);
        $invoiceTopTitle.find('#invoice-date').text((new Date(invoiceDetail.ts * 1000)).toLocaleDateString());
        $invoiceTopTitle.find('#invoice-number').text(invoiceDetail.n);
        $invoiceTopTitle.find('.invoice-vat').text(invoiceDetail.mega.taxnum[1]);
        $invoiceTopTitle.find('.inv-vat-label').text(invoiceDetail.mega.taxnum[0]);

        // billed-to details
        $invoiceDetailContainer.find('.billed-name').text(invoiceDetail.u.cname);
        $invoiceDetailContainer.find('.billed-email').text(invoiceDetail.u.e);
        $invoiceDetailContainer.find('.billed-address').text(invoiceDetail.u.addr.join(', '));
        $invoiceDetailContainer.find('.billed-country').text(invoiceDetail.u.addr[invoiceDetail.u.addr.length - 1]);
        $invoiceDetailContainer.find('.billed-vat').addClass('hidden');
        if (invoiceDetail.u.taxnum) {
            $invoiceDetailContainer.find('.billed-vat')
                .text(invoiceDetail.u.taxnum[0] + ': ' + invoiceDetail.u.taxnum[1]).removeClass('hidden');
        }

        // invoice items
        var $invoiceItemsContainer = $('.inv-payment-table', $invoiceDetailContainer)
        var $allItems = $('.inv-li-content', $invoiceItemsContainer);
        var $invItemContent = $($allItems.get(0));
        var $invItemContentTemplate = $invItemContent.clone(true);
        $allItems.remove();
        var $invItemHeader = $('.inv-li-table-header', $invoiceItemsContainer);
        var taxSum = 0;
        for (var k = invoiceDetail.items.length - 1; k >= 0; k--) {
            var $invItem = $invItemContentTemplate.clone(true);
            $invItem.find('.inv-pay-date').text((new Date(invoiceDetail.items[k].ts * 1000).toLocaleDateString()));
            $invItem.find('.inv-pay-desc').text(invoiceDetail.items[k].d);
            $invItem.find('.inv-pay-amou').text(invoiceDetail.items[k].gross);
            $invItem.insertAfter($invItemHeader);
            taxSum += invoiceDetail.items[k].tax;
        }

        if (invoiceDetail.u.taxnum) {
            $invoiceItemsContainer.find('.inv-payment-price.inv-li-gst .inv-gst-perc')
                .text(invoiceDetail.u.taxnum[0] + ': ' + invoiceDetail.taxrate.toFixed(2) + '%');
        }
        $invoiceItemsContainer.find('.inv-payment-price.inv-li-gst .inv-gst-val').text('€' + taxSum);
        $invoiceItemsContainer.find('.inv-payment-price.inv-li-total .inv-total-val').text('€' + invoiceDetail.tot);

        // receipt top right items
        if (invoiceDetail.rnum) {
            $invoiceTopTitle.find('#rece-date').text((new Date(invoiceDetail.payts * 1000)).toLocaleDateString());
            $invoiceTopTitle.find('#rece-number').text(invoiceDetail.rnum);
            $invoiceDetailContainer.find('.invoice-container.pay-receipt').removeClass('hidden');
        }
        else {
            $invoiceDetailContainer.find('.invoice-container.pay-receipt').addClass('hidden');
        }

        unhideSection();

        $invoiceDetailContainer.find('.inv-detail-export').off('click.subuser').on('click.subuser',
            function invoiceDetailExportClickHandler() {
                M.require('jspdf_js').done(
                    function exportOverviewPageToPDF() {
                        var doc = new jsPDF();
                        var specialElementHandlers = {
                            '.hidden': function (element, renderer) {
                                return true;
                            }
                        };

                        var $invoiceDetailDiv = $('.invoice-container', $invoiceDetailContainer);

                        doc.addHTML($invoiceDetailDiv[0], function () {
                            doc.save('invoice' + invoiceDetail.n + '.pdf');
                        });
                    }
                );
            }
        );
        
        $invoiceDetailContainer.jScrollPane({ enableKeyboardNavigation: false, showArrows: true, arrowSize: 8, animateScroll: true });
    };

    $accountPageHeader.find('.acc-acc').off('click.suba').on('click.suba',
        function invoiceDetailHeaderClick() {
            var $me = $(this);
            if ($me.hasClass('acc-acc')) {
                return mySelf.viewBusinessAccountPage();
            }
    });

    var gettingInvoiceDetailPromise = this.business.getInvoiceDetails(invoiceID, false);
    gettingInvoiceDetailPromise.always(fillInvoiceDetailPage);
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
        $dialog.find('.dialog-button-container .yes-answer').removeClass('default-red-button-user-management')
            .addClass('default-green-button-user-management');
    }
    else {
        $dialog.find('.dialog-button-container .yes-answer').removeClass('default-green-button-user-management')
            .addClass('default-red-button-user-management');
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
 * @param {object} result           an object contain password + sub-user handle
 * @param {Function} callback       a function to call when OK button is pressed on result-view slide
 */
BusinessAccountUI.prototype.showAddSubUserDialog = function (result, callback) {
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
        // $('.licence-bar', $dialog).removeClass('hidden');
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
        // $('.licence-bar', $dialog).addClass('hidden');
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

    // event handler for input getting focus
    $('.dialog-input-container input', $dialog).off('focus.suba')
        .on('focus.suba', function inputHasFocusHandler() {
            $(this).removeClass('error correctinput').addClass('active');
        });

    // event handler for input losing focus
    $('.dialog-input-container input', $dialog).off('blur.suba')
        .on('blur.suba', function inputHasFocusHandler() {
            if (this.value.trim()) {
                $(this).removeClass('error active').addClass('correctinput');
            }
            else {
                $(this).removeClass('error active correctinput');
            }
        });

    // generic keydown monitoring function. - will be injected only when needed
    var keyDownEventHandler = function (target) {
        var $element = $(target.target);
        var $targetParent = $element.parent();
        if ($targetParent && $targetParent.length) {
            var $errorDiv = $targetParent.find('.error-message');
            if ($errorDiv && $errorDiv.length && !$errorDiv.hasClass('hidden')) {
                $errorDiv.addClass('hidden');
            }
            $element.off('keydown.suba');
        }
        else {
            console.error('not allowed, not panned change of HTML is business account - add user dialog');
        }
    };


    // event handler for adding sub-users
    $('.dialog-button-container .add-sub-user', $dialog).off('click.subuser')
        .on('click.subuser', function addSubUserClickHandler() {
            if ($(this).hasClass('disabled')) {
                return;
            }
            if ($(this).hasClass('a-ok-btn')) {
                closeDialog();
                if (callback) {
                    return callback();
                }
                return;
            }

            var $uName = $('.input-user input.sub-n', $dialog);
            var $uLastName = $('.input-user input.sub-n-l', $dialog);
            var $uEmail = $('.input-user input.sub-m', $dialog);
            var uNameTrimed = $uName.val().trim();
            var uLastNameTrimed = $uLastName.val().trim();
            var uEmailTrimed = $uEmail.val().trim();

            if (!uNameTrimed.length) {
                $uName.addClass('error');
                $('.dialog-input-container .error-message.er-sub-n', $dialog).removeClass('hidden').text(l[1099]);

                // monitoring input
                $uName.off('keydown.suba').on('keydown.suba', keyDownEventHandler);

                return;
            }
            if (!uLastNameTrimed) {
                $uLastName.addClass('error');
                $('.dialog-input-container .error-message.er-sub-n', $dialog).removeClass('hidden').text(l[1099]);

                // monitoring input
                $uLastName.off('keydown.suba').on('keydown.suba', keyDownEventHandler);

                return;
            }
            if (checkMail(uEmailTrimed)) {
                $uEmail.addClass('error');
                $('.dialog-input-container .error-message.er-sub-m', $dialog).removeClass('hidden').text(l[5705]);

                // monitoring input
                $uEmail.off('keydown.suba').on('keydown.suba', keyDownEventHandler);

                return;
            }

            var $uPosition = $('.input-user input.sub-p', $dialog);
            var $uIdNumber = $('.input-user input.sub-id-nb', $dialog);
            var $uPhone = $('.input-user input.sub-ph', $dialog);
            var $uLocation = $('.input-user input.sub-lo', $dialog);

            var addUserOptionals = Object.create(null);
            var ttemp = $uPosition.val().trim();
            if (ttemp) {
                addUserOptionals.position = ttemp;
            }
            ttemp = $uIdNumber.val().trim();
            if (ttemp) {
                addUserOptionals.idnum = ttemp;
            }
            ttemp = $uPhone.val().trim();
            if (ttemp) {
                addUserOptionals.phonenum = ttemp;
            }
            ttemp = $uLocation.val().trim();
            if (ttemp) {
                addUserOptionals.location = ttemp;
            }

            loadingDialog.pshow();

            var subName = uNameTrimed;
            var subLastName = uLastNameTrimed;
            var subEmail = uEmailTrimed;

            var subPromise = mySelf.business.addSubAccount(subEmail, subName, subLastName, addUserOptionals);


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

        });

    
    // event handler for key-down on inputs
    //$('.input-user input', $dialog).off('keydown.subuserresd')
    //    .on('keydown.subuserresd', function inputFieldsKeyDoownHandler() {
    //        var $me = $(this);
    //        if ($me.hasClass('error')) {
    //            $me.removeClass('error');
    //            $('.dialog-input-container .error-message', $dialog).addClass('hidden')
    //        }
    //    });

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
    var mySelf = this;

    var $dialog = $('.user-management-edit-profile-dialog.user-management-dialog');
    var $usersContainer = $('.dialog-input-container', $dialog);
    var $nameInput = $('input.edit-sub-name', $usersContainer);
    var $lnameInput = $('input.edit-sub-lname', $usersContainer);
    var $emailInput = $('input.edit-sub-email', $usersContainer);
    var $positionInput = $('input.edit-sub-position', $usersContainer);
    var $subIDInput = $('input.edit-sub-id-nb', $usersContainer);
    var $phoneInput = $('input.edit-sub-phone', $usersContainer);
    var $locationInput = $('input.edit-sub-location', $usersContainer);
    var userAttrs = Object.create(null);

    var clearDialog = function () {
        $nameInput.val('');
        $lnameInput.val('');
        $emailInput.val('');
        $positionInput.val('');
        $subIDInput.val('');
        $phoneInput.val('');
        $locationInput.val('');
    };

    clearDialog();

    //var uName = from8(base64urldecode(subUser.firstname)) + ' ' +
    //    from8(base64urldecode(subUser.lastname));
    //uName = uName.trim();
    var subUserDefaultAvatar = useravatar.contact(subUserHandle);

    userAttrs.fname = from8(base64urldecode(subUser.firstname));
    userAttrs.lname = from8(base64urldecode(subUser.lastname));

    $nameInput.val(userAttrs.fname);
    $lnameInput.val(userAttrs.lname);
    $emailInput.val(subUser.e);
    if (subUser.position) {
        userAttrs.position = from8(base64urldecode(subUser.position));
        $positionInput.val(userAttrs.position);
    }
    if (subUser.idnum) {
        userAttrs.idnum = from8(base64urldecode(subUser.idnum));
        $subIDInput.val(userAttrs.idnum);
    }
    if (subUser.phonenum) {
        userAttrs.phonenum = from8(base64urldecode(subUser.phonenum));
        $phoneInput.val(userAttrs.phonenum);
    }
    if (subUser.location) {
        userAttrs.location = from8(base64urldecode(subUser.location));
        $locationInput.val(userAttrs.location);
    }

    /** checks if a user attribute got changed and returns changes
     * @returns {Object}   if changes happed it will contain changed attrs*/
    var getchangedValues = function () {
        var changes = Object.create(null);

        var fname = $nameInput.val().trim();
        var lname = $lnameInput.val().trim();
        var email = $emailInput.val().trim();
        var pos = $positionInput.val().trim();
        var subid = $subIDInput.val().trim();
        var tel = $phoneInput.val().trim();
        var loc = $locationInput.val().trim();

        var refPos = userAttrs.position || '';
        var refId = userAttrs.idnum || '';
        var refTel = userAttrs.phonenum || '';
        var refLoc = userAttrs.location || '';

        if (fname !== userAttrs.fname) {
            changes.fname = fname;
        }
        if (lname !== userAttrs.lname) {
            changes.lname = lname;
        }
        if (email !== subUser.e) {
            changes.email = email;
        }
        if (pos !== refPos) {
            changes.pos = pos;
        }
        if (subid !== refId) {
            changes.subid = subid;
        }
        if (tel !== refTel) {
            changes.tel = tel;
        }
        if (loc !== refLoc) {
            changes.loc = loc;
        }

        if (Object.keys(changes).length > 0) {
            return changes;
        }
        else {
            return null;
        }

    };

    var handleEditResult = function (st, res, req) {
        closeDialog();
        if (st === 0) {
            msgDialog('warningb', '', l[19524]);
            if (d) {
                console.error(res);
            }
        }
        else {
            // no extra info ... just show operation success message
            if (!res) {
                msgDialog('info', '', l[19525]);
            }
            else {
                // we received LP + handle --> changes included email change
                // calling show add sub-user dialog with "result" passed will show the result dialog
                res.m = req.m;
                mySelf.showAddSubUserDialog(res);
            }

        }
    };

    $('.user-management-subuser-avatars', $dialog).html(subUserDefaultAvatar);

    // close event handler
    $('.dialog-button-container .btn-edit-close, .delete-img.icon', $dialog).off('click.subuser')
        .on('click.subuser', closeDialog);

    // event handler for save button clicking
    $('.dialog-button-container .btn-edit-save', $dialog).off('click.subuser')
        .on('click.subuser', function editSubUserSaveButtonClickHandler() {
            var changedVals = getchangedValues();
            if (!changedVals) {
                return closeDialog();
            }
            else {
                var editPromise = mySelf.business.editSubAccount(subUserHandle, changedVals.email, changedVals.fname, changedVals.lname,
                    {
                        position: changedVals.pos,
                        idnum: changedVals.subid,
                        phonenum: changedVals.tel,
                        location: changedVals.loc
                    });

                editPromise.always(handleEditResult);
            }
        });

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
                M.currentdirid = page;
            }
        }
        else {
            var newSubPage = (subLocation) ? ('fm/user-management/' + subLocation)
                : 'fm/user-management';
            if (page !== newSubPage) {
                history.pushState({ subpage: newSubPage }, "", "/" + newSubPage);
                page = newSubPage;
                M.currentdirid = page;
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
        var leftPanelClass = 'enabled-accounts';
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
            //$userRow.addClass('hidden');
            leftPanelClass = 'disabled-accounts';
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