function dashboardUI() {
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

    if (u_attr.b) {
        $('.fm-right-block.dashboard .non-business-dashboard').addClass('hidden');
        $('.fm-right-block.dashboard .business-dashboard').removeClass('hidden');
        $('.dashboard .button.upgrade-account').addClass('hidden');
        if (u_attr.b.m) {
            $('.business-dashboard .go-to-usermanagement-btn').removeClass('hidden');

            // event handler for clicking on user-management button in dashboard.
            $('.business-dashboard .go-to-usermanagement-btn').off('click').on('click',
                function userManagementBtnClickHandler() {
                    M.openFolder('user-management', true);
                }
            );
        }
        else {
            $('.business-dashboard .go-to-usermanagement-btn').addClass('hidden');
        }
    }
    else {
        $('.fm-right-block.dashboard .non-business-dashboard').removeClass('hidden');
        $('.fm-right-block.dashboard .business-dashboard').addClass('hidden');
        $('.dashboard .button.upgrade-account').removeClass('hidden');
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
    $('.data-float-bl .icon-button').rebind('click', function() {
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
            else {
                section = null;
            }

            if (section) {
                M.openFolder(section);
            }

            return false;
        });

    // Account data
    M.accountData(function(account) {
        var perc;

        // QR Code
        var drawQRCanvas = function _drawQRCanvas() {
            var cutPlace = location.href.indexOf('/fm/');
            var myHost = location.href.substr(0, cutPlace);
            myHost += '/' + M.account.contactLink;
            if (account.contactLink && account.contactLink.length) {
                var QRoptions = {
                    width: 106,
                    height: 106,
                    correctLevel: QRErrorCorrectLevel.H,    // high
                    foreground: '#D90007',
                    text: myHost
                };
                // Render the QR code
                $('.account.qr-icon').text('').qrcode(QRoptions);
            }
            else {
                $('.account.qr-icon').text('');

            }
        };
        drawQRCanvas();

        $('.qr-widget-w .access-qr').rebind('click', function () {
            if (account.contactLink && account.contactLink.length) {
                openAccessQRDialog();
            }
            else {
                var msgTitle = l[18230]; // 'QR Code Reactivate';
                var msgMsg = l[18231]; // 'Your QR Code is deactivated.';
                var msgQuestion = l[18232]; // 'Do you want to reactivate your QR Code?';
                msgDialog('confirmation', msgTitle, msgMsg,
                    msgQuestion,
                    function (reActivate) {
                        if (reActivate) {
                            var reGenQR = { a: 'clc' };
                            api_req(reGenQR, {
                                callback: function (res2, ctx2) {
                                    if (typeof res2 !== 'string') {
                                        return;
                                    }
                                    M.account.contactLink = 'C!' + res2;
                                    drawQRCanvas();
                                    openAccessQRDialog();
                                }
                            });
                        }
                    });
            }
        });

        // Show ballance
        $('.account.left-pane.balance-info').text(l[7108]);
        $('.account.left-pane.balance-txt').safeHTML('@@ &euro; ', account.balance[0][0]);

        $('.fm-account-blocks.storage, .fm-account-blocks.bandwidth').removeClass('exceeded going-out');

        // Achievements Widget
        if (account.maf && !u_attr.b) {
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

            if (u_attr.p === 100 && u_attr.b) {
                $('.account.left-pane.reg-date-info, .account.left-pane.reg-date-val').addClass('hidden');
                var $businessLeft = $('.account.left-pane.info-block.business-users').removeClass('hidden');
                if (u_attr.b.s === 1) {
                    $businessLeft.find('.suba-status').addClass('active').removeClass('disabled pending')
                        .text(l[7666]);
                    if (u_attr.b.m) { // master
                        if ((Date.now() / 1000) - timestamp > 0) {
                            $businessLeft.find('.suba-status').addClass('pending').removeClass('disabled active')
                                .text(l[19609]);
                        }
                    }
                }
                else {
                    $businessLeft.find('.suba-status').removeClass('disabled').removeClass('pending active')
                        .text(l[19608]);
                }

                if (u_attr.b.m) { // master
                    $businessLeft.find('.suba-role').text(l[19610]);
                }
                else {
                    $businessLeft.find('.suba-role').text(l[5568]);
                }

                var $businessDashboard = $('.fm-right-block.dashboard .business-dashboard').removeClass('hidden');
                $('.fm-right-block.dashboard .non-business-dashboard').addClass('hidden');

            }
        }
        else {
            // resetting things might be changed in business account
            $('.fm-right-block.dashboard .business-dashboard').addClass('hidden');
            $('.account.left-pane.info-block.business-users').addClass('hidden');
            $('.account.left-pane.reg-date-info, .account.left-pane.reg-date-val').removeClass('hidden');
            $('.fm-right-block.dashboard .non-business-dashboard').removeClass('hidden');
        }

        /* Registration date, bandwidth notification link */
        $('.dashboard .default-green-button.upgrade-account, .bandwidth-info a').rebind('click', function() {
            loadSubPage('pro');
        });
        $('.account.left-pane.reg-date-info').text(l[16128]);
        $('.account.left-pane.reg-date-val').text(time2date(u_attr.since, 2));

        // left-panel responsive contents
        var $planDateWidth = $('.plan-date-info').width() + $('.plan-date-val').width();
        var $regDateWidth = $('.reg-date-info').width() + $('.plan-date-val').width();
        $.leftPaneResizable.options.updateWidth = Math.max($planDateWidth, $regDateWidth);

        $($.leftPaneResizable).trigger('resize');
        if (!u_attr.b) {
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
                    $percBlock.parent().removeClass('empty hidden');
                }
                else {
                    $percBlock.text('');
                    $percBlock.parent().addClass('empty hidden');
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
            // $('.dashboard .button.upgrade-account').removeClass('hidden');
            // Fill rest of widgets
            dashboardUI.updateWidgets();
        }
        else {
            $('.dashboard .button.upgrade-account').addClass('hidden');
            $('.business-dashboard .user-management-storage .storage-transfer-data')
                .text(bytesToSize(account.space_used));
            $('.business-dashboard .user-management-transfer .storage-transfer-data')
                .text(bytesToSize(account.tfsq.used));

            var $dataStats = $('.business-dashboard .subaccount-view-used-data');

            $dataStats.find('.ba-root .ff-occupy').text(bytesToSize(account.stats[M.RootID].bytes));
            $dataStats.find('.ba-root .folder-number').text(account.stats[M.RootID].folders + ' ' + l[2035]);
            $dataStats.find('.ba-root .file-number').text(account.stats[M.RootID].files + ' ' + l[2034]);

            $dataStats.find('.ba-inshare .ff-occupy').text(bytesToSize(account.stats['inshares'].bytes));
            $dataStats.find('.ba-inshare .folder-number').text(account.stats['inshares'].folders + ' ' + l[2035]);
            $dataStats.find('.ba-inshare .file-number').text(account.stats['inshares'].files + ' ' + l[2034]);

            $dataStats.find('.ba-outshare .ff-occupy').text(bytesToSize(account.stats['outshares'].bytes));
            $dataStats.find('.ba-outshare .folder-number').text(account.stats['outshares'].folders + ' ' + l[2035]);
            $dataStats.find('.ba-outshare .file-number').text(account.stats['outshares'].files + ' ' + l[2034]);

            $dataStats.find('.ba-rubbish .ff-occupy').text(bytesToSize(account.stats[M.RubbishID].bytes));
            $dataStats.find('.ba-rubbish .folder-number').text(account.stats[M.RubbishID].folders + ' ' + l[2035]);
            $dataStats.find('.ba-rubbish .file-number').text(account.stats[M.RubbishID].files + ' ' + l[2034]);

            var verFiles = 0;
            var verBytes = 0;
            for (var k in account.stats) {
                if (account.stats[k]['vfiles']) {
                    verFiles += account.stats[k]['vfiles'];
                }
                if (account.stats[k]['vbytes']) {
                    verBytes += account.stats[k]['vbytes'];
                }
            }

            $dataStats.find('.ba-version .ff-occupy').text(bytesToSize(verBytes));
            $dataStats.find('.ba-version .file-number').text(verFiles + ' ' + l[2034]);
        }

        // if this is a business account user (sub or master)
        //if (u_attr.b) {
        //    $('.dashboard .button.upgrade-account').addClass('hidden');
        //    $('.account.widget.bandwidth').addClass('hidden');
        //    $('.account.widget.body.achievements').addClass('hidden');
        //}

        

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
    var map = ['files', 'folders', 'rubbish', 'ishares', 'oshares', 'links', 'versions'];
    var intl = typeof Intl !== 'undefined' && Intl.NumberFormat && new Intl.NumberFormat();

    $('.data-item .links-s').rebind('click', function() {
        loadSubPage('fm/links');
        return false;
    });

    $('.account.data-item .tiny-icon.cog').rebind('click', function() {
        loadSubPage('fm/account/file-management');
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
                $('.account.data-item .tiny-icon.cog').show();
            }
            else {
                elm.children[2].textContent = '-';
                $(elm).addClass('empty');
                $('.account.data-item .tiny-icon.cog').hide();
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
