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

    // If Business or Pro Flexi, show the Business dashboard
    if (u_attr && (u_attr.b || u_attr.pf)) {

        $('.fm-right-block.dashboard .non-business-dashboard').addClass('hidden');
        const $bsnDashboard = $('.fm-right-block.dashboard .business-dashboard').removeClass('hidden');

        // If Business master account and not expired
        if (u_attr.b && u_attr.b.m && u_attr.b.s !== pro.ACCOUNT_STATUS_EXPIRED) {
            $('.overall-usage-container', $bsnDashboard).addClass('admin');
            $('.subaccount-view-used-data .view-title span', $bsnDashboard).text(l.bsn_pers_usage);
        }

        // If Business expired/grace period or sub user account
        if (u_attr.b && (u_attr.b.s !== pro.ACCOUNT_STATUS_ENABLED || !u_attr.b.m)) {
            $('.left-pane.small-txt.plan-date-info', '.dashboard').addClass('hidden');
            $('.left-pane.big-txt.plan-date-val', '.dashboard').addClass('hidden');
        }

        // If Pro Flexi, show admin overall usage container (and keep Data heading, not Personal usage data)
        if (u_attr.pf) {
            $('.overall-usage-container', $bsnDashboard).addClass('admin');
        }

        // If Pro Flexi expired/grace period
        if (u_attr.pf && (u_attr.pf.s !== pro.ACCOUNT_STATUS_ENABLED)) {
            $('.left-pane.small-txt.plan-date-info', '.dashboard').addClass('hidden');
            $('.left-pane.big-txt.plan-date-val', '.dashboard').addClass('hidden');
        }
    }
    else {
        // Show regular dashboard
        $('.fm-right-block.dashboard .non-business-dashboard').removeClass('hidden');
        $('.fm-right-block.dashboard .business-dashboard').addClass('hidden');
    }

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
            else if (section.indexOf('backups') !== -1) {

                section = M.BackupsId;
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

        // If Pro Flexi, or Business master user (and not status expired), render the
        // storage and transfer analytics graphs on the admin user's dashboard page
        if (u_attr.pf || (u_attr.b && u_attr.b.m && u_attr.b.s !== pro.ACCOUNT_STATUS_EXPIRED)) {

            // Make sure the files are loaded
            M.require('businessAcc_js', 'businessAccUI_js').done(() => {

                const business = new BusinessAccountUI();
                business.viewAdminDashboardAnalysisUI();
            });
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
        if (u_attr.p || (u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_EXPIRED) ||
            (u_attr.pf && u_attr.pf.s === pro.ACCOUNT_STATUS_EXPIRED)) {

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

            // If active/grace/expired Business or Pro Flexi expired status
            if ((u_attr.b) || (u_attr.pf && u_attr.pf.s === pro.ACCOUNT_STATUS_EXPIRED)) {

                // someone modified the CSS to overwirte the hidden class !!, therefore .hide() will be used
                $('.account.left-pane.reg-date-info, .account.left-pane.reg-date-val').addClass('hidden').hide();
                var $businessLeft = $('.account.left-pane.info-block.business-users').removeClass('hidden');

                if (u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_ENABLED) {
                    $businessLeft.find('.suba-status').addClass('active').removeClass('disabled pending')
                        .text(l[7666]);
                }
                else if (u_attr.b && u_attr.b.s === pro.ACCOUNT_STATUS_GRACE_PERIOD && u_attr.b.m) {
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

                    if (u_attr.b && u_attr.b.m) {
                        $('.suba-pay-bill', $businessLeft).removeClass('hidden');
                    }
                }

                // For Pro Flexi, hide the Role block
                if (u_attr.pf) {
                    $('.suba-role', $businessLeft).parent().addClass('hidden');
                }

                // Otherwise for Business Master and User show the Role block
                if (u_attr.b && u_attr.b.m) {
                    $('.suba-role', $businessLeft).text(l[19610]); // Administrator
                }
                else {
                    $('.suba-role', $businessLeft).text(l[5568]); // User
                }

                if (u_attr.b && (u_attr.b.s !== pro.ACCOUNT_STATUS_ENABLED || !u_attr.b.m)) {
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
        for (var i = 0; i < $('.account.left-pane.small-txt:visible').length; i++) {
            var rowwidth = $('.account.left-pane.small-txt:visible').get(i).offsetWidth
                + $('.account.left-pane.big-txt:visible').get(i).offsetWidth;
            maxwidth = Math.max(maxwidth, rowwidth);
        }
        $.leftPaneResizable.options.updateWidth = maxwidth;
        $($.leftPaneResizable).trigger('resize');

        const mBackupsNode = M.getNodeByHandle(M.BackupsId);

        // If not Business or Pro Flexi (i.e. regular account)
        if (!u_attr.b && !u_attr.pf) {

            accountUI.general.charts.init(account);

            /* Used Storage */
            var percents = [
                100 * account.stats[M.RootID].bytes / account.space,
                100 * account.stats[M.RubbishID].bytes / account.space,
                100 * (mBackupsNode.tb / account.space || 0),
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

            if (mBackupsNode) {
                $('.account.progress-size.backups').text(`(${bytesToSize(mBackupsNode.tb)})`);
                $('.js-backups-el', '.non-business-dashboard').removeClass('hidden');
            }
            else {
                $('.js-backups-el', '.non-business-dashboard').addClass('hidden');
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

            // Fill Cloud data widget
            dashboardUI.updateCloudDataWidget();
        }
        else {
            // Business or Pro Flexi
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

            // If Pro Flexi or Business master account
            if (u_attr.pf || (u_attr.b && u_attr.b.m)) {

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

            if (mBackupsNode) {
                $('.js-backups-el', '.business-dashboard').removeClass('hidden');

                fileNumText = ffNumText(mBackupsNode.tf | 0, 'file');
                folderNumText = ffNumText(mBackupsNode.td | 0, 'folder');
                $('.ba-backups .ff-occupy', $dataStats).text(bytesToSize(mBackupsNode.tb, 2));
                $('.ba-backups .folder-number', $dataStats).text(folderNumText);
                $('.ba-backups .file-number', $dataStats).text(fileNumText);
            }
            else {
                $('.js-backups-el', '.business-dashboard').addClass('hidden');
            }

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

        // Init the dashboard content scroll, after we've fetched account data (in MEGA Lite this takes longer)
        if (mega.lite.inLiteMode) {
            initDashboardScroll();
        }

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

            // If Business or Pro Flexi, use the business-dashboard parent selector
            if (u_attr.b || u_attr.pf) {
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

dashboardUI.updateCloudDataWidget = function() {
    const files = l.file_count;
    const folders = l.folder_count;
    const data = M.getDashboardData();
    const locale = [files, folders, files, folders, folders, folders, folders];
    const map = ['files', 'folders', 'rubbish', 'ishares', 'oshares', 'backups', 'links', 'versions'];

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

    $('.backups', '.data-item').rebind('click.openBC', () => {

        if (!M.BackupsId) {
            return false;
        }
        M.openFolder(M.BackupsId);
        return false;
    });

    $('.account.data-item .versioning-settings').rebind('click', function() {
        loadSubPage('fm/account/file-management');
    });

    $('.data-item:not(.used-storage-info)', '.account.data-table.data')
        .each(function(idx, elm) {
            const props = data[map[idx]];
            let {cnt, xfiles, size} = props;

            let str = idx < 7 ? mega.icu.format(locale[idx], cnt, true) : cnt;

            if (props.xfiles > 0) {
                str += `, ${mega.icu.format(files, xfiles, true)}`;
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
