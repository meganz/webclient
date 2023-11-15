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
                p: u_attr.b ? u_attr.b.bu : u_handle, // Parent account (for Pro Flexi there's only the current acct)
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

    this.loading = (close) => {

        const $loader = $('.js-ba-loader', '.fm-right-header-user-management');

        if (close) {
            $loader.addClass('hidden');
        }
        else {
            $loader.removeClass('hidden');
        }
    };

    // private function to hide all business accounts UI divs.
    this.initUItoRender = function () {

        // dealing with non-confirmed accounts, non Pro Flexi accounts and not paid business ones
        if (
            !u_attr
            || !u_privk
            || (
                !u_attr.pf
                && (
                    !u_attr.b
                    || u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED && M.currentdirid !== 'user-management/account'
                )
            )
        ) {
            loadSubPage('start');
            return false;
        }

        if (!u_attr.pf && String(M.currentdirid).substr(0, 15) !== 'user-management') {
            return false;
        }

        this.loading(1);

        var $businessAccountContianer = $('.files-grid-view.user-management-view');
        $businessAccountContianer.removeClass('main-page');
        $('.user-management-list-table', $businessAccountContianer).addClass('hidden');
        $('.user-management-subaccount-view-container', $businessAccountContianer).addClass('hidden');
        $('.user-management-landing-page.user-management-view', $businessAccountContianer).addClass('hidden');
        var $accountContainer = $('.user-management-account-settings', $businessAccountContianer).addClass('hidden');
        $('.invoice', $accountContainer).addClass('hidden');
        $('.profile', $accountContainer).addClass('hidden');
        $('.invoice .invoice-list', $accountContainer).addClass('hidden');
        $('.invoice .invoice-detail', $accountContainer).addClass('hidden');
        $('.fm-empty-user-management').addClass('hidden');

        // hide any possible grid or block view.
        $('.files-grid-view, .fm-blocks-view').addClass('hidden');
        if (M.megaRender) {
            M.megaRender.cleanupLayout(false, [], '');
        }
        else {
            const emptiedBlock = document.querySelector('.fm-right-files-block.emptied:not(.in-chat)');

            if (emptiedBlock) {
                emptiedBlock.classList.remove('emptied');
            }
        }

        // view left panel tabs headers [enabled and disabled] account
        $('.fm-left-panel .nw-tree-panel-header').addClass('hidden');
        $('.user-management-tree-panel-header.enabled-accounts', '.fm-left-panel').removeClass('hidden');
        $('.user-management-tree-panel-header.disabled-accounts', '.fm-left-panel').removeClass('hidden');
        $('.fm-left-panel').addClass('user-management');

        // headers
        $('.fm-right-header-user-management .user-management-main-page-buttons').removeClass('hidden');
        $('.fm-right-header-user-management .user-management-breadcrumb').addClass('hidden');
        $('.inv-det-arrow, .inv-det-id', '.fm-right-header-user-management .user-management-breadcrumb')
            .addClass('hidden');
        $('.fm-right-header-user-management .user-management-overview-buttons').addClass('hidden');
        $('.user-management-overview-bar').addClass('hidden');

        // header events handlers
        $('.fm-right-header-user-management .user-management-main-page-buttons .add-sub-user').off('click.subuser')
            .on('click.subuser', function addSubUserHeaderButtonHandler() {
                mySelf.showAddSubUserDialog();
            });
        $('.fm-right-header-user-management .user-management-main-page-buttons .ba-account').off('click.subuser')
            .on('click.subuser', function addSubUserHeaderButtonHandler() {
                mySelf.viewBusinessAccountPage();
            });

        // If on Pro Flexi
        if (u_attr && u_attr.pf) {

            // Hide some stuff in the left panel on the Invoices page
            $('.fm-tree-panel .content-panel.user-management').removeClass('active');
            $('.fm-left-panel .user-management-tree-panel-header.enabled-accounts').addClass('hidden');
            $('.fm-left-panel .user-management-tree-panel-header.disabled-accounts').addClass('hidden');

            // Don't show some buttons in the top right panel
            $('.fm-right-header-user-management .user-management-main-page-buttons').addClass('hidden');
        }
        if (u_attr && u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED) {
            $('.user-management-main-page-buttons', '.fm-right-header-user-management').addClass('hidden');
        }

        return true;
    };

    // private function to update the sub user left panel
    this.updateSubUserLeftPanel = function(subUserLeftPanelHeader) {
        var $me = $(subUserLeftPanelHeader);
        var disabledFound = false;
        var $subUserLeftPanel = $('.fm-left-panel');
        var $subUsers = $(
            '.fm-tree-panel .content-panel.user-management .nw-user-management-item[id]',
            $subUserLeftPanel
        );
        var $contentBlock = $('.fm-right-files-block', '.fmholder');
        var $userManagementBlock = $('.files-grid-view.user-management-view', $contentBlock);
        var $emptyBlock = $('.fm-empty-user-management', $contentBlock);

        $('.user-management-tree-panel-header', $subUserLeftPanel).removeClass('active');
        $userManagementBlock.removeClass('hidden');
        $emptyBlock.addClass('hidden');

        $me.addClass('active');

        for (var k = 0; k < $subUsers.length; k++) {
            var $subUser = $($subUsers[k]);
            if ($me.hasClass('enabled-accounts')) {
                if (!$('.user-management-status', $subUser).hasClass('disabled')) {
                    $subUser.removeClass('hidden');
                }
                else {
                    $subUser.addClass('hidden');
                }
            }
            else {
                if ($('.user-management-status', $subUser).hasClass('disabled')) {
                    $subUser.removeClass('hidden');
                    disabledFound = true;
                }
                else {
                    $subUser.addClass('hidden');
                }
            }
        }

        var $subAccountsView = $('.fmholder .fm-right-files-block .files-grid-view.user-management-view');
        var $usersTable = $('.user-management-list-table', $subAccountsView);
        var $subUsersTableRow = $('tr', $usersTable);

        for (var h = 1; h < $subUsersTableRow.length; h++) {
            const $currentRow = $($subUsersTableRow[h]);
            if ($me.hasClass('enabled-accounts')) {
                if (!$('.user-management-status', $currentRow).hasClass('disabled')) {
                    $currentRow.removeClass('hidden');
                    $('.dis-en-icon.enabled-icon', $currentRow).addClass('hidden');
                    $('.dis-en-icon.disabled-icon', $currentRow).removeClass('hidden');
                }
                else {
                    $currentRow.addClass('hidden');
                }
            }
            else {
                if ($('.user-management-status', $currentRow).hasClass('disabled')) {
                    $currentRow.removeClass('hidden');
                    $('.dis-en-icon.enabled-icon', $currentRow).removeClass('hidden');
                    $('.dis-en-icon.disabled-icon', $currentRow).addClass('hidden');
                }
                else {
                    $currentRow.addClass('hidden');
                }
            }
        }
        if (!disabledFound && !$me.hasClass('enabled-accounts') && $usersTable.is(":visible ")) {
            $userManagementBlock.addClass('hidden');
            $emptyBlock.removeClass('hidden');
        }

        initTreeScroll();

        const scrollBlock = $('.user-management-scroll', $subAccountsView);

        if (scrollBlock.is('.ps')) {
            Ps.update(scrollBlock[0]);
        }

        const $listTable = $('.user-management-list-table', $subAccountsView);
        $('tr', $listTable).removeClass('last-row');
        $('tr:visible:last', $listTable).addClass('last-row');
    };
}

/**
 * Function to init custom block scrolling
 * @param {Object} $scrollBlock optional custom block selector.
 */
function initBusinessAccountScroll($scrollBlock) {
    "use strict";

    $scrollBlock = $scrollBlock ? $scrollBlock : $('.scroll-block:visible', '.user-management-view');

    if (!$scrollBlock.length) {
        return false;
    }

    if ($scrollBlock.is('.ps')) {
        Ps.update($scrollBlock[0]);
    }
    else {
        Ps.initialize($scrollBlock[0]);
    }
}

/**
 * Function to format start and end dates
 *
 * @param   {Date}    leadingDate                           The start date of the required month
 * @returns {Object} {{fromDate: string, toDate: string}}   The format of start date and end date in YYYYMMDD
 */
function getReportDates(leadingDate) {
    "use strict";

    const today = leadingDate || new Date();
    const todayMonth = today.getMonth() + 1;
    let currMonth = String(todayMonth);
    if (currMonth.length < 2) {
        currMonth = `0${currMonth}`;
    }
    const currYear = String(today.getFullYear());

    const startDate = `${currYear}${currMonth}01`;

    const endDate = getLastDayofTheMonth(today);
    if (!endDate) {
        return;
    }
    const endDateStr = String(endDate.getFullYear()) + currMonth + String(endDate.getDate());

    return { fromDate: startDate, toDate: endDateStr };
}

BusinessAccountUI.prototype.checkCu25519 = function(userHandle, callback) {
    if (!pubCu25519[userHandle]) {
        if (!authring.getContactAuthenticated(userHandle, 'Cu25519')) {
            const ret = fingerprintDialog(userHandle, null, callback);
            if (ret === -5) {
                // not confimed account
                return true;
            }
        }
        else {
            crypt.getPubCu25519(userHandle).always(() => {
                callback(userHandle);
            });
        }
        return false;
    }
    return true;
};


/**
 * Decodes fields in a user object into the correct values.
 *
 * @param {object} encodedUser the user object from the API
 * @param {array} fields the fields in the object that should be decoded
 * @return {object} the decoded user object containing the specified fields
 */
BusinessAccountUI.prototype.decodeFields = function(encodedUser, fields) {
    'use strict';
    const decodedUser = {};
    const decode = tryCatch((encodedField) => from8(base64urldecode(encodedField)), false);

    for (let i = fields.length; i--;) {
        const field = fields[i];
        decodedUser[field] = String(encodedUser[field] && decode(encodedUser[field]) || encodedUser[field] || '');
    }

    return decodedUser;
};

/**
 * Function to view the right pane of "Users Management" used by master users to manage sub-accounts
 * @param {String[]} subAccounts    optional list of subAccount, Default is M.suba
 * @param {Boolean} isBlockView     by default "Grid" view will be used, this param when True will change to "Block"
 * @param {Boolean} quickWay        by default false, if true method will skip some ui operations
 * @returns {Boolean}               true if OK, false if something went wrong
 */
BusinessAccountUI.prototype.viewSubAccountListUI = function (subAccounts, isBlockView, quickWay) {
    "use strict";

    if (!quickWay) {
        this.URLchanger('');
    }

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

    var $subAccountsView;
    var $contentBlock = $('.fm-right-files-block', '.fmholder');
    var $emptyBlock = $('.fm-empty-user-management', $contentBlock);

    if (!isBlockView) {
        $subAccountsView = $('.files-grid-view.user-management-view', $contentBlock);
    }
    else {
        $subAccountsView = $('.fm-blocks-view.user-management-view', $contentBlock);
    }
    $contentBlock.removeClass('hidden');
    $subAccountsView.removeClass('hidden').addClass('main-page');
    $emptyBlock.addClass('hidden');

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

    // Populate the correct number of each type of users into the user analysis table
    const populateUserAnalysisUI = function() {
        let numberOfSubs = 0;
        let activeSubs = 0;
        let pendingSubs = 0;
        let disabledSubs = 0;

        for (const sub in currSubAccounts) {
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
        }

        $('.user-segments-container.all-subs .user-segment-number', $subAccountsView).text(numberOfSubs);
        $('.user-segments-container.active-subs .user-segment-number', $subAccountsView).text(activeSubs);
        $('.user-segments-container.pending-subs .user-segment-number', $subAccountsView).text(pendingSubs);
        $('.user-segments-container.disabled-subs .user-segment-number', $subAccountsView).text(disabledSubs);
    };

    var unhideUsersListSection = function () {
        const $listTable = $('.user-management-list-table', $subAccountsView);
        var $detailListTable = $('.grid-table-user-management', $listTable);
        var $contentBlock = $('.fm-right-files-block', '.fmholder');
        var $userManagementBlock = $('.files-grid-view.user-management-view', $contentBlock);

        $listTable.removeClass('hidden'); // unhide the list table
        $('.user-management-main-page-buttons', '.fm-right-header-user-management')
            .removeClass('hidden'); // unhide head
        $('.nw-user-management-item', '.content-panel.user-management').removeClass('selected');

        if ($('tr:not(.hidden)', $detailListTable).length) {
            $subAccountsView.removeClass('hidden'); // un-hide the container
            $('tr:visible:last', $listTable).addClass('last-row');
            initBusinessAccountScroll($('.user-management-scroll', $listTable));
        }
        else {
            $subAccountsView.addClass('hidden');
            $userManagementBlock.addClass('hidden');
            $emptyBlock.removeClass('hidden');
        }

        loadingDialog.phide();

        if (window.triggerShowAddSubUserDialog) {
            delete window.triggerShowAddSubUserDialog;
            mySelf.showAddSubUserDialog();
        }
    };

    // private function to fill HTML table for sub users
    var fillSubUsersTable = function (subUsers, uiBusiness) {
        var $usersTable = $('.user-management-list-table', $subAccountsView).removeClass('hidden');
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
        for (var h in subUsers) {
            var $currUser = $tr_user.clone(true); // sub-users table
            var $currUserLeftPane = $userLaeftPanelRow.clone(true); // left pane list
            $currUserLeftPane.removeClass('hidden');

            $currUser.attr('id', subUsers[h].u);
            $currUserLeftPane.attr('id', subUsers[h].u);
            // now we will hide icon and role, since we are not ready to support yet.
            // $currUser.find('.fm-user-management-user .admin-icon .tooltip').text('Sub-Account');
            if (!subUsers[h].isAdmin) {
                $currUser.find('.fm-user-management-user .admin-icon').addClass('hidden');
                $currUser.find('.edit-icon, .disabled-icon').removeClass('disabled');
            }
            else {
                $currUser.find('.fm-user-management-user .admin-icon').removeClass('hidden');
                $('.edit-icon', $currUser).removeClass('disabled');
                $('.disabled-icon', $currUser).addClass('disabled');
            }

            $currUserLeftPane.removeClass('selected');
            const decodedUser = mySelf.decodeFields(subUsers[h], ['firstname', 'lastname']);
            const uName = `${decodedUser.firstname} ${decodedUser.lastname}`.trim();

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

            $detailListTable.append($currUser);

            if (u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED) {
                $currUserLeftPane.addClass('disabled');
            }
            // left pane part
            $usersLeftPanel.append($currUserLeftPane);
        }

        initBusinessAccountScroll($('.user-management-scroll', $usersTable));
        loadingDialog.phide();

        // 2- left pane headers (enabled,disabled) sub-users
        $('.user-management-tree-panel-header', '.fm-left-panel.user-management').rebind('click.subuser', function() {
            mySelf.updateSubUserLeftPanel(this);
        });

        // 3- on clicking on a sub-user to view his info (from left pane or row)
        $('.grid-table-user-management .view-icon, .content-panel.user-management .nw-user-management-item,' +
            '.grid-table-user-management tbody tr')
            .rebind('click.subuser', function subUserViewInfoClickHandler() {

                if ($(this).hasClass('disabled')) {
                    return;
                }

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
        $('.grid-table-user-management .edit-icon').rebind('click.subuser',
            function editSubUserClickHandler() {
                if ($(this).hasClass('disabled')) {
                    return false;
                }
                var userHandle = $(this).closest('tr').attr('id');
                mySelf.showEditSubUserDialog(userHandle);
                return false;
            });

        // 5- on clicking on a sub-user row to enable/disable
        $('.grid-table-user-management .dis-en-icon').rebind(
            'click.subuser',
            function disableEnableSubUserClickHandler() {
                const $this = $(this);

                if ($this.hasClass('disabled')) {
                    return false;
                }
                const userHandle = $this.closest('tr').attr('id');
                if (!M.suba[userHandle]) {
                    return;
                }

                if (!mySelf.checkCu25519(userHandle, mySelf.viewSubAccountInfoUI.bind(mySelf))) {
                    return false;
                }

                $this.addClass('disabled');

                var isDisable = false;
                if (M.suba[userHandle].s === 10 || M.suba[userHandle].s === 0) {
                    isDisable = true;
                }

                const decodedUser = mySelf.decodeFields(M.suba[userHandle], ['firstname', 'lastname']);
                const uName = `${decodedUser.firstname} ${decodedUser.lastname}`.trim();

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
                        $this.removeClass('disabled');
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
                        $this.removeClass('disabled');
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

        var totalStorage = 0;
        var totalBandwidth = 0;

        var $usersTable = $('.user-management-list-table', $subAccountsView);

        var todayData = quotas[Object.keys(quotas)[0]];
        if (!todayData) {
            return;
        }

        var subUsersData = todayData.u;
        if (!subUsersData) {
            return;
        }

        for (var sub in subUsersData) {
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
                    activeDate = time2date(activeDate.getTime() / 1000, 1);
                }
                $('.business-sub-last-active span', $subTr).text(activeDate);
            }
        }
        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);

        $('.info-block.storage-sub-users .number', '.user-management-overview-bar').text(totalStorageFormatted.size);
        $('.info-block.storage-sub-users .title2', '.user-management-overview-bar').text(totalStorageFormatted.unit);

        $('.info-block.bandwidth-sub-users .number', '.user-management-overview-bar')
            .text(totalBandwidthFormatted.size);
        $('.info-block.bandwidth-sub-users .title2', '.user-management-overview-bar')
            .text(totalBandwidthFormatted.unit);

        $('.user-management-overview-bar').removeClass('hidden');

        loadingDialog.phide();
    };

    var reDraw = this.isRedrawNeeded(currSubAccounts, this.business.previousSubList);
    if (reDraw) {
        populateUserAnalysisUI();
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

    // In MEGA Lite, on login and visiting the User Management page, the cloud drive is still showing, so hide it.
    // NB: Not using the hidden class, because something else is continually re-rendering and removing it.
    if (mega.lite.inLiteMode) {
        $('.files-grid-view.fm').addClass('mega-lite-hidden');
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
        return l.sub_user_disabled; // disabled
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

    var $dialog = $('.mega-dialog.sub-account-link-password');
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
                    msgDialog('warningb', '', msg, '', () => {
                        loadSubPage('start');
                    });
                };

                var decryptedTokenBase64 = business.decryptSubAccountInvitationLink(invitationLink, enteredPassword);
                if (decryptedTokenBase64) {
                    var getInfoPromise = business.getSignupCodeInfo(decryptedTokenBase64);

                    getInfoPromise.fail(failureAction);

                    getInfoPromise.done(function signupCodeGettingSuccessHandler(status, res) {
                        if (d) {
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

    if (u_type) {
        const msgTxt = l[18795];
        // 'You are currently logged in. ' +
        //  'Would you like to log out and proceed with business account registration ? ';
        // closeDialog();
        msgDialog('confirmation', l[968], msgTxt, '', (e) => {
            if (e) {
                mLogout();
            }
            else {
                loadSubPage('');
            }
        });
    }
    else {
        M.safeShowDialog('invite-link-pwd', prepareSubAccountLinkDialog);
    }

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
        if (d) {
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
    $('.adding-subuser', $landingContainer)
        .rebind('click.subuser', function addSubUserClickHandler() {
            mySelf.showAddSubUserDialog(null, function() {});
        });

    // handler account setting page
    $('.suba-account-setting', $landingContainer)
        .rebind('click.subuser', function accountSettingClickHandler() {
            mySelf.viewBusinessAccountPage();
        });

    $('.fm-right-header-user-management .user-management-main-page-buttons').addClass('hidden');
    $businessAccountContainer.removeClass('hidden'); // BA container
    $landingContainer.removeClass('hidden');
    initBusinessAccountScroll($landingContainer);

    // check if we are required to show add sub-user dialog.
    if (window.triggerShowAddSubUserDialog) {
        delete window.triggerShowAddSubUserDialog;
        $('.landing-sub-container .adding-subuser', $landingContainer).click();
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

    const mySelf = this;

    if (!mySelf.checkCu25519(subUserHandle, mySelf.viewSubAccountInfoUI.bind(mySelf))) {
        return false;
    }

    var $businessAccountContainer = $('.files-grid-view.user-management-view');
    var $subAccountContainer = $('.user-management-subaccount-view-container', $businessAccountContainer);
    var $subHeader = $('.fm-right-header-user-management .user-management-breadcrumb.subaccount');

    var subUser = M.suba[subUserHandle];

    if (!subUser) {
        console.error('at view sub-user info, with a handle we cant find!');
        return;
    }
    this.URLchanger(subUser.u);

    const decodedUser = mySelf.decodeFields(
        subUser,
        ['firstname', 'lastname', 'idnum', 'position', 'phonenum', 'location']
    );
    const uName = `${decodedUser.firstname} ${decodedUser.lastname}`.trim();

    $('.subuser-name', $subAccountContainer).text(uName);
    $('.user-management-subuser-name', $subHeader).text(uName);
    $('.subuser-email', $subAccountContainer).text(subUser.e);

    var sUserId = decodedUser.idnum ? decodedUser.idnum : '';
    var sUserPos = decodedUser.position ? decodedUser.position : '';
    var sUserTel = decodedUser.phonenum ? decodedUser.phonenum : '';
    var sUserLoc = decodedUser.location ? decodedUser.location : '';
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
        $('.profile-button-container .migrate-data,'
            + '.profile-button-container .resend-verification, .profile-button-container .disable-account,' +
            '.profile-button-container .reset-sub-user-password', $subAccountContainer).addClass('disabled');
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
    $('.profile-button-container .disable-account span', $subAccountContainer).text(l[19092]);
    $('.profile-button-container .disable-account', $subAccountContainer).removeClass('positive').addClass('negative')
        .addClass('sub-disable').removeClass('sub-enable');
    $('.profile-button-container .edit-profile span', $subAccountContainer).text(l[16735]);
    $subAccountContainer.find('.profile-button-container .resend-verification').addClass('hidden');
    $subAccountContainer.find('.profile-button-container .migrate-data').addClass('hidden');
    $subAccountContainer.find('.profile-button-container .reset-sub-user-password').addClass('hidden');
    if (subUser.s === 0) {
        $subAccountContainer.find('div.user-management-view-status').addClass('enabled');
        $subAccountContainer.find('.profile-button-container .reset-sub-user-password').removeClass('hidden');
    }
    else if (subUser.s === 10) {
        $subAccountContainer.find('div.user-management-view-status').addClass('pending');
        $('.profile-button-container .resend-verification span', $subAccountContainer).text(l[19097]);
        $('.profile-button-container .resend-verification', $subAccountContainer).removeClass('hidden');
    }
    else {
        $subAccountContainer.find('div.user-management-view-status').addClass('disabled');

        $('.profile-button-container .disable-account span', $subAccountContainer).text(l[19094]);
        $('.profile-button-container .disable-account', $subAccountContainer)
            .removeClass('negative')
            .addClass('positive')
            .addClass('sub-enable')
            .removeClass('sub-disable');
    }
    $subAccountContainer.find('.user-management-view-status.text').text(this.subUserStatus(subUser.s));

    var subUserDefaultAvatar = useravatar.contact(subUserHandle);
    $('.subaccount-img-big', $subAccountContainer).safeHTML(subUserDefaultAvatar);

    // event handler for clicking on the header
    $('.user-management-title', $subHeader)
        .rebind('click.subuser', function navigationHeaderClickHandler() {
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
            var $migrateDialog = $('.user-management-migrate-process-dialog.user-management-dialog');

            mySelf.migrateSubUserData(subUserHandle)
                .then((n) => {
                    M.safeShowDialog('migration-success-dlg', () => {
                        const $dialog = $('.user-management-able-user-dialog.mig-success.user-management-dialog');

                        $('.yes-answer', $dialog).rebind('click.suba', closeDialog);
                        $('.dialog-text-one', $dialog)
                            .safeHTML(l[19149].replace('{0}', `<b>${M.suba[subUserHandle].e}</b>`)
                                .replace('{1}', `<b>${escapeHTML(n.name)}</b>`));

                        return $dialog;
                    });
                })
                .catch((ex) => {
                    if (ex && ex.name === 'AbortError') {
                        return msgDialog('warningb', '', `${ex.message}`);
                    }
                    console.error(ex);
                    msgDialog('warningb', l[135], l[19146], api.strerror(ex));
                })
                .finally(() => {
                    $migrateDialog.addClass('hidden');
                });
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
        const backupsInfo = subUserStats["3"] || emptyArray;
        const publicFolderInfo = subUserStats.ps || emptyArray;
        const publicFileInfo = subUserStats.pf || emptyArray;

        totalStorage = subUserStats["ts"] || 0;
        totalBandwidth = subUserStats["dl"] || 0;

        if (subUser.s === 11 && totalStorage > 0) {
            $('.profile-button-container .migrate-data', $subAccountContainer)
                .safeHTML('<span>@@</span>', l[19095])
                .removeClass('hidden');
        }

        var totalStorageFormatted = numOfBytes(totalStorage, 2);
        var totalBandwidthFormatted = numOfBytes(totalBandwidth, 2);
        var rootTotalFormatted = numOfBytes(rootInfo[0], 2);
        var rubbishTotalFormatted = numOfBytes(rubbishInfo[0], 2);
        var inshareInternalTotalFormatted = numOfBytes(inshareInternalInfo[0], 2);
        var inshareExternalTotalFormatted = numOfBytes(inshareExternalInfo[0], 2);
        var outshareTotalFormatted = numOfBytes(outshareInfo[0] - (outshareInfo[3] || 0), 2);
        var outshareTotalInternalFormatted = numOfBytes(outshareInternalInfo[0], 2);
        const backupsTotalFormatted = numOfBytes(backupsInfo[0], 2);
        const linksTotalFormatted = numOfBytes(publicFolderInfo[0] + publicFileInfo[0], 2);

        var versionsTotalFormatted = numOfBytes(rootInfo[3] + rubbishInfo[3]
            + inshareInternalInfo[3] + inshareExternalInfo[3] + backupsInfo[3], 2);

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
        var $backupsSection = $('.user-management-view-data .subaccount-view-used-data' +
            ' .used-storage-info.ba-backups', $subAccountContainer);
        var $rubbishSection = $('.user-management-view-data .subaccount-view-used-data' +
            ' .used-storage-info.ba-rubbish', $subAccountContainer);
        const $linksSection = $(
            '.user-management-view-data .subaccount-view-used-data .used-storage-info.ba-pub-links',
            $subAccountContainer
        );
        var $versionsSection = $('.user-management-view-data .subaccount-view-used-data' +
            ' .used-storage-info.ba-version', $subAccountContainer);

        var ffNumText = function(value, type) {
            var counter = value || 0;
            return mega.icu.format(type === 'file' ? l.file_count : l.folder_count, counter);
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
        var outShareExFileNumText = ffNumText(outshareInfo[1] - (outshareInfo[4] || 0), 'file');
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

        // TODO: Change "Inbox" to "My Backups" folder data once we get if from API
        const backupsFolderNumText = ffNumText(backupsInfo[2] - 1 > 0 ? backupsInfo[2] - 1 : 0, 'folder');
        const backupsFileNumText = ffNumText(backupsInfo[1], 'file');
        $('.ff-occupy', $backupsSection).text(backupsTotalFormatted.size + ' ' +
            backupsTotalFormatted.unit);
        $('.folder-number', $backupsSection).text(backupsFolderNumText);
        $('.file-number', $backupsSection).text(backupsFileNumText);

        var rubbishFolderNumText = ffNumText(rubbishInfo[2], 'folder');
        var rubbishFileNumText = ffNumText(rubbishInfo[1], 'file');
        $('.ff-occupy', $rubbishSection).text(rubbishTotalFormatted.size + ' ' + rubbishTotalFormatted.unit);
        $('.folder-number', $rubbishSection).text(rubbishFolderNumText);
        $('.file-number', $rubbishSection).text(rubbishFileNumText);

        const linksFolderNumText = ffNumText(publicFolderInfo[2], 'folder');
        const linksFileNumText = ffNumText(publicFileInfo[1], 'file');
        $('.ff-occupy', $linksSection).text(`${linksTotalFormatted.size} ${linksTotalFormatted.unit}`);
        $('.folder-number', $linksSection).text(linksFolderNumText);
        $('.file-number', $linksSection).text(linksFileNumText);

        var versionsFileNumText = ffNumText(rootInfo[4] + rubbishInfo[4]
            + inshareInternalInfo[4] + inshareExternalInfo[4], 'file');
        $('.ff-occupy', $versionsSection).text(versionsTotalFormatted.size + ' ' + versionsTotalFormatted.unit);
        $('.file-number', $versionsSection).text(versionsFileNumText);
    };

    // getting quotas
    var quotasPromise = this.business.getQuotaUsage();
    quotasPromise.done(fillQuotaInfo);


    $businessAccountContainer.removeClass('hidden'); // BA container
    $subAccountContainer.removeClass('hidden').attr('id', 'sub-' + subUserHandle); // sub-info container
    $subHeader.removeClass('hidden');

    initBusinessAccountScroll($subAccountContainer);
};

/**
 * Show the storage and transfer analytic graphs on the admin user's dashboard page
 */
BusinessAccountUI.prototype.viewAdminDashboardAnalysisUI = function() {
    "use strict";

    const mySelf = this;
    const $businessDashboard = $('.fm-right-block.dashboard .business-dashboard');
    const $nbPriceContainer = $('.overall-next-bill-wrapper', $businessDashboard);
    const $storageAnalysisPie = $('.storage-analysis-pie-container', $businessDashboard);
    const $stgeTrfAnalysisContainer = $('.data-analysis-container', $businessDashboard);
    const $stgeAnalysisContainer = $('.storage-analysis-container', $stgeTrfAnalysisContainer);
    const $trfAnalysisContainer = $('.transfer-analysis-container', $stgeTrfAnalysisContainer);

    // Private function to populate the pie chart and data into the storage usage dashboard
    const populateStoragePieAndData = function(st, quotas) {
        if (!quotas) {
            return;
        }

        const todayStats = quotas[Object.keys(quotas)[0]];
        let totalStorage = todayStats.ts || 0;
        let inshareTotal = 0;
        let rootTotal = 0;
        let rubbishTotal = 0;
        let outshareTotal = 0;
        let backupsTotal = 0;

        const emptyArray = [0, 0, 0, 0, 0];
        let currRoot;
        let currInhare;
        let currInhareEx;
        let currRubbish;
        let currBackups;

        for (const sub in todayStats.u) {
            currRoot = todayStats.u[sub]["2"] || emptyArray;
            currInhare = todayStats.u[sub]["isi"] || emptyArray;
            currInhareEx = todayStats.u[sub]["ise"] || emptyArray;
            currRubbish = todayStats.u[sub]["4"] || emptyArray;
            currBackups = todayStats.u[sub]["3"] || emptyArray;

            rootTotal += currRoot[0];
            rubbishTotal += currRubbish[0];
            outshareTotal += currInhareEx[0];
            inshareTotal += currInhare[0];
            backupsTotal += currBackups[0];
        }

        totalStorage = rootTotal + rubbishTotal + outshareTotal + inshareTotal + backupsTotal;

        const totalStorageFormatted = numOfBytes(totalStorage, 2);
        const rootTotalFormatted = numOfBytes(rootTotal, 2);
        const rubbishTotalFormatted = numOfBytes(rubbishTotal, 2);
        const inshareTotalFormatted = numOfBytes(inshareTotal, 2);
        const outshareTotalFormatted = numOfBytes(outshareTotal, 2);
        const backupsTotalFormatted = numOfBytes(backupsTotal, 2);

        // Includes checks for 0/0 causing NaN displayed (specifically on Business/Pro Flexi accounts with no data)
        let rootPercentage = rootTotal / totalStorage;
        rootPercentage = Number.isNaN(rootPercentage) ? 0 : rootPercentage;
        rootPercentage = Math.round(Number.parseFloat(rootPercentage * 100).toFixed(2));

        let insharePercentage = inshareTotal / totalStorage;
        insharePercentage = Number.isNaN(insharePercentage) ? 0 : insharePercentage;
        insharePercentage = Math.round(Number.parseFloat(insharePercentage * 100).toFixed(2));

        let rubbishPercentage = rubbishTotal / totalStorage;
        rubbishPercentage = Number.isNaN(rubbishPercentage) ? 0 : rubbishPercentage;
        rubbishPercentage = Math.round(Number.parseFloat(rubbishPercentage * 100).toFixed(2));

        let outsharePercentage = outshareTotal / totalStorage;
        outsharePercentage = Number.isNaN(outsharePercentage) ? 0 : outsharePercentage;
        outsharePercentage = Math.round(Number.parseFloat(outsharePercentage * 100).toFixed(2));

        let backupsPercentage = backupsTotal / totalStorage;
        backupsPercentage = Number.isNaN(backupsPercentage) ? 0 : backupsPercentage;
        backupsPercentage = Math.round(Number.parseFloat(backupsPercentage * 100).toFixed(2));

        const digitClassMap = ["one-digit", "two-digits", "three-digits"];
        const cloudNodeDigitClass = digitClassMap[String(rootPercentage).length - 1];
        const inshareNodeDigitClass = digitClassMap[String(insharePercentage).length - 1];
        const rubbishNodeDigitClass = digitClassMap[String(rubbishPercentage).length - 1];
        const outshareNodeDigitClass = digitClassMap[String(outsharePercentage).length - 1];
        const backupsNodeDigitClass = digitClassMap[String(backupsPercentage).length - 1];

        $('.storage-summary .total-storage-number', $storageAnalysisPie)
            .text(totalStorageFormatted.size + ' ' + totalStorageFormatted.unit);

        $('.storage-division-container.cloud-node .storage-division-num', $storageAnalysisPie)
            .text(rootTotalFormatted.size + ' ' + rootTotalFormatted.unit);
        $('.storage-division-container.cloud-node .storage-division-per', $storageAnalysisPie)
            .text(`${rootPercentage}%`).addClass(cloudNodeDigitClass);
        $('.storage-division-container.inbox-node .storage-division-num', $storageAnalysisPie)
            .text(outshareTotalFormatted.size + ' ' + outshareTotalFormatted.unit);
        $('.storage-division-container.inbox-node .storage-division-per', $storageAnalysisPie)
            .text(`${outsharePercentage}%`).addClass(outshareNodeDigitClass);
        $('.storage-division-container.inshare-node .storage-division-num', $storageAnalysisPie)
            .text(inshareTotalFormatted.size + ' ' + inshareTotalFormatted.unit);
        $('.storage-division-container.inshare-node .storage-division-per', $storageAnalysisPie)
            .text(`${insharePercentage}%`).addClass(inshareNodeDigitClass);
        $('.storage-division-container.backups-node .storage-division-num', $storageAnalysisPie)
            .text(backupsTotalFormatted.size + ' ' + backupsTotalFormatted.unit);
        $('.storage-division-container.backups-node .storage-division-per', $storageAnalysisPie)
            .text(`${backupsPercentage}%`).addClass(backupsNodeDigitClass);
        $('.storage-division-container.rubbish-node .storage-division-num', $storageAnalysisPie)
            .text(rubbishTotalFormatted.size + ' ' + rubbishTotalFormatted.unit);
        $('.storage-division-container.rubbish-node .storage-division-per', $storageAnalysisPie)
            .text(`${rubbishPercentage}%`).addClass(rubbishNodeDigitClass);

        // If Pro Flexi, hide inshare nodes and only keep external incoming shares
        if (u_attr.pf) {
            $('.storage-division-container.inshare-node', $storageAnalysisPie).addClass('hidden');
        }

        // Show the storage pie chart and data analysis panel
        $storageAnalysisPie.removeClass('hidden');

        // Draw the storage pie chart analytics graph
        const $chartContainer = $('#pie-chart-content', $storageAnalysisPie);
        $chartContainer.empty();
        $chartContainer.safeHTML('<canvas id="usage-pie-chart"></canvas>');
        const $pieChart = $('#usage-pie-chart', $chartContainer);

        M.require('charts_js').done(function usagePieChartDataPopulate() {
            const tooltipLabeling = function(tooltipItem, data) {
                let label = data.labels[tooltipItem.index] || '';
                const perc = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

                if (label) {
                    label += ': ';
                }
                const sizeInfo = numOfBytes(perc);
                label += sizeInfo.size + ' ' + sizeInfo.unit;
                return label;
            };

            const style = getComputedStyle(document.body);
            const colors = [
                style.getPropertyValue('--label-red').trim(),
                style.getPropertyValue('--label-orange').trim(),
                style.getPropertyValue('--label-purple').trim(),
                style.getPropertyValue('--label-green').trim(),
                style.getPropertyValue('--label-grey').trim()
            ];
            const hoverColors = [
                style.getPropertyValue('--label-red-hover').trim(),
                style.getPropertyValue('--label-orange-hover').trim(),
                style.getPropertyValue('--label-purple-hover').trim(),
                style.getPropertyValue('--label-green-hover').trim(),
                style.getPropertyValue('--label-grey-hover').trim()
            ];
            const usagePieChart = new Chart($pieChart, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [rootTotal, outshareTotal, inshareTotal, backupsTotal, rubbishTotal],
                        backgroundColor: colors,
                        hoverBackgroundColor: hoverColors,
                        hoverBorderColor: 'rgb(0, 0, 0, 0.2)',
                        hoverBorderWidth: 2
                    }],
                    // These labels appear in the legend and in the tooltips when hovering different arcs
                    labels: [
                        l[164],
                        l[19187],
                        l[16770],
                        l.restricted_folder_button,
                        l[167]
                    ]
                },
                options: {
                    maintainAspectRatio: false,
                    legend: {
                        display: false
                    },
                    tooltips: {
                        callbacks: {
                            label: tooltipLabeling
                        }
                    },
                    cutoutPercentage: 75,
                    elements: {
                        arc: {
                            borderWidth: 0
                        }
                    }
                }
            });

            const $customChartLegend = $('.storage-pie-data-container .storage-division-container', $storageAnalysisPie)
                .rebind('click.subuser', function chartLegendClickHandler(e) {
                    const $me = $(this);
                    let ix = 0;
                    if ($me.hasClass('inbox-node')) {
                        ix = 1;
                    }
                    else if ($me.hasClass('inshare-node')) {
                        ix = 2;
                    }
                    else if ($me.hasClass('backups-node')) {
                        ix = 3;
                    }
                    else if ($me.hasClass('rubbish-node')) {
                        ix = 4;
                    }

                    if ($me.hasClass('disabled')) {
                        $me.removeClass('disabled');
                    }
                    else {
                        $me.addClass('disabled');
                    }

                    const item = usagePieChart.legend.legendItems[ix];
                    usagePieChart.legend.options.onClick.call(usagePieChart.legend, e, item);
                });
            $customChartLegend.removeClass('disabled');
        });

        // If Pro Flexi expired we want to hide the Storage Usage Breakdown and storage/transfer pie charts
        if (u_attr.pf && u_attr.pf.s === pro.ACCOUNT_STATUS_EXPIRED) {
            $storageAnalysisPie.addClass('hidden');
            $stgeTrfAnalysisContainer.addClass('hidden');
        }
    };

    // Private function to determine the scale unit of the bar chart
    const setBarChartScaleUnit = function(res, isTransferData) {
        const propertyName = isTransferData ? 'tdl' : 'ts';
        let dataDivider = 1;

        // Determine the scale
        const scaleKB = 1024;
        const scaleMB = 1024 * scaleKB;
        const scaleGB = 1024 * scaleMB;
        const scaleTB = 1024 * scaleGB;
        let is_KB = false;
        let is_MB = false;
        let is_GB = false;
        let is_TB = false;

        for (const dailyData in res) {
            const consume = res[dailyData][propertyName] || 0;
            if (consume > scaleTB) {
                is_TB = true;
                break;
            }
            else if (consume > scaleGB) {
                is_GB = true;
            }
            else if (consume > scaleMB) {
                is_MB = true;
            }
            else if (consume > scaleKB) {
                is_KB = true;
            }
        }
        const $barChartUnit = isTransferData ? $('#trf-bar-chart-unit', $stgeTrfAnalysisContainer)
            : $('#stge-bar-chart-unit', $stgeTrfAnalysisContainer);
        if (is_TB) {
            dataDivider = scaleTB;
            $barChartUnit.text(l.data_size_unit_tb);
        }
        else if (is_GB) {
            dataDivider = scaleGB;
            $barChartUnit.text(l[20031]);
        }
        else if (is_MB) {
            dataDivider = scaleMB;
            $barChartUnit.text(l[20032]);
        }
        else if (is_KB) {
            dataDivider = scaleKB;
            $barChartUnit.text(l[20033]);
        }
        else {
            dataDivider = 1;
            $barChartUnit.text(l[20034]);
        }

        return dataDivider;
    };

    // Private function to populate the transfer and storage analytics bar chart and data
    const populateBarChart = function(success, res, isTrfGraph, targetDate) {
        M.require('charts_js').done(() => {
            const chartContainerID = isTrfGraph ? '#trf-bar-chart-container' : '#stge-bar-chart-container';
            const $chartContainer = $(chartContainerID, $stgeTrfAnalysisContainer);

            $chartContainer.empty();
            $chartContainer.safeHTML(
                isTrfGraph ?
                    '<canvas id="trf-bar-chart" class="daily-transfer-flow-container"></canvas>' :
                    '<canvas id="stge-bar-chart" class="daily-storage-flow-container"></canvas>'
            );

            const $chartCanvas = $(isTrfGraph ? '#trf-bar-chart' : '#stge-bar-chart', $chartContainer);
            const style = getComputedStyle(document.body);

            var availableLabels = Object.keys(res);
            availableLabels.sort();

            if (!isTrfGraph) {
                const lastDay = availableLabels[availableLabels.length - 1];
                if (res[lastDay] && res[lastDay].dts !== undefined) {
                    // Use the daily storage value instead of the current storage value for today
                    res[lastDay].ts = res[lastDay].dts;
                }
            }

            // Build bars data and total storage data
            var chartBaseData = [];
            var chartExtraData = [];
            var chartDatasets = [];
            var chartLabels = [];
            var chartTooltips = {};
            const divider = setBarChartScaleUnit(res, isTrfGraph);
            const isTBGraph = divider === 1024 * 1024 * 1024 * 1024;

            const tooltipBarLabeling = function(tooltipItem, data) {
                const storageValue = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                const storageInfo = numOfBytes(storageValue * divider);
                const dataLabel = data.datasets[tooltipItem.datasetIndex].label;
                let labellingMsg = `${storageInfo.size} ${storageInfo.unit}`;

                if (dataLabel !== '') {
                    labellingMsg = dataLabel === 'base' ? l.base_quota_v : l.extra_quota;
                    labellingMsg = labellingMsg.replace('[X]', `${storageInfo.size} ${storageInfo.unit}`);
                }

                return labellingMsg;
            };

            const tooltipBarTitling = function(tooltipItem) {
                const storageDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
                storageDate.setDate(tooltipItem[0].xLabel || 0);
                return acc_time2date(storageDate.getTime() / 1000, true);
            };

            targetDate  = targetDate || new Date();
            const daysOfThisMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
            for (let d = 0; d < daysOfThisMonth; d++) {
                chartBaseData.push(0);
                chartExtraData.push(0);
                chartLabels.push(d + 1);
            }

            if (isTrfGraph) {
                for (let t = 0; t < availableLabels.length; t++) {
                    const index = parseInt(availableLabels[t].substr(6, 2), 10);
                    const dayConsume = res[availableLabels[t]].tdl || 0;
                    chartBaseData[index - 1] = dayConsume / divider;
                }

                chartDatasets = [{
                    label: '',
                    data: chartBaseData,
                    backgroundColor: style.getPropertyValue('--label-blue-hover').trim(),
                    hoverBackgroundColor: style.getPropertyValue('--label-blue-hover').trim(),
                    hoverBorderColor: style.getPropertyValue('--label-blue').trim(),
                    borderWidth: 0,
                    hoverBorderWidth: 2
                }];

                chartTooltips = {
                    callbacks: {
                        label: tooltipBarLabeling,
                        title: tooltipBarTitling
                    },
                    displayColors: false
                };
            }
            else {
                for (let s = 0; s < availableLabels.length; s++) {
                    const index = parseInt(availableLabels[s].substr(6, 2), 10);
                    const dayConsume = res[availableLabels[s]].ts || 0;
                    if (isTBGraph & dayConsume > 3 * divider) {
                        chartBaseData[index - 1] = 3;
                        chartExtraData[index - 1] = dayConsume / divider - 3;
                    }
                    else {
                        chartBaseData[index - 1] = dayConsume / divider;
                    }
                }

                chartDatasets = [{
                    label: 'base',
                    data: chartBaseData,
                    backgroundColor: style.getPropertyValue('--label-blue-hover').trim(),
                    hoverBackgroundColor: style.getPropertyValue('--label-blue-hover').trim(),
                    hoverBorderColor: style.getPropertyValue('--label-blue').trim(),
                    borderWidth: 0,
                    hoverBorderWidth: 2
                }, {
                    label: 'extra',
                    data: chartExtraData,
                    backgroundColor: style.getPropertyValue('--label-yellow-hover').trim(),
                    hoverBackgroundColor: style.getPropertyValue('--label-yellow-hover').trim(),
                    hoverBorderColor: style.getPropertyValue('--label-yellow').trim(),
                    borderWidth: 0,
                    hoverBorderWidth: 2
                }];

                chartTooltips = {
                    mode: 'label',
                    callbacks: {
                        label: tooltipBarLabeling,
                        title: tooltipBarTitling
                    },
                    displayColors: true
                };
            }

            const theBarChart = new Chart($chartCanvas, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: chartDatasets,
                },
                options: {
                    scales: {
                        yAxes: [{
                            stacked: true,
                            ticks: {
                                beginAtZero: true,
                                fontColor: style.getPropertyValue('--text-color-medium').trim(),
                                padding: 8
                            },
                            gridLines: {
                                display: true,
                                drawTicks: false,
                                color: style.getPropertyValue('--divider-color').trim(),
                                zeroLineColor: style.getPropertyValue('--divider-color').trim(),
                                drawBorder: false,
                                tickMarkLength: 0
                            }
                        }],
                        xAxes: [{
                            stacked: true,
                            ticks: {
                                fontColor: style.getPropertyValue('--text-color-medium').trim(),
                                autoSkip: true,
                                maxTicksLimit: 4,
                                maxRotation: 0
                            },
                            gridLines: {
                                display: false
                            }
                        }]
                    },
                    legend: {
                        display: false
                    },
                    tooltips: chartTooltips,
                    layout: {
                        padding: {
                            left: 24,
                            right: 24,
                            bottom: 32,
                            top: 16
                        }
                    }
                }
            });
        });
    };

    // Private function to populate the next billing information on the admin user dashboard
    const populateNextBillInfo = function() {

        if (!M.account || !M.account.b) {
            return false;
        }
        const billData = M.account.b;

        $('.next-bill-value.local .value', $nbPriceContainer)
            .text(formatCurrency(billData.price_local.amount, billData.price_local.name, 'number'));
        $('.next-bill-value.local .currency', $nbPriceContainer).text(billData.price_local.name);

        if (billData.price_local.name === 'EUR') {
            $('.next-bill-value.euro', $nbPriceContainer).addClass('hidden');
        }
        else {
            $('.next-bill-value.euro', $nbPriceContainer).removeClass('hidden')
                .text(formatCurrency(billData.price_eur.amount));
        }

        // If Pro Flexi
        if (u_attr.pf) {

            // If they are expired, hide the next bill container (similar to Business)
            if (u_attr.pf.s === pro.ACCOUNT_STATUS_EXPIRED) {
                $nbPriceContainer.addClass('hidden');
                return;
            }

            // Add special class for Pro Flexi specific changes to the UI in this section
            $nbPriceContainer.addClass('pro-iv');

            // Add click handler to show the Invoice List page
            $('.js-dashboard-invoices-button', $nbPriceContainer).removeClass('hidden');
            $('.js-dashboard-invoices-button', $nbPriceContainer).rebind('click.dashboard', () => {

                M.require('businessAcc_js', 'businessAccUI_js').done(() => {
                    M.onFileManagerReady(() => {

                        const usersM = new BusinessAccountUI();

                        usersM.initUItoRender();

                        M.onSectionUIOpen('user-management');

                        usersM.viewBusinessInvoicesPage();

                        $('.fm-right-files-block', '.fmholder').removeClass('hidden emptied');

                        if (mega.ui.mNodeFilter) {
                            mega.ui.mNodeFilter.resetFilterSelections();
                        }
                    });
                });
            });
        }
    };

    // Private function to fill last/next bill storage/transfer data into the analytics container
    const fillStgeTrfBillInfo = function(isTrfField) {
        if (!M.account || !M.account.b) {
            return false;
        }
        const billData = M.account.b;

        const $targetContainer = isTrfField ? $trfAnalysisContainer : $stgeAnalysisContainer;
        const $lbRow = $('.one-column', $targetContainer).removeClass('hidden');
        const $nbRow = $('.two-column', $targetContainer);
        const $billDiff = $('.next-bill-ratio', $nbRow).addClass('hidden').removeClass('up down');
        const $billDiffArrow = $('.sprite-fm-mono', $billDiff).removeClass('icon-up icon-down');

        var noLastBillItem;
        var lastBillItem;
        var nextBillItem;
        if (isTrfField) {
            noLastBillItem = typeof billData.lbxfer === 'undefined';
            lastBillItem = noLastBillItem ? 0 : billData.lbxfer;
            nextBillItem = billData.nbxfer;
        }
        else {
            noLastBillItem = typeof billData.lbstrg === 'undefined';
            lastBillItem = noLastBillItem ? 0 : billData.lbstrg;
            nextBillItem = billData.nbstrg;
        }

        $('.usage-value', $nbRow).text(l[5816].replace('[X]', nextBillItem));

        if (noLastBillItem) {
            $lbRow.addClass('hidden');
        }
        else {
            $('.usage-value', $lbRow).text(l[5816].replace('[X]', lastBillItem));

            const valDiff = nextBillItem - lastBillItem;
            if (lastBillItem !== 0 && valDiff !== 0) {
                const valDiffSize = Math.abs(valDiff);
                const valDiffPerc = formatPercentage(valDiffSize / lastBillItem);

                $billDiff.addClass(valDiff > 0 ? 'up' : 'down').removeClass('hidden');
                $billDiffArrow.addClass(valDiff > 0 ? 'icon-up' : 'icon-down');
                $('.ratio-value', $billDiff).text(valDiffSize);
                $('.diff-perc span', $billDiff).text(
                    l.bsn_last_renew_diff_ratio.replace('[X]', `(${valDiffPerc})`)
                );
            }
        }
    };

    // Private function to populate the month dropdown list into the storage and transfer analytics chart
    const populateMonthDropDownList = function($targetContainer) {
        const adminCreationDate = new Date(u_attr.since * 1000);
        const nowDate = new Date();
        nowDate.setDate(1);
        const monthLimit = 12; // 1 year back max
        const $monthDropdown = $('.chart-month-selector', $targetContainer);
        const $dropdownScroll = $('.dropdown-scroll', $monthDropdown);
        const $dropdownLabel = $('> span', $monthDropdown);
        $dropdownScroll.empty();
        $dropdownLabel.text('');

        for (var m = 0; m < monthLimit; m++) {
            const nowTime = nowDate.getTime();
            const label = time2date(nowTime / 1000, 3);
            var itemNode;

            itemNode = mCreateElement('div', {
                'class': 'option',
                'data-state': m === 0 ? 'active' : '',
                'data-value': nowTime
            }, $dropdownScroll[0]);
            mCreateElement('span', undefined, itemNode).textContent = label;

            if (m === 0) {
                $dropdownLabel.text(label);
            }

            nowDate.setMonth(nowDate.getMonth() - 1);

            if (nowDate < adminCreationDate && nowDate.getMonth() !== adminCreationDate.getMonth()) {
                break;
            }
        }


        $('.option', $monthDropdown).rebind('click.subuser', function() {
            const $this = $(this);
            const $activeMonthDropdown = $this.closest('.chart-month-selector.active');
            const selectedDate = new Date(Number.parseFloat($this.attr('data-value')));
            const newReportDates = getReportDates(selectedDate);

            const barReportPromise = mySelf.business.getQuotaUsageReport(false, newReportDates);
            barReportPromise.done((st, res) => {
                populateBarChart(st, res, $activeMonthDropdown.hasClass('transfer'), selectedDate);
            });
        });
        bindDropdownEvents($monthDropdown);
    };

    const quotasPromise = this.business.getQuotaUsage();
    quotasPromise.done(populateStoragePieAndData);

    // Display storage and transfer analytics graphs
    $stgeTrfAnalysisContainer.removeClass('hidden');
    const initialBarReportDates = getReportDates();

    // Prepare and populate data into the transfer bar chart
    const stgeTrfBarReportPromise = this.business.getQuotaUsageReport(false, initialBarReportDates);
    stgeTrfBarReportPromise.done((st, res) => {
        // Populate the transfer analytics bar chart
        populateBarChart(st, res, true);
        // Populate the storage analytics bar chart
        populateBarChart(st, res, false);
    });

    // If Pro Flexi, or Business v is not set
    if (u_attr.pf || typeof M.account.b.v === 'undefined' || M.account.b.v === 0) {

        // Populate the next billing info into the overall usage section
        populateNextBillInfo();

        // Fill the last/next bill transfer data into the analytics section
        fillStgeTrfBillInfo(true);

        // Fill the last/next bill storage data into the analytics section
        fillStgeTrfBillInfo(false);
    }
    else {
        // If a business voucher user, hide all next billing info
        $nbPriceContainer.addClass('hidden');
        $('.lb-nb-info', $stgeTrfAnalysisContainer).addClass('hidden');
        $('.forecast-remarks', $stgeTrfAnalysisContainer).addClass('hidden');
    }

    // Populate the month dropdown list for the transfer analytics graph
    populateMonthDropDownList($trfAnalysisContainer);
    // Populate the month dropdown list for the storage analytics graph
    populateMonthDropDownList($stgeAnalysisContainer);
};

BusinessAccountUI.prototype.initBusinessAccountHeader = function ($accountContainer) {
    "use strict";
    var mySelf = this;
    var $profileContainer = $('.profile', $accountContainer);
    var $invoiceContainer = $('.invoice', $accountContainer);

    // Don't show the Profile Tab if on Pro Flexi
    if (u_attr.pf) {
        $('.settings-menu-bar .settings-menu-item.suba-setting-profile', $accountContainer).addClass('hidden');
    }

    // NB: u_attr.b (for Business) is not available in Pro Flexi, so always check for that
    // before checking sub properties like u_attr.b.s otherwise an exception gets thrown
    if (u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED) {
        $('.settings-menu-bar .settings-menu-item.suba-setting-inv', $accountContainer).addClass('hidden');
    }

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
    if (!u_attr || (!u_attr.b && !u_attr.pf)) {
        return;
    }

    if (u_attr.b && u_attr.b.m && (!u_attr["^buextra"] || sessionStorage.buextra)) {
        if (sessionStorage.buextra) {
            $('.fm-notification-block.business-next-tier').text(l.business_pass_base).addClass('visible');
        }
        else {
            M.accountData((account) => {
                if (account.space_bus_ext || account.tfsq_bus_ext) {
                    $('.fm-notification-block.business-next-tier').text(l.business_pass_base).addClass('visible');
                    sessionStorage.buextra = 1;
                    mega.attr.set('buextra', 1, -2, 0);
                }
            });
        }
    }

    // Check the Business account is expired or in grace period
    if (u_attr.b && !pro.isExpiredOrInGracePeriod(u_attr.b.s)) {
        return;
    }
    // Check the Pro Flexi account is expired or in grace period
    if (u_attr.pf && !pro.isExpiredOrInGracePeriod(u_attr.pf.s)) {
        return false;
    }

    var msg = '';
    if ((u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED) ||
        (u_attr.pf && u_attr.pf.s === pro.ACCOUNT_STATUS_EXPIRED)) {

        // If Business master account or Pro Flexi
        if (u_attr.b && u_attr.b.m) {
            msg = l[24431];
        }
        else if (u_attr.pf) {
            msg = l.pro_flexi_expired_banner;
        }
        else {
            // Otherwise Business sub-user
            msg = l[20462];
        }
        $('.fm-notification-block.expired-business').safeHTML(`<span>${msg}</span>`).addClass('visible');
        clickURLs();

        const isMaster = (u_attr.b && u_attr.b.m) || u_attr.pf;
        this.showExpiredDialog(isMaster);
    }
    else if ((u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_GRACE_PERIOD && u_attr.b.m) ||
        (u_attr.pf && u_attr.pf.s === pro.ACCOUNT_STATUS_GRACE_PERIOD)) {

        if (u_attr.pf) {
            msg = l.pro_flexi_grace_period_banner;
        }
        else {
            msg = l[20650];
        }
        $('.fm-notification-block.grace-business').safeHTML(`<span>${msg}</span>`).addClass('visible');
        clickURLs();
    }
};

/**
 * Show a dialog to the user telling that the account is expired
 * @param {Boolean} isMaster
 */
BusinessAccountUI.prototype.showExpiredDialog = function(isMaster) {
    "use strict";

    const $dialog = isMaster ?
        $('.payment-reminder.user-management-dialog') :
        $('.user-management-able-user-dialog.warning.user-management-dialog');

    if (!$dialog.length) {
        return;
    }

    if (isMaster) {
        $('button.js-close', $dialog)
            .rebind('click.subuser', function closeExpiredAccountDialog() {
                closeDialog();
            });

        $dialog.find('.pay-reactive-acc').off('click.subuser')
            .on('click.subuser', function payReactivateAccountButtonClickHandler() {
                closeDialog();
                loadSubPage('repay');
            });

        // If Business, change the title and icon
        if (u_attr.b) {
            $('.js-payment-reminder-title-business', $dialog).removeClass('hidden');
            $('.js-payment-reminder-description-business', $dialog).removeClass('hidden');
            $('.img-dialog-business-expiry', $dialog).removeClass('hidden');
        }

        // If Pro Flexi, change the title and icon
        else if (u_attr.pf) {
            $('.js-payment-reminder-title-pro-flexi', $dialog).removeClass('hidden');
            $('.js-payment-reminder-description-pro-flexi', $dialog).removeClass('hidden');
            $('.img-dialog-pro-flexi-expiry', $dialog).removeClass('hidden');
        }

        M.safeShowDialog('expired-business-dialog', function() {
            return $dialog;
        });
    }
    else {
        $('.dialog-text-one', $dialog).safeHTML(l[20462]);
        $('.text-two-text', $dialog).text(l[20463]);
        $('.bold-warning', $dialog).text(l[20464] + ':');

        $('.cancel-action').addClass('hidden');
        $('.ok-action', $dialog)
            .rebind('click.subuser', function closeExpiredSubAccountDialog() {
                closeDialog();
            });
        $('.ok-action span', $dialog).text(l[81]);

        M.safeShowDialog('expired-business-dialog', function() {
            return $dialog;
        });
    }
};


/** view business account page */
BusinessAccountUI.prototype.viewBusinessAccountPage = SoonFc(60, function() {
    "use strict";
    if (!this.initUItoRender()) {
        return;
    }
    var mySelf = this;
    this.URLchanger('account');
    loadingDialog.pshow();

    var $businessAccountContainer = $('.files-grid-view.user-management-view', 'body');
    var $accountContainer = $('.user-management-account-settings', $businessAccountContainer);
    var $profileContainer = $('.profile', $accountContainer);
    var $invoiceContainer = $('.invoice', $accountContainer);
    var $countriesSelect = $('.cnt-ddl', $profileContainer);
    var $countriesSelectScroll = $('.dropdown-scroll', $profileContainer).text('');

    // If Pro Flexi, show the different breadcrumbs for Invoices
    const $breadcrumbsClass = (u_attr.pf) ? 'pro-iv-invoices' : 'account';
    const $pageHeader =
        $(`.user-management-breadcrumb.${$breadcrumbsClass}`, '.fm-right-header-user-management');

    var unhideSection = function () {
        $businessAccountContainer.removeClass('hidden');
        $accountContainer.removeClass('hidden');
        $profileContainer.removeClass('hidden');
        $pageHeader.removeClass('hidden');

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

        initBusinessAccountScroll($profileContainer);
    };

    // event handler for header clicking
    this.initBusinessAccountHeader($accountContainer);

    // function to fill dropdown list of countries
    var loadCountries = function () {
        var countries = M.getCountries();
        var ctnKeys = {};

        $countriesSelectScroll.text('');
        ctnKeys = Object.keys(countries);

        for (var k = 0; k < ctnKeys.length; k++) {

            var itemNode;

            itemNode = mCreateElement('div', {
                'class': 'option',
                'data-value': ctnKeys[k]
            }, $countriesSelectScroll[0]);
            mCreateElement('span', undefined, itemNode).textContent = countries[ctnKeys[k]];
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
    var $cZipInput = $('input#prof-zip', $profileContainer).val(cZip);
    var $cCountrySelect = $('.cnt-ddl', $profileContainer);
    var $cCountryOption = $('.option[data-value="' + cCountry + '"]', $cCountrySelect);

    var inputs = [$cNameInput, $cTelInput, $cEmailInput, $cVatInput, $cAddressInput,
        $cAddress2Input, $cCityInput, $cStateInput, $cZipInput];

    var addCorrectValClass = function ($item) {
        $item.parent().removeClass('error');
        if ($item.val().trim()) {
            $item.parent().addClass('correctinput');
        }
    };
    const $saveButton = $('.saving-btn-profile', $profileContainer);
    $saveButton.removeClass('active').addClass('disabled');
    const changes = Object.create(null);
    var checkChange = function(value, originalValue, key) {
        if (value === originalValue) {
            delete changes[key];
        }
        else {
            changes[key] = true;
        }
        if (Object.keys(changes).length > 0) {
            $saveButton.addClass('active').removeClass('disabled');
        }
        else {
            $saveButton.removeClass('active').addClass('disabled');
        }
    };
    // Select country
    bindDropdownEvents($countriesSelect);
    $cCountryOption.addClass('active').attr('data-state', 'active');
    $('>span', $cCountrySelect).text($cCountryOption.text());
    $countriesSelect.rebind('change.businessacc', (e) => {
        checkChange($(e.target).attr('data-value'), cCountry, 'cCountry');
        return false;
    });
    inputs.forEach(function($input) {
        var megaInput = new mega.ui.MegaInputs($input);
        addCorrectValClass($input);

        // Update vat and zip title.
        if (megaInput.updateTitle && ($input.is($cZipInput) || $input.is($cVatInput))) {
            megaInput.updateTitle();
        }
        const origVal = $input.val();
        $input.rebind('keyup.businessacc', () => {
            checkChange($input.val().trim(), origVal, $input.attr('id'));
            return false;
        });
    });

    $saveButton.rebind(
        'click.suba',
        function companyProfileSaveButtonClick() {
            if ($saveButton.hasClass('disabled')) {
                return;
            }
            $saveButton.removeClass('active').addClass('disabled');
            var attrsToChange = [];
            var valid = true;
            var isTaxChanged = false;
            var $selectedCountry = $('.option[data-state="active"]', $cCountrySelect);

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
                const validatedPhoneNumber = M.validatePhoneNumber($cTelInput.val().trim());
                if (validatedPhoneNumber) {
                    $cTelInput.megaInputsHideError();
                    attrsToChange.push({ key: '%phone', val: validatedPhoneNumber });
                }
                else {
                    $cTelInput.megaInputsShowError(l[8814]);
                    $cTelInput.focus();
                    valid = false;
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
            if ($selectedCountry.attr('data-value') !== cCountry) {
                attrsToChange.push({ key: '%country', val: $selectedCountry.attr('data-value') });
            }
            if ($cZipInput.val().trim() !== cZip) {
                attrsToChange.push({ key: '%zip', val: $cZipInput.val().trim() });
            }


            var settingResultHandler = function (st) {
                if (st) {
                    $saveButton.removeClass('active').addClass('disabled');
                    toaster.main.neutral(
                        l[19633],
                        'sprite-fm-uni icon-check',
                        {
                            hasClose: false
                        });

                    M.safeShowDialog('business-profile-up-success', function() {
                        var $dialog =
                            $('.user-management-able-user-dialog.mig-success.user-management-dialog');
                        $('.yes-answer', $dialog).off('click.suba').on('click.suba', closeDialog);
                        var msg = l[20954];
                        if (attrsToChange.length === 1 && attrsToChange[0].key === '%phone') {
                            msg = l.busProfileUpdatePhone;
                        }

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
                }
                else {
                    $saveButton.addClass('active').removeClass('disabled');
                    msgDialog('warningb', '', l[19528]);
                }
            };

            if (valid) {
                var settingPromise = mySelf.business.updateBusinessAttrs(attrsToChange);
                settingPromise.always(settingResultHandler);
            }
            else {
                $saveButton.addClass('active').removeClass('disabled');
            }
        }
    );

    // event handler for clicking on header
    $('.acc-home', $pageHeader).rebind('click.suba', function invoiceListHeaderClick() {
        if (u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED) {
            return;
        }
        const $me = $(this);
        if ($me.hasClass('acc-home')) {
            return mySelf.viewSubAccountListUI();
        }
    });

    // event handler for country select changing
    $('.cnt-ddl .option', $profileContainer).rebind('click.suba',
        function countrySelectChangingHandler(se) {

            var value = $(this).attr('data-value');

            setPostCodeOnUI(value);
            setTaxName(value);
        });

    // event handler for clicking left panel
    $('.user-management-tree-panel-header', '.fm-left-panel.user-management').rebind('click.subuser', function() {
        mySelf.updateSubUserLeftPanel(this);
    });

    unhideSection();
});


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

    // If Pro Flexi, show the different breadcrumbs for Invoices
    const $breadcrumbsClass = (u_attr.pf) ? 'pro-iv-invoices' : 'account';
    const $pageHeader =
        $(`.user-management-breadcrumb.${$breadcrumbsClass}`, '.fm-right-header-user-management');

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
            $pageHeader.removeClass('hidden');

            $('.settings-menu-bar .settings-menu-item', $accountContainer).removeClass('selected');
            $('.settings-menu-bar .suba-setting-inv', $accountContainer).addClass('selected');

            initBusinessAccountScroll($invoiceContainer);
        };

        // check if we need to re-draw
        if (!isInvoiceRedrawNeeded(invoicesList, (mySelf.business) ? mySelf.business.previousInvoices : null)) {
            return unhideSection();
        }

        var $invoicesTable = $('.invoice .invoice-list .invoice-table', $accountContainer);
        var $invoiceRows = $('.invoice-row-data', $invoicesTable);
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

            // If the invoice is non business
            if (!invoicesList[k].b && !u_attr.pf) {
                continue;
            }

            var invoiceDate = new Date(invoicesList[k].ts * 1000);
            var $newInvoiceRow = $invoiceRowTemplate.clone(true);
            var invId = invoicesList[k].n;

            $newInvoiceRow.attr('id', invId);
            $newInvoiceRow.find('.inv-date').text(time2date(invoicesList[k].ts, 1));
            $newInvoiceRow.find('.inv-desc').text(invoicesList[k].d);
            $('.inv-total', $newInvoiceRow).text(formatCurrency(invoicesList[k].tot));
            $newInvoiceRow.removeClass('hidden'); // if it was hidden

            $newInvoiceRow.rebind('click.suba', function invoiceDetailButtonClick() {
                var clickedInvoiceId = $(this).attr('id');
                if (!clickedInvoiceId) {
                    console.error("Cant Find the id of the clicked invoice!");
                    return;
                }
                mySelf.viewInvoiceDetail(clickedInvoiceId);
            });

            $invoicesTable.append($newInvoiceRow);
        }

        unhideSection();

        // If Pro Flexi, hide the Invoices tab
        if (u_attr.pf) {
            $('.settings-menu-bar .suba-setting-inv', $accountContainer).addClass('hidden');
        }
    };

    // If Pro Flexi
    if (u_attr.pf) {

        // Update the avatar, name, email Pro level in dashboard side panel
        accountUI.general.userUIUpdate();

        // Init button on dashboard to backup their master key
        $('.dashboard .backup-master-key', '.fmholder').rebind('click.dashboardBackupKey', () => {
            M.showRecoveryKeyDialog(2);
        });

        // Show dashboard side panel on the side of the Invoices list
        $('.content-panel.dashboard', '.fmholder').addClass('active');
    }

    mySelf.initBreadcrumbClickHandlers($pageHeader);

    var getInvoicesPromise = this.business.getAccountInvoicesList();
    getInvoicesPromise.always(prepareInvoiceListSection);
};


BusinessAccountUI.prototype.initBreadcrumbClickHandlers = function($pageHeader) {
    'use strict';

    $('.acc-acc', $pageHeader).rebind('click.acc-acc', () => {

        // If Pro Flexi, when clicking on Invoices breadcrumbs, go back to the Invoices page
        if (u_attr.pf) {
            return this.viewBusinessInvoicesPage();
        }

        return this.viewBusinessAccountPage();
    });

    $('.acc-home', $pageHeader).rebind('click.acc-home', () => {

        // If Pro Flexi, when clicking on Dashboard breadcrumbs, go back to the Dashboard
        if (u_attr.pf) {
            loadSubPage('fm/dashboard');
        }

        return this.viewSubAccountListUI();
    });
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

    // If Pro Flexi, show the different breadcrumbs for Invoices
    const $breadcrumbsClass = (u_attr.pf) ? 'pro-iv-invoices' : 'account';
    const $pageHeader =
        $(`.user-management-breadcrumb.${$breadcrumbsClass}`, '.fm-right-header-user-management');

    loadingDialog.pshow();
    this.initBusinessAccountHeader($accountContainer);

    var unhideSection = function () {
        $businessAccountContainer.removeClass('hidden');
        $accountContainer.removeClass('hidden');
        $invoiceContainer.removeClass('hidden');
        $invoiceDetailContainer.removeClass('hidden');
        $pageHeader.removeClass('hidden');

        $('.inv-det-arrow, .inv-det-id', $pageHeader).removeClass('hidden');
        $('.settings-menu-bar .settings-menu-item', $accountContainer).removeClass('selected');
        $('.settings-menu-bar .suba-setting-inv', $accountContainer).addClass('selected');
        loadingDialog.phide();

        initBusinessAccountScroll($invoiceContainer);
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

    var fillInvoiceDetailPage = function(st, invoiceDetail) {


        if (st !== 1 || !validateInvoice(invoiceDetail)) {
            msgDialog('warningb', '', l[19302]);
            mySelf.viewBusinessAccountPage();
            return;
        }

        // navigation bar
        $('.inv-det-id', $pageHeader).text(invoiceDetail.n);

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
        $('.inv-vat-label', $invoiceTopTitle).text(l.taxname_label.replace('%TAXNAME', invoiceDetail.mega.taxnum[0]));

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
                .text(l.taxname_label.replace('%TAXNAME', invoiceDetail.u.taxnum[0])
                    + ' ' + invoiceDetail.u.taxnum[1]).removeClass('hidden');
        }

        // invoice items
        const $invoiceItemsContainer = $('.inv-payment-table', $invoiceDetailContainer);
        const $allItems = $('.inv-li-content', $invoiceItemsContainer);
        const $invItemContent = $($allItems.get(0));
        const $invItemContentTemplate = $invItemContent.clone(true);
        $allItems.remove();
        var $invItemHeader = $('.inv-li-table-header', $invoiceItemsContainer);
        var taxSum = 0;

        // for debug...
        if (d && localStorage.debugNewPrice) {
            invoiceDetail.items[0].d = "Mega Business (8 users+10TB extra storage+10TB extra transfer)";
            invoiceDetail.items[0].v = 1;
            invoiceDetail.items[0].gross = 90;
            invoiceDetail.items[0].net = 78.26;
            invoiceDetail.items[0].tax = 11.74;
            invoiceDetail.items[0].ts = 1603856535;
            invoiceDetail.items[0].list = { // (NEW FIELD)
                "u": [8, 40],
                "s": [10, 25],
                "t": [10, 25],
                "du": 3
            };
            invoiceDetail.taxrate = 15;
            invoiceDetail.tot = 90;
        }
        // end debug...

        let oldInvoice = false;
        let taxExcluded = false;

        for (var k = invoiceDetail.items.length - 1; k >= 0; k--) {
            let $invItem;

            if (invoiceDetail.items[k].v && invoiceDetail.items[k].list) {
                if (invoiceDetail.items[k].list.t) {
                    $invItem = $invItemContentTemplate.clone(true);
                    $('.inv-pay-date', $invItem).text(' ');
                    $('.inv-pay-desc', $invItem).text(l.additional_transfer
                        .replace('%1', invoiceDetail.items[k].list.t[0]));
                    $('.inv-pay-amou', $invItem).text(formatCurrency(invoiceDetail.items[k].list.t[1]));
                    $invItem.insertAfter($invItemHeader);
                }
                if (invoiceDetail.items[k].list.s) {
                    $invItem = $invItemContentTemplate.clone(true);
                    $('.inv-pay-date', $invItem).text(' ');
                    $('.inv-pay-desc', $invItem).text(l.additional_storage
                        .replace('%1', invoiceDetail.items[k].list.s[0]));
                    $('.inv-pay-amou', $invItem).text(formatCurrency(invoiceDetail.items[k].list.s[1]));
                    $invItem.insertAfter($invItemHeader);
                }
                if (invoiceDetail.items[k].list.u) {
                    $invItem = $invItemContentTemplate.clone(true);
                    $('.inv-pay-date', $invItem).text(' ');
                    let nbUsersText = mega.icu.format(l.users_unit, invoiceDetail.items[k].list.u[0]);
                    if (invoiceDetail.items[k].list.du) {
                        nbUsersText += ' ' + mega.icu.format(l.deactive_user_count, invoiceDetail.items[k].list.du);
                        $('.inv-payment-price-deactive-users', $invoiceItemsContainer).removeClass('hidden');
                    }
                    $('.inv-pay-desc', $invItem).text(nbUsersText);
                    $('.inv-pay-amou', $invItem).text(formatCurrency(invoiceDetail.items[0].list.u[1]));
                    $invItem.insertAfter($invItemHeader);
                }
                $invItem = $invItemContentTemplate.clone(true);

                // If Pro Flexi, the Base price will be set so show it
                if (invoiceDetail.items[k].list.b) {
                    $('.inv-pay-amou', $invItem).text(formatCurrency(invoiceDetail.items[k].list.b[1]));
                }
                else {
                    // Otherwise for Business don't show it
                    $('.inv-pay-amou', $invItem).text(' ');
                }

                $('.inv-pay-date', $invItem).text(time2date(invoiceDetail.items[k].ts, 1));
                $('.inv-pay-desc', $invItem).text(invoiceDetail.items[k].d);
                $invItem.insertAfter($invItemHeader);

                taxExcluded = invoiceDetail.items[k].extax;
            }
            else {
                $invItem = $invItemContentTemplate.clone(true);
                $('.inv-pay-date', $invItem).text(time2date(invoiceDetail.items[k].ts, 1));
                $('.inv-pay-desc', $invItem).text(invoiceDetail.items[k].d);
                $('.inv-pay-amou', $invItem).text(formatCurrency(invoiceDetail.items[k].net));
                $invItem.insertAfter($invItemHeader);
                oldInvoice = true;
            }

            taxSum += invoiceDetail.items[k].tax;
        }

        if (invoiceDetail.u.taxnum) {
            let taxText = '';
            if (oldInvoice || taxExcluded) {
                taxText = l.taxname_label.replace('%TAXNAME', invoiceDetail.taxname || invoiceDetail.u.taxnum[0])
                    + ` ${formatPercentage(Number(invoiceDetail.taxrate) / 100, true)}`;
            }
            else {
                taxText = l.tax_on_invoice.replace('%1', invoiceDetail.taxname || invoiceDetail.u.taxnum[0])
                    .replace('%2', Number(invoiceDetail.taxrate).toFixed(2) + '%');
            }
            $('.inv-payment-price.inv-li-gst .inv-gst-perc', $invoiceItemsContainer).text(taxText);
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

        $('.inv-detail-export', $invoiceDetailContainer).rebind(
            'click.subuser',
            function invoiceDetailExportClickHandler() {
                M.require('business_invoice').done(
                    function exportOverviewPageToPDF() {

                        var myPage = pages['business_invoice'];
                        myPage = translate(myPage);

                        const { mega, ts, n, u, items, tot } = invoiceDetail;
                        const { e, phaddr, poaddr, taxnum, cname } = mega;
                        // now prepare the invoice.
                        myPage = myPage.replace('{1cname}', escapeHTML(cname));
                        myPage = myPage.replace('{1megae}', escapeHTML(e));
                        myPage = myPage.replace('{1phaddr}', escapeHTML(phaddr.join(', ')));
                        myPage = myPage.replace('{1poaddr}', escapeHTML(poaddr.join(', ')));
                        myPage = myPage.replace('{0Date}', escapeHTML(time2date(ts, 1)));
                        myPage = myPage.replace('{1InvoiceTitle}', escapeHTML($invoiceTopTitle.find('.inv-title.invv').text()));
                        myPage = myPage.replace('{1InvoiceNB}', escapeHTML(n));
                        myPage = myPage.replace('{2VATNB}', escapeHTML(taxnum[1]));
                        myPage = myPage.replace('{2VATTXT}', escapeHTML(
                            l.taxname_label.replace('%TAXNAME', taxnum[0])));
                        myPage = myPage.replace('{3CompanyName}', escapeHTML(u.cname));
                        myPage = myPage.replace('{4CompanyEmail}', escapeHTML(u.e));
                        myPage = myPage.replace('{5CompanyAddress}', escapeHTML(validAddressSentFromApi.join(', ')));
                        myPage = myPage.replace('{6CompanyCountry}', escapeHTML(u.addr[u.addr.length - 1]));
                        var cVat = '---';
                        if (u.taxnum && u.taxnum[1]) {
                            cVat = l.taxname_label.replace('%TAXNAME', u.taxnum[0])
                                + ' ' + u.taxnum[1];
                        }
                        myPage = myPage.replace('{7CompanyVat}', escapeHTML(cVat));
                        var itemDate = '---';
                        var itemDec = '---';
                        var itemAmount = '---';
                        if (items && items.length) {
                            itemDate = time2date(items[0].ts, 1);
                            itemDec = items[0].d;
                            itemAmount = items[0].net;
                            if (items[0].v && items[0].list) {
                                const rowStart = myPage.indexOf('<li class="inv-li-content"');
                                if (rowStart) {
                                    const rowEnd = myPage.indexOf('</li>', rowStart);
                                    if (rowEnd) {
                                        const $allItems = $('.inv-li-content', $invoiceItemsContainer);
                                        if ($allItems.length) {
                                            let newRows = '';
                                            for (let k = 0; k < $allItems.length / 2; k++) {
                                                // safe, 1- no user entry -2- sanitized before on document.
                                                newRows += $allItems[k].outerHTML;
                                            }
                                            myPage = myPage.slice(0, rowStart)
                                                + newRows + myPage.slice(rowEnd + 5, myPage.length);

                                        }
                                    }
                                }
                            }
                            else {
                                myPage = myPage.replace('{8itemDate}', escapeHTML(itemDate));
                                myPage = myPage.replace('{9itemDesc}', escapeHTML(itemDec));
                                myPage = myPage.replace('{10itemAmount}', Number(itemAmount).toFixed(2));
                            }
                        }

                        myPage = myPage.replace('{15totalVal}',
                            escapeHTML($invoiceItemsContainer.find('.inv-payment-price.inv-li-gst .inv-gst-perc')[0].textContent));
                        myPage = myPage.replace('{11itemVat}',
                            escapeHTML($invoiceItemsContainer.find('.inv-payment-price.inv-li-gst .inv-gst-val')[0].textContent));
                        myPage = myPage.replace('{12totalCost}', '\u20ac' + Number(tot).toFixed(2));

                        var pdfPrintIframe = document.getElementById('invoicePdfPrinter');
                        var newPdfPrintIframe = document.createElement('iframe');
                        newPdfPrintIframe.id = 'invoicePdfPrinter';
                        newPdfPrintIframe.src = 'about:blank';
                        newPdfPrintIframe.classList.add('hidden');
                        var pdfIframeParent = pdfPrintIframe.parentNode;
                        pdfIframeParent.replaceChild(newPdfPrintIframe, pdfPrintIframe);
                        newPdfPrintIframe.onload = function() {
                            setTimeout(() => {
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
    };

    mySelf.initBreadcrumbClickHandlers($pageHeader);

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
    $('.graphic', $dialog).removeClass('icon-success').addClass('icon-question');
    if (isEnable) {
        dialogQuestion = l[19101];
        note = l[19102];
        $('.graphic', $dialog).removeClass('icon-error').addClass('icon-success');
        const $yesButton = $('footer .yes-answer', $dialog);
        $yesButton.removeClass('negative');
        $yesButton.addClass('positive');
    }
    else {
        const $yesButton = $('footer .yes-answer', $dialog);
        $yesButton.removeClass('positive');
        $yesButton.addClass('negative');
    }

    dialogQuestion = dialogQuestion.replace('[B]', '<b>').replace('[/B]', '</b>')
        .replace('{0}', escapeHTML(userName));
    $dialog.find('.dialog-text-one').safeHTML(dialogQuestion);
    $dialog.find('.dialog-text-two').text(note);

    // event handler for clicking on "Yes" or "Cancel" buttons
    $('footer .dlg-btn', $dialog)
        .rebind('click.subuser', function() {
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
 * This is a function to show the fingerprint dialog.
 * It can be called whenever needed
 */
BusinessAccountUI.prototype.showVerifyDialog = function() {
    "use strict";

    if (!u_attr || !u_attr.b || u_attr.b.m || u_attr.b.s === -1) {
        return;
    }

    const showVerifyDlg = (sendCredentials) => {

        if (!sendCredentials || sendCredentials === -9) {
            return;
        }

        fingerprintDialog(u_attr.b.mu[0], true);

    };

    mega.attr.get(u_handle, 'gmk', -2, 0).always(showVerifyDlg);
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

        $('button.js-close', $dialog)
            .rebind('click.subuser', function closeWelcomeDialogHandler() {
                closeDialog();
            });

        $('.add-subuser, .go-to-landing', $dialog)
            .rebind('click.subuser', function welcomeDlgGoToUsersManagement() {
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
        $('.fingerprint-container', $dialog).addClass('hidden');
        $('header h2', $dialog).text(l[19084]).removeClass('hidden');
        $('footer .add-more', $dialog).addClass('hidden');
        $('footer .add-sub-user', $dialog).removeClass('a-ok-btn');
        $('footer .add-sub-user span', $dialog).text(l.bsn_add_users);
        $('.graphic', $dialog).addClass('hidden');
        $('.dialog-input-title-ontop', $dialog).removeClass('correctinput error');
        $('footer .mega-switch', $dialog).removeClass('toggle-on').trigger('update.accessibility');
        $('footer .mega-switch .mega-feature-switch', $dialog)
            .attr('style', '');
        $('footer .invite-link-option', $dialog).removeClass('hidden');
        $('footer .add-sub-user', $dialog).removeClass('disabled');
        $('footer .add-more', $dialog).removeClass('disabled');
        $('button.js-close', $dialog).removeClass('hidden');
        $dialog.addClass('dialog-template-main').removeClass('dialog-template-graphic');
    };

    clearDialog(); // remove any previous data

    var megaInputs = new mega.ui.MegaInputs($inputs);

    // checking if we are coming from landing page
    if (!result && callback) {
        $('header h2', $dialog).text(l[19104]);
    }

    // checking if we are passing a valid result object
    if (result && result.u && result.m) {
        const $addContianer = $('.dialog-input-container', $dialog);
        const $resultContianer = $('.verification-container', $dialog);
        const $fpContainer = $('.fingerprint-container', $dialog).addClass('hidden');

        const subUserDefaultAvatar = useravatar.contact(result.u);
        $('.new-sub-user', $resultContianer).safeHTML(subUserDefaultAvatar);
        $('.sub-e', $resultContianer).text(result.m);
        if (result.lp) {
            $('.verification-user-pw', $resultContianer).removeClass('hidden');
            if (is_extension || M.execCommandUsable()) {
                $('.copy-pw-btn', $resultContianer).removeClass('hidden');
                $('.copy-pw-btn', $resultContianer)
                    .rebind('click.suba', function() {
                        copyToClipboard(result.lp, l[19602]);
                        $('footer .add-sub-user', $dialog).removeClass('disabled');
                        $('footer .add-more', $dialog).removeClass('disabled');
                    });
            }
            $('footer .add-sub-user', $dialog).addClass('disabled');
            $('footer .add-more', $dialog).addClass('disabled');
            $('.sub-p', $resultContianer)
                .rebind('copy.suba', function passwordTextTouchHandler() {
                    $('footer .add-sub-user', $dialog).removeClass('disabled');
                    $('footer .add-more', $dialog).removeClass('disabled');
                });
            $('.sub-p', $resultContianer).text(result.lp);
        }
        else {
            $('.verification-user-pw', $resultContianer).addClass('hidden');
            $('.copy-pw-btn', $resultContianer).addClass('hidden');
        }

        $addContianer.addClass('hidden');

        userFingerprint(u_handle, (fprint) => {
            if (!fprint || !fprint.length) {
                return;
            }
            const $divs = $('.fingerprint-content-container div', $fpContainer);
            for (let v = 0; v < fprint.length && v < 10; v++) {
                $divs[v].textContent = fprint[v];
            }
            $fpContainer.removeClass('hidden');
        });

        $resultContianer.removeClass('hidden');
        $('footer .add-sub-user', $dialog).addClass('a-ok-btn'); // OK
        $('footer .add-sub-user span', $dialog).text(l[81]); // OK
        $('.dialog-subtitle', $dialog).removeClass('hidden');
        $('header h2', $dialog).text(l[20035]);
        $dialog.removeClass('dialog-template-main').addClass('dialog-template-graphic');
        $('button.js-close', $dialog).addClass('hidden');
        $('.graphic.sent-email', $dialog).removeClass('hidden');
        $('footer .invite-link-option', $dialog).addClass('hidden');

    }

    // event handler for "X" icon to close the dialog
    $('button.js-close', $dialog)
        .rebind('click.subuser', function exitIconClickHandler() {
            closeDialog();
        });

    // event handler for clicking on "add more"
    $('footer .add-more', $dialog)
        .rebind('click.subuser', function addMoreClickHandler() {
            if ($(this).hasClass('disabled')) {
                return;
            }
            clearDialog();
        });

    // event handler for clicking on show-more button to view optional fields
    $('.dialog-input-container .opti-add-suba', $dialog)
        .rebind('click.subuser', function showMoreMoreClickHandler() {
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
    $('footer .mega-switch', $dialog)
        .rebind('click.subuser', function protectLinkClickHandler() {
            var $me = $(this);
            if ($me.hasClass('toggle-on')) {
                $me.removeClass('toggle-on');
            }
            else {
                $me.addClass('toggle-on');
            }
            $me.trigger('update.accessibility');
        });

    // event handler for adding sub-users
    $('footer .add-sub-user', $dialog)
        .rebind('click.subuser', function addSubUserClickHandler() {
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
                $uName.megaInputsShowError(l.error_invalid_name);
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
            var isProtectLink = $('footer .mega-switch', $dialog).hasClass('toggle-on');

            var subPromise =
                mySelf.business.addSubAccount(subEmail, subName, subLastName, addUserOptionals, isProtectLink);


            var finalizeOperation = function (st,res,req) {
                var $addContianer = $('.dialog-input-container', $dialog);
                var $resultContianer = $('.verification-container', $dialog);
                const $subUserEmail = $('.sub-e', $resultContianer);
                const $fpContainer = $('.fingerprint-container', $dialog).addClass('hidden');

                if (st === 1) {
                    var subUserDefaultAvatar = useravatar.contact(res.u);
                    $('.new-sub-user', $resultContianer).safeHTML(subUserDefaultAvatar);
                    $subUserEmail.text(req.m).attr({
                        'data-simpletip': req.m,
                        'data-simpletipposition': 'top'
                    });

                    if (res.lp) {
                        $('.verification-user-pw', $resultContianer).removeClass('hidden');
                        if (is_extension || M.execCommandUsable()) {
                            $('.copy-pw-btn', $resultContianer).removeClass('hidden');
                            $('.copy-pw-btn', $resultContianer)
                                .rebind('click.suba', function() {
                                    copyToClipboard(res.lp, l[19602]);
                                    $('footer .add-sub-user', $dialog).removeClass('disabled');
                                    $('footer .add-more', $dialog).removeClass('disabled');
                                });
                        }
                        $('footer .add-sub-user', $dialog).addClass('disabled');
                        $('footer .add-more', $dialog).addClass('disabled');
                        $('.sub-p', $resultContianer)
                            .rebind('copy.suba', function passwordTextTouchHandler() {
                                $('footer .add-sub-user', $dialog).removeClass('disabled');
                                $('footer .add-more', $dialog).removeClass('disabled');
                            });
                        $('.sub-p', $resultContianer).text(res.lp);
                    }
                    else {
                        $('.verification-user-pw', $resultContianer).addClass('hidden');
                        $('.copy-pw-btn', $resultContianer).addClass('hidden');
                    }

                    $addContianer.addClass('hidden');

                    userFingerprint(u_handle, (fprint) => {
                        if (!fprint || !fprint.length) {
                            return;
                        }
                        const $divs = $('.fingerprint-content-container div', $fpContainer);
                        for (let v = 0; v < fprint.length && v < 10; v++) {
                            $divs[v].textContent = fprint[v];
                        }
                        $fpContainer.removeClass('hidden');
                    });

                    $resultContianer.removeClass('hidden');
                    $('footer .add-more', $dialog).removeClass('hidden');
                    $('footer .add-sub-user', $dialog).addClass('a-ok-btn'); // OK
                    $('footer .add-sub-user span', $dialog).text(l[81]); // OK
                    $('.licence-bar', $dialog).addClass('hidden');
                    $('.dialog-subtitle', $dialog).removeClass('hidden');
                    $('header h2', $dialog).text(l[20035]);
                    $dialog.removeClass('dialog-template-main').addClass('dialog-template-graphic');
                    $('button.js-close', $dialog).addClass('hidden');
                    $('.graphic.sent-email', $dialog).removeClass('hidden');
                    $('footer .invite-link-option', $dialog).addClass('hidden');
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

                if ($subUserEmail.prop('scrollWidth') > $subUserEmail.prop('offsetWidth')) {
                    // If the sub user's email is too long, add the simpletip to display the full email address
                    $subUserEmail.addClass('simpletip');
                }
                else {
                    $subUserEmail.removeClass('simpletip');
                }
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
    var $subTitle = $('.pass-reset-sub', $dialog);
    var $generateButton = $('.generate-pass-btn', $dialog);
    var $passVisibility = $('.pass-visibility', $generatedPassSection);
    var $tempPass = $('.temp-pw', $generatedPassSection);
    var $copyPassBtn = $('.copy-pass-reset', $dialog);

    const decodedUser = mySelf.decodeFields(subUser, ['firstname', 'lastname']);
    const uName = `${decodedUser.firstname} ${decodedUser.lastname}`;

    var subTitle = l[22077].replace('[S]', '<span class="green strong">')
        .replace('[S]', '</span>').replace('{0}', escapeHTML(uName));

    $subTitle.safeHTML(subTitle);

    $('button.js-close, .cancel-dlg', $dialog).rebind('click.subuser',
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

    $confirmBtn.rebind('click.subuser', function confirmResetPassBtn() {
        if ($(this).hasClass('disabled')) {
            return;
        }
        closeDialog();

        mySelf.business.resetSubUserPassword(subUserHandle, mySelf.lastGeneratedPass)
            .then(() => {

                M.safeShowDialog('pass-reset-success-subuser-dlg', () => {
                    const $resetDialog = $('.user-management-able-user-dialog.mig-success.user-management-dialog');

                    $('.yes-answer', $resetDialog).rebind('click.suba', closeDialog);
                    $('.dialog-text-one', $resetDialog)
                        .safeHTML(l[22081].replace('{0}', `<b>${subUser.e}</b>`));

                    return $resetDialog;
                });

            })
            .catch((ex) => {
                msgDialog('info', '', l[22082], api.strerror(ex));
            });
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

    const mySelf = this;

    if (!mySelf.checkCu25519(subUserHandle, mySelf.showEditSubUserDialog.bind(mySelf))) {
        return false;
    }

    var subUser = M.suba[subUserHandle];

    var $dialog = $('.user-management-edit-profile-dialog.user-management-dialog');
    var $usersContainer = $('.content-block', $dialog);
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

    const decodedUser = mySelf.decodeFields(
        subUser,
        ['firstname', 'lastname', 'position', 'idnum', 'phonenum', 'location']
    );
    userAttrs.fname = decodedUser.firstname;
    userAttrs.lname = decodedUser.lastname;

    $nameInput.val(userAttrs.fname).blur();
    $lnameInput.val(userAttrs.lname).blur();
    $emailInput.val(subUser.e).blur();

    if (decodedUser.position) {
        userAttrs.position = decodedUser.position;
        $positionInput.val(userAttrs.position).blur();
        $positionInput.parent().addClass('correctinput');
    }
    if (decodedUser.idnum) {
        userAttrs.idnum = decodedUser.idnum;
        $subIDInput.val(userAttrs.idnum).blur();
        $subIDInput.parent().addClass('correctinput');
    }
    if (decodedUser.phonenum) {
        userAttrs.phonenum = decodedUser.phonenum;
        $phoneInput.val(userAttrs.phonenum).blur();
        $phoneInput.parent().addClass('correctinput');
    }
    if (decodedUser.location) {
        userAttrs.location = decodedUser.location;
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
            msgDialog('warningb', '', res === EACCESS ?  l[19562] : l[19524]);
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

    // close event handler
    $('footer .btn-edit-close, button.js-close', $dialog)
        .rebind('click.subuser', closeDialog);

    // event handler for save button clicking
    $('footer .btn-edit-save', $dialog)
        .rebind('click.subuser', function() {
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
                if ('email' in changedVals) {
                    if (!isValidEmail(changedVals.email)) {
                        $emailInput.megaInputsShowError(l[5705]);
                        return;
                    }
                    for (const u of Object.values(M.suba)) {
                        if (u.e === changedVals.email) {
                            $emailInput.megaInputsShowError(
                                u.s !== 0 && u.s !== 10
                                    ? l.err_bus_sub_exists_deactive
                                    : l[19562]
                            );
                            return;
                        }
                    }
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
        initBusinessAccountScroll($usersContainer);
    }

    $('footer .ok-done', $dialog)
        .rebind('click.subuser', function addSubUserDoneClickHandler() {
            $('footer .ok-done', $dialog).off('keydown.subuserresd');
            closeDialog();
        });
    $('footer .ok-done', $dialog)
        .rebind('keydown.subuserresd', function addSubUserDoneKeydownHandler(key) {
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
BusinessAccountUI.prototype.migrateSubUserData = async function(subUserHandle) {
    "use strict";
    if (!subUserHandle || subUserHandle.length !== 11 || !M.suba[subUserHandle]) {
        throw new MEGAException(`Invalid data-migration sub-user handle, ${subUserHandle}`);
    }
    const subUser = M.suba[subUserHandle];
    const $migrateDialog = $('.user-management-migrate-process-dialog.user-management-dialog');

    const decodedUser = this.decodeFields(subUser, ['firstname', 'lastname']);
    const subName = `${decodedUser.firstname} ${decodedUser.lastname}`.trim();

    $migrateDialog.find('.sub-user-name-from').text(subName);
    $migrateDialog.find('.process-percentage').text('0%');
    $migrateDialog.find('.data-migrate.progress-bar').attr('style', 'width:0');
    fm_showoverlay();
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
    changePercentage(10);

    // getting sub-user tree.
    const [f, {k, k2}] = await Promise.all([
        this.business.getSubUserTree(subUserHandle),
        this.business.getSubAccountMKey(subUserHandle)
    ]);
    changePercentage(20);

    // sub-user tree decrypting
    const {tree, errors, warns} = this.business.decrypteSubUserTree(f, k || k2, k ? 0 : subUserHandle);

    if (errors.length || warns.length) {
        // operation contains errors and/or warning
        const msg = l[19147].replace(/\[Br]/g, '<br/>')
            .replace('{0}', M.suba[subUserHandle].e)
            .replace('{1}', errors.length)
            .replace('{2}', warns.length);

        await new Promise((resolve, reject) => {
            msgDialog('confirmation', '', msg, l[18229], (yes) => {
                if (!yes) {
                    return reject(new MEGAException(l[19148].replace('{0}', subUser.e), subUser, 'AbortError'));
                }
                resolve();
            });
        });
    }
    changePercentage(30);

    // name the folder as the sub-user email + timestamp.
    const folderName = `${subUser.e}_${Date.now()}`;

    return this.business.copySubUserTreeToMasterRoot(tree, folderName, changePercentage);
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
        window.mega.ui.searchbar.closeMiniSearch();
        pushHistoryState(newSubPage);
        page = newSubPage;

        // remove fm/ in front for M.currentdirid
        M.currentdirid = page.startsWith('fm/') ? page.slice(3) : page;
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

        const decodedUser = self.decodeFields(subuser, ['firstname', 'lastname']);
        const uName = `${decodedUser.firstname} ${decodedUser.lastname}`.trim();
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
        if (u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED) {
            $userRow.addClass('disabled');
        }
        self.updateSubUserLeftPanel($('.user-management-tree-panel-header.' + leftPanelClass)[0]);
    };

    if (!$usersLeftPanel.hasClass('hidden') && $usersLeftPanel.hasClass('active')) {
        updateLeftSubUserPanel(subuser);
    }

    if (!String(M.currentdirid).includes('user-management')) {
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
