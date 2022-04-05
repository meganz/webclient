function dashboardUI(updProcess) {
    "use strict";

    // Prevent ephemeral session to access dashboard via url
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

    updProcess = updProcess || false;

    if (!updProcess) {
        loadingDialog.show('loadDashboard');
    }

    $('.fm-right-files-block, .section.conversations, .fm-right-account-block').addClass('hidden');
    $('.fm-right-block.dashboard').removeClass('hidden');

    // Hide backup widget is user already saved recovery key before
    if (localStorage.recoverykey) {
        $('.account.widget.recovery-key').addClass('hidden');
    }
    else {
        $('.account.widget.recovery-key').removeClass('hidden');
    }

    M.onSectionUIOpen('dashboard');

    if (u_attr && u_attr.b) {
        $('.fm-right-block.dashboard .non-business-dashboard').addClass('hidden');
        const $bsnDashboard = $('.fm-right-block.dashboard .business-dashboard').removeClass('hidden');
        if (u_attr.b.m && u_attr.b.s !== -1) {
            $('.overall-usage-container', $bsnDashboard).addClass('admin');
            $('.subaccount-view-used-data .view-title span', $bsnDashboard).text(l.bsn_pers_usage);
        }
        if (u_attr.b.s !== 1 || !u_attr.b.m) {
            $('.left-pane.small-txt.plan-date-info', '.dashboard').addClass('hidden');
            $('.left-pane.big-txt.plan-date-val', '.dashboard').addClass('hidden');
        }
    }
    else {
        $('.fm-right-block.dashboard .non-business-dashboard').removeClass('hidden');
        $('.fm-right-block.dashboard .business-dashboard').addClass('hidden');
    }

    // Add-contact plus
    $('.dashboard .contacts-widget .add-contacts').rebind('click', function() {
        contactAddDialog();
        return false;
    });

    // Avatar dialog
    $('.fm-account-avatar').rebind('click', function(e) {
        avatarDialog();
    });

    // Data plus, upload file
    $('.non-business-dashboard button.upload-file, .business-dashboard button.upload-file').rebind('click', function() {
        $('.fm-file-upload input').trigger('click');
        return false;
    });

    // Space-widget clickable sections
    $('.account.widget.storage .pr-item')
        .rebind('click', function() {
            var section = String($(this).attr('class')).replace(/account|pr-item|empty|ui-droppable/g, '').trim();
            if (section.indexOf('cloud-drive') !== -1) {
                section = M.RootID;
            }
            else if (section.indexOf('rubbish-bin') !== -1) {
                section = M.RubbishID;
            }
            else if (section.indexOf('incoming-shares') !== -1) {
                section = 'shares';
            }
            else if (section.indexOf('inbox') !== -1) {
                section = M.InboxID;
            }
            else if (section.indexOf('versions') === -1) {
                section = null;
            }
            else {
                section = 'account/file-management';
            }

            if (section) {
                M.openFolder(section);
            }

            return false;
        });

    // Account data
    /* eslint-disable-next-line complexity */
    M.accountData(function(account) {
        if (!updProcess) {
            loadingDialog.hide('loadDashboard');
        }
        accountUI.general.userUIUpdate();

        // Display welcome message
        if (u_attr.firstname) {
            const $welcome = $('.dashboard .welcome-message-banner').removeClass('hidden');
            $('.message', $welcome).text(l[24930].replace('$1', u_attr.firstname));
        }

        // Render the storage and transfer analytics graphs on the admin user's dashboard page
        if (u_attr.b && u_attr.b.m && u_attr.b.s !== -1) {
            const business = new BusinessAccountUI();
            business.viewAdminDashboardAnalysisUI();
        }

        // Show balance
        $('.account.left-pane.balance-info').text(l[7108]);
        $('.account.left-pane.balance-txt').safeHTML('@@ &euro; ', account.balance[0][0]);

        $('.fm-account-blocks.storage, .fm-account-blocks.bandwidth').removeClass('exceeded going-out');

        // Achievements Widget
        if (account.maf && !u_attr.b) {
            $('.fm-right-block.dashboard').addClass('active-achievements');
            var $achWidget = $('.account.widget.achievements');
            var maf = M.maf;
            var $storage = $('.account.bonuses-size.storage', $achWidget);
            var $transfer = $('.account.bonuses-size.transfers', $achWidget);
            var storageCurrentValue = maf.storage.current /*+ maf.storage.base*/;
            var transferCurrentValue = maf.transfer.current /*+ maf.transfer.base*/;

            $storage.text(bytesToSize(storageCurrentValue, 0));
            $transfer.text(bytesToSize(transferCurrentValue, 0));

            $('.more-bonuses', $achWidget).rebind('click', function() {
                mega.achievem.achievementsListDialog();
            });
        }
        else {
            $('.fm-right-block.dashboard').removeClass('active-achievements');
        }

        if (!updProcess) {
            // Only render the referral program widget if loading the dashboard page UI initially
            dashboardUI.renderReferralWidget();
        }

        // Elements for free/pro accounts. Expires date / Registration date
        if (u_attr.p || (u_attr.b && u_attr.b.s === -1)) {

            var timestamp;
            // Subscription
            if (account.stype == 'S') {

                // Get the date their subscription will renew
                timestamp = account.srenew[0];

                // Display the date their subscription will renew
                if (timestamp > 0) {
                    $('.account.left-pane.plan-date-val').text(time2date(timestamp, 2));
                    $('.account.left-pane.plan-date-info').text(l[20154]);
                }
                else {
                    // Otherwise hide info blocks
                    $('.account.left-pane.plan-date-val, .account.left-pane.plan-date-info').addClass('hidden');
                }
            }
            else if (account.stype == 'O') {
                // one-time or cancelled subscription
                $('.account.left-pane.plan-date-val').text(time2date(account.expiry, 2));

                // If user has nextplan, show infomative tooltip
                if (account.nextplan) {
                    $('.account.left-pane.plan-date-info').safeHTML(escapeHTML(l[20153]) +
                        '<div class="sprite-fm-mono icon-info-filled simpletip" ' +
                        'data-simpletip-class="center-align medium-width" data-simpletip="' +
                        escapeHTML(l[20965]) + '"></div>');
                }
                else if (u_attr.b && u_attr.b.m) {
                    $('.account.left-pane.plan-date-info').text(l[987]);
                }
                else {
                    $('.account.left-pane.plan-date-info').text(l[20153]);
                }
            }

            if (u_attr.b && (u_attr.p === 100 || u_attr.b.s === -1)) {
                // someone modified the CSS to overwirte the hidden class !!, therefore .hide() will be used
                $('.account.left-pane.reg-date-info, .account.left-pane.reg-date-val').addClass('hidden').hide();
                var $businessLeft = $('.account.left-pane.info-block.business-users').removeClass('hidden');
                if (u_attr.b.s === 1) {
                    $businessLeft.find('.suba-status').addClass('active').removeClass('disabled pending')
                        .text(l[7666]);
                }
                else if (u_attr.b.s === 2 && u_attr.b.m) {
                    $('.suba-status', $businessLeft).addClass('pending').removeClass('disabled active')
                        .text(l[19609]);
                    if (u_attr.b.sts && u_attr.b.sts[0] && u_attr.b.sts[0].s === -1) {
                        const expiryDate = new Date(u_attr.b.sts[0].ts * 1000);
                        const currentTime = new Date();
                        let remainingDays = Math.floor((expiryDate - currentTime) / 864e5);
                        remainingDays = remainingDays < 0 ? 0 : remainingDays;
                        const daysLeft = mega.icu.format(l[16284], remainingDays);
                        $('.suba-days-left', $businessLeft).removeClass('hidden').text(daysLeft);
                        $('.suba-pay-bill', $businessLeft).removeClass('hidden');
                    }
                }
                else {
                    $('.suba-status', $businessLeft).addClass('disabled').removeClass('pending active')
                        .text(l[19608]);

                    if (u_attr.b.m) {
                        $('.suba-pay-bill', $businessLeft).removeClass('hidden');
                    }
                }

                if (u_attr.b.m) { // master
                    $businessLeft.find('.suba-role').text(l[19610]);
                }
                else {
                    $businessLeft.find('.suba-role').text(l[5568]);
                }
                if (u_attr.b.s !== 1 || !u_attr.b.m) {
                    $('.left-pane.small-txt.plan-date-info', '.dashboard').addClass('hidden');
                    $('.left-pane.big-txt.plan-date-val', '.dashboard').addClass('hidden');
                }

                var $businessDashboard = $('.fm-right-block.dashboard .business-dashboard').removeClass('hidden');
                $('.fm-right-block.dashboard .non-business-dashboard').addClass('hidden');

            }
        }
        else {
            // resetting things might be changed in business account
            $('.fm-right-block.dashboard .business-dashboard').addClass('hidden');
            $('.account.left-pane.info-block.business-users').addClass('hidden');
            $('.account.left-pane.reg-date-info, .account.left-pane.reg-date-val').removeClass('hidden').show();
            $('.fm-right-block.dashboard .non-business-dashboard').removeClass('hidden');
        }

        /* Registration date, bandwidth notification link */
        $('.upgrade-to-pro, .pay-bill-btn', '.dashboard').rebind('click.dboard', function() {
            if (u_attr && u_attr.b && u_attr.b.m && (u_attr.b.s === -1 || u_attr.b.s === 2)) {
                loadSubPage('repay');
            }
            else {
                loadSubPage('pro');
            }
        });

        $('.account.left-pane.reg-date-info').text(l[16128]);
        $('.account.left-pane.reg-date-val').text(time2date(u_attr.since, 2));

        // left-panel responsive contents
        var maxwidth = 0;
        for (var i = 0; i < $('.account.left-pane.small-txt:visible').length; i++){
            var rowwidth = $('.account.left-pane.small-txt:visible').get(i).offsetWidth
                + $('.account.left-pane.big-txt:visible').get(i).offsetWidth;
            maxwidth = Math.max(maxwidth, rowwidth);
        }
        $.leftPaneResizable.options.updateWidth = maxwidth;

        $($.leftPaneResizable).trigger('resize');
        if (!u_attr.b) {
            accountUI.general.charts.init(account);

            /* Used Storage */
            var percents = [
                100 * account.stats[M.RootID].bytes / account.space,
                100 * account.stats[M.RubbishID].bytes / account.space,
                100 * account.stats[M.InboxID].bytes / account.space,
                100 * account.stats[M.RootID].vbytes / account.space,
                Math.max(100 * (account.space - account.space_used) / account.space, 0),
            ];
            for (let i = 0; i < percents.length; i++) {
                const $percBlock = $('.storage .account.progress-perc.pr' + i);
                $percBlock.safeHTML(`<span class="value">${Math.round(percents[i])}</span><span class="unit">%</span>`);
                const $percBar = $('.storage .account.progress-bar-section.pr' + i);
                $percBar.css('width', percents[i] + '%');
            }

            // Cloud drive
            $('.account.progress-size.cloud-drive').text(
                `(${bytesToSize(account.stats[M.RootID].bytes)})`
            );
            // Rubbish bin
            $('.account.progress-size.rubbish-bin').text(
                `(${bytesToSize(account.stats[M.RubbishID].bytes)})`
            );

            // Hide the inbox if it is empty
            const inboxSize = account.stats[M.InboxID].bytes;
            if (inboxSize > 0) {
                // Inbox
                $('.account.progress-size.inbox').text(
                    `(${bytesToSize(inboxSize)})`
                );
                $('.pr-item.inbox').parent().removeClass('hidden');
            }
            else {
                $('.pr-item.inbox').parent().addClass('hidden');
            }

            // Available
            $('.account.progress-size.available').text(
                `(${bytesToSize(Math.max(account.space - account.space_used, 0))})`
            );
            // Versions
            $('.account.progress-size.versions').text(
                `(${bytesToSize(account.stats[M.RootID].vbytes)})`
            );
            /* End of Used Storage */

            /* hide/show quota warning banner */
            const quotaBanner = document.querySelector('.non-business-dashboard .account.quota-alert-banner');
            if (quotaBanner) {
                if (account.isFull) {
                    quotaBanner.textContent = l[24973];
                    quotaBanner.classList.remove('hidden', 'warning');
                    quotaBanner.classList.add('error');
                }
                else if (account.isAlmostFull) {
                    quotaBanner.textContent = l[24974];
                    quotaBanner.classList.remove('hidden', 'error');
                    quotaBanner.classList.add('warning');
                }
                else {
                    quotaBanner.classList.add('hidden');
                }
            }

            if (u_attr.p) {
                $('.account.widget.bandwidth').addClass('enabled-pr-bar');
                $('.dashboard .account.learn-more.right').addClass('hidden');
            }
            else {

                // Show available bandwith for FREE accounts with enabled achievements
                if (account.tfsq.ach) {
                    $('.account.widget.bandwidth').addClass('enabled-pr-bar');
                }
                else {
                    $('.account.widget.bandwidth').removeClass('enabled-pr-bar');
                }

                $('.dashboard .account.learn-more.right').removeClass('hidden');
                $('.dashboard .account.learn-more.right').rebind('click', function() {
                    var $dropDownItem = $('.dropdown', $(this));
                    if ($dropDownItem.hasClass('hidden')) {
                        $dropDownItem.removeClass('hidden');
                    }
                    else {
                        $dropDownItem.addClass('hidden');
                    }
                });

                // Get more transfer quota button
                $('.account.widget.bandwidth .free .more-quota').rebind('click', function() {
                    loadSubPage('pro');
                    return false;
                });
            }

            if (account.tfsq.used > 0 || Object(u_attr).p || account.tfsq.ach) {
                $('.account.widget.bandwidth').removeClass('hidden');
                $('.fm-account-blocks.bandwidth.right').removeClass('hidden');
                $('.bandwidth .account.progress-size.base-quota').text(bytesToSize(account.tfsq.used, 0));
            }
            else {
                $('.account.widget.bandwidth').addClass('hidden');
                $('.fm-account-blocks.bandwidth.right').addClass('hidden');
            }

            /* End of Used Bandwidth progressbar */
            // Fill rest of widgets
            dashboardUI.updateWidgets();
        }
        else {

            // Debug code ...
            if (d && localStorage.debugNewPrice) {
                account.space_bus_base = 3;
                account.space_bus_ext = 2;
                account.tfsq_bus_base = 3;
                account.tfsq_bus_ext = 1;
                account.tfsq_bus_used = 3848290697216; // 3.5 TB
                account.space_bus_used = 4617948836659; // 4.2 TB
            }
            // END Debug code

            const $storageBlk = $('.business-dashboard .user-management-storage');
            const $transferBlk = $('.business-dashboard .user-management-transfer');
            const $storageBaseBlk = $('.storage-transfer-data-details-base', $storageBlk);
            const $transferBaseBlk = $('.storage-transfer-data-details-base', $transferBlk);
            const $storageExtBlk = $('.storage-transfer-data-details-ext', $storageBlk);
            const $transferExtBlk = $('.storage-transfer-data-details-ext', $transferBlk);

            $('.storage-transfer-data, .storage-transfer-current', $storageBlk)
                .text(bytesToSize(account.space_bus_used || account.space_used, 2));
            $('.storage-transfer-data, .storage-transfer-current', $transferBlk)
                .text(bytesToSize(account.tfsq_bus_used || account.tfsq.used, 2));

            $('.storage-transfer-data', $storageExtBlk).text(l[5816].replace('[X]', 0));
            $('.storage-transfer-data', $transferExtBlk).text(l[5816].replace('[X]', 0));

            if (u_attr.b.m) {

                $storageExtBlk.removeClass('hidden');
                $transferExtBlk.removeClass('hidden');
                $('.view-info .storage-transfer-current', $storageBlk).removeClass('hidden');
                $('.view-info .storage-transfer-current', $transferBlk).removeClass('hidden');
                $('.storage-transfer-data-base-head', $storageBlk).removeClass('hidden');
                $('.storage-transfer-data-base-head', $transferBlk).removeClass('hidden');

                if (account.space_bus_base) {
                    $('.storage-transfer-data', $storageBaseBlk)
                        .text(l[5816].replace('[X]', account.space_bus_base));
                    if (account.space_bus_ext) {
                        $('.storage-transfer-data', $storageExtBlk).text(l[5816].replace('[X]', account.space_bus_ext));
                    }
                }
                if (account.tfsq_bus_base) {
                    $('.storage-transfer-data', $transferBaseBlk)
                        .text(l[5816].replace('[X]', account.tfsq_bus_base));
                    if (account.tfsq_bus_ext) {
                        $('.storage-transfer-data', $transferExtBlk).text(l[5816].replace('[X]', account.tfsq_bus_ext));
                    }
                }
            }

            var $dataStats = $('.business-dashboard .subaccount-view-used-data');

            var ffNumText = function(value, type) {
                var counter = value || 0;
                return mega.icu.format(type === 'file' ? l.file_count : l.folder_count, counter);
            };

            const rubbishSize = account.stats[M.RubbishID].bytes;

            var folderNumText = ffNumText(account.stats[M.RootID].folders, 'folder');
            var fileNumText = ffNumText(account.stats[M.RootID].files, 'file');
            $('.ba-root .ff-occupy', $dataStats).text(bytesToSize(account.stats[M.RootID].bytes, 2));
            $('.ba-root .folder-number', $dataStats).text(folderNumText);
            $('.ba-root .file-number', $dataStats).text(fileNumText);

            folderNumText = ffNumText(account.stats.inshares.items, 'folder');
            fileNumText = ffNumText(account.stats.inshares.files, 'file');
            $('.ba-inshare .ff-occupy', $dataStats).text(bytesToSize(account.stats.inshares.bytes, 2));
            $('.ba-inshare .folder-number', $dataStats).text(folderNumText);
            $('.ba-inshare .file-number', $dataStats).text(fileNumText);

            folderNumText = ffNumText(account.stats.outshares.items, 'folder');
            fileNumText = ffNumText(account.stats.outshares.files, 'file');
            $('.ba-outshare .ff-occupy', $dataStats).text(bytesToSize(account.stats.outshares.bytes, 2));
            $('.ba-outshare .folder-number', $dataStats).text(folderNumText);
            $('.ba-outshare .file-number', $dataStats).text(fileNumText);

            folderNumText = ffNumText(account.stats[M.RubbishID].folders, 'folder');
            fileNumText = ffNumText(account.stats[M.RubbishID].files, 'file');
            $('.ba-rubbish .ff-occupy', $dataStats).text(bytesToSize(rubbishSize, 2));
            $('.ba-rubbish .folder-number', $dataStats).text(folderNumText);
            $('.ba-rubbish .file-number', $dataStats).text(fileNumText);

            folderNumText = ffNumText(account.stats.links.folders, 'folder');
            fileNumText = ffNumText(account.stats.links.files, 'file');
            $('.ba-pub-links .ff-occupy', $dataStats).text(bytesToSize(account.stats.links.bytes, 2));
            $('.ba-pub-links .folder-number', $dataStats).text(folderNumText);
            $('.ba-pub-links .file-number', $dataStats).text(fileNumText);

            if (rubbishSize > 0) {
                $('.ba-rubbish', $dataStats).removeClass('empty');
            }
            else {
                $('.ba-rubbish', $dataStats).addClass('empty');
            }

            var verFiles = 0;
            var verBytes = 0;
            verFiles = account.stats[M.RootID]['vfiles'];
            verBytes = account.stats[M.RootID]['vbytes'];
            // for (var k in account.stats) {
            //    if (account.stats[k]['vfiles']) {
            //        verFiles += account.stats[k]['vfiles'];
            //    }
            //    if (account.stats[k]['vbytes']) {
            //        verBytes += account.stats[k]['vbytes'];
            //    }
            // }

            $('.ba-version .versioning-settings').rebind('click', function() {
                loadSubPage('fm/account/file-management');
            });

            $('.business-dashboard .used-storage-info.ba-pub-links').rebind('click.suba', function() {
                loadSubPage('fm/links');
            });

            fileNumText = ffNumText(verFiles, 'file');
            $('.ba-version .ff-occupy', $dataStats).text(bytesToSize(verBytes));
            $('.ba-version .file-number', $dataStats).text(fileNumText);
        }

        // if this is a business account user (sub or master)
        // if (u_attr.b) {
        //    $('.account.widget.bandwidth').addClass('hidden');
        //    $('.account.widget.body.achievements').addClass('hidden');
        // }

        onIdle(fm_resize_handler);
        initTreeScroll();

        // Button on dashboard to backup their master key
        $('.dashboard .backup-master-key').rebind('click', function() {
            M.showRecoveryKeyDialog(2);
        });
    });
}
dashboardUI.renderReferralWidget = function() {
    "use strict";

    // Referrals Widget
    if (mega.flags.refpr) {
        M.affiliate.getBalance().then(() => {
            let prefix = '.non-business-dashboard ';
            if (u_attr.b) {
                prefix = '.business-dashboard ';
            }

            const $referralWidget = $(prefix + '.account.widget.referrals');
            const balance = M.affiliate.balance;
            var localCurrency;
            var localTotal;
            var localAvailable;

            if (balance) {
                localCurrency = balance.localCurrency;

                $referralWidget.removeClass('hidden');

                if (localCurrency === 'EUR') {
                    localTotal = formatCurrency(balance.localTotal);
                    localAvailable = formatCurrency(balance.localAvailable);

                    $('.euro', $referralWidget).addClass('hidden');
                }
                else {
                    localTotal = formatCurrency(balance.localTotal, localCurrency, 'number');
                    localAvailable = formatCurrency(balance.localAvailable, localCurrency, 'number');

                    $('.euro', $referralWidget).removeClass('hidden');
                    $('.referral-value.local .currency', $referralWidget).text(localCurrency);
                    $('.referral-value.total.euro', $referralWidget)
                        .text(formatCurrency(balance.pending + balance.available));
                    $('.referral-value.available.euro', $referralWidget).text(formatCurrency(balance.available));
                }

                $('.referral-value.total.local .value', $referralWidget)
                    .text(localTotal);
                $('.referral-value.available.local .value', $referralWidget)
                    .text(localAvailable);

                // Referral widget button
                $('button.referral-program', $referralWidget).rebind('click.refer', () => {
                    loadSubPage('/fm/refer');
                });
            }
        }).catch(ex => {
            if (d) {
                console.error('Update affiliate data failed: ', ex);
            }
        });
    }
};
dashboardUI.updateWidgets = function(widget) {
    /* Contacts block */
    dashboardUI.updateContactsWidget();

    /* Chat block */
    dashboardUI.updateChatWidget();

    // Cloud data block
    dashboardUI.updateCloudDataWidget();
};
dashboardUI.updateContactsWidget = function() {
    var contacts = M.getActiveContacts();
    if (!contacts.length) {
        $('.account.widget.text.contacts').removeClass('hidden');
        $('.account.data-table.contacts').addClass('hidden');
    }
    else {
        var recent = 0;
        var now = unixtime();
        contacts.forEach(function(handle) {
            var user = M.getUserByHandle(handle);

            if ((now - user.ts) < (7 * 86400)) {
                recent++;
            }
        });
        $('.account.widget.text.contacts').addClass('hidden');
        $('.account.data-table.contacts').removeClass('hidden');
        $('.data-right-td.all-contacts span').text(contacts.length);
        $('.data-right-td.new-contacts span').text(recent);
        $('.data-right-td.waiting-approval span').text(Object.keys(M.ipc || {}).length);
        $('.data-right-td.sent-requests span').text(Object.keys(M.opc || {}).length);
    }
};
dashboardUI.updateChatWidget = function() {
    var allChats = 0;
    var privateChats = 0;
    var groupChats = 0;
    var unreadMessages = $('.new-messages-indicator .chat-unread-count:visible').text();

    if (!megaChatIsDisabled && typeof megaChat !== 'undefined') {
        megaChat.chats.forEach(function(chatRoom) {
            if (chatRoom.type === "group" || chatRoom.type === "public") {
                groupChats++;
            }
            else {
                privateChats++;
            }
            allChats++;
        });
    }
    if (allChats === 0) {
        $('.account.widget.text.chat').removeClass('hidden');
        $('.account.icon-button.add-contacts').addClass('hidden');
        $('.account.data-table.chat').addClass('hidden');
    }
    else {
        $('.account.widget.text.chat').addClass('hidden');
        $('.account.icon-button.add-contacts').removeClass('hidden');
        $('.account.data-table.chat').removeClass('hidden');
        $('.data-right-td.all-chats span').text(allChats);
        $('.data-right-td.group-chats span').text(groupChats);
        $('.data-right-td.private-chats span').text(privateChats);
        $('.data-right-td.unread-messages-data span').text(unreadMessages | 0);
    }
    $('.chat-widget .account.data-item, .chat-widget .account.widget.title')
        .rebind('click.chatlink', function() {
            loadSubPage('fm/chat');
        });
    $('.chat-widget .add-contacts').rebind('click.chatlink', function() {
        loadSubPage('fm/chat');
        Soon(function() {
            $('.conversations .small-icon.white-medium-plus').parent().trigger('click');
        });
    });
};
dashboardUI.updateCloudDataWidget = function() {
    const files = l.file_count;
    const folders = l.folder_count;
    const data = M.getDashboardData();
    const locale = [files, folders, files, folders, folders, folders];
    const map = ['files', 'folders', 'rubbish', 'ishares', 'oshares', 'links', 'versions'];
    const intl = typeof Intl !== 'undefined' && Intl.NumberFormat && new Intl.NumberFormat();

    $('.data-item .links-s').rebind('click', function() {
        loadSubPage('fm/public-links');
        return false;
    });

    $('.data-item .rubbish-bin-dashboard').rebind('click', function() {
        loadSubPage('fm/' + M.RubbishID);
        return false;
    });

    $('.data-item .incoming').rebind('click', function() {
        loadSubPage('fm/shares');
        return false;
    });

    $('.data-item .outgoing').rebind('click', function() {
        loadSubPage('fm/out-shares');
        return false;
    });

    $('.account.data-item .versioning-settings').rebind('click', function() {
        loadSubPage('fm/account/file-management');
    });

    $('.data-item:not(.used-storage-info)', '.account.data-table.data')
        .each(function(idx, elm) {
            const props = data[map[idx]];
            let {cnt, xfiles, size} = props;
            if (intl) {
                cnt = intl.format(cnt || 0);
                xfiles = intl.format(xfiles || 0);
            }

            let str = idx < 6 ? mega.icu.format(locale[idx], cnt) : cnt;

            if (props.xfiles > 1) {
                str += `, ${mega.icu.format(files, xfiles)}`;
            }

            elm.children[1].textContent = str;
            if (props.cnt > 0) {
                elm.children[2].textContent = bytesToSize(size);
                $(elm).removeClass('empty');
                $('.account.data-item .versioning-settings').show();
            }
            else {
                elm.children[2].textContent = '-';
                $(elm).addClass('empty');
                $('.account.data-item .versioning-settings').hide();
            }
        });
};
dashboardUI.prototype = undefined;
Object.freeze(dashboardUI);

/**
 * Function to init custom block scrolling
 * @param {Object} $scrollBlock optional custom block selector.
 */
function initDashboardScroll() {
    "use strict";

    var $scrollBlock = $('.fm-right-block.dashboard', '.fm-main');

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
