// MEGA Achievements
Object.defineProperty(mega, 'achievem', {
    value: Object.create(null, {
        RWDLVL: {value: 0},

        toString: {
            value: function toString(ach) {
                if (ach !== undefined) {
                    var res = Object.keys(this)
                        .filter(function(v) {
                            return this[v] === ach;
                        }.bind(this));

                    return String(res);
                }

                return '[object MegaAchievements]';
            }
        },

        bind: {
            value: function bind(action) {
                this.rebind('click', function() {
                    if (action) {
                        switch (action[0]) {
                            case '!':
                                var pf = navigator.platform.toUpperCase();
                                if (pf.indexOf('WIN') !== -1) {
                                    open('https://mega.nz/MEGAsyncSetup.exe');
                                    break;
                                }

                                if (pf.indexOf('MAC') !== -1) {
                                    open('https://mega.nz/MEGAsyncSetup.dmg');
                                    break;
                                }
                                mega.redirect('mega.io', 'desktop', false, false, false);
                                break;
                            case '/':
                                if (action === '/mobile') {
                                    mega.redirect('mega.io', 'mobile', false, false, false);
                                    break;
                                }
                                loadSubPage(action);
                                break;

                            case '~':
                                var fn = action.substr(1);
                                if (typeof mega.achievem[fn] === 'function') {
                                    if (fn.toLowerCase().indexOf('dialog') > 0) {
                                        closeDialog();
                                    }
                                    mega.achievem[fn]();
                                }
                                break;
                        }
                    }
                    return false;
                });
            }
        },

        prettify: {
            value: function prettify(maf) {
                var data = Object(clone(maf.u));
                var quota = {
                    storage: {base: 0, current: 0, max: 0},
                    transfer: {base: 0, current: 0, max: 0}
                };

                var setExpiry = function(data, out) {
                    var time = String(data[2]).split('');
                    var unit = time.pop();
                    time = time.join('') | 0;

                    if (time === 1 && unit === 'y') {
                        time = 12;
                        unit = 'm';
                    }

                    var result = {
                        unit: unit,
                        value: time
                    };

                    switch (unit) {
                        case 'd':
                            result.utxt = (time < 2) ? l[930] : l[16290];
                            break;
                        case 'w':
                            result.utxt = (time < 2) ? l[16292] : l[16293];
                            break;
                        case 'm':
                            result.utxt = (time < 2) ? l[913] : l[6788];
                            break;
                        case 'y':
                            result.utxt = (time < 2) ? l[932] : l[16294];
                            break;
                    }

                    out = out || data;
                    out.expiry = result;
                    return result;
                };

                Object.keys(data)
                    .forEach(function(k) {
                        setExpiry(data[k]);
                    });

                var mafr = Object(maf.r);
                var mafa = Object(maf.a);
                var alen = mafa.length;
                while (alen--) {
                    var ach = clone(mafa[alen]);

                    if (!data[ach.a]) {
                        data[ach.a] = Object(clone(mafr[ach.r]));
                        setExpiry(data[ach.a]);
                    }
                    var exp = setExpiry(mafr[ach.r] || data[ach.a], ach);
                    var ts = ach.ts * 1000;

                    ach.date = new Date(ts);
                    ach.left = Math.round((ach.e * 1000 - Date.now()) / 86400000);

                    if (data[ach.a].rwds) {
                        data[ach.a].rwds.push(ach);
                    }
                    else if (data[ach.a].rwd) {
                        data[ach.a].rwds = [data[ach.a].rwd, ach];
                    }
                    else {
                        data[ach.a].rwd = ach;
                    }
                }

                Object.keys(data)
                    .forEach(function(k) {
                        var ach = data[k];
                        var base = 0;
                        var rwds = ach.rwds || [ach.rwd];
                        for (var i = rwds.length; i--;) {
                            var rwd = rwds[i];

                            if (rwd && rwd.left > 0) {
                                base++;
                                if (ach[1]) {
                                    quota.transfer.current += mafr[rwd.r][1];
                                }
                                quota.storage.current += mafr[rwd.r][0];
                            }
                        }

                        if (ach[1]) {
                            quota.transfer.max += ach[1] * (base || 1);
                        }
                        quota.storage.max += ach[0] * (base || 1);
                    });

                if (Object(u_attr).p) {
                    quota.storage.base = Object(M.account).pstrg;
                    quota.transfer.base = Object(M.account).pxfer;
                }
                else {
                    quota.storage.base = maf.s;
                }

                data = Object.create(quota, Object.getOwnPropertyDescriptors(data));

                return data;
            }
        }
    })
});

(function(o) {
    var map = {
        /*  1 */ 'WELCOME'     : 'ach-create-account:/register',
        /*  2 */ 'TOUR'        : 'ach-take-tour',
        /*  3 */ 'INVITE'      : 'ach-invite-friend:~inviteFriendDialog',
        /*  4 */ 'SYNCINSTALL' : 'ach-install-megasync:!',
        /*  5 */ 'APPINSTALL'  : 'ach-install-mobile-app:/mobile',
        /*  6 */ 'VERIFYE164'  : 'ach-verify-number',
        /*  7 */ 'GROUPCHAT'   : 'ach-group-chat:/fm/chat',
        /*  8 */ 'FOLDERSHARE' : 'ach-share-folder:/fm/contacts',
        /*  9 */ 'SMSVERIFY'   : 'ach-sms-verification:~smsVerifyDialog'
    };
    var mapToAction = Object.create(null);
    var mapToElement = Object.create(null);

    Object.keys(map).forEach(function(k, idx) {
        Object.defineProperty(o, 'ACH_' + k, {
            value: idx + 1,
            enumerable: true
        });

        var tmp = map[k].split(':');
        mapToAction[idx + 1] = tmp[1];
        mapToElement[idx + 1] = tmp[0];
    });
    Object.defineProperty(o, 'mapToAction', {
        value: Object.freeze(mapToAction)
    });
    Object.defineProperty(o, 'mapToElement', {
        value: Object.freeze(mapToElement)
    });

})(mega.achievem);


/**
 * Check whether achievements are enabled for the current user.
 * @returns {MegaPromise}
 */
mega.achievem.enabled = function achievementsEnabled() {
    'use strict';

    var self = this;
    var promise = new MegaPromise();
    var status = 'ach' + u_type + u_handle;

    var notify = function(res) {
        self.achStatus[status] = res | 0;

        if ((res | 0) > 0) {
            return promise.resolve();
        }
        promise.reject();
    };

    if (typeof this.achStatus[status] === 'number') {
        notify(this.achStatus[status]);
    }
    else if (u_type && u_attr !== undefined) {
        notify(u_attr.flags && u_attr.flags.ach);
    }
    else if (this.achStatus[status] instanceof MegaPromise) {
        promise = this.achStatus[status];
    }
    else {
        this.achStatus[status] = promise;
        api.req({a: 'ach'}).then(({result}) => result).always(notify).catch(dump);
    }

    return promise;
};
mega.achievem.achStatus = Object.create(null);

/**
 * Show achievements list dialog
 * @param {Function} [onDialogClosed] function to invoke when the [x] is clicked
 */
mega.achievem.achievementsListDialog = function achievementsListDialog(onDialogClosed) {
    if (!M.maf) {
        loadingDialog.show();

        M.accountData(function() {
            loadingDialog.hide();

            if (M.maf) {
                achievementsListDialog(onDialogClosed);
            }
            else if (onDialogClosed) {
                onIdle(onDialogClosed);
            }
        });
        return true;
    }
    var $dialog = $('.mega-dialog.achievements-list-dialog');

    $('button.js-close', $dialog)
        .rebind('click', function() {
            if (onDialogClosed) {
                onIdle(onDialogClosed);
            }
            closeDialog();
            return false;
        });

    // hide everything until seen on the api reply (maf)
    $('.achievements-cell', $dialog).addClass('hidden');

    mega.achievem.bindStorageDataToView($dialog, true);

    // Show dialog
    M.safeShowDialog('achievements', () => {
        $dialog.removeClass('hidden');

        // Init scroll
        var $scrollBlock = $('.achievements-scroll', $dialog);

        if ($scrollBlock.is('.ps')) {
            $scrollBlock.scrollTop(0);
            Ps.update($scrollBlock[0]);
        }
        else {
            Ps.initialize($scrollBlock[0]);
        }

        return $dialog;
    });

    $('.invitees .new-dialog-icon', $dialog).rebind('click', () => {
        closeDialog();
        fm_showoverlay();
        mega.achievem.invitationStatusDialog();
    });
    $('.js-dashboard-btn', $dialog).rebind('click', () => {
        closeDialog();
        loadSubPage('fm/dashboard');
    });
};

/**
 * Show achievements list dialog
 * @param {Element} [$viewContext] element to bind the data dynamicaly
 * @param {boolean} [isDialog] boolean value for conditinal bindings
 */
mega.achievem.bindStorageDataToView = function bindStorageDataToView($viewContext, isDialog) {
    'use strict';
    var ach = mega.achievem;
    var maf = M.maf;
    var totalStorage = 0;
    var totalTransfer = 0;
    var totalInviteeCount = 0;
    var $cell;
    var locFmt = l[16325].replace(/\[S]/g, '<span>').replace(/\[\/S]/g, '</span>');

    const calculateAndBindRewardData = function calculateAndBindRewardData(data, idx) {

        if (data.rwds) {
            for (var i = data.rwds.length - 1; i >= 0; i--) {
                // totalStorage += data.rwds[i].left > 0 ? data[0] : 0;
                // totalTransfer += data.rwds[i].left > 0 ? data[1] : 0;
                totalInviteeCount += data.rwds[i].left > 0 ? 1 : 0;
            }
        }
        else if (data.rwd) {
            locFmt = l[16336].replace(/[()]/g, '').replace('[S]', '<span>').replace('[/S]', '</span>');

            // totalStorage += data[0];
            // totalTransfer += data[1];

            if (!data.rwd.e) {
                // this reward do not expires
                locFmt = '&nbsp;';
            }
            else if (data.rwd.left < 1) {
                // show "Expired"
                locFmt = l[1664];
                // totalStorage -= data[0];
                // totalTransfer -= data[1];
                $('.expires-txt', $cell).addClass('error');
                $cell.addClass('expired');
            }

            if (idx !== ach.ACH_INVITE) {
                $cell.addClass('achieved');

                if (data.rwd.expiry.unit === "d" && data.rwd.left > 0){
                    locFmt = mega.icu.format(l.ach_expires_days, data.rwd.left)
                        .replace('[S]', '<span>').replace('[/S]', '</span>');
                    $('.expires-txt', $cell).safeHTML(locFmt);
                }
                else {
                    $('.expires-txt', $cell).safeHTML(locFmt.replace('%1', data.rwd.left).replace('%2', l[16290]));
                }
                if (!$('.expires-txt', $cell).hasClass('error')) {
                    $('.expires-txt', $cell).addClass('info');
                }

                locFmt = '';
                switch (idx) {
                    case ach.ACH_WELCOME:     locFmt = l[16395]; break;
                    case ach.ACH_SYNCINSTALL: locFmt = l[16396]; break;
                    case ach.ACH_APPINSTALL:  locFmt = l[16397]; break;
                }
            }
        }
        else {
            locFmt = l[16291].replace(/[()]/g, '').replace('[S]', '<span>').replace('[/S]', '</span>');
            $('.expires-txt', $cell)
                .removeClass('error')
                .safeHTML('%n', locFmt, data.expiry.value, data.expiry.utxt);
            $cell.removeClass('expired');
        }

    };

    for (var idx in maf) {
        if (maf.hasOwnProperty(idx)) {
            idx |= 0;
            var data = maf[idx];
            var selector = ach.mapToElement[idx];
            if (selector) {
                $cell = $('.achievements-cell.' + selector, $viewContext).removeClass('hidden');

                if (idx !== 3 && (data.rwd || data.rwds)) {
                    $cell.addClass('one-reward');
                }

                if (!$cell.hasClass('localized')) {
                    $cell.addClass('localized');
                }

                calculateAndBindRewardData(data, idx);

                ach.bind.call($('.mega-button.positive', $cell), ach.mapToAction[idx]);
                $cell.removeClass('hidden');

                // If this is the SMS achievement, and SMS achievements are not enabled yet, hide the container
                if (selector === 'ach-sms-verification' && u_attr.flags.smsve !== 2) {
                    $cell.addClass('hidden');
                }
            }
        }
    }

    const loadDialogMoreData = function loadDialogMoreData() {

        $('.storage-quota .quota-txt', $viewContext).text(bytesToSize(M.maf.storage.current, 0));
        // $('.transfer-quota .quota-txt', $viewContext).text(bytesToSize(totalTransfer, 0));

        if (maf[3].rwds) {
            $('.invitees .quota-txt', $viewContext).text(totalInviteeCount);
            $('.invitees .new-dialog-icon', $viewContext).removeClass('hidden');
        }
        else if (maf[3].rwd && maf[3].rwd.left > 0) {
            $('.invitees .quota-txt', $viewContext).text(1);
            $('.invitees .new-dialog-icon', $viewContext).removeClass('hidden');
        }
        else {
            $('.invitees .quota-txt', $viewContext).text(0);
            $('.invitees .new-dialog-icon', $viewContext).addClass('hidden');
        }

    };

    if (isDialog) {
        loadDialogMoreData();
    }

    maf = ach = undefined;
};

/**
 * Show Invite a friend dialog
 * @param {String} close dialog parameter
 */
mega.achievem.inviteFriendDialog = function inviteFriendDialog(close) {
    var $dialog = $('.mega-dialog.invite-dialog');

    if (close) {
        showLoseChangesWarning().done(closeDialog);
        return true;
    }

    $('button.js-close', $dialog).rebind('click', mega.achievem.inviteFriendDialog);
    $('button.how-it-works', $dialog).rebind('click', () => {
        $('.how-it-works, .how-it-works-body', $dialog).toggleClass('closed');
    });

    var ach = mega.achievem;
    var maf = M.maf;
    maf = maf[ach.ACH_INVITE];

    $('.info-body p:first', $dialog).safeHTML(l[16317].replace('[S]', '<strong>').replace('[/S]', '</strong>'));

    // Remove all previously added emails
    $('.share-added-contact.token-input-token-invite', $dialog).remove();

    // Remove success dialog look
    $dialog.removeClass('success');

    // Default buttons states
    $('button.back', $dialog).addClass('hidden');
    $('button.send', $dialog).removeClass('hidden').addClass('disabled');
    $('button.status', $dialog).addClass('hidden');

    // Show dialog
    M.safeShowDialog('invite-friend', function() {
        'use strict';

        $dialog.removeClass('hidden');

        if (!$('.achievement-dialog.input').tokenInput("getSettings")) {
            mega.achievem.initInviteDialogMultiInputPlugin();
        }
        else {
            initPerfectScrollbar($('.multiple-input', $dialog));
            Soon(function() {
                $('.token-input-input-token-mega input', $dialog).trigger("focus");
            });
        }

        return $dialog;
    });

    // Remove unfinished user inputs
    $('#token-input-ach-invite-dialog-input', $dialog).val('');

    // Set focus on input so user can type asap
    $('.multiple-input .token-input-list-invite', $dialog).click();

    // Show "Invitation Status" button if invitations were sent before
    if (maf && maf.rwd && 0) {
        $('button.status', $dialog)
            .removeClass('hidden')
            .rebind('click', function() {
                closeDialog();
                mega.achievem.invitationStatusDialog();
            });
    }
    else {
        $('button.status', $dialog).addClass('hidden');
    }
};

/**
 * Load the SMS phone verification dialog
 */
mega.achievem.smsVerifyDialog = function () {

    'use strict';

    sms.phoneInput.init();
};

mega.achievem.initInviteDialogMultiInputPlugin = function initInviteDialogMultiInputPlugin() {

    // Init textarea logic
    var $dialog = $('.mega-dialog.invite-dialog');
    var $this = $('.achievement-dialog.multiple-input.emails input');
    var contacts = M.getContactsEMails();
    var errorTimer = null;

    $this.tokenInput(contacts, {
        theme: "invite",
        hintText: l[5908],
        searchingText: "",
        noResultsText: "",
        addAvatar: false,
        autocomplete: null,
        searchDropdown: false,
        emailCheck: true,
        preventDoublet: true,
        tokenValue: "id",
        propertyToSearch: "id",
        resultsLimit: 5,
        // Prevent showing of drop down list with contacts email addresses
        // Max allowed email address is 254 chars
        minChars: 255,
        visibleComma: true,
        accountHolder: (M.u[u_handle] || {}).m || '',
        scrolLocation: 'invite',
        excludeCurrent: false,
        visibleComma: false,
        enableHTML: true,
        onEmailCheck: function() {
            $('.achievement-dialog.input-info', $dialog).addClass('red').text(l[7415]);
            $('.achievement-dialog.multiple-input', $dialog).find('li input').eq(0).addClass('red');
            resetInfoText();
        },
        onDoublet: function (u, iType) {
            if (iType === 'opc') {
                $('.achievement-dialog.input-info', $dialog).addClass('red').text(l[17545]);
            }
            else if (iType === 'ipc') {
                $('.achievement-dialog.input-info', $dialog).addClass('red').text(l[17546]);
            }
            else {
                $('.achievement-dialog.input-info', $dialog).addClass('red').text(l[7413]);
            }
            $('.achievement-dialog.multiple-input', $dialog).find('li input').eq(0).addClass('red');

            resetInfoText();
        },
        onHolder: function() {
            $('.achievement-dialog.input-info', $dialog).addClass('red').text(l[7414]);
            $('.achievement-dialog.multiple-input', $dialog).find('li input').eq(0).addClass('red');
            resetInfoText();
        },
        onReady: function() {// Called once on dialog initialization
            var $input = $dialog.find('li input').eq(0);

            $input.rebind('keyup click change', function() {
                var value = $.trim($input.val());
                var emailList = value.split(/[ ;,]+/);
                var $wrapper = $('.multiple-input', $dialog);

                if (isValidEmail(value)) {
                    resetInfoText(0);
                    $('button.send', $dialog).removeClass('disabled');
                }
                else if ($wrapper.find('.share-added-contact').length > 0 || emailList.length > 1) {
                    $('button.send', $dialog).removeClass('disabled');
                }
                else {
                    $('button.send', $dialog).addClass('disabled');
                }
            });
            resetInfoText(0);
            setTimeout(function() {
                $('.token-input-input-token-invite input', $dialog).trigger("focus");
            }, 0);
        },
        onAdd: function() {
            $('.invite-dialog button.send', $dialog).removeClass('disabled');

            resetInfoText(0);
        },
        onDelete: function(item) {
            var $inviteDialog = $('.invite-dialog');
            var $inputTokens = $('.share-added-contact.token-input-token-invite', $dialog);
            var itemNum = $inputTokens.length;

            setTimeout(function() {
                $('.token-input-input-token-mega input', $inviteDialog).trigger("blur");
            }, 0);

            // Get number of emails
            if (itemNum === 0) {
                $('button.send', $inviteDialog).addClass('disabled');
            }
            else {
                $('button.send', $inviteDialog).removeClass('disabled');
            }
        }
    });

    // Rest input info text and color
    function resetInfoText(timeOut) {
        if (!$.isNumeric(timeOut)) {
            timeOut = 3000;
        }

        if (errorTimer) {
            clearTimeout(errorTimer);
            errorTimer = null;
        }

        errorTimer = setTimeout(function() {
            // Rest input info text and color
            $('.achievement-dialog.input-info')
                .removeClass('red')
                .text(l[9093]);

            $('.achievement-dialog.multiple-input').find('li input').eq(0)
                .removeClass('red').trigger('focus');
        }, timeOut);
    }

    // Invite dialog back button click event handler
    $('.mega-dialog.invite-dialog button.back').rebind('click', function() {
        var $dialog = $('.mega-dialog.invite-dialog');

        // Remove all previously added emails
        $('.share-added-contact.token-input-token-invite', $dialog).remove();

        // Disable Send button
        $('button.send', $dialog).addClass('disabled');

        initPerfectScrollbar($('.multiple-input', $dialog));
        Soon(function() {
            $('.token-input-input-token-mega input', $dialog).trigger("focus");
        });

        $dialog.removeClass('success');
    });

    // Invite dialog send button click event handler
    $('.mega-dialog.invite-dialog button.send').rebind('click', function() {
        'use strict';

        // Text message
        var emailText = l[5878];

        // List of email address planned for addition
        var $mails = $('.token-input-list-invite .token-input-token-invite');
        var mailNum = $mails.length;

        if (mailNum) {
            var error = false;

            // Loop through new email list
            $mails.each(function(index, value) {

                // Extract email addresses one by one
                var email = $(value).text().replace(',', '');
                const myEmail = Object(M.u[u_handle]).m || Object(window.u_attr).email;

                if (myEmail) {
                    M.inviteContact(myEmail, email, emailText);
                }
                else {
                    error = true;
                }
            });

            if (!error) {
                $('.mega-dialog.invite-dialog').addClass('success');
                $('.mega-dialog.invite-dialog button.back').removeClass('hidden');
                $('.mega-dialog.invite-dialog .share-added-contact.token-input-token-invite').remove();
            }
            else {
                console.warn('Unable to send invitation(s), no account access.');
            }
        }
        else {
            console.warn('Unable to send invitation(s), no emails found.');
        }
    });
}

/**
 * Show invitation status dialog
 * @param {String} close dialog parameter
 */
mega.achievem.invitationStatusDialog = function invitationStatusDialog(close) {
    'use strict';
    var $dialog = $('.mega-dialog.invitation-dialog');
    var $scrollBlock = $dialog.find('.table-scroll');

    if (close) {
        closeDialog();
        return true;
    }
    var $table = $scrollBlock.find('.table');

    if (!invitationStatusDialog.$tmpl) {
        invitationStatusDialog.$tmpl = $('.table-row:first', $table).clone();
    }

    var getConfig = function() {
        return invitationStatusDialog.config;
    };

    var setConfig = function(what, value) {
        invitationStatusDialog.config[what] = value;
    };

    if (!invitationStatusDialog.config) {
        invitationStatusDialog.config = {};
        setConfig('sortBy', l[16100]);
        setConfig('sortDir', 1);
    }
    $table.empty();

    $('button.js-close', $dialog).rebind('click', invitationStatusDialog);

    var ach = mega.achievem;
    var maf = M.maf;
    maf = maf[ach.ACH_INVITE];

    var locFmt;


    // Due specific M.maf.rwds structure sorting must be done respecting it
    var getSortByMafEmailFn = function() {
        var sortfn;

        sortfn = function(a, b, d) {
            if (typeof a.m[0] == 'string' && typeof b.m[0] == 'string') {
                return a.m[0].localeCompare(b.m[0]) * d;
            }
            return -1;
        };

        return sortfn;
    };

    /**
     * getSortByMafStatusFn, sort by .c and .csu attrs
     */
    var getSortByMafStatusFn = function() {
        var sortfn;

        sortfn = function(a, b, d) {

            var compare = function(x, y, d) {
                if (x < y) {
                    return (-1 * d);
                }
                else if (x > y) {
                    return d;
                }
                else {
                    return 0;
                }
            };

            if (a.c && b.c) {
                return compare(a.c, b.c);
            }
            else if (a.c && !b.c) {
                return d;
            }
            else if (!a.c && b.c) {
                return (-1 * d);
            }

            // No completed, search for .csu contact signed up
            else {
                if (a.csu && b.csu) {
                    return compare(a.csu, b.csu);
                }
                else if (a.csu && !b.csu) {
                    return d;
                }
                else if (!a.csu && b.csu) {
                    return (-1 * d);
                }

                // No completed and not signed up, sort by challenge timestamp
                else {
                    return compare(a.ts, b.ts);
                }
            }
        };

        return sortfn;
    };

    var sortFn = getSortByMafEmailFn();
    var sortBy = getConfig().sortBy;

    if (sortBy === l[89]) {// Status
        sortFn = getSortByMafStatusFn();
    }
    else if (sortBy === l[16100]) {// Date Sent
        sortFn = M.getSortByDateTimeFn();
    }
    var rwds = maf.rwds || [maf.rwd];
    var rlen = rwds.length;

    rwds.sort(
        function(a, b) {
            return sortFn(a, b, getConfig().sortDir);
        }
    );

    while (rlen--) {
        var rwd = rwds[rlen];
        var $tmpl = invitationStatusDialog.$tmpl.clone();

        $('.email strong', $tmpl).text(rwd.m[0]);
        $('.date span', $tmpl).text(time2date(rwd.ts));

        // If no pending (the invitee signed up)
        if (rwd.csu) {// csu - contact (invitee) signed up
            if (rwd.c) {// c - completed, time elapsed from time when app is installed

                $('.status', $tmpl)
                    .safeHTML(
                        '<strong class="green">@@</strong>' +
                        '<span class="light-grey"></span>',
                        l[16105]);// Quota Granted

                var expiry = rwd.expiry || maf.expiry;
                locFmt = l[16336].replace('[S]', '').replace('[/S]', '');
                $('.status .light-grey', $tmpl)
                    .safeHTML('%n', locFmt, expiry.value, expiry.utxt);

                $('.icon i', $tmpl).addClass('sprite-fm-mono icon-active granted-icon');
            }
            else {// Pending APP Install

                $('.status', $tmpl)
                    .safeHTML('<strong class="orange">@@</span>', l[16104]);// Pending App Install

                $('.icon i', $tmpl).addClass('sprite-fm-mono icon-exclamation-filled pending-install-icon');
            }

            // Remove reinvite button
            $('.date button.resend', $tmpl).remove();
        }
        else {// Pending

            $('.status', $tmpl)
                .safeHTML('<strong >@@</span>', l[7379]);// Pending

            $('.icon i', $tmpl).addClass('sprite-fm-mono icon-options pending-icon');

            // In case that time-limit is not
            $('.date button', $tmpl).rebind('click', function() {
                var $row = $(this).closest('.table-row');

                reinvite($('.email strong', $row).text(), $row);
                return false;
            });
        }

        $table.append($tmpl);
    }

    // Show dialog
    M.safeShowDialog('invitations', $dialog);

    // Init scroll
    initPerfectScrollbar($table);

    $('button.invite-more', $dialog).rebind('click', function() {
        closeDialog();
        mega.achievem.inviteFriendDialog();
        return false;
    });

    $('button.reinvite-all', $dialog).rebind('click', function() {
        $('.table-row', $table).each(function(idx, $row) {
            $row = $($row);

            if ($('.date div', $row).length) {
                reinvite($('.email strong', $row).text(), $row);
            }
        });
        $(this).addClass('hidden');
        return false;
    });

    // Click on sort column Email, Status or Date Sent
    $('.header .table-cell', $dialog).rebind('click', function() {

        var config = getConfig();
        var $elem = $('span', $(this));
        var sortBy = $elem.text();
        var sortClass = 'asc';

        // Do not sort for first colum
        if (!sortBy) {
            return false;
        }

        if (config.sortBy === sortBy) {
            setConfig('sortDir', config.sortDir * (-1))
        }
        else {
            setConfig('sortBy', sortBy);
            setConfig('sortDir', 1);
        }

        if (config.sortDir === -1) {
            sortClass = 'desc';
        }

        $('.table-cell span', $dialog).removeClass('asc desc');
        $($elem).addClass(sortClass);

        // Repaint dialog
        mega.achievem.invitationStatusDialog();
    });

    function reinvite(rawEmail, $row) {
        const email = String(rawEmail).trim();
        var opc = M.findOutgoingPendingContactIdByEmail(email);

        if (opc) {
            M.reinvitePendingContactRequest(email).catch(tell);
        }
        else {
            console.warn('No outgoing pending contact request for %s', email);
        }

        $('.date button.resend', $row).fadeOut(700);
    };
};

/**
 * Parse account achievements.
 */
mega.achievem.parseAccountAchievements = function parseAccountAchievements() {
    // hide everything until seen on the api reply (maf)
    var storageMaxValue = 0;
    var storageCurrentValue = 0;
    var transferMaxValue = 0;
    var transferCurrentValue = 0;
    var storageBaseQuota = 0;
    var transferBaseQuota = 0;

    var ach = mega.achievem;
    var maf = M.maf;
    for (var idx in maf) {
        if (maf.hasOwnProperty(idx)) {
            idx |= 0;
            var data = maf[idx];
            if (ach.mapToElement[idx]) {
                var base = 0;
                var rwds = data.rwds || [data.rwd];
                for (i = rwds.length; i--;) {
                    if (rwds[i] && rwds[i].left > 0) {
                        base++;
                    }
                }
                var storageValue = (data[0] * base);
                storageMaxValue += storageValue;
                if (data[1]) {
                    var transferValue = (data[1] * base);
                    transferMaxValue += transferValue;

                    if (data.rwd && data.rwd.left > 0) {
                        transferCurrentValue += transferValue;
                    }
                }

                if (idx === ach.ACH_INVITE) {
                    if (data.rwd && storageValue) {
                        storageCurrentValue += storageValue;
                    }
                }
                // Achieved
                else if (data.rwd && data.rwd.left > 0) {
                    storageCurrentValue += storageValue;
                }
            }
        }
    }

    // For free users only show base quota for storage and remove it for bandwidth.
    // For pro users replace base quota by pro quota
    storageBaseQuota = maf.storage.base ;

    if (u_attr.p) {
        transferBaseQuota = maf.transfer.base;
    }

    var storageProportion = storageCurrentValue / (storageBaseQuota + storageCurrentValue) * 100;
    var transferProportion = transferCurrentValue / (transferBaseQuota + transferCurrentValue) * 100;
    var storageAchieveValue = storageCurrentValue;
    var transferAchieveValue = transferCurrentValue;
    var $planContent = $('.data-block.account-type', '.fm-account-main');
    var $storageContent = $('.acc-storage-space', $planContent);
    var $bandwidthContent = $('.acc-bandwidth-vol', $planContent);
    storageCurrentValue += storageBaseQuota;
    transferCurrentValue += transferBaseQuota;

    $('.plan-info > span', $bandwidthContent).text(bytesToSize(transferCurrentValue, 0));
    $('.settings-sub-bar', $bandwidthContent).css('width', transferProportion + '%');
    $('.base-quota-note span', $bandwidthContent).text(l[19992]
        .replace('%1', bytesToSize(transferBaseQuota, 0)));
    $('.achieve-quota-note span', $bandwidthContent).text(l[19993]
        .replace('%1', bytesToSize(transferAchieveValue, 0)));

    $('.plan-info > span', $storageContent).text(bytesToSize(storageCurrentValue, 0));
    $('.settings-sub-bar', $storageContent).css('width', storageProportion + '%');
    $('.base-quota-note span', $storageContent).text(l[19992]
        .replace('%1', bytesToSize(storageBaseQuota, 0)));
    $('.achieve-quota-note span', $storageContent).text(l[19993]
        .replace('%1', bytesToSize(storageAchieveValue, 0)));
};

// No one needs to mess with this externally
Object.freeze(mega.achievem);
