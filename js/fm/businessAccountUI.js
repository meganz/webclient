/**
 * A UI control Class to perform Business Account related UI
 */
function BusinessAccountUI() {
    "use strict";
    if (!mega.buinsessController) {
        /**@type {BusinessAccount} */
        this.business = new BusinessAccount();
        mega.buinsessController = this.business;
        mBroadcaster.addListener('business:subuserUpdate', this.UIEventsHandler.bind(this));
        this.initialized = false;
    }
    else {
        this.business = mega.buinsessController;
        this.initialized = true;
        if (u_handle && u_attr) {
            this.currAdmin = {
                u: u_handle,
                p: u_attr.b.bu,
                s: 0,
                e: u_attr.email,
                firstname: base64urlencode(to8(u_attr.firstname)),
                lastname: base64urlencode(to8(u_attr.lastname)),
                position: null,
                idnum: null,
                phonenum: null,
                location: null,
                isAdmin: true
            };
        }
    }

    var mySelf = this;

    // private function to hide all business accounts UI divs.
    this.initUItoRender = function () {

        // dealing with non-confirmed accounts, and not payed-ones
        if (!u_attr || !u_attr.b || u_attr.b.s === -1 || !u_privk) {
            loadSubPage('start');
            return false;
        }

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
        $('.fm-empty-user-management').addClass('hidden');

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
        $('.fm-right-header-user-management .user-management-main-page-buttons').removeClass('hidden');
        $('.fm-right-header-user-management .user-management-breadcrumb').addClass('hidden');
        $('.inv-det-arrow, .inv-det-id',
            '.fm-right-header-user-management .user-management-breadcrumb.account').addClass('hidden');
        $('.fm-right-header-user-management .user-management-overview-buttons').addClass('hidden');
        $('.user-management-overview-bar').addClass('hidden');


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
        return true;
    };
}

/**
 * Function to view the right pane of "Users Management" used by master users to manage sub-accounts
 * @param {String[]} subAccounts    optional list of subAccount, Default is M.suba
 * @param {Boolean} isBlockView     by default "Grid" view will be used, this param when True will change to "Block"
 * @param {Boolean} quickWay        by default false, if true method will skip some ui operations
 * @returns {Boolean}               true if OK, false if something went wrong
 */
BusinessAccountUI.prototype.viewSubAccountListUI = function (subAccounts, isBlockView, quickWay) {
    "use strict";
    if (!this.business.isBusinessMasterAcc()) {
        return false;
    }
    var currSubAccounts = subAccounts;
    if (!currSubAccounts) {
        if (M.suba) {
            currSubAccounts = M.suba;
        }
        else {
            return false;
        }
    }

    if (!this.initUItoRender()) {
        return;
    }

    var mySelf = this;
    this.business.hasSubs = false;

    var subAccountsView;
    if (!isBlockView) {
        subAccountsView = $('.files-grid-view.user-management-view');
    }
    else {
        subAccountsView = $('.fm-blocks-view.user-management-view');
    }
    $('.fm-right-files-block').removeClass('hidden');
    $('.fm-empty-user-management').addClass('hidden');

    if (!quickWay) {
        this.URLchanger('');
    }

    if (!Object.keys(currSubAccounts).length) { // no subs
        return this.viewLandingPage();
    }
    this.business.hasSubs = true;

    loadingDialog.pshow();

    // API doesn't send the "Admin" user, i assume that this because the current admin is the caller.
    // if later, when we get multiple admins the same thing happened for other admins, then we can't rely
    // on the below adding of the current user as an admin.
    if (this.currAdmin) {
        if (!currSubAccounts[this.currAdmin.u]) {
            currSubAccounts[this.currAdmin.u] = this.currAdmin;
        }
    }

    currSubAccounts = mySelf.sortSubusers(currSubAccounts);

    var unhideUsersListSection = function () {
        subAccountsView.removeClass('hidden'); // un-hide the container
        $('.user-management-list-table', subAccountsView).removeClass('hidden'); // unhide the list table
        $('.fm-right-header-user-management .user-management-main-page-buttons').removeClass('hidden'); // unhide head
        $('.content-panel.user-management .nw-user-management-item').removeClass('selected');
        loadingDialog.phide();

        if (window.triggerShowAddSubUserDialog) {
            delete window.triggerShowAddSubUserDialog;
            mySelf.showAddSubUserDialog();
        }
    };

    // private function to fill HTML table for sub users
    var fillSubUsersTable = function (subUsers, uiBusiness) {
        var $usersTable = $('.user-management-list-table', subAccountsView).removeClass('hidden');
        var $tr = $('tr', $usersTable);
        var $tr_user = $($tr.get(1)).clone(true); // the first one is the table header
        $tr_user.removeClass('hidden');
        var $detailListTable = $('.grid-table-user-management', $usersTable);

        var $usersLeftPanel = $('.fm-tree-panel .content-panel.user-management');
        var $userLaeftPanelItems = $('.nw-user-management-item ', $usersLeftPanel);
        var $userLaeftPanelRow = $($userLaeftPanelItems.get(0)).clone(true);
        $userLaeftPanelItems.remove();
        $('.user-management-tree-panel-header.enabled-accounts').addClass('active');
        $('.user-management-tree-panel-header.disabled-accounts').removeClass('active');

        // remove all elements from template on HTML file
        for (var k = 1; k < $tr.length; k++) {
            $tr.get(k).remove();
        }

        // now let's fill the table with sub-users data
        // for (var a = 0; a < 50; a++) {
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
            if (!subUsers[h].isAdmin) {
                $currUser.find('.fm-user-management-user .admin-icon').addClass('hidden');
                $currUser.find('.edit-icon.icon, .disabled-icon.icon').removeClass('disabled');
            }
            else {
                $currUser.find('.fm-user-management-user .admin-icon').removeClass('hidden');
                $currUser.find('.edit-icon.icon, .disabled-icon.icon').addClass('disabled');
            }

            $currUserLeftPane.removeClass('selected');
            var uName = 'Error';
            try {
                uName = from8(base64urldecode(subUsers[h].firstname)) + ' ' +
                    from8(base64urldecode(subUsers[h].lastname));
            }
            catch (e) { }
            uName = uName.trim();
            $currUser.find('.fm-user-management-user .user-management-name').text(uName);
            $currUserLeftPane.find('.nw-user-management-name').text(uName);

            if (subUsers[h].pe && subUsers[h].pe.e) {
                $currUser.find('.user-management-email').addClass('pending-email').text(l[19606]);
            }
            else {
                $currUser.find('.user-management-email').removeClass('pending-email').text(subUsers[h].e);
            }
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

        // 2- left pane headers (enabled,disabled) sub-users
        $('.user-management-tree-panel-header').off('click.subuser');
        $('.user-management-tree-panel-header').on('click.subuser', function subUserLeftPanelHeaderClickHandler() {
            var me = $(this);
            var disabledFound = false;
            var $subUsers = $('.fm-tree-panel .content-panel.user-management .nw-user-management-item');

            $('.user-management-tree-panel-header').removeClass('active');
            $('.fm-empty-user-management').addClass('hidden');

            me.addClass('active');

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
                        disabledFound = true;
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
            if (!disabledFound && !me.hasClass('enabled-accounts') && $usersTable.is(":visible ")) {
                $('.fm-empty-user-management').removeClass('hidden');
            }

        });

        // 3- on clicking on a sub-user to view his info (from left pane or row)
        $('.grid-table-user-management .view-icon.icon, .content-panel.user-management .nw-user-management-item,' +
            '.grid-table-user-management tr').off('click.subuser')
            .on('click.subuser', function subUserViewInfoClickHandler() {

                $('.content-panel.user-management .nw-user-management-item').removeClass('selected');

                var userHandle = false;
                var $me = $(this);

                if ($me.hasClass('nw-user-management-item')) { // left pane
                    userHandle = $me.attr('id');
                }
                else if ($me.hasClass('view-icon')) { // user row
                    userHandle = $me.closest('tr').attr('id');
                }
                else if ($me.is('tr')) { // user row
                    userHandle = $me.attr('id');
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
                return false;
            });

        // 4- on clicking on a sub-user row to edit his info (edit  icon)
        $('.grid-table-user-management .edit-icon.icon').off('click.subuser').on('click.subuser',
            function editSubUserClickHandler() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                var userHandle = $(this).closest('tr').attr('id');
                mySelf.showEditSubUserDialog(userHandle);
                return false;
            });

        // 5- on clicking on a sub-user row to enable/disable
        $('.grid-table-user-management .dis-en-icon').off('click.subuser').on('click.subuser',
            function disableEnableSubUserClickHandler() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                var userHandle = $(this).closest('tr').attr('id');
                if (!M.suba[userHandle]) {
                    return;
                }
                var isDisable = false;
                if (M.suba[userHandle].s === 10 || M.suba[userHandle].s === 0) {
                    isDisable = true;
                }

                var uName = from8(base64urldecode(M.suba[userHandle].firstname)) + ' ' +
                    from8(base64urldecode(M.suba[userHandle].lastname));
                uName = uName.trim();

                if (isDisable) {
                    var confirmationDlgResultHandler = function (adminAnswer) {
                        if (adminAnswer) {
                            var opPromise = mySelf.business.deActivateSubAccount(userHandle);
                            opPromise.done(
                                function () {
                                    // action packet will update DB. [+ memory]
                                    // subUser.s = 11; // disabled
                                    return;
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
                            var opPromise = mySelf.business.activateSubAccount(userHandle);
                            opPromise.done(
                                function (st, res, req) {
                                    if (res === 0) {
                                        return;
                                    }
                                    else if (typeof res === 'object') {
                                        res.m = M.suba[userHandle].e;
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
                return false;

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
                    activeDate = new Date(dd.substr(0, 4), dd.substr(4, 2) - 1, dd.substr(6, 2));
                    // activeDate = activeDate.toLocaleDateString();
                    activeDate = time2date(activeDate.getTime() / 1000, 1);
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

    var reDraw = this.isRedrawNeeded(currSubAccounts, this.business.previousSubList);

    if (reDraw) {
        fillSubUsersTable(currSubAccounts, this);
        // storing current drawn sub-users to prevent not needed redraw
        this.business.previousSubList = JSON.parse(JSON.stringify(currSubAccounts));
    }
    else {
        unhideUsersListSection();
    }

    if (!quickWay) {
        // getting quotas
        var quotasPromise = this.business.getQuotaUsage();
        quotasPromise.done(fillSubUsersUsage);
    }
    else {
        loadingDialog.phide();
    }
};

/**
 * get the status string of a sub-user
 * @param {Number} statusCode       a number represents the status code of a sub-user
 * @returns {String}                the status string (Active, disabled ...etc)
 */
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
 * Check if re-rendering of business account users management is needed
 * @param {Object} subs             New users object
 * @param {Object} previousSubs     Old users object
 */
BusinessAccountUI.prototype.isRedrawNeeded = function (subs, previousSubs) {
    "use strict";
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
            if (subs[k][h] instanceof Object) {
                if (!(previousSubs[k][h] instanceof Object)) {
                    return true;
                }
                for (var a in subs[k][h]) {
                    if (subs[k][h][a] !== previousSubs[k][h][a]) {
                        return true;
                    }
                }
            }
            else if (subs[k][h] !== previousSubs[k][h]) {
                return true;
            }
        }
    }
    return false;
};


/**
 * show the password dialog for invitation link
 * @param {String} invitationLink       sub-user invitation link
 */
BusinessAccountUI.prototype.showLinkPasswordDialog = function (invitationLink) {

    "use strict";

    var $dialog = $('.fm-dialog.sub-account-link-password');
    var prepareSubAccountLinkDialog = function () {

        var $passInput = $('input.sub-m', $dialog);
        var megaPassInput = new mega.ui.MegaInputs($passInput);

        $('.decrypt-sub-user-link', $dialog).off('click');

        $('.link-sub-user-pass input', $dialog).off('keydown').on('keydown', function (e) {
            $(this).parent().removeClass('error');
            if (e.keyCode === 13 || e.code === 'Enter' || e.key === 'Enter') {
                return $('.decrypt-sub-user-link', $dialog).trigger('click');
            }

        });

        $('.decrypt-sub-user-link', $dialog).on('click', function decryptOkBtnHandler() {
            var enteredPassword = $('.link-sub-user-pass input', $dialog).val();
            $('.link-sub-user-pass input', $dialog).val('');
            if (!enteredPassword.length) {
                $('.link-sub-user-pass input', $dialog).megaInputsShowError(l[6220]);
                return false;
            }
            else {
                closeDialog();
                loadingDialog.pshow();
                var business = new BusinessAccount();

                var failureAction = function (st, res, desc) {

                    loadingDialog.phide();
                    var msg = l[17920]; // not valid password
                    if (res) {
                        msg = l[19567]; // not valid link 19567
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

                    getInfoPromise.done(function signupCodeGettingSuccessHandler(status, res) {
                        if (localStorage.d) {
                            console.log(res);
                        }
                        if (!res.e || !res.firstname || !res.bpubk || !res.bu) {
                            failureAction(1, res, 'uv2 not complete response');
                        }
                        else {
                            loadingDialog.phide();
                            if (u_type === false) {
                                res.signupcode = decryptedTokenBase64;
                                localStorage.businessSubAc = JSON.stringify(res);
                                loadSubPage('register');
                            }
                            else {
                                var msgTxt = l[18795];
                                // 'You are currently logged in. ' +
                                //  'Would you like to log out and proceed with business account registration ? ';
                                // closeDialog();
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
 * Opens a signup code of a business account sub-user
 * @param {String} signupCode       sub-user signup code
 */
BusinessAccountUI.prototype.openInvitationLink = function (signupCode) {
    "use strict";
    var business = new BusinessAccount();
    var getInfoPromise = business.getSignupCodeInfo(signupCode);

    var failureAction = function (st, res, desc) {
        msgDialog('warninga', '', l[19567], '', function () {
            loadSubPage('start');
        });
    };

    getInfoPromise.fail(failureAction);

    getInfoPromise.done(function signupCodeGettingSuccessHandler(status, res) {
        if (localStorage.d) {
            console.log(res);
        }
        if (!res.e || !res.firstname || !res.bpubk || !res.bu) {
            failureAction(1, res, 'uv2 not complete response');
        }
        else {
            if (u_type === false) {
                res.signupcode = signupCode;
                localStorage.businessSubAc = JSON.stringify(res);
                if (is_mobile) {
                    mobile.register.show(res);
                }
                else {
                    loadSubPage('register');
                }
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
};

/** Function to show landing page, for admins without sub-users yet */
BusinessAccountUI.prototype.viewLandingPage = function () {
    "use strict";
    if (!this.initUItoRender()) {
        return;
    }
    var mySelf = this;

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $landingContainer = $('.user-management-landing-page.user-management-view', $businessAccountContainer);

    $('.content-panel.user-management .nw-user-management-item').removeClass('selected').addClass('hidden');

    // handler for add users button
    $('.landing-sub-container.adding-subuser', $landingContainer).off('click.subuser')
        .on('click.subuser', function addSubUserClickHandler() {
            mySelf.showAddSubUserDialog(null, function () { });
        });

    // handler account setting page
    $('.landing-sub-container.suba-account-setting', $landingContainer).off('click.subuser')
        .on('click.subuser', function accountSettingClickHandler() {
            mySelf.viewBusinessAccountPage();
        });

    $('.fm-right-header-user-management .user-management-main-page-buttons').addClass('hidden');
    $businessAccountContainer.removeClass('hidden'); // BA container
    $landingContainer.removeClass('hidden');

    // check if we are required to show add sub-user dialog.
    if (window.triggerShowAddSubUserDialog) {
        delete window.triggerShowAddSubUserDialog;
        $('.landing-sub-container.adding-subuser', $landingContainer).click();
    }
};

/**
 * A function to show the sub-user info page
 * @param {String} subUserHandle        sub-user handle to view the info page for
 */
BusinessAccountUI.prototype.viewSubAccountInfoUI = function (subUserHandle) {
    "use strict";
    if (!this.initUItoRender()) {
        return;
    }
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

    // hide or show pending email
    if (subUser.pe && subUser.pe.e) {
        var $pending = $subAccountContainer.find('.pending-email-note').addClass('active');
        $pending.find('.pending-email-txt').text(subUser.pe.e);
    }
    else {
        $subAccountContainer.find('.pending-email-note').removeClass('active');
    }

    if (subUser.isAdmin) {
        $subAccountContainer.find('.profile-button-container .migrate-data, .profile-button-container .edit-profile, '
            + '.profile-button-container .resend-verification, .profile-button-container .disable-account,' +
            '.profile-button-container .reset-sub-user-password').addClass('disabled');
        $subAccountContainer.find('.admin-icon.role').removeClass('hidden');
    }
    else {
        $subAccountContainer.find('.profile-button-container .migrate-data, .profile-button-container .edit-profile, '
            + '.profile-button-container .resend-verification, .profile-button-container .disable-account,' +
            '.profile-button-container .reset-sub-user-password').removeClass('disabled');
        $subAccountContainer.find('.admin-icon.role').addClass('hidden');
    }

    $subAccountContainer.find('.user-management-view-status').removeClass('enabled pending disabled');
    // $subAccountContainer.find('.profile-button-container .disable-account').removeClass('hidden');
    $subAccountContainer.find('.profile-button-container .disable-account').text(l[19092])
        .removeClass('default-green-button-user-management').addClass('default-red-button-user-management')
        .addClass('sub-disable').removeClass('sub-enable');
    $subAccountContainer.find('.profile-button-container .edit-profile').text(l[16735]);
    $subAccountContainer.find('.profile-button-container .resend-verification').addClass('hidden');
    $subAccountContainer.find('.profile-button-container .migrate-data').addClass('hidden');
    $subAccountContainer.find('.profile-button-container .reset-sub-user-password').addClass('hidden');
    if (subUser.s === 0) {
        $subAccountContainer.find('div.user-management-view-status').addClass('enabled');
        $subAccountContainer.find('.profile-button-container .reset-sub-user-password').removeClass('hidden');
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
    $('.subaccount-img-big', $subAccountContainer).safeHTML(subUserDefaultAvatar);
    $('.user-management-subuser-avatars', $subHeader).safeHTML(subUserDefaultAvatar);

    // event handler for clicking on the header
    $('.user-management-icon', $subHeader).off('click.subuser')
        .on('click.subuser', function navigationHeaderClickHandler() {
            mySelf.viewSubAccountListUI();
        });

    // event handler for enable/disable account
    $subAccountContainer.find('.profile-button-container .disable-account').off('click.subuser')
        .on('click.subuser', function enable_disableClickHandler() {
            if ($(this).hasClass('disabled')) {
                return false;
            }
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
            if ($(this).hasClass('disabled')) {
                return;
            }
            mySelf.migrateSubUserData(subUserHandle);
        });

    // event handler for edit sub-user button
    $subAccountContainer.find('.profile-button-container .edit-profile').off('click.subuser').on('click.subuser',
        function editSubUserClickHandler() {
            if ($(this).hasClass('disabled')) {
                return;
            }
            mySelf.showEditSubUserDialog(subUserHandle);
        });

    // event handler for sub-user password reset
    $subAccountContainer.find('.profile-button-container .reset-sub-user-password')
        .off('click.subuser').on('click.subuser', function resetPasswordSubUserClickHandler() {
            if ($(this).hasClass('disabled')) {
                return;
            }
            mySelf.showResetPasswordSubUserDialog(subUserHandle);
        });



    // event handler for re-send invitation
    $subAccountContainer.find('.profile-button-container .resend-verification').off('click.subuser')
        .on('click.subuser', function resendInvitation_ClickHandler() {
            if ($(this).hasClass('hidden disabled')) {
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

        var ffNumText = function(value, type) {
            var counter = value || 0;
            var numTextOutput = "";

            if (counter === 0) {
                numTextOutput = type === 'file' ? l[23259] : l[23258];
            }
            else if (counter === 1) {
                numTextOutput = type === 'file' ? l[23257] : l[23256];
            }
            else {
                numTextOutput = (type === 'file' ? l[23261] : l[23260]).replace('[X]', counter);
            }

            return numTextOutput;
        };

        var cloudDriveFolderNumText = ffNumText(rootInfo[2], 'folder');
        var cloudDriveFileNumText = ffNumText(rootInfo[1], 'file');
        $('.ff-occupy', $cloudDriveSection).text(rootTotalFormatted.size + ' ' + rootTotalFormatted.unit);
        $('.folder-number', $cloudDriveSection).text(cloudDriveFolderNumText);
        $('.file-number', $cloudDriveSection).text(cloudDriveFileNumText);

        var inShareInFolderNumText = ffNumText(inshareInternalInfo[2], 'folder');
        var inShareInFileNumText = ffNumText(inshareInternalInfo[1], 'file');
        $('.ff-occupy', $inShareSection).text(inshareInternalTotalFormatted.size + ' ' +
            inshareInternalTotalFormatted.unit);
        $('.folder-number', $inShareSection).text(inShareInFolderNumText);
        $('.file-number', $inShareSection).text(inShareInFileNumText);

        var inShareExFolderNumText = ffNumText(inshareExternalInfo[2], 'folder');
        var inShareExFileNumText = ffNumText(inshareExternalInfo[1], 'file');
        $('.ff-occupy', $inShareExSection).text(inshareExternalTotalFormatted.size + ' ' +
            inshareExternalTotalFormatted.unit);
        $('.folder-number', $inShareExSection).text(inShareExFolderNumText);
        $('.file-number', $inShareExSection).text(inShareExFileNumText);

        var outShareExFolderNumText = ffNumText(outshareInfo[2], 'folder');
        var outShareExFileNumText = ffNumText(outshareInfo[1], 'file');
        $('.ff-occupy', $outShareExternalSection).text(outshareTotalFormatted.size + ' ' +
            outshareTotalFormatted.unit);
        $('.folder-number', $outShareExternalSection).text(outShareExFolderNumText);
        $('.file-number', $outShareExternalSection).text(outShareExFileNumText);

        var outShareInFolderNumText = ffNumText(outshareInternalInfo[2], 'folder');
        var outShareInFileNumText = ffNumText(outshareInternalInfo[1], 'file');
        $('.ff-occupy', $outShareSection).text(outshareTotalInternalFormatted.size + ' ' +
            outshareTotalInternalFormatted.unit);
        $('.folder-number', $outShareSection).text(outShareInFolderNumText);
        $('.file-number', $outShareSection).text(outShareInFileNumText);

        var rubbishFolderNumText = ffNumText(rubbishInfo[2], 'folder');
        var rubbishFileNumText = ffNumText(rubbishInfo[1], 'file');
        $('.ff-occupy', $rubbishSection).text(rubbishTotalFormatted.size + ' ' + rubbishTotalFormatted.unit);
        $('.folder-number', $rubbishSection).text(rubbishFolderNumText);
        $('.file-number', $rubbishSection).text(rubbishFileNumText);

        var versionsFileNumText = ffNumText(rootInfo[4] + rubbishInfo[4]
            + inshareInternalInfo[4] + inshareExternalInfo[4] + outshareInfo[4], 'file');
        $('.ff-occupy', $versionsSection).text(versionsTotalFormatted.size + ' ' + versionsTotalFormatted.unit);
        $('.file-number', $versionsSection).text(versionsFileNumText);
    };

    // viewing the right buttons


    // getting quotas
    var quotasPromise = this.business.getQuotaUsage();
    quotasPromise.done(fillQuotaInfo);


    $businessAccountContainer.removeClass('hidden'); // BA container
    $subAccountContainer.removeClass('hidden').attr('id', 'sub-' + subUserHandle); // sub-info container
    $subHeader.removeClass('hidden');
    $subAccountContainer.jScrollPane({
        enableKeyboardNavigation: false, showArrows: true,
        arrowSize: 8, animateScroll: true
    });
};


/** show business account overview page
 * */
BusinessAccountUI.prototype.viewBusinessAccountOverview = function () {
    "use strict";

    if (!this.initUItoRender()) {
        return;
    }
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
        $chartContainer.safeHTML('<canvas id="usage-pie-chart"></canvas>');
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
                        l[19187],
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

        $overviewContainer.jScrollPane({
            enableKeyboardNavigation: false, showArrows: true,
            arrowSize: 8, animateScroll: true
        });
    };

    // private function to format start and end dates
    var getReportDates = function (leadingDate) {
        var today = leadingDate || new Date();

        var todayMonth = today.getUTCMonth() + 1;
        var currMonth = String(todayMonth);
        if (currMonth.length < 2) {
            currMonth = '0' + currMonth;
        }
        var currYear = String(today.getUTCFullYear());

        var startDate = currYear + currMonth + '01';

        var endDate = getLastDayofTheMonth(today);
        if (!endDate) {
            return;
        }
        var endDateStr = String(endDate.getUTCFullYear()) + currMonth + String(endDate.getDate());
        return { fromDate: startDate, toDate: endDateStr };
    };

    // private function to populate the reporting bar chart
    var populateBarChart = function (st, res, targetDate) {
        M.require('charts_js').done(function () {
            var $charContainer = $("#chartcontainer");
            $charContainer.empty();
            $charContainer.safeHTML('<canvas id="usage-bar-chart" class="daily-transfer-flow-container"></canvas>');
            var chartCanvas = $("#usage-bar-chart");

            var availableLabels = Object.keys(res);
            availableLabels.sort();

            var chartData = [];
            var chartLabels = [];
            var divider = 1;
            var totalMonthTransfer = 0;
            var randVal;

            // if statement only for testing, can be removed after deploy.
            if (d && localStorage.bTest) {
                availableLabels = [];
                for (var h2 = 0; h2 < 30; h2++) {
                    randVal = Math.random() * 100;
                    chartData.push(randVal);
                    availableLabels.push(h2 + 1);
                    chartLabels.push(h2 + 1);
                    totalMonthTransfer += randVal;
                }
            }
            // building bars data + total transfer
            else {
                // let determine the scale.
                var scaleKB = 1024;
                var scaleMB = 1024 * scaleKB;
                var scaleGB = 1024 * scaleMB;
                var is_KB = false;
                var is_MB = false;
                var is_GB = false;
                for (var ss = 0; ss < availableLabels.length; ss++) {
                    var consume = res[availableLabels[ss]].tdl || 0;
                    if (consume > scaleGB) {
                        is_GB = true;
                        break;
                    }
                    else if (consume > scaleMB) {
                        is_MB = true;
                    }
                    else if (consume > scaleKB) {
                        is_KB = true;
                    }
                }
                if (is_GB) {
                    divider = scaleGB;
                    $businessAccountContainer.find('#barchart-unit').text(l[20031]);
                }
                else if (is_MB) {
                    divider = scaleMB;
                    $businessAccountContainer.find('#barchart-unit').text(l[20032]);
                }
                else if (is_KB) {
                    divider = scaleKB;
                    $businessAccountContainer.find('#barchart-unit').text(l[20033]);
                }
                else {
                    divider = 1;
                    $businessAccountContainer.find('#barchart-unit').text(l[20034]);
                }

                var lastDayOfThisMonth = getLastDayofTheMonth(targetDate || new Date())
                    .getDate();
                for (var v = 0; v < lastDayOfThisMonth; v++) {
                    chartData.push(0);
                    chartLabels.push(v + 1);
                }
                for (var h = 0; h < availableLabels.length; h++) {
                    var index = parseInt(availableLabels[h].substr(6, 2), 10);
                    var dayConsume = res[availableLabels[h]].tdl || 0;
                    // chartData.push(res[availableLabels[h]].tdl / divider);
                    chartData[index - 1] = dayConsume / divider;
                    totalMonthTransfer += dayConsume;

                    // keeping the day number only
                    // availableLabels[h] = availableLabels[h].substr(6, 2);
                }
            }

            var allTransferFormatted = numOfBytes(totalMonthTransfer, 2);
            $overviewContainer.find('.transfer-analysis-container .transfer-analysis-summary .total-transfer-number')
                .text(allTransferFormatted.size + ' ' + allTransferFormatted.unit);

            var tooltipBarLabeling = function (tooltipItem, data) {
                var perc = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

                var sizeInfo = numOfBytes(perc * divider);
                var label = sizeInfo.size + ' ' + sizeInfo.unit;
                return label;
            };
            var tooltipBartiteling = function () {
                return '';
            };

            var myChart = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: chartLabels, // availableLabels,
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
                            label: tooltipBarLabeling,
                            title: tooltipBartiteling
                        },
                        displayColors: false
                    }
                }
            });
        });
        $overviewContainer.jScrollPane({
            enableKeyboardNavigation: false, showArrows: true,
            arrowSize: 8, animateScroll: true
        });
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
                text: monthNames[nowDate.getUTCMonth()] + ' ' + nowDate.getUTCFullYear()
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
            reportPromise2.done(function fillBarChart(st, res) {
                populateBarChart(st, res, selectedDate);
            });
        });
    };

    populateMonthDropDownList();

};

BusinessAccountUI.prototype.initBusinessAccountHeader = function ($accountContainer) {
    "use strict";
    var mySelf = this;
    var $profileContainer = $('.profile', $accountContainer);
    var $invoiceContainer = $('.invoice', $accountContainer);
    // event handler for header clicking
    $('.settings-menu-bar .settings-menu-item', $accountContainer).off('click.suba').on('click.suba',
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
                if ($invoiceContainer.hasClass('hidden') || $('.invoice-list', $invoiceContainer).hasClass('hidden')) {
                    mySelf.viewBusinessInvoicesPage();
                }
            }
        }
    );
};

/** Show UI elements if the account got expired  */
BusinessAccountUI.prototype.showExp_GraceUIElements = function() {
    "use strict";
    if (!u_attr || !u_attr.b || (u_attr.b.s !== -1 && u_attr.b.s !== 2)) {
        return;
    }
    var msg = '';
    if (u_attr.b.s === -1) { // expired
        if (u_attr.b.m) {
            msg = l[20400].replace(/\[S\]/g, '<span>').replace(/\[\/S\]/g, '</span>')
                .replace('[A]', '<a href="/repay" class="clickurl">').replace('[/A]', '</a>');
        }
        else {
            msg = l[20462];
        }
        $('.fm-notification-block.expired-business').safeHTML(msg).show();
        clickURLs();
        this.showExpiredDialog(u_attr.b.m);
    }
    else if (u_attr.b.s === 2) { // grace
        if (u_attr.b.m) {
            msg = l[20650].replace(/\[S\]/g, '<span>').replace(/\[\/S\]/g, '</span>')
                .replace('[A]', '<a href="/repay" class="clickurl">').replace('[/A]', '</a>');
            $('.fm-notification-block.grace-business').safeHTML(msg).show();
            clickURLs();
        }
    }
};

/**
 * Show a dialog to the user telling that the account is expired
 * @param {Boolean} isMaster
 */
BusinessAccountUI.prototype.showExpiredDialog = function(isMaster) {
    "use strict";
    var $dialog;

    if (isMaster) {
        $dialog = $('.payment-reminder.user-management-dialog');

        $dialog.find('.close-x-icon.close-exp-dlg').off('click.subuser')
            .on('click.subuser', function closeExpiredAccountDialog() {
                closeDialog();
            });

        $dialog.find('.pay-reactive-acc').off('click.subuser')
            .on('click.subuser', function payReactivateAccountButtonClickHandler() {
                closeDialog();
                loadSubPage('repay');
            });

        M.safeShowDialog('expired-business-dialog', function() {
            return $dialog;
        });
    }
    else {
        $dialog = $('.user-management-able-user-dialog.warning.user-management-dialog');

        $dialog.find('.dialog-text-one').safeHTML(l[20462]);
        $dialog.find('.dialog-text-two .text-two-text').text(l[20463]);
        $dialog.find('.dialog-text-two .bold-warning').text(l[20464] + ':');

        $dialog.find('.cancel-action').addClass('hidden');
        $dialog.find('.ok-action').text(l[81]).off('click.subuser')
            .on('click.subuser', function closeExpiredSubAccountDialog() {
                closeDialog();
            });

        M.safeShowDialog('expired-business-dialog', function() {
            return $dialog;
        });
    }
};


/** view business account page */
BusinessAccountUI.prototype.viewBusinessAccountPage = function () {
    "use strict";
    if (!this.initUItoRender()) {
        return;
    }
    var mySelf = this;
    this.URLchanger('account');
    loadingDialog.pshow();

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
        $('.settings-menu-bar .settings-menu-item', $accountContainer).removeClass('selected');
        $('.settings-menu-bar .suba-setting-profile', $accountContainer).addClass('selected');
        loadingDialog.phide();

        // if we dont find essential business attrs --> get them
        if (!u_attr['%name'] && !u_attr['%phone']) {
            mySelf.business.updateSubUserInfo(u_attr.b.bu, ['%name', '%phone',
                '%email', '%taxnum', '%address1', '%address2', '%city', '%state',
                '%country', '%zip']);
            return;
        }

    };

    // event handler for header clicking
    this.initBusinessAccountHeader($accountContainer);

    // function to fill dropdown list of countries
    var loadCountries = function () {
        var countries = M.getCountries();

        var optionHtml = '<option value="{0}">{1}</option>';

        var $countriesSelect = $('#cnt-ddl', $profileContainer);
        $countriesSelect.empty();

        // first option as place-holder
        $countriesSelect.append('<option value="" hidden disabled>{0}</option >'.replace('{0}', l[481]));

        var ctnKeys = Object.keys(countries);

        for (var k = 0; k < ctnKeys.length; k++) {
            var currOption = optionHtml.replace('{0}', ctnKeys[k]).replace('{1}', countries[ctnKeys[k]]);
            $countriesSelect.append(currOption);
        }
    };

    var getPostCodeName = function(countryCode) {
        if (!countryCode) {
            return l[10659]; // "Postcode";
        }
        switch (countryCode) {
            case "US": return "ZIP code";
            case "CA": return "Postal Code";
            case "PH": return "ZIP code";
            case "DE": return "PLZ";
            case "AT": return "PLZ";
            case "IN": return "Pincode";
            case "IE": return "Eircode";
            case "BR": return "CEP";
            case "IT": return "CAP";
            default: return l[10659]; // "Postcode";
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

    if (u_attr['%name']) {
        cName = u_attr['%name'];
    }
    if (u_attr['%phone']) {
        cTel = u_attr['%phone'];
    }
    if (u_attr['%email']) {
        cEmail = u_attr['%email'];
    }
    if (u_attr['%taxnum']) {
        cVat = u_attr['%taxnum'];
    }
    if (u_attr['%address1']) {
        cAddress = u_attr['%address1'];
    }
    if (u_attr['%address2']) {
        cAddress2 = u_attr['%address2'];
    }
    if (u_attr['%city']) {
        cCity = u_attr['%city'];
    }
    if (u_attr['%state']) {
        cState = u_attr['%state'];
    }
    if (u_attr['%country']) {
        cCountry = u_attr['%country'];
    }
    if (u_attr['%zip']) {
        cZip = u_attr['%zip'];
    }

    var setPostCodeOnUI = function(countryCode) {
        var postCode = getPostCodeName(countryCode);
        $profileContainer.find('input#prof-zip').prop('placeholder', postCode);
    };

    setPostCodeOnUI(cCountry);

    var setTaxName = function(countryCode) {
        var taxName = mySelf.business.getTaxCodeName(countryCode);
        if (taxName) {
            $('input#prof-vat', $profileContainer).attr("placeholder", taxName);
        }
    };

    setTaxName(cCountry);

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

    var inputs = [$cNameInput, $cTelInput, $cEmailInput, $cVatInput, $cAddressInput,
        $cAddress2Input, $cCityInput, $cStateInput, $cZipInput];

    var addCorrectValClass = function ($item) {
        $item.parent().removeClass('error');
        if ($item.val().trim()) {
            $item.parent().addClass('correctinput');
        }
    };

    inputs.forEach(function($input) {
        var megaInput = new mega.ui.MegaInputs($input);
        addCorrectValClass($input);

        // Update vat and zip title.
        if (megaInput.updateTitle && ($input.is($cZipInput) || $input.is($cVatInput))) {
            megaInput.updateTitle();
        }
    });

    $('.saving-btn-profile', $profileContainer).off('click.suba').on('click.suba',
        function companyProfileSaveButtonClick() {
            var attrsToChange = [];
            var valid = true;
            var isTaxChanged = false;

            if ($cNameInput.val().trim() !== cName) {
                if (!$cNameInput.val().trim()) {
                    $cNameInput.megaInputsShowError(l[19507]);
                    $cNameInput.focus();
                    valid = false;
                }
                else {
                    $cNameInput.megaInputsHideError();
                    attrsToChange.push({ key: '%name', val: $cNameInput.val().trim() });
                }
            }
            if ($cTelInput.val().trim() !== cTel) {
                if (!$cTelInput.val().trim()) {
                    $cTelInput.megaInputsShowError(l[8814]);
                    $cTelInput.focus();
                    valid = false;
                }
                else {
                    $cTelInput.megaInputsHideError();
                    attrsToChange.push({ key: '%phone', val: $cTelInput.val().trim() });
                }
            }
            if ($cEmailInput.val().trim() !== cEmail) {
                if (!$cEmailInput.val().trim() || !isValidEmail($cEmailInput.val())) {
                    $cEmailInput.megaInputsShowError(l[7415]);
                    $cEmailInput.focus();
                    valid = false;
                }
                else {
                    $cEmailInput.megaInputsHideError();
                    attrsToChange.push({ key: '%email', val: $cEmailInput.val().trim() });
                }
            }
            if ($cVatInput.val().trim() !== cVat) {
                if (!$cVatInput.val().trim()) {
                    $cVatInput.megaInputsShowError(l[20953]);
                    $cVatInput.focus();
                    valid = false;
                }
                else {
                    $cVatInput.megaInputsHideError();
                    attrsToChange.push({ key: '%taxnum', val: $cVatInput.val().trim() });
                    isTaxChanged = true;
                }
            }
            if ($cAddressInput.val().trim() !== cAddress) {
                attrsToChange.push({ key: '%address1', val: $cAddressInput.val().trim() });
            }
            if ($cAddress2Input.val().trim() !== cAddress2) {
                attrsToChange.push({ key: '%address2', val: $cAddress2Input.val().trim() });
            }
            if ($cCityInput.val().trim() !== cCity) {
                attrsToChange.push({ key: '%city', val: $cCityInput.val().trim() });
            }
            if ($cStateInput.val().trim() !== cState) {
                attrsToChange.push({ key: '%state', val: $cStateInput.val().trim() });
            }
            if ($cCountryInput.val() !== cCountry) {
                attrsToChange.push({ key: '%country', val: $cCountryInput.val() });
            }
            if ($cZipInput.val().trim() !== cZip) {
                attrsToChange.push({ key: '%zip', val: $cZipInput.val().trim() });
            }


            var settingResultHandler = function (st) {
                if (st) {
                    var $savingNotidication = $('.auto-save', $accountContainer);
                    $savingNotidication.removeClass('hidden');
                    $savingNotidication.show();

                    M.safeShowDialog('business-profile-up-success', function() {
                        var $dialog =
                            $('.user-management-able-user-dialog.mig-success.user-management-dialog');
                        $('.yes-answer', $dialog).off('click.suba').on('click.suba', closeDialog);
                        var msg = l[20954];

                        if (isTaxChanged) {
                            var myNow = new Date();

                            if (u_attr && (myNow.getTime() - (u_attr.since * 1000) < 2592e6)) {
                                // if difference is less than one month
                                msg += ' ' + l[20955];
                            }
                            else if (M && M.account && M.account.purchases && M.account.purchases.length) {
                                // get first business purchase
                                var firstPurchase = null;
                                for (var pur = 0; pur < M.account.purchases.length; pur++) {
                                    if (M.account.purchases[pur][1] && M.account.purchases[pur][5]) {
                                        if (M.account.purchases[pur][5] === 100) {
                                            firstPurchase = M.account.purchases[pur];
                                            break;
                                        }
                                    }
                                }

                                if (myNow.getTime() - (firstPurchase[1] * 1000) < 2592e6) {
                                    msg += ' ' + l[20955];
                                }
                            }
                        }
                        $dialog.find('.dialog-text-one').text(msg);

                        return $dialog;
                    });

                    // we will clean up cached data of invoices to insure updating if needed
                    if (mega && mega.buinsessAccount && mega.buinsessAccount.invoicesList
                        && mega.buinsessAccount.invoicesList.list) {
                        if (mega.buinsessAccount.invoicesList.list.length === 1) {
                            mega.buinsessAccount.invoicesList = null;
                            if (mega.buinsessAccount.invoicesDetailsList) {
                                mega.buinsessAccount.invoicesDetailsList = null;
                            }
                        }
                        else {
                            var bInv = 0;
                            for (var iv = 0; iv < mega.buinsessAccount.invoicesList.list.length && bInv <= 2; iv++) {
                                if (mega.buinsessAccount.invoicesList.list[iv].b) {
                                    bInv++;
                                }
                            }
                            if (bInv === 1) {
                                mega.buinsessAccount.invoicesList = null;
                                if (mega.buinsessAccount.invoicesDetailsList) {
                                    mega.buinsessAccount.invoicesDetailsList = null;
                                }
                            }
                        }
                    }

                    setTimeout(function () {
                        $savingNotidication.fadeOut(1000);
                    }, 4000);

                }
                else {
                    msgDialog('warningb', '', l[19528]);
                }
            };

            if (valid) {
                var settingPromise = mySelf.business.updateBusinessAttrs(attrsToChange);
                settingPromise.always(settingResultHandler);
            }
        }
    );

    // event handler for clicking on header
    $accountPageHeader.find('.acc-home').off('click.suba').on('click.suba',
        function invoiceListHeaderClick() {
            var $me = $(this);
            if ($me.hasClass('acc-home')) {
                return mySelf.viewSubAccountListUI();
            }
        });

    // event handler for country select changing
    $('select#cnt-ddl', $profileContainer).off('change.suba').on('change.suba',
        function countrySelectChangingHandler(se) {
            setPostCodeOnUI(this.value);
            setTaxName(this.value);
        });

    unhideSection();

};


/** show business account page (Settings and invoices)
 * */
BusinessAccountUI.prototype.viewBusinessInvoicesPage = function () {
    "use strict";

    if (!this.initUItoRender()) {
        return;
    }
    var mySelf = this;
    this.URLchanger('invoices');

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $accountContainer = $('.user-management-account-settings', $businessAccountContainer);
    var $invoiceContainer = $('.invoice', $accountContainer);
    var $invoiceListContainer = $('.invoice-list', $invoiceContainer);
    var $accountPageHeader = $('.fm-right-header-user-management .user-management-breadcrumb.account');
    var $invoicesTableContainer = $('.invoice-table-list-container', $invoiceListContainer);

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

    this.initBusinessAccountHeader($accountContainer);

    // private function to fill the list of invoices on UI
    var prepareInvoiceListSection = function (st, invoicesList) {

        var unhideSection = function () {
            $businessAccountContainer.removeClass('hidden');
            $accountContainer.removeClass('hidden');
            $invoiceContainer.removeClass('hidden');
            $invoiceListContainer.removeClass('hidden');
            $accountPageHeader.removeClass('hidden');
            $('.settings-menu-bar .settings-menu-item', $accountContainer).removeClass('selected');
            $('.settings-menu-bar .suba-setting-inv', $accountContainer).addClass('selected');
        };

        // check if we need to re-draw
        if (!isInvoiceRedrawNeeded(invoicesList, (mySelf.business) ? mySelf.business.previousInvoices : null)) {
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


        for (var k = invoicesList.length - 1; k >= 0; k--) {
            // if the invoice is non buinsess one
            if (!invoicesList[k].b) {
                continue;
            }

            var invoiceDate = new Date(invoicesList[k].ts * 1000);
            var $newInvoiceRow = $invoiceRowTemplate.clone(true);
            var invId = invoicesList[k].n;

            $newInvoiceRow.attr('id', invId);
            // $newInvoiceRow.find('.inv-date').text(invoiceDate.toLocaleDateString());
            $newInvoiceRow.find('.inv-date').text(time2date(invoicesList[k].ts, 1));
            $newInvoiceRow.find('.inv-desc').text(invoicesList[k].d);
            $('.inv-total', $newInvoiceRow).text(formatCurrency(invoicesList[k].tot));
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

        $invoicesTableContainer.jScrollPane({
            enableKeyboardNavigation: false, showArrows: true,
            arrowSize: 8, animateScroll: true
        });
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

    if (!this.initUItoRender()) {
        return;
    }
    var mySelf = this;
    this.URLchanger('invdet!' + invoiceID);

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $accountContainer = $('.user-management-account-settings', $businessAccountContainer);
    var $invoiceContainer = $('.invoice', $accountContainer);
    var $invoiceDetailContainer = $('.invoice-detail', $invoiceContainer);
    var $accountPageHeader = $('.fm-right-header-user-management .user-management-breadcrumb.account');

    loadingDialog.pshow();
    this.initBusinessAccountHeader($accountContainer);

    var unhideSection = function () {
        $businessAccountContainer.removeClass('hidden');
        $accountContainer.removeClass('hidden');
        $invoiceContainer.removeClass('hidden');
        $invoiceDetailContainer.removeClass('hidden');
        $accountPageHeader.removeClass('hidden');
        $accountPageHeader.find('.inv-det-arrow, .inv-det-id').removeClass('hidden');
        $('.settings-menu-bar .settings-menu-item', $accountContainer).removeClass('selected');
        $('.settings-menu-bar .suba-setting-inv', $accountContainer).addClass('selected');
        loadingDialog.phide();
    };

    var validateInvoice = function (invoice) {
        // top level validate
        if (!invoice || !invoice.mega || !invoice.u || !invoice.items || !invoice.ts
            || invoice.tot === undefined || invoice.taxrate === undefined) {
            return false;
        }

        // mega object validation
        if (!invoice.mega.cnum || !invoice.mega.taxnum || !invoice.mega.cname
            || !invoice.mega.phaddr || !invoice.mega.poaddr) {
            return false;
        }
        // billed object validate
        if (!invoice.u.e || !invoice.u.cname /*|| !invoice.u.addr*/) {
            return false;
        }

        // items validation
        if (!invoice.items.length) {
            return false;
        }
        for (var k = 0; k < invoice.items.length; k++) {
            if (typeof invoice.items[k].ts === 'undefined' || typeof invoice.items[k].gross === 'undefined'
                || typeof invoice.items[k].net === 'undefined' || typeof invoice.items[k].tax === 'undefined'
                || typeof invoice.items[k].d === 'undefined') {
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
        invoiceDetail.mega.phaddr[invoiceDetail.mega.phaddr.length - 1] =
            invoiceDetail.mega.phaddr[invoiceDetail.mega.phaddr.length - 1].toUpperCase();
        invoiceDetail.mega.poaddr[invoiceDetail.mega.poaddr.length - 1] =
            invoiceDetail.mega.poaddr[invoiceDetail.mega.poaddr.length - 1].toUpperCase();
        $megaContainer.find('.inv-subtitle').text(invoiceDetail.mega.cname);
        $megaContainer.find('.biller-email').text(invoiceDetail.mega.e);
        $megaContainer.find('.biller-address').text(invoiceDetail.mega.phaddr.join(', '));
        $megaContainer.find('.biller-post').text(invoiceDetail.mega.poaddr.join(', '));

        // invoice top details
        var $invoiceTopTitle = $('.inv-title-container .inv-right', $invoiceDetailContainer);
        $invoiceTopTitle.find('#invoice-date').text(time2date(invoiceDetail.ts, 1));
        $invoiceTopTitle.find('#invoice-number').text(invoiceDetail.n);
        $invoiceTopTitle.find('.invoice-vat').text(invoiceDetail.mega.taxnum[1]);
        $invoiceTopTitle.find('.inv-vat-label').text(invoiceDetail.mega.taxnum[0] + ':');

        // billed-to details
        $invoiceDetailContainer.find('.billed-name').text(invoiceDetail.u.cname);
        $invoiceDetailContainer.find('.billed-email').text(invoiceDetail.u.e);

        var validAddressSentFromApi = []; // storing it, and removing country
        for (var ad = 0; ad < invoiceDetail.u.addr.length - 1; ad++) {
            if (invoiceDetail.u.addr[ad]) {
                validAddressSentFromApi.push(invoiceDetail.u.addr[ad]);
            }
        }
        $invoiceDetailContainer.find('.billed-address').text(validAddressSentFromApi.join(', '));
        $invoiceDetailContainer.find('.billed-country').text(invoiceDetail.u.addr[invoiceDetail.u.addr.length - 1]);
        $invoiceDetailContainer.find('.billed-vat').addClass('hidden');
        if (invoiceDetail.u.taxnum) {
            $invoiceDetailContainer.find('.billed-vat')
                .text(invoiceDetail.u.taxnum[0] + ': ' + invoiceDetail.u.taxnum[1]).removeClass('hidden');
        }

        // invoice items
        var $invoiceItemsContainer = $('.inv-payment-table', $invoiceDetailContainer);
        var $allItems = $('.inv-li-content', $invoiceItemsContainer);
        var $invItemContent = $($allItems.get(0));
        var $invItemContentTemplate = $invItemContent.clone(true);
        $allItems.remove();
        var $invItemHeader = $('.inv-li-table-header', $invoiceItemsContainer);
        var taxSum = 0;
        for (var k = invoiceDetail.items.length - 1; k >= 0; k--) {
            var $invItem = $invItemContentTemplate.clone(true);
            $invItem.find('.inv-pay-date').text(time2date(invoiceDetail.items[k].ts, 1));
            $invItem.find('.inv-pay-desc').text(invoiceDetail.items[k].d);
            $('.inv-pay-amou', $invItem).text(formatCurrency(invoiceDetail.items[k].net));
            $invItem.insertAfter($invItemHeader);
            taxSum += invoiceDetail.items[k].tax;
        }

        if (invoiceDetail.u.taxnum) {
            $invoiceItemsContainer.find('.inv-payment-price.inv-li-gst .inv-gst-perc')
                .text((invoiceDetail.taxname || invoiceDetail.u.taxnum[0])
                    + ': ' + Number(invoiceDetail.taxrate).toFixed(2) + '%');
        }
        $('.inv-payment-price.inv-li-gst .inv-gst-val', $invoiceItemsContainer).text(formatCurrency(taxSum));
        $('.inv-payment-price.inv-li-total .inv-total-val', $invoiceItemsContainer)
            .text(formatCurrency(invoiceDetail.tot));

        if (taxSum > 0) {
            $invoiceTopTitle.find('.inv-title.invv').text(l[19989]);
        }

        // receipt top right items
        if (invoiceDetail.rnum) {
            $invoiceTopTitle.find('#rece-date').text(time2date(invoiceDetail.payts, 1));
            $invoiceTopTitle.find('#rece-number').text(invoiceDetail.rnum);
            $invoiceDetailContainer.find('.invoice-container.pay-receipt').removeClass('hidden');
        }
        else {
            $invoiceDetailContainer.find('.invoice-container.pay-receipt').addClass('hidden');
        }

        unhideSection();

        $invoiceDetailContainer.find('.inv-detail-export').off('click.subuser').on('click.subuser',
            function invoiceDetailExportClickHandler() {
                M.require('business_invoice').done(
                    function exportOverviewPageToPDF() {

                        var myPage = pages['business_invoice'];
                        myPage = translate(myPage);

                        // now prepare the invoice.
                        myPage = myPage.replace('{0Date}', escapeHTML(time2date(invoiceDetail.ts, 1)));
                        myPage = myPage.replace('{1InvoiceTitle}', escapeHTML($invoiceTopTitle.find('.inv-title.invv').text()));
                        myPage = myPage.replace('{1InvoiceNB}', escapeHTML(invoiceDetail.n));
                        myPage = myPage.replace('{2VATNB}', escapeHTML(invoiceDetail.mega.taxnum[1]));
                        myPage = myPage.replace('{2VATTXT}', escapeHTML(invoiceDetail.mega.taxnum[0]));
                        myPage = myPage.replace('{3CompanyName}', escapeHTML(invoiceDetail.u.cname));
                        myPage = myPage.replace('{4CompanyEmail}', escapeHTML(invoiceDetail.u.e));
                        myPage = myPage.replace('{5CompanyAddress}', escapeHTML(validAddressSentFromApi.join(', ')));
                        myPage = myPage.replace('{6CompanyCountry}',
                            escapeHTML(invoiceDetail.u.addr[invoiceDetail.u.addr.length - 1]));
                        var cVat = '---';
                        if (invoiceDetail.u.taxnum && invoiceDetail.u.taxnum[1]) {
                            cVat = invoiceDetail.u.taxnum[0] + ': ' + invoiceDetail.u.taxnum[1];
                        }
                        myPage = myPage.replace('{7CompanyVat}', escapeHTML(cVat));
                        var itemDate = '---';
                        var itemDec = '---';
                        var itemAmount = '---';
                        if (invoiceDetail.items && invoiceDetail.items.length) {
                            itemDate = time2date(invoiceDetail.items[0].ts, 1);
                            itemDec = invoiceDetail.items[0].d;
                            itemAmount = invoiceDetail.items[0].net;
                        }
                        myPage = myPage.replace('{8itemDate}', escapeHTML(itemDate));
                        myPage = myPage.replace('{9itemDesc}', escapeHTML(itemDec));
                        myPage = myPage.replace('{10itemAmount}', Number(itemAmount).toFixed(2));

                        myPage = myPage.replace('{15totalVal}',
                            escapeHTML($invoiceItemsContainer.find('.inv-payment-price.inv-li-gst .inv-gst-perc')[0].textContent));
                        myPage = myPage.replace('{11itemVat}',
                            escapeHTML($invoiceItemsContainer.find('.inv-payment-price.inv-li-gst .inv-gst-val')[0].textContent));
                        myPage = myPage.replace('{12totalCost}', '\u20ac' + Number(invoiceDetail.tot).toFixed(2));

                        var pdfPrintIframe = document.getElementById('invoicePdfPrinter');
                        var newPdfPrintIframe = document.createElement('iframe');
                        newPdfPrintIframe.id = 'invoicePdfPrinter';
                        newPdfPrintIframe.src = 'about:blank';
                        newPdfPrintIframe.classList.add('hidden');
                        var pdfIframeParent = pdfPrintIframe.parentNode;
                        pdfIframeParent.replaceChild(newPdfPrintIframe, pdfPrintIframe);
                        newPdfPrintIframe.onload = function () {
                            setTimeout(function () {
                                newPdfPrintIframe.focus();
                                newPdfPrintIframe.contentWindow.print();
                            }, 1);
                        };
                        var doc = newPdfPrintIframe.contentWindow.document;
                        doc.open();
                        doc.write(myPage);
                        doc.close();
                    }
                );
            }
        );

        $invoiceDetailContainer.jScrollPane({
            enableKeyboardNavigation: false, showArrows: true,
            arrowSize: 8, animateScroll: true
        });
    };

    $accountPageHeader.find('.acc-acc').off('click.suba').on('click.suba',
        function invoiceDetailHeaderClick() {
            var $me = $(this);
            if ($me.hasClass('acc-acc')) {
                return mySelf.viewBusinessAccountPage();
            }
        });
    $accountPageHeader.find('.acc-home').off('click.suba').on('click.suba',
        function invoiceListHeaderClick() {
            var $me = $(this);
            if ($me.hasClass('acc-home')) {
                return mySelf.viewSubAccountListUI();
            }
        });

    var gettingInvoiceDetailPromise = this.business.getInvoiceDetails(invoiceID, false);
    gettingInvoiceDetailPromise.always(fillInvoiceDetailPage);
};


/**
 * Shows the confirmation dialog for sub-user disabling
 * @param {Function} actionFuncHandler      user response handler - function accepts 1 boolean parameter
 * @param {String} userName                 sub-user name
 * @param {Boolean} isEnable                a flag to tell that we want enabling conformation
 */
BusinessAccountUI.prototype.showDisableAccountConfirmDialog = function (actionFuncHandler, userName, isEnable) {
    "use strict";
    var $dialog = $('.user-management-able-user-dialog.sub-en-dis.user-management-dialog');

    var dialogQuestion = l[19098];
    var note = l[19099];
    $dialog.find('.dlg-suba-icon').removeClass('re-enable-large-icon').addClass('disable-large-icon');
    if (isEnable) {
        dialogQuestion = l[19101];
        note = l[19102];
        $dialog.find('.dlg-suba-icon').removeClass('disable-large-icon').addClass('re-enable-large-icon');
        $dialog.find('.dialog-button-container .yes-answer').removeClass('default-red-button-user-management')
            .addClass('default-green-button-user-management');
    }
    else {
        $dialog.find('.dialog-button-container .yes-answer').removeClass('default-green-button-user-management')
            .addClass('default-red-button-user-management');
    }

    dialogQuestion = dialogQuestion.replace('[B]', '<b>').replace('[/B]', '</b>')
        .replace('{0}', escapeHTML(userName));
    $dialog.find('.dialog-text-one').safeHTML(dialogQuestion);
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


/** show Welcome to business account dialog */
BusinessAccountUI.prototype.showWelcomeDialog = function () {
    "use strict";

    if (!u_attr || !u_attr.b || u_attr.b.s === -1 || !u_privk) {
        return;
    }

    var showTheDialog = function (isViewed) {
        if (isViewed === '1') {
            return;
        }
        var $dialog = $('.bus-welcome-dialog.user-management-dialog');

        $dialog.find('.welcome-ok-btn, .close-x-icon').off('click.subuser')
            .on('click.subuser', function closeWelcomeDialogHandler() {
                closeDialog();
            });

        $dialog.find('.welcome-dlg-options .add-subuser, .welcome-dlg-options .go-to-landing').off('click.subuser')
            .on('click.subuser', function welcomeDlgGoToUsersManagement() {
                closeDialog();
                if ($(this).hasClass('add-subuser')) {
                    window.triggerShowAddSubUserDialog = true;
                }
                M.openFolder('user-management', true);
            });

        M.safeShowDialog('welcome-to-business-dlg', function () {
            mega.attr.set('bwelcome', 1, -2, 0);
            return $dialog;
        });
    };

    mega.attr.get(u_handle, 'bwelcome', -2, 0).always(showTheDialog);
};

/**
 * shows the add sub-user dialog, if result is passed, the result dialog will be shown
 * @param {Object} result           an object contain password + sub-user handle
 * @param {Function} callback       a function to call when OK button is pressed on result-view slide
 */
BusinessAccountUI.prototype.showAddSubUserDialog = function (result, callback) {
    "use strict";

    var $dialog = $('.user-management-add-user-dialog.user-management-dialog');
    var mySelf = this;
    var $adduserContianer = $('.dialog-input-container', $dialog);
    var $inputs = $('input', $adduserContianer);

    var clearDialog = function () {
        $inputs.val('').blur();
        $adduserContianer.removeClass('hidden');
        $('.verification-container', $dialog).addClass('hidden');
        $('.dialog-subtitle', $dialog).addClass('hidden');
        $('.dialog-title', $dialog).text(l[19084]).addClass('left-version').removeClass('hidden');
        $('.dialog-button-container .add-more', $dialog).addClass('hidden');
        $('.dialog-button-container .add-sub-user', $dialog).text(l[19084]).removeClass('a-ok-btn');
        $('.mega-logo.icon56.dialog-heading-img', $dialog).addClass('hidden');
        $('.sent-email-logo.dialog-heading-img', $dialog).addClass('hidden');
        $('.dialog-input-title-ontop', $dialog).removeClass('correctinput error');
        $('.dialog-button-container .dialog-feature-toggle', $dialog).removeClass('toggle-on');
        $('.dialog-button-container .dialog-feature-toggle .dialog-feature-switch', $dialog)
            .attr('style', '');
        $('.dialog-button-container .invite-link-option', $dialog).removeClass('hidden');
        $('.dialog-button-container .add-sub-user', $dialog).removeClass('disabled');
        $('.dialog-button-container .add-more', $dialog).removeClass('disabled');
    };

    clearDialog(); // remove any previous data

    var megaInputs = new mega.ui.MegaInputs($inputs);

    // checking if we are coming from landing page
    if (!result && callback) {
        $('.mega-logo.icon56.dialog-heading-img', $dialog).removeClass('hidden');
        $('.dialog-title', $dialog).text(l[19104]).removeClass('left-version');
    }

    // checking if we are passing a valid result object
    if (result && result.u && result.m) {
        var $addContianer = $('.dialog-input-container', $dialog);
        var $resultContianer = $('.verification-container', $dialog);

        var subUserDefaultAvatar = useravatar.contact(result.u);
        $('.new-sub-user', $resultContianer).safeHTML(subUserDefaultAvatar);
        $('.sub-e', $resultContianer).text(result.m);
        if (result.lp) {
            $('.verification-user-pw', $resultContianer).removeClass('hidden');
            if (is_extension || M.execCommandUsable()) {
                $('.copy-pw-btn', $resultContianer).removeClass('hidden');
                $('.copy-pw-btn', $resultContianer).off('click.suba').on('click.suba',
                    function copyPasswordButtonClickHandler() {
                        copyToClipboard(result.lp, l[19602]);
                        $('.dialog-button-container .add-sub-user', $dialog).removeClass('disabled');
                        $('.dialog-button-container .add-more', $dialog).removeClass('disabled');
                    }
                );
            }
            $('.dialog-button-container .add-sub-user', $dialog).addClass('disabled');
            $('.dialog-button-container .add-more', $dialog).addClass('disabled');
            $('.sub-p', $resultContianer).off('copy.suba').on('copy.suba',
                function passwordTextTouchHandler() {
                    $('.dialog-button-container .add-sub-user', $dialog).removeClass('disabled');
                    $('.dialog-button-container .add-more', $dialog).removeClass('disabled');
                }
            );
            $('.sub-p', $resultContianer).text(result.lp);
        }
        else {
            $('.verification-user-pw', $resultContianer).addClass('hidden');
            $('.copy-pw-btn', $resultContianer).addClass('hidden');
        }

        $addContianer.addClass('hidden');
        $resultContianer.removeClass('hidden');
        $('.dialog-button-container .add-sub-user', $dialog).text(l[81]).addClass('a-ok-btn'); // OK
        $('.dialog-subtitle', $dialog).removeClass('hidden');
        $('.dialog-title', $dialog).text(l[20035]).removeClass('left-version');
        $('.sent-email-logo.dialog-heading-img', $dialog).removeClass('hidden');
        $('.dialog-button-container .invite-link-option', $dialog).addClass('hidden');

    }

    // event handler for "X" icon to close the dialog
    $('.delete-img.icon', $dialog).off('click.subuser')
        .on('click.subuser', function exitIconClickHandler() {
            closeDialog();
        });

    // event handler for clicking on "add more"
    $('.dialog-button-container .add-more', $dialog).off('click.subuser')
        .on('click.subuser', function addMoreClickHandler() {
            if ($(this).hasClass('disabled')) {
                return;
            }
            clearDialog();
        });

    // event handler for clicking on show-more button to view optional fields
    $('.dialog-input-container .opti-add-suba', $dialog).off('click.subuser')
        .on('click.subuser', function showMoreMoreClickHandler() {
            var $me = $(this);
            if ($me.hasClass('show')) {
                $('.dialog-input-container .optional-input-container', $dialog).slideDown('slow');
                $me.removeClass('show').addClass('hide');
            }
            else {
                $('.dialog-input-container .optional-input-container', $dialog).slideUp('slow');
                $me.removeClass('hide').addClass('show');
            }
        });


    // event handler for toggle switch of Protect link with Password
    $('.dialog-button-container .dialog-feature-toggle', $dialog).off('click.subuser')
        .on('click.subuser', function protectLinkClickHandler() {
            var $me = $(this);
            if ($me.hasClass('toggle-on')) {
                $me.find('.dialog-feature-switch').animate({ marginRight: '22px' }, 150, 'swing', function () {
                    $me.removeClass('toggle-on').addClass('toggle-off');
                });

            }
            else {
                $me.find('.dialog-feature-switch').animate({ marginRight: '2px' }, 150, 'swing', function () {
                    $me.addClass('toggle-on').removeClass('toggle-off');
                });
            }
        });

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

            var $uName = $('input.sub-n', $dialog);
            var $uLastName = $('input.sub-n-l', $dialog);
            var $uEmail = $('input.sub-m', $dialog);
            var uNameTrimed = $uName.val().trim();
            var uLastNameTrimed = $uLastName.val().trim();
            var uEmailTrimed = $uEmail.val().trim();

            if (!uNameTrimed.length || !uLastNameTrimed) {
                $uName.megaInputsShowError(l[1098] + ' ' + l[1099]);
                $uLastName.megaInputsShowError();

                $uName.rebind('keydown.clearErrorsOnName', function() {
                    $uLastName.megaInputsHideError();
                });

                $uLastName.rebind('keydown.clearErrorsOnName', function() {
                    $uName.megaInputsHideError();
                });
                return;
            }

            if (!isValidEmail(uEmailTrimed)) {
                $uEmail.megaInputsShowError(l[5705]);

                return;
            }

            var $uPosition = $('input.sub-p', $dialog);
            var $uIdNumber = $('input.sub-id-nb', $dialog);
            var $uPhone = $('input.sub-ph', $dialog);
            var $uLocation = $('input.sub-lo', $dialog);

            var addUserOptionals = Object.create(null);
            // check if optional section is visible, then collect fields values
            if ($('.dialog-input-container .opti-add-suba', $dialog).hasClass('hide')) {
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
            }

            loadingDialog.pshow();
            $dialog.addClass('hidden');
            var subName = uNameTrimed;
            var subLastName = uLastNameTrimed;
            var subEmail = uEmailTrimed;
            var isProtectLink = $('.dialog-button-container .dialog-feature-toggle', $dialog).hasClass('toggle-on');

            var subPromise =
                mySelf.business.addSubAccount(subEmail, subName, subLastName, addUserOptionals, isProtectLink);


            var finalizeOperation = function (st,res,req) {
                var $addContianer = $('.dialog-input-container', $dialog);
                var $resultContianer = $('.verification-container', $dialog);

                if (st === 1) {
                    var subUserDefaultAvatar = useravatar.contact(res.u);
                    $('.new-sub-user', $resultContianer).safeHTML(subUserDefaultAvatar);
                    $('.sub-e', $resultContianer).text(req.m);
                    if (res.lp) {
                        $('.verification-user-pw', $resultContianer).removeClass('hidden');
                        if (is_extension || M.execCommandUsable()) {
                            $('.copy-pw-btn', $resultContianer).removeClass('hidden');
                            $('.copy-pw-btn', $resultContianer).off('click.suba').on('click.suba',
                                function copyPasswordButtonClickHandler() {
                                    copyToClipboard(res.lp, l[19602]);
                                    $('.dialog-button-container .add-sub-user', $dialog).removeClass('disabled');
                                    $('.dialog-button-container .add-more', $dialog).removeClass('disabled');
                                }
                            );
                        }
                        $('.dialog-button-container .add-sub-user', $dialog).addClass('disabled');
                        $('.dialog-button-container .add-more', $dialog).addClass('disabled');
                        $('.sub-p', $resultContianer).off('copy.suba').on('copy.suba',
                            function passwordTextTouchHandler() {
                                $('.dialog-button-container .add-sub-user', $dialog).removeClass('disabled');
                                $('.dialog-button-container .add-more', $dialog).removeClass('disabled');
                            }
                        );
                        $('.sub-p', $resultContianer).text(res.lp);
                    }
                    else {
                        $('.verification-user-pw', $resultContianer).addClass('hidden');
                        $('.copy-pw-btn', $resultContianer).addClass('hidden');
                    }

                    $addContianer.addClass('hidden');
                    $resultContianer.removeClass('hidden');
                    $('.dialog-button-container .add-more', $dialog).removeClass('hidden');
                    $('.dialog-button-container .add-sub-user', $dialog).text(l[81]).addClass('a-ok-btn'); // OK
                    $('.licence-bar', $dialog).addClass('hidden');
                    $('.dialog-subtitle', $dialog).removeClass('hidden');
                    $('.dialog-title', $dialog).text(l[20035]).removeClass('left-version');
                    // $('.dialog-title', $dialog).addClass('hidden');
                    $('.mega-logo.icon56.dialog-heading-img', $dialog).addClass('hidden');
                    $('.sent-email-logo.dialog-heading-img', $dialog).removeClass('hidden');
                    $('.dialog-button-container .invite-link-option', $dialog).addClass('hidden');
                }
                else {
                    if (res === -12) {
                        $uEmail.megaInputsShowError(l[1783]);
                    }
                    else {
                        msgDialog('warninga', l[135], l[1679]);
                    }
                }

                loadingDialog.phide();
                $dialog.removeClass('hidden');
            };

            subPromise.always(finalizeOperation);

        });


    M.safeShowDialog('sub-user-adding-dlg', function () {
        return $dialog;
    });
};


BusinessAccountUI.prototype.showResetPasswordSubUserDialog = function(subUserHandle) {
    "use strict";
    if (!subUserHandle) {
        return;
    }
    if (!M.suba[subUserHandle]) {
        return;
    }
    var subUser = M.suba[subUserHandle];
    var mySelf = this;

    var $dialog = $('.user-management-dialog.bus-pw-reset');
    var $generatedPassSection = $('.generated-pass-section', $dialog).addClass('hidden');
    var $generatePassSection = $('.generate-pass-section', $dialog).removeClass('hidden');
    var $confirmBtn = $('.btn.apply-reset', $dialog).addClass('disabled');
    // var $confirmNote = $('.confirm-note', $dialog);
    var $subTitle = $('.pass-reset-sub', $dialog);
    var $generateButton = $('.generate-pass-btn', $dialog);
    var $passVisibility = $('.pass-visibility', $generatedPassSection);
    var $tempPass = $('.temp-pw', $generatedPassSection);
    var $copyPassBtn = $('.copy-pass-reset', $dialog);

    var fName = from8(base64urldecode(subUser.firstname));
    var lName = from8(base64urldecode(subUser.lastname));

    var subTitle = l[22077].replace('[S]', '<span class="green strong">')
        .replace('[S]', '</span>').replace('{0}', escapeHTML(fName) + ' ' + escapeHTML(lName));

    $subTitle.safeHTML(subTitle);

    $('.close-dlg, .cancel-dlg', $dialog).off('click.subuser').on('click.subuser',
        function closeResetSubUserPassword() {
            closeDialog();
        });

    $generateButton.off('click.subuser').on('click.subuser',
        function generatePasswordBtn() {
            $generatePassSection.addClass('hidden');
            $generatedPassSection.removeClass('hidden');

            // 12 character pass
            var randomTick;
            var generatedPass = '';
            for (var k = 0; k < 12; k++) {
                randomTick = Math.floor(Math.random() * 93) + 33;
                generatedPass += String.fromCharCode(randomTick);
            }
            mySelf.lastGeneratedPass = generatedPass;

            if ($passVisibility.hasClass('show-pw')) {
                $tempPass.text('*******');
            }
            else {
                $tempPass.text(generatedPass);
            }

        });

    $passVisibility.off('click.subuser').on('click.subuser',
        function passVisibiltyChange() {
            if ($passVisibility.hasClass('show-pw')) {
                $passVisibility.removeClass('show-pw').addClass('hide-pw');
                $tempPass.text(mySelf.lastGeneratedPass);
            }
            else {
                $passVisibility.addClass('show-pw').removeClass('hide-pw');
                $tempPass.text('*******');
            }
        });

    var copyGeneratedPass = function() {
        copyToClipboard(mySelf.lastGeneratedPass, l[19602]);
        $confirmBtn.removeClass('disabled');
    };

    $copyPassBtn.off('click.subuser').on('click.subuser', copyGeneratedPass);
    $tempPass.off('copy.subuser').on('copy.subuser', copyGeneratedPass);

    var resetPasswordResultHandler = function(c, res, txt) {
        if (c) {

            M.safeShowDialog('pass-reset-success-subuser-dlg', function() {
                var $resetDialog =
                    $('.user-management-able-user-dialog.mig-success.user-management-dialog');
                $('.yes-answer', $resetDialog).off('click.suba').on('click.suba', closeDialog);
                $resetDialog.find('.dialog-text-one')
                    .safeHTML(l[22081].replace('{0}', '<b>' + subUser.e + '</b>'));

                return $resetDialog;
            });
        }
        else {
            if (d) {
                console.error(txt + ' ' + res);
            }
            msgDialog('info', '', l[22082]);
        }

    };

    $confirmBtn.off('click.subuser').on('click.subuser',
        function confirmResetPassBtn() {
            if ($(this).hasClass('disabled')) {
                return;
            }

            closeDialog();

            var resetPassOperation = mySelf.business.resetSubUserPassword(subUserHandle, mySelf.lastGeneratedPass);

            resetPassOperation.always(resetPasswordResultHandler);

        });

    M.safeShowDialog('sub-user-resetPass-dlg', function() {
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

    var nameMegaInput = new mega.ui.MegaInputs($nameInput);
    var lnameMegaInput = new mega.ui.MegaInputs($lnameInput);
    var emailMegaInput = new mega.ui.MegaInputs($emailInput);
    var positionMegaInput = new mega.ui.MegaInputs($positionInput);
    var subIDMegaInput = new mega.ui.MegaInputs($subIDInput);
    var phoneMegaInput = new mega.ui.MegaInputs($phoneInput);
    var locationMegaInput = new mega.ui.MegaInputs($locationInput);

    var clearDialog = function () {
        $nameInput.val('').blur();
        $lnameInput.val('').blur();
        $emailInput.val('').blur();
        $positionInput.val('').blur();
        $subIDInput.val('').blur();
        $phoneInput.val('').blur();
        $locationInput.val('').blur();

        nameMegaInput.hideError();
        lnameMegaInput.hideError();
        emailMegaInput.hideError();
        positionMegaInput.hideError();
        subIDMegaInput.hideError();
        phoneMegaInput.hideError();
        locationMegaInput.hideError();
    };

    clearDialog();

    var subUserDefaultAvatar = useravatar.contact(subUserHandle);

    userAttrs.fname = from8(base64urldecode(subUser.firstname));
    userAttrs.lname = from8(base64urldecode(subUser.lastname));

    $nameInput.val(userAttrs.fname).blur();
    $lnameInput.val(userAttrs.lname).blur();
    $emailInput.val(subUser.e).blur();

    if (subUser.position) {
        userAttrs.position = from8(base64urldecode(subUser.position));
        $positionInput.val(userAttrs.position).blur();
        $positionInput.parent().addClass('correctinput');
    }
    if (subUser.idnum) {
        userAttrs.idnum = from8(base64urldecode(subUser.idnum));
        $subIDInput.val(userAttrs.idnum).blur();
        $subIDInput.parent().addClass('correctinput');
    }
    if (subUser.phonenum) {
        userAttrs.phonenum = from8(base64urldecode(subUser.phonenum));
        $phoneInput.val(userAttrs.phonenum).blur();
        $phoneInput.parent().addClass('correctinput');
    }
    if (subUser.location) {
        userAttrs.location = from8(base64urldecode(subUser.location));
        $locationInput.val(userAttrs.location).blur();
        $locationInput.parent().addClass('correctinput');
    }

    if (subUser.pe && subUser.pe.e) {
        var $pending = $dialog.find('.pending-email-note').addClass('active');
        $pending.find('.pending-email-txt').text(subUser.pe.e);
    }
    else {
        $dialog.find('.pending-email-note').removeClass('active');
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
            if (!subUser.pe || subUser.pe !== email) {
                changes.email = email;
            }
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
                var infoSubMessage = '';
                if (subUser && subUser.s === 11 && req && req.email) {
                    // The admin changed a disabled user's email
                    infoSubMessage = l[24073];
                }
                msgDialog('info', '', l[19525], infoSubMessage);
            }
            else {
                // we received LP + handle --> changes included email change
                // calling show add sub-user dialog with "result" passed will show the result dialog
                res.m = req.email;
                if (subUser && subUser.s === 11) {
                    msgDialog(
                        'info',
                        '',
                        l[24073],
                        '',
                        function() {
                            mySelf.showAddSubUserDialog(res);
                        }
                    );
                }
                else {
                    mySelf.showAddSubUserDialog(res);
                }
            }

        }
    };

    $('.user-management-subuser-avatars', $dialog).safeHTML(subUserDefaultAvatar);

    // event handler for input getting focus
    $('.dialog-input-container input', $dialog).off('focus.suba')
        .on('focus.suba', function inputHasFocusHandler() {
            if ($(this).is($emailInput)) {
                $('.top-login-warning.edit-email-warning', $dialog).addClass('active').removeClass('hidden');
            }
        });

    // event handler for input losing focus
    $('.dialog-input-container input', $dialog).off('blur.suba')
        .on('blur.suba', function inputHasFocusHandler() {
            $dialog.find('.top-login-warning.edit-email-warning').addClass('hidden').removeClass('active');
        });

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
                if ('fname' in changedVals && !changedVals.fname.length) {
                    $nameInput.megaInputsShowError(l[1098] + ' ' + l[1099]);
                    $lnameInput.megaInputsShowError();
                    return;
                }
                if ('lname' in changedVals && !changedVals.lname.length) {
                    $nameInput.megaInputsShowError(l[1098] + ' ' + l[1099]);
                    $lnameInput.megaInputsShowError();
                    return;
                }
                if ('email' in changedVals && !isValidEmail(changedVals.email)) {
                    $emailInput.megaInputsShowError(l[5705]);
                    return;
                }
                var editPromise = mySelf.business.editSubAccount(subUserHandle, changedVals.email,
                    changedVals.fname, changedVals.lname,
                    {
                        position: changedVals.pos,
                        idnum: changedVals.subid,
                        phonenum: changedVals.tel,
                        location: changedVals.loc
                    });

                editPromise.always(handleEditResult);
            }
        });

    $($nameInput).rebind('input.nameErrors', function() {
        $lnameInput.megaInputsHideError();
    });

    $($lnameInput).rebind('input.nameErrors', function() {
        $nameInput.megaInputsHideError();
    });

    M.safeShowDialog('sub-user-editting-dlg', function () {
        return $dialog;
    });
};


/**
 * show the adding result for a list of sub-users
 * @param {Object[]} results        array of sub-user object {email,status,initPass,handle}
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
            $('.new-sub-user.avatar', $currSubUser).safeHTML(subUserDefaultAvatar);
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
 * @param {String} subUserHandle            sub-user's handle
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

    var subUser = M.suba[subUserHandle];
    var $migrateDialog = $('.user-management-migrate-process-dialog.user-management-dialog');
    var subName = from8(base64urldecode(subUser.firstname)) + ' ' + from8(base64urldecode(subUser.lastname));
    $migrateDialog.find('.sub-user-name-from').text(subName);
    $migrateDialog.find('.process-percentage').text('0%');
    $migrateDialog.find('.data-migrate.progress-bar').attr('style', 'width:0');
    $migrateDialog.removeClass('hidden');

    var changePercentage = function (val) {
        $migrateDialog.find('.process-percentage').text(val + '%'); // .attr('style', 'width:' + val + '%').
        $migrateDialog.find('.data-migrate.progress-bar').attr('style', 'width:' + val + '%');
    };

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
        $migrateDialog.addClass('hidden');
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
            changePercentage(10);
            // getting sub-user master-key
            var gettingSubMasterKey = mySelf.business.getSubAccountMKey(subUserHandle);
            changePercentage(15);
            gettingSubMasterKey.fail(
                function getMKeyfailed(mkSt, mkRes, mkM) {
                    if (d) {
                        console.error("getting sub-user Master key has failed! " + mkRes + " --" + mkM);
                    }
                    var failMsg = l[22083].replace('{0}', '<b>' + subUser.e + '</b></br></br>');
                    return failing(failMsg);
                }
            );

            gettingSubMasterKey.done(
                function getMKeyOK(st2, MKeyResult) {
                    changePercentage(20);
                    // sub-user tree decrypting
                    var treeObj = mySelf.business.decrypteSubUserTree(treeResult, MKeyResult.k);
                    changePercentage(30);
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

                            var cpyPromise = mySelf.business.copySubUserTreeToMasterRoot(treeObj.tree,
                                folderName, changePercentage);
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
                                    changePercentage(100);
                                    loadingDialog.phide();
                                    $migrateDialog.addClass('hidden');

                                    M.safeShowDialog('migration-success-dlg', function () {
                                        var $dialog =
                                            $('.user-management-able-user-dialog.mig-success.user-management-dialog');
                                        $('.yes-answer', $dialog).off('click.suba').on('click.suba', closeDialog);
                                        $dialog.find('.dialog-text-one')
                                            .safeHTML(l[19149].replace('{0}', '<b>' + M.suba[subUserHandle].e + '</b>')
                                                .replace('{1}', '<b>' + escapeHTML(folderName) + '</b>'));
                                        return $dialog;
                                    });
                                    return;
                                }
                            );

                        };

                        if (treeObj.errors.length || treeObj.warns.length) {
                            // operation contains errors and/or warning
                            var msgMsg = l[19147].replace(/\[Br\]/g, '<br/>');
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
 * Sorting subusers for viewing
 * @param {Object} subusers     Subusers list
 * @param {Number} field        the field to sort with (0 or null means by name)
 */
BusinessAccountUI.prototype.sortSubusers = function(subusers, field) {
    "use strict";
    if (!field) { // by name
        var tempArray = [];
        for (var sub in subusers) {
            tempArray.push({ key: sub, val: subusers[sub] });
        }
        tempArray.sort(function (a, b) {
            if (a.val.firstname > b.val.firstname) {
                return 1;
            }
            else if (a.val.firstname < b.val.firstname) {
                return -1;
            }
            else {
                if (a.val.lastname > b.val.lastname) {
                    return 1;
                }
                else {
                    return -1;
                }
            }
        });
        var sortedSubList = {};
        for (var k = 0; k < tempArray.length; k++) {
            sortedSubList[tempArray[k].key] = tempArray[k].val;
        }
        return sortedSubList;
    }
};


/**
 * a function will change the url location depending on opened sub-page in business account
 * @param {String} subLocation      the sub-location to be added after fm/user-management/
 */
BusinessAccountUI.prototype.URLchanger = function (subLocation) {
    "use strict";
    var newSubPage = subLocation ? 'fm/user-management/' + subLocation : 'fm/user-management';
    if (page !== newSubPage) {
        pushHistoryState(newSubPage);
        page = newSubPage;
        M.currentdirid = page;
    }
};

/**
 * Event handler for sub-user changes, this handler will be invoked eventually when relate action-packet
 * is received
 * @param {Object} subuser      the sub-user object
 */
BusinessAccountUI.prototype.UIEventsHandler = function (subuser) {
    "use strict";
    if (!subuser) {
        return;
    }

    var $usersLeftPanel = $('.fm-tree-panel .content-panel.user-management');
    var self = this;

    // private function to update left panel
    var updateLeftSubUserPanel = function (subuser) {
        var $userRow = $('#' + subuser.u, $usersLeftPanel);
        if (!$userRow.length) {
            if (!subuser.u || !subuser.firstname || !subuser.lastname) {
                return;
            }
            var $userLaeftPanelItems = $('.nw-user-management-item ', $usersLeftPanel);
            var $userLaeftPanelRow = $($userLaeftPanelItems.get(0)).clone(true);
            $userRow = $userLaeftPanelRow.clone(true);
            $userRow.removeClass('hidden selected');
            $userRow.attr('id', subuser.u);
            if (self && !self.business.hasSubs) {
                $userRow.rebind(
                    'click.subuser',
                    function() {
                        $('.content-panel.user-management .nw-user-management-item').removeClass('selected');
                        $(this).addClass('selected');
                        self.viewSubAccountInfoUI(subuser.u);
                    }
                );
            }

            $usersLeftPanel.append($userRow);
        }

        var uName = from8(base64urldecode(subuser.firstname)) + ' ' +
            from8(base64urldecode(subuser.lastname));
        $userRow.find('.nw-user-management-name').text(uName);

        var leftPanelClass = 'enabled-accounts';
        if (subuser.s === 0) {
            $userRow.find('.user-management-status').removeClass('pending disabled')
                .addClass('enabled');
            // leftPanelClass = 'enabled-accounts';
        }
        else if (subuser.s === 10) {
            $userRow.find('.user-management-status').removeClass('enabled disabled')
                .addClass('pending');
        }
        else {
            $userRow.find('.user-management-status').removeClass('enabled pending')
                .addClass('disabled');
            // $userRow.addClass('hidden');
            leftPanelClass = 'disabled-accounts';
        }
        $('.user-management-tree-panel-header.' + leftPanelClass).trigger('click.subuser');
    };

    if (!$usersLeftPanel.hasClass('hidden') && $usersLeftPanel.hasClass('active')) {
        updateLeftSubUserPanel(subuser);
    }

    if (M.currentdirid && M.currentdirid.indexOf('user-management') === -1) {
        return;
    }

    // if we are in table view
    if (!$('.user-management-list-table').hasClass('hidden')
        || !$('.user-management-landing-page.user-management-view').hasClass('hidden')) {
        // safe to create new object.
        var busUI = new BusinessAccountUI();
        busUI.viewSubAccountListUI();
        // updateLeftSubUserPanel(subuser);
    }
    // if we are in sub-user view
    else if (!$('.files-grid-view.user-management-view .user-management-subaccount-view-container')
        .hasClass('hidden')) {
        var viewedUserId =
            $('.files-grid-view.user-management-view .user-management-subaccount-view-container').attr('id');
        var updatedUser = 'sub-' + subuser.u;
        if (viewedUserId === updatedUser) {
            // safe to create new object.
            var busUI1 = new BusinessAccountUI();
            busUI1.viewSubAccountInfoUI(subuser.u);
            // update the left pane
            // updateLeftSubUserPanel(subuser);
        }
    }
    else if (!$('.files-grid-view.user-management-view .user-management-account-settings')
        .hasClass('hidden')) {
        if (!subuser.u) { // dummy attr
            // safe to create new object.
            var busUI2 = new BusinessAccountUI();
            busUI2.viewBusinessAccountPage();
        }
    }
};
