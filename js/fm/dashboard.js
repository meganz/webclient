function dashboardUI() {
    $('.fm-right-files-block, .section.conversations, .fm-right-account-block').addClass('hidden');
    $('.fm-right-block.dashboard').removeClass('hidden');

    // Hide backup widget is user already saved recovery key before
    if (localStorage.recoverykey) {
        $('.account.widget.recovery-key').addClass('hidden');
    }
    else {
        $('.account.widget.recovery-key').removeClass('hidden');
        // Button on dashboard to backup their master key
        $('.backup-master-key').rebind('click', function() {
            loadSubPage('backup');
        });
    }

    M.onSectionUIOpen('dashboard');
    accountUI.userUIUpdate();

    // Add-contact plus
    $('.dashboard .contacts-widget .add-contacts').rebind('click', function() {
        contactAddDialog();
        $('.fm-add-user').trigger('click');
        $('.add-user-size-icon').trigger('click');
        return false;
    });

    // Avatar dialog
    $('.fm-account-avatar').rebind('click', function(e) {
        avatarDialog();
    });

    // Data plus, upload file
    $('.data-float-bl .icon-button').rebind('click', function() {
        $('.fm-file-upload input').trigger('click');
        return false;
    });

    // Space-widget clickable sections
    $('.account.widget.storage .pr-item')
        .rebind('click', function() {
            var section = String($(this).attr('class')).replace(/account|pr-item|empty/g, '').trim();
            switch (section) {
                case 'cloud-drive':
                    section = M.RootID;
                    break;
                case 'rubbish-bin':
                    section = M.RubbishID;
                    break;
                case 'inbox':
                    section = M.InboxID;
                    break;
                case 'incoming-shares':
                    section = 'shares';
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

    // Account data
    M.accountData(function(account) {
        var perc;

        // Show ballance
        $('.account.left-pane.balance-info').text(l[7108]);
        $('.account.left-pane.balance-txt').safeHTML('@@ &euro; ', account.balance[0][0]);

        $('.fm-account-blocks.storage, .fm-account-blocks.bandwidth').removeClass('exceeded going-out');

        // Achievements Widget
        if (account.maf) {
            $('.fm-right-block.dashboard').addClass('active-achievements');
            var $achWidget = $('.account.widget.achievements');
            var maf = M.maf;
            var $storage = $('.account.bonuses-size.storage', $achWidget);
            var $transfer = $('.account.bonuses-size.transfer', $achWidget);
            var storageCurrentValue = maf.storage.current /*+ maf.storage.base*/;
            var transferCurrentValue = maf.transfer.current /*+ maf.transfer.base*/;

            $storage.text(bytesToSize(storageCurrentValue, 0));
            $transfer.text(bytesToSize(transferCurrentValue, 0));

            if (maf.storage.current > 0) {
                $storage.removeClass('light-grey');
            }
            else {
                $storage.addClass('light-grey');
            }
            if (maf.transfer.current > 0) {
                $transfer.removeClass('light-grey');
            }
            else {
                $transfer.addClass('light-grey');
            }

            $('.progress-bar.storage', $achWidget)
                .css('width', Math.round(maf.storage.current * 100 / maf.storage.max) + '%');
            $('.progress-bar.transfers', $achWidget)
                .css('width', Math.round(maf.transfer.current * 100 / maf.transfer.max) + '%');

            $('.more-bonuses', $achWidget).rebind('click', function() {
                mega.achievem.achievementsListDialog();
            });
        }
        else {
            $('.fm-right-block.dashboard').removeClass('active-achievements');
        }

        // Elements for free/pro accounts. Expites date / Registration date
        if (u_attr.p) {

            // Subscription
            if (account.stype == 'S') {

                // Get the date their subscription will renew
                var timestamp = account.srenew[0];

                // Display the date their subscription will renew
                if (timestamp > 0) {
                    $('.account.left-pane.plan-date-val').text(time2date(timestamp, 2));
                    $('.account.left-pane.plan-date-info').text(l[7354]);
                }
                else {
                    // Otherwise hide info blocks
                    $('.account.left-pane.plan-date-val, .account.left-pane.plan-date-info').addClass('hidden');
                }
            }
            else if (account.stype == 'O') {
                // one-time or cancelled subscription
                $('.account.left-pane.plan-date-info').text(l[16175]);
                $('.account.left-pane.plan-date-val').text(time2date(account.expiry, 2));
            }
        }

        /* Registration date, bandwidth notification link */
        $('.dashboard .button.upgrade-account, .bandwidth-info a').rebind('click', function() {
            loadSubPage('pro');
        });
        $('.account.left-pane.reg-date-info').text(l[16128]);
        $('.account.left-pane.reg-date-val').text(time2date(u_attr.since, 2));


        accountUI.fillCharts(account, true);


        /* Used Storage progressbar */
        var percents = [
            100 * account.stats[M.RootID].bytes / account.space,
            100 * account.stats[M.RubbishID].bytes / account.space,
            100 * account.stats.inshares.bytes / account.space,
            100 * account.stats[M.InboxID].bytes / account.space
        ];
        for (var i = 0; i < 4; i++) {
            var $percBlock = $('.storage .account.progress-perc.pr' + i);
            if (percents[i] > 0) {
                $percBlock.text(Math.round(percents[i]) + ' %');
                $percBlock.parent().removeClass('empty');
            }
            else {
                $percBlock.text('');
                $percBlock.parent().addClass('empty');
            }
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
        /* End of Used Storage progressbar */


        /* Used Bandwidth progressbar */
        $('.bandwidth .account.progress-bar.green').css('width', account.tfsq.perc + '%');
        $('.bandwidth .account.progress-size.available-quota').text(bytesToSize(account.tfsq.left, 0));

        if (u_attr.p) {
            $('.account.widget.bandwidth').addClass('enabled-pr-bar');
            $('.dashboard .account.rounded-icon.right').addClass('hidden');
        }
        else {

            // Show available bandwith for FREE accounts with enabled achievements
            if (account.tfsq.ach) {
                $('.account.widget.bandwidth').addClass('enabled-pr-bar');
            }
            else {
                $('.account.widget.bandwidth').removeClass('enabled-pr-bar');
            }

            $('.dashboard .account.rounded-icon.right').removeClass('hidden');
            $('.dashboard .account.rounded-icon.right').rebind('click', function() {
                if (!$(this).hasClass('active')) {
                    $(this).addClass('active');
                    $(this).find('.dropdown').removeClass('hidden');
                }
                else {
                    $(this).removeClass('active');
                    $(this).find('.dropdown').addClass('hidden');
                }
            });
            $('.fm-right-block.dashboard').rebind('click', function(e) {
                if (!$(e.target).hasClass('rounded-icon') && $('.account.rounded-icon.info').hasClass('active')) {
                    $('.account.rounded-icon.info').removeClass('active');
                    $('.dropdown.body.bandwidth-info').addClass('hidden');
                }
            });

            // Get more transfer quota button
            $('.account.widget.bandwidth .free .more-quota').rebind('click', function() {
                // if the account have achievements, show them, otherwise #pro
                if (M.maf) {
                    mega.achievem.achievementsListDialog();
                }
                else {
                    loadSubPage('pro');
                }
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

        onIdle(fm_resize_handler);
        initTreeScroll();
    });
}
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
    var unreadMessages = $('.nw-fm-left-icon.conversations > .new-messages-indicator:visible').text();

    if (!megaChatIsDisabled && typeof megaChat !== 'undefined') {
        megaChat.chats.forEach(function(chatRoom) {
            if (chatRoom.type === "group") {
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
    var file1 = 835;
    var files = 833;
    var folder1 = 834;
    var folders = 832;
    var data = M.getDashboardData();
    var locale = [files, folders, files, folders, folders, files];
    var map = ['files', 'folders', 'rubbish', 'ishares', 'oshares', 'links'];
    var intl = typeof Intl !== 'undefined' && Intl.NumberFormat && new Intl.NumberFormat();

    $('.data-item .links-s').rebind('click', function() {
        loadSubPage('fm/links');
        return false;
    });

    $('.data-float-bl').find('.data-item')
        .each(function(idx, elm) {
            var props = data[map[idx]];
            var str = l[locale[idx]];
            var cnt = props.cnt;
            if (cnt === 1) {
                str = l[(locale[idx] === files) ? file1 : folder1];
            }
            else if (intl) {
                cnt = intl.format(props.cnt || 0);
            }

            if (props.xfiles > 1) {
                str += ', ' + String(l[833]).replace('[X]', props.xfiles);
            }

            elm.children[1].textContent = idx < 5 ? String(str).replace('[X]', cnt) : cnt;
            if (props.cnt > 0) {
                elm.children[2].textContent = bytesToSize(props.size);
                $(elm).removeClass('empty');
            }
            else {
                elm.children[2].textContent = '-';
                $(elm).addClass('empty');
            }
        });
};
dashboardUI.prototype = undefined;
Object.freeze(dashboardUI);

function initDashboardScroll(scroll) {
    $('.fm-right-block.dashboard').jScrollPane({
        enableKeyboardNavigation: false, showArrows: true, arrowSize: 5, animateScroll: true
    });
    jScrollFade('.fm-right-block.dashboard');
    if (scroll) {
        var jsp = $('.fm-right-block.dashboard').data('jsp');
        if (jsp) {
            jsp.scrollToBottom();
        }
    }
}
