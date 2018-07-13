function accountUI() {
    "use strict";

    // Prevent ephemeral session to access account settings via url
    if (u_type === 0) {
        msgDialog('confirmation', l[998], l[17146]
            + ' ' + l[999], l[1000], function(e) {
            if (e) {
                loadSubPage('register');
                return false;
            }
            loadSubPage('fm');
        });

        return false;
    }

    $('.fm-account-notifications').removeClass('hidden');
    $('.fm-account-button').removeClass('active');
    $('.fm-account-sections').addClass('hidden');
    $('.fm-right-files-block, .section.conversations, .fm-right-block.dashboard').addClass('hidden');
    $('.fm-right-account-block').removeClass('hidden');
    $('.nw-fm-left-icon').removeClass('active');
    $('.nw-fm-left-icon.settings').addClass('active');
    $('.account.data-block.storage-data').removeClass('exceeded');
    $('.fm-account-save-block').addClass('hidden');
    $('.fm-account-save').removeClass('disabled');


    if ($('.fmholder').hasClass('transfer-panel-opened')) {
        $.transferClose();
    }

    // Destroy jScrollings in select dropdowns
    $('.fm-account-main .default-select-scroll').each(function(i, e) {
        $(e).parent().fadeOut(200).parent().removeClass('active');
        deleteScrollPanel(e, 'jsp');
    });

    M.onSectionUIOpen('account');
    if (typeof zxcvbn === 'undefined') {
        loadingDialog.show();
        return M.require('zxcvbn_js')
            .done(function() {
                delay(accountUI);
            });
    }

    M.accountData(function(account) {
        loadingDialog.hide();
        accountUI.userUIUpdate();

        var perc_c;
        var id = getSitePath();
        var pid = String(id).replace('/fm/account/', '');
        var sectionClass;
        var tabSection;

        if (pid.indexOf('-notifications') > 0) {
            tabSection = pid.split('-').shift();
        }
        else {
            switch (pid) {
                case 'payment':
                case 'achievements':
                case 'email-and-pass':
                    id = '/fm/account';
                    tabSection = pid;
                    break;

                case 'notifications':
                    tabSection = 'cloud-drive';
                    break;

                case 'chat':
                case 'advanced':
                case 'transfers':
                case 'file-management':
                    id = '/fm/account/advanced';
                    tabSection = pid;

                    if (pid === 'file-management') {
                        tabSection = 'fm';
                    }
                    else if (pid === 'advanced') {
                        tabSection = 'ui';
                    }
                    break;

                default:
                    tabSection = 'general';
            }
        }

        $('.account.tab-content').addClass('hidden');
        $('.account.tab-lnk.active').removeClass('active');

        if (tabSection) {
            tabSection = tabSection.replace(/[^\w-]/g, '');

            if (tabSection === 'achievements' && !account.maf) {
                tabSection = 'general';
            }

            $('.account.tab-content.' + tabSection).removeClass('hidden');
            $('.account.tab-lnk[data-tab="' + tabSection + '"]').addClass('active');
        }

        if (id === '/fm/account/advanced') {
            $('.fm-account-settings').removeClass('hidden');
            sectionClass = 'advanced';

            accountUI.advancedSection();

            if (is_chrome_firefox) {
                if (!$('#acc_dls_folder').length) {
                    $('.transfer-settings').safeAppend(
                        '<div id="acc_dls_folder">' +
                        '<div class="fm-account-header">Downloads folder:</div>' +
                        '<input type="button" value="Browse..." style="-moz-appearance:' +
                        'button;margin-right:12px;cursor:pointer" />' +
                        '</div>');
                    var fld = mozGetDownloadsFolder();
                    $('#acc_dls_folder').append($('<span/>').text(fld && fld.path));
                    $('#acc_dls_folder input').click(function() {
                        var fs = mozFilePicker(0, 2);
                        if (fs) {
                            mozSetDownloadsFolder(fs);
                            $(this).next().text(fs.path);
                        }
                    });
                }
            }
        }
        else if (id === '/fm/account') {
            $('.fm-account-profile').removeClass('hidden');
            sectionClass = 'account-s';
        }
        else if (id === '/fm/account/history') {
            $('.fm-account-history').removeClass('hidden').find('.account.tab-content').removeClass('hidden');
            sectionClass = 'history';
        }
        else if (id === '/fm/account/reseller' && M.account.reseller) {
            $('.fm-account-reseller').removeClass('hidden').find('.account.tab-content').removeClass('hidden');
            sectionClass = 'reseller';
        }
        else if (id === '/fm/account/megadrop') {
            $('.fm-account-widget').removeClass('hidden').find('.account.tab-content').removeClass('hidden');
            mega.megadrop.stngsDraw();
            sectionClass = 'megadrop';
        }
        else {
            // This is the main entry point for users who just had upgraded their accounts
            if (isNonActivatedAccount()) {
                alarm.nonActivatedAccount.render(true);
            }

            $('.fm-account-notifications').removeClass('hidden');
            sectionClass = 'notifications';
        }

        $('.fm-account-button.' + sectionClass).addClass('active');

        if (u_attr.p) {

            // LITE/PRO account
            var planNum = u_attr.p;
            var planText = pro.getProPlanName(planNum);

            $('.account.plan-info.accounttype span').text(planText);
            $('.small-icon.membership').addClass('pro' + planNum);

            // Subscription
            if (account.stype === 'S') {

                // Get the date their subscription will renew
                var timestamp = (account.srenew.length > 0) ? account.srenew[0] : 0;    // Timestamp e.g. 1493337569
                var paymentType = (account.sgw.length > 0) ? account.sgw[0] : '';       // Credit Card etc
                var gatewayId = (account.sgwids.length > 0) ? account.sgwids[0] : null; // Gateway ID e.g. 15, 16 etc

                // Display the date their subscription will renew if known
                if (timestamp > 0) {
                    var dateString = time2date(timestamp, 2);

                    // Use format: 14 March 2015 - Credit Card
                    paymentType = dateString + ' - ' + paymentType;

                    // Change placeholder 'Expires on' to 'Renews'
                    $('.account.plan-info.expiry-txt').text(l[6971]);
                    $('.account.plan-info.expiry').text(paymentType);
                }
                else {
                    // Otherwise show nothing
                    $('.account.plan-info.expiry').text('');
                    $('.account.plan-info.expiry-txt').text('');
                }

                var $buttons = $('.account.buttons');
                var $cancelSubscriptionButton = $buttons.find('.btn-cancel-sub');
                var $achievementsButton = $buttons.find('.btn-achievements').addClass('hidden');

                // If Apple or Google subscription (see pro.getPaymentGatewayName function for codes)
                if ((gatewayId === 2) || (gatewayId === 3)) {

                    // Tell them they need to cancel their plan off-site and don't show the feedback dialog
                    $cancelSubscriptionButton.removeClass('hidden').rebind('click', function() {
                        msgDialog('warninga', l[7179], l[16501]);
                    });
                }

                // Otherwise if ECP or Sabadell
                else if ((gatewayId === 16) || (gatewayId === 17)) {

                    // Check if there are any active subscriptions
                    // ccqns = Credit Card Query Number of Subscriptions
                    api_req({a: 'ccqns'}, {
                        callback: function(numOfSubscriptions, ctx) {

                            // If there is an active subscription
                            if (numOfSubscriptions > 0) {

                                // Show cancel button and show cancellation dialog
                                $cancelSubscriptionButton.removeClass('hidden').rebind('click', function() {
                                    accountUI.cancelSubscriptionDialog.init();
                                });
                                $achievementsButton.addClass('hidden');
                            }
                        }
                    });
                }
            }
            else if (account.stype == 'O') {

                // one-time or cancelled subscription
                $('.account.plan-info.expiry a').rebind('click', function() {
                    document.location = $(this).attr('href');
                });
                $('.account.plan-info.expiry-txt').text(l[987]);
                $('.account.plan-info.expiry a').text(time2date(account.expiry, 2));
                $('.account.data-block .btn-cancel-sub').addClass('hidden');
            }

            // Maximum bandwidth
            $('.account.plan-info.bandwidth span').text(bytesToSize(account.bw, 0));
            $('.account.plan-info-row.bandwidth').show();
        }
        else {
            // free account:
            $('.account.plan-info.accounttype span').text(l[435]);
            $('.account.plan-info.expiry').text(l[436]);
            $('.btn-cancel-sub').addClass('hidden');
            $('.account.plan-info-row.bandwidth').hide();
        }

        // Bind Inpust Focus/Blur events
        $('.fm-account-input input').rebind('focus', function() {
            var $wrapper = $(this).parent();

            if (!$wrapper.hasClass('disabled')) {
                $wrapper.addClass('focused');
            }
        });

        $('.fm-account-input input').rebind('blur', function() {
            $(this).parent().removeClass('focused');
        });

        // Upgrade Account Button
        $('.upgrade-to-pro').rebind('click', function() {
            loadSubPage('pro');
        });

        // Maximum disk space
        $('.account.plan-info.storage span').text(bytesToSize(account.space, 0));

        accountUI.fillCharts(account);

        /* Used Storage progressbar */
        var percents = [
            100 * account.stats[M.RootID].bytes / account.space,
            100 * account.stats[M.InboxID].bytes / account.space,
            100 * account.stats.inshares.bytes / account.space,
            100 * account.stats[M.RubbishID].bytes / account.space
        ];
        for (var i = 0; i < 4; i++) {
            var $percBlock = $('.data-block.storage-data .account.pr-item.pr' + i);
            if (percents[i] > 0) {
                $percBlock.removeClass('empty hidden');
            }
            else {
                $percBlock.addClass('empty hidden');
            }
        }

        // Storage usage clickable sections
        $('.account.storage-data .pr-item')
            .rebind('click', function() {
                var section = String($(this).attr('class')).replace(/account|pr-item|empty/g, '').trim();
                switch (section) {
                    case 'pr0':
                        section = M.RootID;
                        break;
                    case 'pr1':
                        section = M.InboxID;
                        break;
                    case 'pr2':
                        section = 'shares';
                        break;
                    case 'pr3':
                        section = M.RubbishID;
                        break;
                    default:
                        section = null;
                        break;
                }

                if (section) {
                    M.openFolder(section);
                }

                return false;
            });

        perc_c = Math.floor(account.space_used / account.space * 100);
        if (perc_c > 100) {
            perc_c = 100;
        }

        // Cloud drive
        $('.account.progress-size.cloud-drive').text(
            account.stats[M.RootID].bytes > 0 ? bytesToSize(account.stats[M.RootID].bytes) : '-'
        );
        // Rubbish bin
        $('.account.progress-size.rubbish-bin').text(
            account.stats[M.RubbishID].bytes > 0 ? bytesToSize(account.stats[M.RubbishID].bytes) : '-'
        );
        // Incoming shares
        $('.account.progress-size.incoming-shares').text(
            account.stats.inshares.bytes ? bytesToSize(account.stats.inshares.bytes) : '-'
        );
        // Inbox
        $('.account.progress-size.inbox').text(
            account.stats[M.InboxID].bytes > 0 ? bytesToSize(account.stats[M.InboxID].bytes) : '-'
        );
        // Available
        $('.tab-content .account.progress-size.available').text(
            account.space - account.space_used > 0 ?
                bytesToSize(account.space - account.space_used) : '-'
        );
        // Progressbar
        $('.tab-content .account.progress-bar').css('width', perc_c + '%');
        // Versioning
        $('.tab-content .account.progress-size.versioning').text(
            bytesToSize(account.stats[M.RootID].vbytes)
        );

        // Go to versioning settings.
        $('.tab-content .version-settings-button').rebind('click', function() {
            loadSubPage('fm/account/file-management');
        });

        /* achievements */
        if (!account.maf) {
            $('.fm-right-account-block').removeClass('active-achievements');
        }
        else {
            $('.fm-right-account-block').addClass('active-achievements');

            mega.achievem.parseAccountAchievements();
        }
        /* QR stuff */
        if (account.contactLink && account.contactLink.length) {
            $('.qr-settings .qr-settings-acc').removeClass('hidden');
            $('.qr-settings .dialog-feature-toggle').addClass('toggle-on')
                .find('.dialog-feature-switch').css('marginLeft', '22px');
        }
        else {
            $('.qr-settings .qr-settings-acc').addClass('hidden');
            $('.qr-settings .dialog-feature-toggle').removeClass('toggle-on')
                .find('.dialog-feature-switch').css('marginLeft', '2px');
        }
        $('.qr-settings .button.access-qr').rebind('click', function () {
            openAccessQRDialog();
        });
        $('.qr-settings .dialog-feature-toggle').rebind('click', function () {
            var me = $(this);
            if (me.hasClass('toggle-on')) {
                me.find('.dialog-feature-switch').animate({ marginLeft: '2px' }, 150, 'swing', function () {
                    me.removeClass('toggle-on');
                    $('.qr-settings .qr-settings-acc').addClass('hidden');
                    api_req({
                        a: 'cld',
                        cl: account.contactLink.substring(2, account.contactLink.length)
                    }, {
                        myAccount: account,
                        callback: function (res, ctx) {
                            if (res === 0) { // success
                                ctx.myAccount.contactLink = '';
                            }
                        }
                    });
                });
            }
            else {
                me.find('.dialog-feature-switch').animate({ marginLeft: '22px' }, 150, 'swing', function () {
                    me.addClass('toggle-on');
                    $('.qr-settings .qr-settings-acc').removeClass('hidden');
                    api_req({ a: 'clc' }, {
                        myAccount: account,
                        callback: function (res, ctx) {
                            if (typeof res !== 'string') {
                                res = '';
                            }
                            else {
                                res = 'C!' + res;
                            }
                            ctx.myAccount.contactLink = res;
                        }
                    });
                });
            }
        });
        /* End QR stuff */


        $('.fm-account-main .pro-upgrade').rebind('click', function(e) {
            loadSubPage('pro');
        });
        $('.account.plan-info.balance span').safeHTML('&euro; @@', account.balance[0][0]);
        var a = 0;
        if (M.c['contacts']) {
            for (var i in M.c['contacts'])
                a++;
        }
        if (!$.sessionlimit) {
            $.sessionlimit = 10;
        }
        if (!$.purchaselimit) {
            $.purchaselimit = 10;
        }
        if (!$.transactionlimit) {
            $.transactionlimit = 10;
        }
        if (!$.voucherlimit) {
            $.voucherlimit = 10;
        }

        $('.account-history-dropdown-button.sessions').text(l[472].replace('[X]', $.sessionlimit));
        $('.account-history-drop-items.session10-').text(l[472].replace('[X]', 10));
        $('.account-history-drop-items.session100-').text(l[472].replace('[X]', 100));
        $('.account-history-drop-items.session250-').text(l[472].replace('[X]', 250));

        var $passwords = $('#account-password,#account-new-password,#account-confirm-password');
        $passwords.unbind('click');

        M.account.sessions.sort(function(a, b) {
            if (a[0] < b[0]) {
                return 1;
            }
            else {
                return -1;
            }
        });

        $('#sessions-table-container').empty();
        var html =
            '<table width="100%" border="0" cellspacing="0" cellpadding="0" class="grid-table sessions">' +
            '<tr><th>' + l[479] + '</th><th>' + l[480] + '</th><th>' + l[481] + '</th><th>' + l[482] + '</th>' +
            '<th class="no-border session-status">' + l[7664] + '</th>' +
            '<th class="no-border logout-column">&nbsp;</th></tr>';
        var numActiveSessions = 0;

        $(account.sessions).each(function(i, el) {

            if (i == $.sessionlimit) {
                return false;
            }

            var userAgent = el[2];
            var dateTime = htmlentities(time2date(el[0]));
            var browser = browserdetails(userAgent);
            var browserName = browser.nameTrans;
            var ipAddress = htmlentities(el[3]);
            var country = countrydetails(el[4]);
            var currentSession = el[5];
            var sessionId = el[6];
            var activeSession = el[7];
            var status = '<span class="current-session-txt">' + l[7665] + '</span>';    // Current

            // Show if using an extension e.g. "Firefox on Linux (+Extension)"
            if (browser.isExtension) {
                browserName += ' (+' + l[7683] + ')';
            }

            // If not the current session
            if (!currentSession) {
                if (activeSession) {
                    status = '<span class="active-session-txt">' + l[7666] + '</span>';     // Active
                }
                else {
                    status = '<span class="expired-session-txt">' + l[1664] + '</span>';    // Expired
                }
            }

            // If unknown country code use question mark gif
            if (!country.icon || country.icon === '??.gif') {
                country.icon = 'ud.gif';
            }

            // Generate row html
            html += '<tr class="' + (currentSession ? "current" : sessionId) + '">'
                + '<td><span class="fm-browsers-icon"><img title="' + escapeHTML(userAgent.replace(/\s*megext/i, ''))
                + '" src="' + staticpath + 'images/browser/' + browser.icon
                + '" /></span><span class="fm-browsers-txt">' + htmlentities(browserName)
                + '</span></td>'
                + '<td>' + ipAddress + '</td>'
                + '<td><span class="fm-flags-icon"><img alt="" src="' + staticpath + 'images/flags/'
                + country.icon + '" style="margin-left: 0px;" /></span><span class="fm-flags-txt">'
                + htmlentities(country.name) + '</span></td>'
                + '<td>' + dateTime + '</td>'
                + '<td>' + status + '</td>';

            // If the session is active show logout button
            if (activeSession) {
                html += '<td>' + '<span class="settings-logout">' + l[967] + '</span>' + '</td></tr>';
            }
            else {
                html += '<td>&nbsp;</td>';
            }

            // If the current session or active then increment count
            if (currentSession || activeSession) {
                numActiveSessions++;
            }
        });
        $('#sessions-table-container').safeHTML(html + '</table>');

        // Don't show button to close other sessions if there's only the current session
        if (numActiveSessions === 1) {
            $('.fm-close-all-sessions').hide();
        }

        $('.fm-close-all-sessions').rebind('click', function() {
            msgDialog('confirmation', '', l[18513], false, function(e) {
                if (e) {
                    loadingDialog.show();
                    var $activeSessionsRows = $('.active-session-txt').parents('tr');
                    // Expire all sessions but not the current one
                    api_req({a: 'usr', ko: 1}, {
                        callback: function() {
                            M.account = null;
                            /* clear account cache */
                            $activeSessionsRows.find('.settings-logout').remove();
                            $activeSessionsRows.find('.active-session-txt')
                                .removeClass('active-session-txt').addClass('expired-session-txt').text(l[1664]);
                            $('.fm-close-all-sessions').hide();
                            loadingDialog.hide();
                        }
                    });
                }
            });
        });

        $('.settings-logout').rebind('click', function() {

            var $this = $(this).parents('tr');
            var sessionId = $this.attr('class');

            if (sessionId === 'current') {
                mLogout();
            }
            else {
                loadingDialog.show();
                /* usr - user session remove
                 * remove a session Id from the current user,
                 * usually other than the current session
                 */
                api_req({a: 'usr', s: [sessionId]}, {
                    callback: function(res, ctx) {
                        M.account = null;
                        /* clear account cache */
                        $this.find('.settings-logout').remove();
                        $this.find('.active-session-txt').removeClass('active-session-txt')
                            .addClass('expired-session-txt').text(l[1664]);
                        loadingDialog.hide();
                    }
                });
            }
        });

        $('.account-history-dropdown-button.purchases').text(l[469].replace('[X]', $.purchaselimit));
        $('.account-history-drop-items.purchase10-').text(l[469].replace('[X]', 10));
        $('.account-history-drop-items.purchase100-').text(l[469].replace('[X]', 100));
        $('.account-history-drop-items.purchase250-').text(l[469].replace('[X]', 250));

        M.account.purchases.sort(function(a, b) {
            if (a[1] < b[1]) {
                return 1;
            }
            else {
                return -1;
            }
        });

        $('.grid-table.purchases tr').remove();
        var html = '<tr><th>' + l[475] + '</th><th>' + l[476] + '</th><th>' + l[477] + '</th><th>' + l[478] + '</th></tr>';

        // Render every purchase made into Purchase History on Account page
        $(account.purchases).each(function(index, purchaseTransaction) {

            if (index === $.purchaselimit) {
                return false;// Break the loop
            }

            // Set payment method
            var paymentMethodId = purchaseTransaction[4];
            var paymentMethod = pro.getPaymentGatewayName(paymentMethodId).displayName;

            // Set Date/Time, Item (plan purchased), Amount, Payment Method
            var dateTime = time2date(purchaseTransaction[1]);
            var price = purchaseTransaction[2];
            var proNum = purchaseTransaction[5];
            var numOfMonths = purchaseTransaction[6];
            var monthWording = (numOfMonths == 1) ? l[931] : 'months';  // Todo: l[6788] when generated
            var item = pro.getProPlanName(proNum) + ' (' + numOfMonths + ' ' + monthWording + ')';

            // Render table row
            html += '<tr>'
                + '<td>' + dateTime + '</td>'
                + '<td>'
                + '<span class="fm-member-icon">'
                + '<i class="small-icon membership pro' + proNum + '"></i>'
                + '</span>'
                + '<span class="fm-member-icon-txt"> ' + item + '</span>'
                + '</td>'
                + '<td>&euro;' + htmlentities(price) + '</td>'
                + '<td>' + paymentMethod + '</td>'
                + '</tr>';
        });

        $('.grid-table.purchases').html(html);
        $('.account-history-dropdown-button.transactions').text(l[471].replace('[X]', $.transactionlimit));
        $('.account-history-drop-items.transaction10-').text(l[471].replace('[X]', 10));
        $('.account-history-drop-items.transaction100-').text(l[471].replace('[X]', 100));
        $('.account-history-drop-items.transaction250-').text(l[471].replace('[X]', 250));

        M.account.transactions.sort(function(a, b) {
            if (a[1] < b[1]) {
                return 1;
            }
            else {
                return -1;
            }
        });

        $('.grid-table.transactions tr').remove();
        var html = '<tr><th>' + l[475] + '</th><th>' + l[484] + '</th><th>' + l[485] + '</th><th>' + l[486] + '</th></tr>';

        $(account.transactions).each(function(i, el) {

            if (i === $.transactionlimit) {
                return false;
            }

            var credit = '', debit = '';

            if (el[2] > 0) {
                credit = '<span class="green">&euro;' + htmlentities(el[2]) + '</span>';
            }
            else {
                debit = '<span class="red">&euro;' + htmlentities(el[2]) + '</span>';
            }
            html += '<tr><td>' + time2date(el[1]) + '</td><td>' + htmlentities(el[0]) + '</td><td>' + credit + '</td><td>' + debit + '</td></tr>';
        });

        $('.grid-table.transactions').html(html);
        var i = new Date().getFullYear() - 10, html = '', sel = '';
        $('.default-select.year span').text('YYYY');

        while (i >= 1900) {
            if (u_attr.birthyear && i == u_attr.birthyear) {
                sel = 'active';
                $('.default-select.year span').text(u_attr.birthyear);
            }
            else {
                sel = '';
            }

            html += '<div class="default-dropdown-item ' + sel + '" data-value="' + i + '">' + i + '</div>';
            i--;
        }

        $('.default-select.year .default-select-scroll').html(html);
        var i = 1, html = '', sel = '';
        $('.default-select.day span').text('DD');

        while (i < 32) {
            if (u_attr.birthday && i == u_attr.birthday) {
                sel = 'active';
                $('.default-select.day span').text(u_attr.birthday);
            }
            else {
                sel = '';
            }
            html += '<div class="default-dropdown-item ' + sel + '" data-value="' + i + '">' + i + '</div>';
            i++;
        }

        $('.default-select.day .default-select-scroll').html(html);
        var i = 1, html = '', sel = '';
        $('.default-select.month span').text('MM');

        while (i < 13) {
            if (u_attr.birthmonth && i == u_attr.birthmonth) {
                sel = 'active';
                $('.default-select.month span').text(u_attr.birthmonth);
            }
            else {
                sel = '';
            }
            html += '<div class="default-dropdown-item ' + sel + '" data-value="' + i + '">' + i + '</div>';
            i++;
        }

        $('.default-select.month .default-select-scroll').html(html);
        var html = '', sel = '';
        $('.default-select.country span').text(l[996]);

        var countries = M.getCountries();
        for (var country in countries) {
            if (!countries.hasOwnProperty(country)) {
                continue;
            }
            if (u_attr.country && country == u_attr.country) {
                sel = 'active';
                $('.default-select.country span').text(countries[country]);
            }
            else {
                sel = '';
            }
            html += '<div class="default-dropdown-item ' + sel + '" data-value="' + country + '">'
                + countries[country]
                + '</div>';
        }
        $('.default-select.country .default-select-scroll').safeHTML(html);

        // Bind Dropdowns events
        bindDropdownEvents($('.fm-account-main .default-select'), 1, '.account.tab-content');

        // Cache selectors
        var $newEmail = $('#account-email');
        var $emailInfoMessage = $('.fm-account-change-email');
        var $personalInfoBlock = $('.profile-form.first');
        var $firstNameField = $personalInfoBlock.find('#account-firstname');
        var $saveBlock = $('.fm-account-save-block');
        var $cancelButton = $saveBlock.find('.fm-account-cancel');
        var $saveButton = $saveBlock.find('.fm-account-save');

        $('#account-password').val('');
        $('#account-new-password').val('');
        $('#account-confirm-password').val('');

        // Reset change email fields after change
        $newEmail.val('');
        $emailInfoMessage.addClass('hidden');

        $passwords.rebind('keyup.em', function() {
            var texts = [];
            $passwords.each(function() {
                texts.push($(this).val());
            });
            $newEmail.val('');
        });

        // On text entry in the new email text field
        $newEmail.rebind('keyup', function() {
            var mail = $.trim($newEmail.val());

            $passwords.val('');
            $saveBlock.find('.fm-account-save').removeClass('disabled');
            $saveBlock.addClass('hidden');

            // Show information message
            $emailInfoMessage.removeClass('hidden');

            // If not valid email yet, exit
            if (checkMail(mail)) {
                return;
            }

            // Show save button
            if (mail !== u_attr.email) {
                $personalInfoBlock.addClass('email-confirm');
                $saveBlock.removeClass('hidden');
            }
        });

        $firstNameField.on('input', function() {

            if ($(this).val().trim().length > 0) {
                $saveBlock.removeClass('hidden');
            }
            else {
                $saveBlock.addClass('hidden');
            }
        });

        $('#account-lastname, #account-phonenumber').rebind('keyup.settingsGeneral', function() {

            if ($firstNameField.val().trim().length > 0) {
                $saveBlock.removeClass('hidden');
            }
            else {
                $saveBlock.addClass('hidden');
            }
        });

        $cancelButton.rebind('click', function() {
            $saveBlock.addClass('hidden');
            $saveBlock.find('.fm-account-save').removeClass('disabled');
            $personalInfoBlock.removeClass('email-confirm');
            $('#account-password').val('');
            $('#account-new-password').val('');
            $('#account-confirm-password').val('');
            accountUI();
        });

        $saveButton.rebind('click', function() {
            if ($(this).hasClass('disabled')) {
                return false;
            }

            $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle, '', 'div', true));
            $('.fm-avatar').safeHTML(useravatar.contact(u_handle, '', 'div'));

            var firstName = String($('#account-firstname').val() || '').trim();
            var lastName = String($('#account-lastname').val() || '').trim();
            var bDay = String($('.default-select.day .default-dropdown-item.active').attr('data-value') || '');
            var bMonth = String($('.default-select.month .default-dropdown-item.active').attr('data-value') || '');
            var bYear = String($('.default-select.year .default-dropdown-item.active').attr('data-value') || '');
            var country = String($('.default-select.country .default-dropdown-item.active').attr('data-value') || '');

            var apiCallNeeded = false;
            var userAttrRequest = { a: 'up' };

            if (u_attr.firstname == null || u_attr.firstname !== firstName) {
                // we want also to catch the 'undefined' or null and replace with the empty string (or given string)
                u_attr.firstname = firstName || 'Nobody';
                userAttrRequest.firstname = base64urlencode(to8(u_attr.firstname));
                apiCallNeeded = true;
            }
            if (u_attr.lastname == null || u_attr.lastname !== lastName) {
                // we want also to catch the 'undefined' or null and replace with the empty string (or given string)
                u_attr.lastname = lastName;
                userAttrRequest.lastname = base64urlencode(to8(u_attr.lastname));
                apiCallNeeded = true;
            }
            if (u_attr.birthday == null || u_attr.birthday !== bDay) {
                u_attr.birthday = bDay;
                userAttrRequest.birthday = base64urlencode(u_attr.birthday);
                apiCallNeeded = true;
            }
            if (u_attr.birthmonth == null || u_attr.birthmonth !== bMonth) {
                u_attr.birthmonth = bMonth;
                userAttrRequest.birthmonth = base64urlencode(u_attr.birthmonth);
                apiCallNeeded = true;
            }
            if (u_attr.birthyear == null || u_attr.birthyear !== bYear) {
                u_attr.birthyear = bYear;
                userAttrRequest.birthyear = base64urlencode(u_attr.birthyear);
                apiCallNeeded = true;
            }
            if (u_attr.country == null || u_attr.country !== country) {
                u_attr.country = country;
                userAttrRequest.country = base64urlencode(u_attr.country);
                apiCallNeeded = true;
            }

            if (apiCallNeeded) {
                api_req(userAttrRequest, {
                    callback: function (res) {
                        if (res === u_handle) {
                            $('.user-name').text(u_attr.name);
                            showToast('settings', l[7698]);
                            accountUI();
                        }
                    }
                });
            }

            var pws = zxcvbn($('#account-new-password').val());

            if ($('#account-new-password').val() !== $('#account-confirm-password').val()) {
                msgDialog('warninga', l[135], l[715], false, function() {
                    $('#account-new-password').val('');
                    $('#account-confirm-password').val('');
                    $('#account-new-password').focus();
                    $('.fm-account-save-block').removeClass('hidden');
                    $('.fm-account-save').addClass('disabled');
                });
            }
            else if (/*$('#account-password').val() !== ''
                &&*/ $('#account-confirm-password').val() !== ''
                && $('#account-new-password').val() !== ''
                && (pws.score === 0 || pws.entropy < 16)) {

                msgDialog('warninga', l[135], l[1129], false, function() {
                    $('#account-new-password').val('');
                    $('#account-confirm-password').val('');
                    $('#account-new-password').focus();
                    $('.fm-account-save-block').removeClass('hidden');
                    $('.fm-account-save').addClass('disabled');
                });
            }
            else if ($('#account-confirm-password').val() !== '' /*&& $('#account-password').val() !== ''
                && $('#account-confirm-password').val() !== $('#account-password').val()*/) {
                loadingDialog.show();
                changepw($('#account-password').val(), $('#account-confirm-password').val(), {
                    callback: function(res) {
                        loadingDialog.hide();
                        if (res == EACCESS) { // pwd incorrect
                            msgDialog('warninga', l[135], l[724], false, function() {
                                $('#account-password').val('');
                                $('#account-password').focus();
                                $('#account-password').bind('keyup.accpwd', function() {
                                    $('.fm-account-save-block').removeClass('hidden');
                                    $('.fm-account-save').removeClass('disabled');
                                    $('#account-password').unbind('keyup.accpwd');
                                });
                            });
                        }
                        else if (typeof res == 'number' && res < 0) { // something went wrong
                            $passwords.val('');
                            msgDialog('warninga', l[135], l[6972]);
                        }
                        else { // success
                            showToast('settings', l[725]);
                            var pw_aes = new sjcl.cipher.aes(prepare_key_pw($('#account-confirm-password').val()));
                            u_attr.k = a32_to_base64(encrypt_key(pw_aes, u_k));
                            $passwords.val('');
                        }
                        accountUI();
                    }
                });
            }
            /*else if ($('#account-password').val() !== ''
                    && $('#account-confirm-password').val() === $('#account-password').val()) {
                msgDialog('warninga', l[135], l[16664]);
                $('#account-confirm-password').val('');
                $('#account-new-password').val('');
                $('.fm-account-save-block').removeClass('hidden');
                $('.fm-account-save').addClass('disabled');
            }*/
            else {
                $passwords.val('');
            }

            // Get the new email address
            var email = $('#account-email').val().trim().toLowerCase();

            // If there is text in the email field and it doesn't match the existing one
            if ((email !== '') && (u_attr.email !== email)) {

                loadingDialog.show();

                // Request change of email
                // e => new email address
                // i => requesti (Always has the global variable requesti (last request ID))
                api_req({ a: 'se', aa: 'a', e: email, i: requesti }, {
                    callback: function(res) {

                        loadingDialog.hide();

                        if (res === -12) {
                            return msgDialog('warninga', l[135], l[7717]);
                        }

                        fm_showoverlay();
                        dialogPositioning('.awaiting-confirmation');

                        $('.awaiting-confirmation').removeClass('hidden');
                        $('.fm-account-save-block').addClass('hidden');
                        $('.fm-account-save').removeClass('disabled');

                        localStorage.new_email = email;
                    }
                });

                return;
            }

            $('.fm-account-save-block').addClass('hidden');
            $('.fm-account-save').removeClass('disabled');
        });

        $('#current-email').val(u_attr.email);
        $('#account-firstname').val(u_attr.firstname);
        $('#account-lastname').val(u_attr.lastname);

        $('.account-history-dropdown-button').rebind('click', function() {
            $(this).addClass('active');
            $('.account-history-dropdown').addClass('hidden');
            $(this).next().removeClass('hidden');
        });

        $('.account-history-drop-items').rebind('click', function() {

            $(this).parent().prev().removeClass('active');
            $(this).parent().find('.account-history-drop-items').removeClass('active');
            $(this).parent().parent().find('.account-history-dropdown-button').text($(this).text());

            var c = $(this).attr('class');

            if (!c) {
                c = '';
            }

            if (c.indexOf('session10-') > -1) {
                $.sessionlimit = 10;
            }
            else if (c.indexOf('session100-') > -1) {
                $.sessionlimit = 100;
            }
            else if (c.indexOf('session250-') > -1) {
                $.sessionlimit = 250;
            }

            if (c.indexOf('purchase10-') > -1) {
                $.purchaselimit = 10;
            }
            else if (c.indexOf('purchase100-') > -1) {
                $.purchaselimit = 100;
            }
            else if (c.indexOf('purchase250-') > -1) {
                $.purchaselimit = 250;
            }

            if (c.indexOf('transaction10-') > -1) {
                $.transactionlimit = 10;
            }
            else if (c.indexOf('transaction100-') > -1) {
                $.transactionlimit = 100;
            }
            else if (c.indexOf('transaction250-') > -1) {
                $.transactionlimit = 250;
            }

            if (c.indexOf('voucher10-') > -1) {
                $.voucherlimit = 10;
            }
            else if (c.indexOf('voucher100-') > -1) {
                $.voucherlimit = 100;
            }
            else if (c.indexOf('voucher250-') > -1) {
                $.voucherlimit = 250;
            }
            else if (c.indexOf('voucherAll-') > -1) {
                $.voucherlimit = 'all';
            }

            $(this).addClass('active');
            $(this).closest('.account-history-dropdown').addClass('hidden');
            accountUI();
        });

        // LITE/PRO account
        if (u_attr.p) {
            var bandwidthLimit = Math.round(account.servbw_limit | 0);

            $('#bandwidth-slider').slider({
                min: 0, max: 100, range: 'min', value: bandwidthLimit,
                change: function(e, ui) {
                    if (M.currentdirid === 'account/transfers') {
                        bandwidthLimit = ui.value;

                        if (parseInt(localStorage.bandwidthLimit) !== bandwidthLimit) {

                            var done = delay.bind(null, 'bandwidthLimit', function() {
                                api_req({"a": "up", "srvratio": Math.round(bandwidthLimit)});
                                localStorage.bandwidthLimit = bandwidthLimit;
                                showToast('settings', l[16168]);
                            }, 700);

                            if (bandwidthLimit > 99) {
                                msgDialog('warningb:!' + l[776], l[882], l[12689], 0, function(e) {
                                    if (e) {
                                        done();
                                    }
                                    else {
                                        $('.slider-percentage span').text('0 %').removeClass('bold warn');
                                        $('#bandwidth-slider').slider('value', 0);
                                    }
                                });
                            }
                            else {
                                done();
                            }
                        }
                    }
                },
                slide: function(e, ui) {
                    $('.slider-percentage span').text(ui.value + ' %');

                    if (ui.value > 90) {
                        $('.slider-percentage span').addClass('warn bold');
                    }
                    else {
                        $('.slider-percentage span').removeClass('bold warn');
                    }
                }
            });
            $('.slider-percentage span').text(bandwidthLimit + ' %');
            $('.bandwith-settings').removeClass('hidden');
        }

        $('#slider-range-max2').slider({
            min: 1, max: 6, range: "min", value: fmconfig.dl_maxSlots || 4,
            change: function(e, ui) {
                if (M.currentdirid === 'account/transfers' && ui.value !== fmconfig.dl_maxSlots) {
                    mega.config.setn('dl_maxSlots', ui.value);
                    dlQueue.setSize(fmconfig.dl_maxSlots);
                }
            },
            slide: function(e, ui) {
                $('.upload-settings .numbers.active').removeClass('active');
                $('.upload-settings .numbers.val' + ui.value).addClass('active');
            }
        });
        $('.download-settings .numbers.active').removeClass('active');
        $('.download-settings .numbers.val' + $('#slider-range-max2').slider('value')).addClass('active');

        $('#slider-range-max').slider({
            min: 1, max: 6, range: "min", value: fmconfig.ul_maxSlots || 4,
            change: function(e, ui) {
                if (M.currentdirid === 'account/transfers' && ui.value !== fmconfig.ul_maxSlots) {
                    mega.config.setn('ul_maxSlots', ui.value);
                    ulQueue.setSize(fmconfig.ul_maxSlots);
                }
            },
            slide: function(e, ui) {
                $('.download-settings .numbers.active').removeClass('active');
                $('.download-settings .numbers.val' + ui.value).addClass('active');
            }
        });
        $('.upload-settings .numbers.active').removeClass('active');
        $('.upload-settings .numbers.val' + $('#slider-range-max').slider('value')).addClass('active');

        $('.ulspeedradio').removeClass('radioOn').addClass('radioOff');
        var i = 3;
        if ((fmconfig.ul_maxSpeed | 0) === 0) {
            i = 1;
        }
        else if (fmconfig.ul_maxSpeed === -1) {
            i = 2;
        }
        else {
            $('#ulspeedvalue').val(Math.floor(fmconfig.ul_maxSpeed / 1024));
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        if (fmconfig.font_size) {
            $('.uifontsize input')
                .removeClass('radioOn').addClass('radioOff')
                .parent()
                .removeClass('radioOn').addClass('radioOff');
            $('#fontsize' + fmconfig.font_size)
                .removeClass('radioOff').addClass('radioOn')
                .parent()
                .removeClass('radioOff').addClass('radioOn');
        }
        $('.ulspeedradio input').rebind('click', function(e) {
            var ul_maxSpeed;
            var id = $(this).attr('id');
            if (id == 'rad2') {
                ul_maxSpeed = -1;
            }
            else if (id == 'rad1') {
                ul_maxSpeed = 0;
            }
            else {
                if (parseInt($('#ulspeedvalue').val()) > 0) {
                    ul_maxSpeed = parseInt($('#ulspeedvalue').val()) * 1024;
                }
                else {
                    ul_maxSpeed = 100 * 1024;
                }
            }
            $('.ulspeedradio').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            mega.config.setn('ul_maxSpeed', ul_maxSpeed);
        });
        $('#ulspeedvalue').rebind('click keyup', function(e) {
            $('.ulspeedradio').removeClass('radioOn').addClass('radioOff');
            $('#rad3,#rad3_div').addClass('radioOn').removeClass('radioOff');
            $('#rad3').trigger('click');
        });

        $('.uifontsize input').rebind('click', function(e) {
            $('body').removeClass('fontsize1 fontsize2').addClass('fontsize' + $(this).val());
            $('.uifontsize input').removeClass('radioOn').addClass('radioOff').parent().removeClass('radioOn').addClass('radioOff');
            $(this).removeClass('radioOff').addClass('radioOn').parent().removeClass('radioOff').addClass('radioOn');
            mega.config.setn('font_size', $(this).val());
        });

        $('.ulskip').removeClass('radioOn').addClass('radioOff');
        var i = 5;
        if (fmconfig.ul_skipIdentical) {
            i = 4;
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.ulskip input').rebind('click', function(e) {
            var ul_skipIdentical = 0;
            var id = $(this).attr('id');
            if (id == 'rad4') {
                ul_skipIdentical = 1;
            }

            $('.ulskip').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            mega.config.setn('ul_skipIdentical', ul_skipIdentical);
        });

        $('.dlThroughMEGAsync').removeClass('radioOn').addClass('radioOff');
        i = 19;
        if (fmconfig.dlThroughMEGAsync) {
            i = 18;
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.dlThroughMEGAsync input').rebind('click', function(e) {
            var dlThroughMEGAsync = 0;
            var id = $(this).attr('id');
            if (id === 'rad18') {
                dlThroughMEGAsync = 1;
            }

            $('.dlThroughMEGAsync').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            mega.config.setn('dlThroughMEGAsync', dlThroughMEGAsync);
        });

        var $cbTpp = $('#transfers-tooltip');// Checkbox transfers popup
        if (fmconfig.tpp) {

            $cbTpp.switchClass('checkboxOff', 'checkboxOn').prop('checked', true);
            $cbTpp.parent().switchClass('checkboxOff', 'checkboxOn');
        }
        else {
            $cbTpp.switchClass('checkboxOn', 'checkboxOff').prop('checked', false);
            $cbTpp.parent().switchClass('checkboxOn', 'checkboxOff');
        }

        $('#transfers-tooltip').rebind('click.tpp_enable_disable', function() {
            var $this = $(this);

            if (fmconfig.tpp) {
                $this.switchClass('checkboxOn', 'checkboxOff');
                $this.parent().switchClass('checkboxOn', 'checkboxOff');
                mega.config.setn('tpp', 0);
            }
            else {
                $this.switchClass('checkboxOff', 'checkboxOn').prop('checked', true);
                $this.parent().switchClass('checkboxOff', 'checkboxOn');
                mega.config.setn('tpp', 1);
            }
        });

        $('.dbDropOnLogout').removeClass('radioOn').addClass('radioOff');
        i = 21;
        if (fmconfig.dbDropOnLogout) {
            i = 20;
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.dbDropOnLogout input').rebind('click', function(e) {
            var id = $(this).attr('id');
            var dbDropOnLogout = 0;
            if (id === 'rad20') {
                dbDropOnLogout = 1;
            }
            mega.config.setn('dbDropOnLogout', dbDropOnLogout);
            $('.dbDropOnLogout').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
        });

        $('.uisorting').removeClass('radioOn').addClass('radioOff');
        var i = 8;
        if (fmconfig.uisorting) {
            i = 9;
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.uisorting input').rebind('click', function(e) {
            var uisorting = 0;
            var id = $(this).attr('id');
            if (id == 'rad9') {
                uisorting = 1;
            }
            $('.uisorting').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            mega.config.setn('uisorting', uisorting);
        });

        $('.uiviewmode').removeClass('radioOn').addClass('radioOff');
        var i = 10;
        if (fmconfig.uiviewmode) {
            i = 11;
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.uiviewmode input').rebind('click', function(e) {
            var uiviewmode = 0;
            var id = $(this).attr('id');
            if (id == 'rad11') {
                uiviewmode = 1;
            }
            $('.uiviewmode').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            mega.config.setn('uiviewmode', uiviewmode);
        });

        $('.rubsched, .rubschedopt').removeClass('radioOn').addClass('radioOff');
        var i = 13;
        if (u_attr.flags.ssrs > 0) {
            var value = 90; // days
            $('.rubsched-options').removeClass('hidden');

            // non-pro users cannot disable it
            if (!u_attr.p) {
                // hide on/off switches
                $('.rubsched').addClass('hidden').next().addClass('hidden');
                value = 30; // days
            }
            $('.rubschedopt-none').addClass('hidden');

            if (M.account.ssrs !== undefined) {
                value = M.account.ssrs;
            }
            i = 14;
            $('#rad' + i + '_opt').val(value);
            $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
            $('#rad' + i).removeClass('radioOff').addClass('radioOn');
            i = 12;
            if (!value) {
                i = 13;
                $('.rubsched-options').addClass('hidden');
            }

            // show/hide on/off switches
            if (u_attr.p) {
                $('.rubbish-desc').text(l[18685]).removeClass('hidden');
                $('.pro-rubsched-options').removeClass('hidden');
            }
            else {
                $('.rubbish-settings .green-notification').removeClass('hidden');
                $('.rubbish-desc').text(l[18686]).removeClass('hidden');
                $('.pro-rubsched-options').addClass('hidden');
            }
        }
        else if (fmconfig.rubsched) {
            i = 12;
            $('.rubsched-options').removeClass('hidden');
            var opt = String(fmconfig.rubsched).split(':');
            $('#rad' + opt[0] + '_opt').val(opt[1]);
            $('#rad' + opt[0] + '_div').removeClass('radioOff').addClass('radioOn');
            $('#rad' + opt[0]).removeClass('radioOff').addClass('radioOn');
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.rubschedopt input').rebind('click', function(e) {
            var id = $(this).attr('id');
            var opt = $('#' + id + '_opt').val();
            mega.config.setn('rubsched', id.substr(3) + ':' + opt);
            $('.rubschedopt').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            // initAccountScroll(1);
        });
        $('.rubsched_textopt').rebind('click.rs blur.rs keypress.rs', function(e) {
            var minVal = 7;
            var maxVal = u_attr.p ? Math.pow(2, 53) : 30;
            var curVal = parseInt($(this).val()) | 0;

            // Do not save value until user leave input or click Enter button
            if (e.which && e.which !== 13) {
                return;
            }

            curVal = Math.min(Math.max(curVal, minVal), maxVal);
            $(this).val(curVal);

            var id = String($(this).attr('id')).split('_')[0];
            $('.rubschedopt').removeClass('radioOn').addClass('radioOff');
            $('#' + id + ',#' + id + '_div').addClass('radioOn').removeClass('radioOff');
            mega.config.setn('rubsched', id.substr(3) + ':' + curVal);
            // initAccountScroll(1);
        });
        $('.rubsched input').rebind('click', function() {
            var id = $(this).attr('id');
            if (id === 'rad13') {
                mega.config.setn('rubsched', 0);
                $('.rubsched-options').addClass('hidden');
            }
            else if (id === 'rad12') {
                $('.rubsched-options').removeClass('hidden');
                if (!fmconfig.rubsched) {
                    var defValue = u_attr.p ? 90 : 30;
                    var defOption = 14;
                    mega.config.setn('rubsched', defOption + ":" + defValue);
                    $('#rad' + defOption + '_div').removeClass('radioOff').addClass('radioOn');
                    $('#rad' + defOption).removeClass('radioOff').addClass('radioOn');
                    $('#rad' + defOption + '_opt').val(defValue);
                }
            }
            $('.rubsched').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            // initAccountScroll(1);
        });

        $('.redeem-voucher').rebind('click', function(event) {
            var $this = $(this);
            if ($this.attr('class').indexOf('active') == -1) {
                $('.fm-account-overlay').fadeIn(100);
                $this.addClass('active');
                $('.fm-voucher-popup').removeClass('hidden');
                accountUI.voucherCentering($this);
                $(window).rebind('resize.voucher', function(e) {
                    accountUI.voucherCentering($this);
                });

                $('.fm-account-overlay, .fm-purchase-voucher, .fm-voucher-button').rebind('click.closeDialog', function() {
                    $('.fm-account-overlay').fadeOut(100);
                    $('.redeem-voucher').removeClass('active');
                    $('.fm-voucher-popup').addClass('hidden');
                });
            }
            else {
                $('.fm-account-overlay').fadeOut(200);
                $this.removeClass('active');
                $('.fm-voucher-popup').addClass('hidden');
                $(window).unbind('resize.voucher');
            }
        });

        $('.fm-voucher-body input').rebind('focus', function(e) {
            if ($(this).val() == l[487]) {
                $(this).val('');
            }
        });

        $('.fm-voucher-body input').rebind('blur', function(e) {
            if ($(this).val() == '') {
                $(this).val(l[487]);
            }
        });

        $('.fm-voucher-button').rebind('click', function(e) {
            if ($('.fm-voucher-body input').val() == l[487]) {
                msgDialog('warninga', l[135], l[1015]);
            }
            else {
                loadingDialog.show();
                api_req({a: 'uavr', v: $('.fm-voucher-body input').val()},
                    {
                        callback: function(res, ctx) {
                            loadingDialog.hide();
                            $('.fm-voucher-popup').addClass('hidden');
                            $('.fm-voucher-body input').val(l[487]);
                            if (typeof res == 'number') {
                                if (res == -11) {
                                    msgDialog('warninga', l[135], l[714]);
                                }
                                else if (res < 0) {
                                    msgDialog('warninga', l[135], l[473]);
                                }
                                else {
                                    if (M.account) {
                                        M.account.lastupdate = 0;
                                    }
                                    accountUI();
                                }
                            }
                        }
                    });
            }
        });

        $('.vouchercreate').rebind('click', function(e) {
            var vouchertype = $('.default-select.vouchertype .default-dropdown-item.active').attr('data-value');
            var voucheramount = parseInt($('#account-voucheramount').val());
            var proceed = false;
            for (var i in M.account.prices)
                if (M.account.prices[i][0] == vouchertype) {
                    proceed = true;
                }
            if (!proceed) {
                msgDialog('warninga', l[135], 'Please select the voucher type.');
                return false;
            }
            if (!voucheramount) {
                msgDialog('warninga', l[135], 'Please enter a valid voucher amount.');
                return false;
            }
            if (vouchertype === '19.99') {
                vouchertype = '19.991';
            }
            loadingDialog.show();
            api_req({a: 'uavi', d: vouchertype, n: voucheramount, c: 'EUR'},
                {
                    callback: function(res, ctx) {
                        M.account.lastupdate = 0;
                        accountUI();
                    }
                });
        });

        if (M.account.reseller) {
            var email = 'resellers@mega.nz';

            $('.resellerbuy').attr('href', 'mailto:' + email)
                .find('span').text(l[9106].replace('%1', email));

            // Use 'All' or 'Last 10/100/250' for the dropdown text
            var buttonText = ($.voucherlimit === 'all') ? l[7557] : l['466a'].replace('[X]', $.voucherlimit);

            $('.account-history-dropdown-button.vouchers').text(buttonText);
            $('.fm-account-reseller .membership-big-txt.balance').safeHTML('@@ &euro; ', account.balance[0][0]);
            $('.account-history-drop-items.voucher10-').text(l['466a'].replace('[X]', 10));
            $('.account-history-drop-items.voucher100-').text(l['466a'].replace('[X]', 100));
            $('.account-history-drop-items.voucher250-').text(l['466a'].replace('[X]', 250));

            // Sort vouchers by most recently created at the top
            M.account.vouchers.sort(function(a, b) {

                if (a['date'] < b['date']) {
                    return 1;
                }
                else {
                    return -1;
                }
            });

            $('.grid-table.vouchers tr').remove();
            $('.fm-account-button.reseller').removeClass('hidden');
            var html = '<tr><th>' + l[475] + '</th><th>' + l[7714] + '</th><th>' + l[477] + '</th><th>' + l[488] + '</th></tr>';

            $(account.vouchers).each(function(i, el) {

                // Only show the last 10, 100, 250 or if the limit is not set show all vouchers
                if (($.voucherlimit !== 'all') && (i >= $.voucherlimit)) {
                    return false;
                }

                var status = l[489];
                if (el.redeemed > 0 && el.cancelled == 0 && el.revoked == 0) {
                    status = l[490] + ' ' + time2date(el.redeemed);
                }
                else if (el.revoked > 0 && el.cancelled > 0) {
                    status = l[491] + ' ' + time2date(el.revoked);
                }
                else if (el.cancelled > 0) {
                    status = l[492] + ' ' + time2date(el.cancelled);
                }

                var voucherLink = 'https://mega.nz/#voucher' + htmlentities(el.code);

                html += '<tr><td>' + time2date(el.date) + '</td><td class="selectable">' + voucherLink + '</td><td>&euro; ' + htmlentities(el.amount) + '</td><td>' + status + '</td></tr>';
            });
            $('.grid-table.vouchers').html(html);
            $('.default-select.vouchertype .default-select-scroll').html('');
            var prices = [];
            for (var i in M.account.prices) {
                prices.push(M.account.prices[i][0]);
            }
            prices.sort(function(a, b) {
                return (a - b)
            })

            var voucheroptions = '';
            for (var i in prices)
                voucheroptions += '<div class="default-dropdown-item" data-value="' + htmlentities(prices[i]) + '">&euro;' + htmlentities(prices[i]) + ' voucher</div>';
            $('.default-select.vouchertype .default-select-scroll').html(voucheroptions);
            bindDropdownEvents($('.default-select.vouchertype'), 0, '.fm-account-reseller');
        }

        $('.fm-purchase-voucher,.default-white-button.topup').rebind('click', function(e) {
            loadSubPage('resellers');
        });

        if (is_extension || ssl_needed()) {
            $('#acc_use_ssl').hide();
        }

        $('.usessl').removeClass('radioOn').addClass('radioOff');
        var i = 7;
        if (use_ssl) {
            i = 6;
        }
        $('#rad' + i + '_div').removeClass('radioOff').addClass('radioOn');
        $('#rad' + i).removeClass('radioOff').addClass('radioOn');
        $('.usessl input').rebind('click', function(e) {
            var id = $(this).attr('id');
            if (id == 'rad7') {
                use_ssl = 0;
            }
            else if (id == 'rad6') {
                use_ssl = 1;
            }
            $('.usessl').removeClass('radioOn').addClass('radioOff');
            $(this).addClass('radioOn').removeClass('radioOff');
            $(this).parent().addClass('radioOn').removeClass('radioOff');
            mega.config.setn('use_ssl', use_ssl | 0);
            localStorage.use_ssl = fmconfig.use_ssl;
        });

        $('.fm-account-remove-avatar,.fm-account-avatar').rebind('click', function() {
            msgDialog('confirmation', l[1756], l[6973], false, function(e) {
                if (e) {
                    mega.attr.set('a', 'none', true, false);

                    useravatar.invalidateAvatar(u_handle);
                    $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle, '', 'div', true));
                    $('.fm-avatar').safeHTML(useravatar.contact(u_handle, '', 'div'));
                    $('.fm-account-remove-avatar').hide();
                }
            });
        });

        $('.fm-account-change-avatar,.fm-account-avatar').rebind('click', function(e) {
            avatarDialog();
        });
        $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle, '', 'div', true));

        $('#find-duplicate').rebind('click', M.findDupes);

        $.tresizer();

        clickURLs();

    }, 1);

    $('.editprofile').rebind('click', function() {
        loadSubPage('fm/account');
    });

    $('.rubbish-bin-link').rebind('click', function() {
        loadSubPage('fm/rubbish');
    });

    // Cancel account button on main Account page
    $('.cancel-account').rebind('click', function() {

        // Please confirm that all your data will be deleted
        var confirmMessage = l[1974];

        // Search through their Pro plan purchase history
        $(account.purchases).each(function(index, purchaseTransaction) {

            // Get payment method name
            var paymentMethodId = purchaseTransaction[4];
            var paymentMethod = pro.getPaymentGatewayName(paymentMethodId).name;

            // If they have paid with iTunes or Google Play in the past
            if ((paymentMethod === 'apple') || (paymentMethod === 'google')) {

                // Update confirmation message to remind them to cancel iTunes or Google Play
                confirmMessage += ' ' + l[8854];
                return false;
            }
        });

        // Ask for confirmation
        msgDialog('confirmation', l[6181], confirmMessage, false, function(event) {
            if (event) {
                loadingDialog.show();
                api_req({a: 'erm', m: Object(M.u[u_handle]).m, t: 21}, {
                    callback: function(res) {
                        loadingDialog.hide();
                        if (res === ENOENT) {
                            msgDialog('warningb', l[1513], l[1946]);
                        }
                        else if (res === 0) {
                            handleResetSuccessDialogs('.reset-success', l[735], 'deleteaccount');
                        }
                        else {
                            msgDialog('warningb', l[135], l[200]);
                        }
                    }
                });
            }
        });
    });

    // Button on main Account page to backup their master key
    $('.backup-master-key').rebind('click', function() {
        loadSubPage('backup');
    });

    $('.default-grey-button.reviewsessions').rebind('click', function() {
        loadSubPage('fm/account/history');
    });

    $('.fm-account-button').rebind('click', function() {
        if ($(this).attr('class').indexOf('active') == -1) {
            switch (true) {
                case $(this).hasClass('account-s'):
                    loadSubPage('fm/account');
                    break;
                case $(this).hasClass('advanced'):
                    loadSubPage('fm/account/advanced');
                    break;
                case $(this).hasClass('notifications'):
                    loadSubPage('fm/account/notifications');
                    break;
                case $(this).hasClass('history'):
                    loadSubPage('fm/account/history');
                    break;
                case $(this).hasClass('reseller'):
                    loadSubPage('fm/account/reseller');
                    break;
                case $(this).hasClass('megadrop'):
                    loadSubPage('fm/account/megadrop');
                    break;
            }
        }
    });

    $('.account.tab-lnk').rebind('click', function() {
        if (!$(this).hasClass('active')) {
            $('.fm-account-save-block').addClass('hidden');
            $('.fm-account-save').removeClass('disabled');
            var $this = $(this);
            var $sectionBlock = $this.closest('.fm-account-sections');
            var currentTab = $this.attr('data-tab');
            var page = 'fm/account/' + currentTab;

            if ($sectionBlock.hasClass('fm-account-settings')) {
                if (currentTab === 'ui') {
                    page = 'fm/account/advanced';
                }
                else if (currentTab === 'fm') {
                    page = 'fm/account/file-management';
                }
            }
            else if ($sectionBlock.hasClass('fm-account-notifications')) {
                if (currentTab === 'cloud-drive') {
                    page = 'fm/account/notifications';
                }
                else {
                    page = 'fm/account/' + currentTab + '-notifications';
                }
            }
            else if ($sectionBlock.hasClass('fm-account-profile')) {
                if (currentTab === 'general') {
                    page = 'fm/account';
                }
            }
            loadSubPage(page);
            return false;

            // $sectionBlock.find('.account.tab-content:not(.hidden)').addClass('hidden');
            // $sectionBlock.find('.account.tab-content.' + currentTab).removeClass('hidden');
            // $sectionBlock.find('.account.tab-lnk.active').removeClass('active');
            // $this.addClass('active');
            // $(window).trigger('resize');
        }
    });

    $('.account-pass-lines').attr('class', 'account-pass-lines');
    $('#account-new-password').rebind('keyup.pwdchg', function(el) {
        $('.account-pass-lines').attr('class', 'account-pass-lines');
        if ($(this).val() !== '') {
            $('.fm-account-save-block').removeClass('hidden');
            $('.fm-account-save').addClass('disabled');
            if ($(this).val() === $('#account-confirm-password').val()) {
                $('.fm-account-save').removeClass('disabled');
            }
            else {
                $('.fm-account-save').addClass('disabled');
            }
            var pws = zxcvbn($(this).val());
            if (pws.score > 3 && pws.entropy > 75) {
                $('.account-pass-lines').addClass('good4');
            }
            else if (pws.score > 2 && pws.entropy > 50) {
                $('.account-pass-lines').addClass('good3');
            }
            else if (pws.score > 1 && pws.entropy > 40) {
                $('.account-pass-lines').addClass('good2');
            }
            else if (pws.score > 0 && pws.entropy > 15) {
                $('.account-pass-lines').addClass('good1');
            }
            else {
                $('.account-pass-lines').addClass('weak-password');
            }
        }
    });

    $('#account-confirm-password').rebind('keyup.pwdchg', function(el) {

        $('.fm-account-save-block').removeClass('hidden');
        if ($(this).val() === $('#account-new-password').val()) {
            $('.fm-account-save').removeClass('disabled');
        }
        else {
            $('.fm-account-save').addClass('disabled');
        }
    });

    // Account Notifications settings handling
    var accNotifHandler = function accNotifHandler() {
        var $parent = $(this);
        var $input = $parent.find('input');
        var $tab = $parent.closest('.tab-content');
        var type = $input.attr('type');
        var tab = accNotifHandler.getTabName($tab);

        if (type === 'radio') {
            var RADIO_ENABLE = "1";
            var RADIO_DISABLE = "2";

            var $container = $parent.closest('.radio-buttons');

            $('.radioOn', $container)
                .removeClass('radioOn').addClass('radioOff');

            $input.removeClass('radioOff').addClass('radioOn');
            $parent.removeClass('radioOff').addClass('radioOn');

            switch ($input.val()) {
                case RADIO_ENABLE:
                    mega.notif.set('enabled', tab);
                    break;
                case RADIO_DISABLE:
                    mega.notif.unset('enabled', tab);
                    break;
                default:
                    console.error('Invalid radio value...', tab, $input);
                    break;
            }
        }
        else if (type === 'checkbox') {

            if ($input.hasClass('checkboxOn')) {
                $input.removeClass('checkboxOn').addClass('checkboxOff').prop('checked', false);
                $parent.removeClass('checkboxOn').addClass('checkboxOff');
                mega.notif.unset($input.attr('name'), tab);
            }
            else {
                $input.removeClass('checkboxOff').addClass('checkboxOn').prop('checked', true);
                $parent.removeClass('checkboxOff').addClass('checkboxOn');
                mega.notif.set($input.attr('name'), tab);
            }
        }
        else {
            console.error('Unknown type.', type, $input);
        }

        return false;
    };
    accNotifHandler.getTabName = function($tab) {
        var tab = String($tab.attr('class'))
            .split(" ").filter(function(c) {
                return ({
                    'chat': 1,
                    'contacts': 1,
                    'cloud-drive': 1
                })[c];
            });
        return String(tab).split('-').shift();
    };
    $('.fm-account-notifications input').each(function(i, e) {
        $(e).parent().rebind('click', accNotifHandler);
    });
    $('.fm-account-notifications .tab-content').each(function(i, e) {
        var $input;
        var $tab = $(e);
        var $radios = $('.radio-buttons', $tab);
        var tab = accNotifHandler.getTabName($tab);

        $('.radioOn', $radios)
            .removeClass('radioOn').addClass('radioOff');

        if (mega.notif.has('enabled', tab)) {
            $input = $('input:first', $radios);
        }
        else {
            $input = $('input:last', $radios);
        }

        $input.removeClass('radioOff').addClass('radioOn');
        $input.parent().removeClass('radioOff').addClass('radioOn');

        var $checkboxes = $('.checkbox-buttons', $tab);
        if ($checkboxes.length) {
            $('input', $checkboxes).each(function(i, e) {
                var $input = $(e);
                var $item = $input.closest('.checkbox-item');

                $('.checkboxOn', $item)
                    .removeClass('checkboxOn')
                    .addClass('checkboxOff')
                    .prop('checked', false);

                if (mega.notif.has($input.attr('name'), tab)) {
                    $input.removeClass('checkboxOff').addClass('checkboxOn').prop('checked', true);
                    $input.parent().removeClass('checkboxOff').addClass('checkboxOn');
                }
            });
        }
    });
    accNotifHandler = undefined;
}

/**
 * Update user UI (pro plan, avatar, first/last name, email)
 */
accountUI.userUIUpdate = function() {
    'use strict';

    // Show Membership plan
    $('.small-icon.membership').removeClass('pro1 pro2 pro3 pro4');
    if (u_attr.p) {
        // LITE/PRO account
        var planNum = u_attr.p;
        var planText = pro.getProPlanName(planNum);

        $('.account.membership-plan').text(planText);
        $('.small-icon.membership').addClass('pro' + planNum);
    }
    else {
        $('.account.membership-plan').text(l[435]);
    }

    // update avatar
    $('.fm-account-avatar').safeHTML(useravatar.contact(u_handle, '', 'div', true));
    $('.fm-avatar').safeHTML(useravatar.contact(u_handle, '', 'div'));


    // Show first name or last name
    $('.membership-big-txt.name').text(u_attr.fullname);

    // Show email address
    if (u_attr.email) {
        $('.membership-big-txt.email').text(u_attr.email);
    }
    else {
        $('.membership-big-txt.email').hide();
    }
};

/**
 * Helper function to fill common charts into the dashboard and account sections
 * @param {Object}  account       User account data (I.e. same as M.account)
 * @param {Boolean} [onDashboard] Whether invoked from the dashboard
 */
accountUI.fillCharts = function(account, onDashboard) {
    var b2;
    var deg;
    var perc;
    var perc_c;
    var b_exceeded;
    var s_exceeded;

    /* New Used Bandwidth chart */
    var $bandwidthChart = $('.fm-account-blocks.bandwidth');

    perc_c = account.tfsq.perc;
    if (perc_c > 100) {
        perc_c = 100;
    }
    if (perc_c > 99 || dlmanager.isOverQuota) {
        $bandwidthChart.addClass('exceeded');
        b_exceeded = 1;
    }

    deg = 230 * perc_c / 100;

    // Used Bandwidth chart
    if (deg <= 180) {
        $bandwidthChart.find('.left-chart span').css('transform', 'rotate(' + deg + 'deg)');
        $bandwidthChart.find('.right-chart span').removeAttr('style');
    }
    else {
        $bandwidthChart.find('.left-chart span').css('transform', 'rotate(180deg)');
        $bandwidthChart.find('.right-chart span').css('transform', 'rotate(' + (deg - 180) + 'deg)');
    }

    // Maximum bandwidth
    b2 = bytesToSize(account.tfsq.max, 0).split(' ');
    var usedB = bytesToSize(account.tfsq.used);
    $bandwidthChart.find('.chart.data .size-txt').text(usedB);
    $bandwidthChart.find('.chart.data .pecents-txt').text((b2[0]));
    $bandwidthChart.find('.chart.data .gb-txt').text((b2[1]));
    if ((u_attr.p || account.tfsq.ach) && b2[0] > 0) {
        if (perc_c > 0) {
            $bandwidthChart.removeClass('no-percs');
            $bandwidthChart.find('.chart.data .perc-txt').text(perc_c + '%');
        }
        else {
            $bandwidthChart.addClass('no-percs');
        }
    }
    else {
        $bandwidthChart.addClass('no-percs');
        $bandwidthChart.find('.chart.data span:not(.size-txt)').text('');
        var usedW;
        if (usedB[0] === '1') {
            usedW = l[17524].toLowerCase().replace('%tq1', '').trim();
        }
        else if (usedB[0] === '2') {
            usedW = l[17525].toLowerCase().replace('%tq2', '').trim();
        }
        else {
            usedW = l[17517].toLowerCase().replace('%tq', '').trim();
        }
        $bandwidthChart.find('.chart.data .pecents-txt').text(usedW);
    }
    /* End of New Used Bandwidth chart */


    /* New Used Storage chart */
    var $storageChart = $('.fm-account-blocks.storage');
    var $storageData = $('.account.data-block.storage-data');
    $storageData.removeClass('exceeded');
    perc = Math.floor(account.space_used / account.space * 100);
    perc_c = perc;
    if (perc_c > 100) {
        perc_c = 100;
    }
    if (perc_c === 100) {
        s_exceeded = 1;
        $storageChart.addClass('exceeded');
        $storageData.addClass('exceeded');
    }
    else if (perc_c > 80) {
        $storageChart.addClass('going-out');
    }

    deg = 230 * perc_c / 100;

    // Used space chart
    if (deg <= 180) {
        $storageChart.find('.left-chart span').css('transform', 'rotate(' + deg + 'deg)');
        $storageChart.find('.right-chart span').removeAttr('style');
    }
    else {
        $storageChart.find('.left-chart span').css('transform', 'rotate(180deg)');
        $storageChart.find('.right-chart span').css('transform', 'rotate(' + (deg - 180) + 'deg)');
    }

    // Maximum disk space
    b2 = bytesToSize(account.space, 0).split(' ');
    $storageChart.find('.chart.data .pecents-txt').text(b2[0]);
    $storageChart.find('.chart.data .gb-txt').text(b2[1]);
    $storageChart.find('.chart.data .perc-txt').text(perc_c + '%');
    $storageChart.find('.chart.data .size-txt').text(bytesToSize(account.space_used));
    $('.account.quota-txt.used-space')
        .safeHTML('<span>@@</span> @@ @@',
            bytesToSize(account.space_used), l[5528], b2.join(' '));

    /** End New Used Storage chart */


    // Charts warning notifications
    var $chartsBlock = $('.account' + (onDashboard ? '.widget.content' : '.data-block.charts'));
    $chartsBlock.find('.chart-warning:not(.hidden)').addClass('hidden');
    if (b_exceeded && s_exceeded) {
        // Bandwidth and Storage quota exceeded
        $chartsBlock.find('.chart-warning.storage-and-bandwidth').removeClass('hidden');
    }
    else if (s_exceeded) {
        // Storage quota exceeded
        $chartsBlock.find('.chart-warning.storage').removeClass('hidden');
    }
    else if (b_exceeded) {
        // Bandwidth quota exceeded
        $chartsBlock.find('.chart-warning.bandwidth').removeClass('hidden');
    }
    else if (perc_c > 80) {
        // Running out of cloud space
        $chartsBlock.find('.chart-warning.out-of-space').removeClass('hidden');
    }
    if (b_exceeded || s_exceeded || perc_c > 80) {
        $chartsBlock.find('.chart-warning').rebind('click', function() {
            loadSubPage('pro');
        });
        $storageData.find('.chart-warning, .upgrade-account.button').rebind('click', function() {
            loadSubPage('pro');
        });
    }
    /* End of Charts warning notifications */
};

/**
 * Dialog to cancel subscriptions
 */
accountUI.cancelSubscriptionDialog = {

    $backgroundOverlay: null,
    $dialog: null,
    $dialogSuccess: null,
    $accountPageCancelButton: null,
    $continueButton: null,
    $cancelReason: null,
    $expiryTextBlock: null,
    $expiryDateBlock: null,

    /**
     * Initialise the dialog
     */
    init: function() {

        // Cache some selectors
        this.$dialog = $('.cancel-subscription-st1');
        this.$dialogSuccess = $('.cancel-subscription-st2');
        this.$accountPageCancelButton = $('.btn-cancel-sub');
        this.$continueButton = this.$dialog.find('.continue-cancel-subscription');
        this.$cancelReason = this.$dialog.find('.cancel-textarea textarea');
        this.$backgroundOverlay = $('.fm-dialog-overlay');
        this.$expiryTextBlock = $('.account.plan-info.expiry-txt');
        this.$expiryDateBlock = $('.account.plan-info.expiry');

        // Show the dialog
        this.$dialog.removeClass('hidden');
        this.$backgroundOverlay.removeClass('hidden').addClass('payment-dialog-overlay');

        // Init textarea scrolling
        initTextareaScrolling($('.cancel-textarea textarea'), 126);

        // Init functionality
        this.enableButtonWhenReasonEntered();
        this.initSendingReasonToApi();
        this.initCloseAndBackButtons();
    },

    /**
     * Close the dialog when either the close or back buttons are clicked
     */
    initCloseAndBackButtons: function() {
        var self = this;

        // Close main dialog
        this.$dialog.find('.default-white-button.cancel, .fm-dialog-close').rebind('click', function() {
            self.$dialog.addClass('hidden');
            self.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        });

        // Prevent clicking on the background overlay which closes it unintentionally
        self.$backgroundOverlay.rebind('click', function(event) {
            event.stopPropagation();
        });
    },

    /**
     * Close success dialog
     */
    initCloseButtonSuccessDialog: function() {
        var self = this;

        this.$dialogSuccess.find('.fm-dialog-close').rebind('click', function() {
            self.$dialogSuccess.addClass('hidden');
            self.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
        });
    },

    /**
     * Make sure text has been entered before making the button available
     */
    enableButtonWhenReasonEntered: function() {
        var self = this;

        this.$cancelReason.rebind('keyup', function() {

            // Trim for spaces
            var reason = $(this).val();
            reason = $.trim(reason);

            // Make sure at least 1 character
            if (reason.length > 0) {
                self.$continueButton.removeClass('disabled');
            }
            else {
                self.$continueButton.addClass('disabled');
            }
        });
    },

    /**
     * Send the cancellation reason
     */
    initSendingReasonToApi: function() {
        var self = this;

        this.$continueButton.rebind('click', function() {

            // Get the cancellation reason
            var reason = self.$cancelReason.val();

            // Hide the dialog and show loading spinner
            self.$dialog.addClass('hidden');
            self.$backgroundOverlay.addClass('hidden').removeClass('payment-dialog-overlay');
            loadingDialog.show();

            // Cancel the subscription/s
            // cccs = Credit Card Cancel Subscriptions, r = reason
            api_req({a: 'cccs', r: reason}, {
                callback: function() {

                    // Hide loading dialog and cancel subscription button on account page, set exiry date
                    loadingDialog.hide();
                    self.$accountPageCancelButton.addClass('hidden');
                    self.$expiryTextBlock.text(l[987]);
                    self.$expiryDateBlock
                        .safeHTML('<a href="/fm/account/history" class="clickurl">@@</a>',
                            time2date(account.expiry, 2));
                    clickURLs();
                    self.$expiryDateBlock.find('a').rebind('click', function() {
                        document.location = $(this).attr('href');
                    });

                    // Show success dialog and refresh UI
                    self.$dialogSuccess.removeClass('hidden');
                    self.$backgroundOverlay.removeClass('hidden');
                    self.$backgroundOverlay.addClass('payment-dialog-overlay');
                    self.initCloseButtonSuccessDialog();

                    // Reset account cache so all account data will be refetched and re-render the account page UI
                    M.account.lastupdate = 0;
                    accountUI();
                }
            });
        });
    }
};

accountUI.disableElement = function(element) {
    $(element).addClass('disabled').attr('disabled', 1);
};
accountUI.enableElement = function(element) {
    $(element).removeClass('disabled').removeAttr('disabled');
};

accountUI.initCheckbox = function(className, $container, currentValue, onChangeCb) {
    var $wrapperDiv = $('.' + className, $container);
    var $input = $('input[type="checkbox"]', $wrapperDiv);

    $wrapperDiv.rebind('click.checkbox', function() {
        if ($wrapperDiv.is('.disabled')) {
            return;
        }

        var res;

        if ($input.hasClass('checkboxOn')) {
            res = onChangeCb(false);
            if (res !== false) {
                accountUI.initCheckbox.uncheck($input, $wrapperDiv);
            }
        }
        else {
            res = onChangeCb(true);
            if (res !== false) {
                accountUI.initCheckbox.check($input, $wrapperDiv);
            }
        }
    });
    if (currentValue === true || currentValue === 1) {
        accountUI.initCheckbox.check($input, $wrapperDiv);
    }
    else {
        accountUI.initCheckbox.uncheck($input, $wrapperDiv);
    }

};

accountUI.initCheckbox.check = function($input, $wrapperDiv) {
    $input.removeClass('checkboxOff').addClass('checkboxOn').attr('checked', true);
    $wrapperDiv.removeClass('checkboxOff').addClass('checkboxOn');
};
accountUI.initCheckbox.uncheck = function($input, $wrapperDiv) {
    $input.removeClass('checkboxOn').addClass('checkboxOff').attr('checked', false);
    $wrapperDiv.removeClass('checkboxOn').addClass('checkboxOff');
};

accountUI.initCheckbox.enable = function(className, $container) {
    var $wrapperDiv = $('.' + className, $container);
    $wrapperDiv.removeClass('disabled');
};
accountUI.initCheckbox.disable = function(className, $container) {
    var $wrapperDiv = $('.' + className, $container);
    $wrapperDiv.addClass('disabled');
};

accountUI.initRadio = function(className, $container, currentValue, onChangeCb) {
    $('.' + className, $container).removeClass('radioOn').addClass('radioOff');

    $('input.' + className + '[value="' + currentValue + '"]', $container)
        .removeClass('radioOff').addClass('radioOn');

    $('.' + className + ' input', $container).rebind('click.radio', function(e) {
        var newVal = $(this).val();

        accountUI.initRadio.setValue(className, newVal, $container);
        onChangeCb(newVal);
    });

    accountUI.initRadio.setValue(className, currentValue, $container);
};
accountUI.initRadio.setValue = function(className, newVal, $container) {
    var $input = $('input.' + className + '[value="' + newVal + '"]', $container);
    if ($input.is('.disabled')) {
        return;
    }

    $('.' + className + '.radioOn', $container)
        .addClass('radioOff').removeClass('radioOn');


    $input
        .removeClass('radioOff').addClass('radioOn')
        .attr('checked', 1);

    $input.parent().addClass('radioOn').removeClass('radioOff');
};


accountUI.initRadio.disable = function($input) {
    $('input.[value="' + newVal + '"]', $container)
        .addClass('disabled')
        .attr('disabled', 1);
};

accountUI.initRadio.enable = function(value, $container) {
    $('input.[value="' + newVal + '"]', $container)
        .removeClass('disabled')
        .removeAttr('disabled');
};

accountUI.advancedSection = function(autoaway, autoawaylock, autoawaytimeout, persist, persistlock) {
    // TODO: FIXME, make accountUI elements not dependant!
    if (!megaChatIsReady) {
        // accountUI.advanced section was called too early, e.g. before chat's initialisation...delay the init.
        var args = toArray.apply(null, arguments);
        setTimeout(function() {
            accountUI.advancedSection.apply(accountUI, args);
        }, 700);
        return;
    }

    var presenceInt = megaChat.plugins.presencedIntegration;

    if (!presenceInt || !presenceInt.userPresence) {
        setTimeout(function() {
            throw new Error('presenceInt is not ready...');
        });
        return;
        // ^ FIXME too..!
    }

    // Only call this if the call of this function is the first one, made by fm.js -> accountUI
    if (autoaway === undefined) {
        $(presenceInt).rebind('settingsUIUpdated.settings', function(e,
                                                                     autoaway,
                                                                     autoawaylock,
                                                                     autoawaytimeout,
                                                                     persist,
                                                                     persistlock) {
            accountUI.advancedSection(autoaway, autoawaylock, autoawaytimeout, persist, persistlock);
        });

        presenceInt.userPresence.updateui();
        return;
    }

    // chat
    var $sectionContainerChat = $('.account.tab-content.chat');

    var _initPresenceRadio = function(presence) {
        accountUI.initRadio(
            'chatstatus',
            $sectionContainerChat,
            presence,
            function(newVal) {
                presenceInt.setPresence(parseInt(newVal));
            }
        );
    };

    if (typeof (megaChat) !== 'undefined' && typeof(presenceInt) !== 'undefined') {
        $(presenceInt).rebind('settingsUIUpdated.settings', function(e,
                                                                     autoaway,
                                                                     autoawaylock,
                                                                     autoawaytimeout,
                                                                     persist,
                                                                     persistlock) {
            accountUI.advancedSection(autoaway, autoawaylock, autoawaytimeout, persist, persistlock);
        });
    }

    _initPresenceRadio(presenceInt.getPresence(u_handle));

    var persistChangeRequestedHandler = function(newVal) {
        presenceInt.userPresence.ui_setpersist(newVal);
    };

    var autoawayChangeRequestHandler = function(newVal) {
        presenceInt.userPresence.ui_setautoaway(newVal);
    };


    if (autoawaytimeout !== false) {

        accountUI.initCheckbox(
            'persist-presence',
            $sectionContainerChat,
            persist,
            persistChangeRequestedHandler
        );


        // prevent changes to persist-presence if persistlock is set
        accountUI.initCheckbox[persistlock ? "disable" : "enable"](
            'persist-presence',
            $sectionContainerChat
        );

        if (persistlock === true) {
            $('.persist-presence-wrapper', $sectionContainerChat).addClass('hidden');
        }
        else {
            $('.persist-presence-wrapper', $sectionContainerChat).removeClass('hidden');
        }

        accountUI.initCheckbox(
            'autoaway',
            $sectionContainerChat,
            autoaway,
            autoawayChangeRequestHandler
        );

        // prevent changes to autoaway if autoawaylock is set
        accountUI.initCheckbox[autoawaylock ? "disable" : "enable"](
            'autoaway',
            $sectionContainerChat
        );

        if (autoawaylock === true) {
            $('.autoaway-wrapper', $sectionContainerChat).addClass('hidden');
        }
        else {
            $('.autoaway-wrapper', $sectionContainerChat).removeClass('hidden');
        }

        // always editable for user comfort -
        accountUI.enableElement($('input#autoaway', $sectionContainerChat));

        var lastValidNumber = Math.floor(autoawaytimeout / 60);
        // when value is changed, set checkmark
        $('input#autoaway', $sectionContainerChat)
            .rebind('change.dashboard', function() {
                var val = parseInt($(this).val());
                if (val > 3505) {
                    val = 3505;
                }
                else if (val < 0) {
                    val = 5;
                }

                if (val > 0) {
                    presenceInt.userPresence.ui_setautoaway(true, val * 60);
                    lastValidNumber = val;
                }
            })
            .rebind('blur.dashboard', function() {
                // the goal of the following line is to reset the value of the field if the entered data is invalid
                // after the user removes focus from it (and set the internally set value)
                $(this).val(presenceInt.userPresence.autoawaytimeout / 60);
            })
            .val(lastValidNumber);
    }

    accountUI.initCheckbox(
        'richpreviews-confirmation',
        $sectionContainerChat,
        RichpreviewsFilter.previewGenerationConfirmation === true,
        function(newVal) {
            if (newVal) {
                RichpreviewsFilter.confirmationDoConfirm();
            }
            else {
                RichpreviewsFilter.confirmationDoNever();
            }
        }
    );

    $('.versioning-switch')
    .rebind('click', function() {
        var val = $('#versioning-status').prop('checked') ? 1 : 0;
        var setVersioningAttr = function(val) {
            showToast('settings', l[16168]);
            mega.attr.set(
                'dv',
                val,
                -2,
                true
            )
            .done(
            function(e) {
                $('#versioning-status').prop('checked', val ? false : true);
                $('.label-heading').text(val ? l[7070] : l[17601]);
                fileversioning.dvState = val;
            });
        };
        if ($('#versioning-status').prop('checked')) {
            msgDialog('confirmation', l[882], l[17595], false, function(e) {
                if (e) {
                    setVersioningAttr(val);
                }
            });
        }
        else {
            setVersioningAttr(val);
        }
    });
    //update versioning info
    fileversioning.updateVersionInfo();
    $('.delete-all-versions')
    .rebind('click', function() {

        if (!$(this).hasClass('disabled')) {
            msgDialog('remove', l[1003], l[17581], l[1007], function(e) {
                if (e) {
                    loadingDialog.show();
                    api_req({
                            a: 'dv'
                            }, {
                            callback: function(res, ctx) {
                                if (res === 0) {
                                    M.accountData(function() {
                                        fileversioning.updateVersionInfo();
                                    }, false, true);
                                }
                            }
                        });
                }
            });
        }
    });
};

accountUI.voucherCentering = function voucherCentering($button) {
    'use strict';

    var $popupBlock = $('.fm-voucher-popup');
    var popupHeight = $popupBlock.outerHeight();

    $popupBlock.css({
        'top': $button.offset().top - popupHeight - 10,
        'right': $('body').outerWidth() - $button.outerWidth() - $button.offset().left
    });

    if ($button.offset().top + 10 > popupHeight) {
        $popupBlock.css('top', $button.offset().top - popupHeight - 10);
    }
    else {
        $popupBlock.css('top', $button.offset().top + $button.outerHeight() + 10);
    }
};
