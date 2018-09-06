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

                                action = 'sync';
                                /** Fallthrough */

                            case '/':
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
                                    quota.transfer.current += ach[1];
                                }
                                quota.storage.current += ach[0];
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
        /*  8 */ 'FOLDERSHARE' : 'ach-share-folder:/fm/contacts'
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
        M.req('ach').always(notify);
    }

    return promise;
};
mega.achievem.achStatus = Object.create(null);

/**
 * Show achievement dialog
 * @param {String} title achievement title
 * @param {String} close dialog parameter
 */
mega.achievem.achievementDialog = function achievementDialog(title, close) {
    var headerTxt, descriptionTxt, storageSpace, transferQuota, monthNumber;
    var $dialog = $('.fm-dialog.achievement-dialog')
    if (close) {
        closeDialog();
        return true;
    }
    M.safeShowDialog('achievement', $dialog);

    $('.achievement-dialog .button.continue,.achievement-dialog .fm-dialog-close').rebind('click', function() {
        mega.achievem.achievementDialog(title, 1);
    });
    switch (title) {
        case 'create-account':
            headerTxt = 'Create an account in MEGA';
            storageSpace = '10 GB';
            monthNumber = 1;
            break;
        case 'install-megasync':
            headerTxt = 'Install MEGAsync';
            storageSpace = '20 GB';
            transferQuota = '20 GB';
            monthNumber = 2;
            break;
        case 'install-mobile-app':
            headerTxt = 'Install a mobile app';
            storageSpace = '20 GB';
            transferQuota = '20 GB';
            monthNumber = 2;
            break;
        case 'read-intro':
            headerTxt = 'Read our introduction';
            storageSpace = '20 GB';
            transferQuota = '20 GB';
            monthNumber = 2;
            break;
        case 'invite-friend':
            headerTxt = 'Invite a friend to MEGA';
            storageSpace = '20 GB';
            transferQuota = '20 GB';
            monthNumber = 2;
            break;
        case 'verify-number':
            headerTxt = 'Verify your mobile number';
            storageSpace = '20 GB';
            transferQuota = '20 GB';
            monthNumber = 2;
            break;
        case 'start-chat':
            headerTxt = 'Start a group chat';
            storageSpace = '20 GB';
            transferQuota = '20 GB';
            monthNumber = 2;
            break;
        case 'share-folder':
            headerTxt = 'Share a folder';
            storageSpace = '20 GB';
            transferQuota = '20 GB';
            monthNumber = 2;
            break;
    }
    $dialog.find('.fm-dialog-title').text(headerTxt);
    $dialog.find('.storage .reward-txt span').text(storageSpace);
    if (transferQuota) {
        $dialog.find('.bandwidth .reward-txt span').removeClass('hidden').text(transferQuota);
    }
    else {
        $dialog.find('.bandwidth .reward-txt span').addClass('hidden');
    }
    $dialog.find('.achievement-dialog.expires-txt span').text(monthNumber);
    $dialog.attr('class', 'fm-dialog achievement-dialog ' + title);
};

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
    var $dialog = $('.fm-dialog.achievements-list-dialog');

    $dialog.find('.fm-dialog-close')
        .rebind('click', function() {
            if (onDialogClosed) {
                onIdle(onDialogClosed);
            }
            closeDialog();
            return false;
        });

    // hide everything until seen on the api reply (maf)
    $('.achievements-cell', $dialog).addClass('hidden');

    var ach = mega.achievem;
    var maf = M.maf;
    for (var idx in maf) {
        if (maf.hasOwnProperty(idx)) {
            idx |= 0;
            var data = maf[idx];
            var selector = ach.mapToElement[idx];
            if (selector) {
                var $cell = $('.achievements-cell.' + selector, $dialog).removeClass('hidden');

                var locFmt = l[16287].replace('[S]', '<span>').replace('[/S]', '</span>');
                $('.reward.storage .reward-txt', $cell)
                    .safeHTML('%n', locFmt, bytesToSize(data[0], 0));

                if (!data[1]) {
                    $cell.addClass('one-reward');
                }
                else {
                    locFmt = l[16288].replace('[S]', '<span>').replace('[/S]', '</span>');
                    $('.reward.bandwidth .reward-txt', $cell)
                        .safeHTML('%n', locFmt, bytesToSize(data[1], 0));
                }

                if (!$cell.hasClass('localized')) {
                    $cell.addClass('localized');

                    var $desc = $cell.find('.description');
                    var text = String($desc.text()).trim().replace('[%3]', '%3');

                    if (!data[1]) {
                        // one-reward
                        $desc.safeHTML('%n', text, bytesToSize(data[0], 0), data.expiry.value);
                    }
                    else {
                        $desc.safeHTML('%n', text, bytesToSize(data[0], 0),
                            bytesToSize(data[1], 0), data.expiry.value);
                    }
                }

                if (data.rwd && idx !== ach.ACH_INVITE) {
                    $cell.addClass('achieved');

                    locFmt = l[16336].replace('[S]', '<span>').replace('[/S]', '</span>');
                    if (!data.rwd.e) {
                        // this reward do not expires
                        locFmt = '&nbsp;';
                    }
                    else if (data.rwd.left < 1) {
                        // show "Expired"
                        locFmt = l[1664];
                    }
                    $('.expires-txt', $cell).addClass('red').safeHTML('%n', locFmt, data.rwd.left, l[16290]);

                    locFmt = '';
                    switch (idx) {
                        case ach.ACH_WELCOME:     locFmt = l[16395]; break;
                        case ach.ACH_SYNCINSTALL: locFmt = l[16396]; break;
                        case ach.ACH_APPINSTALL:  locFmt = l[16397]; break;
                    }

                    $('.description', $cell)
                        .text(locFmt
                            .replace('%1', bytesToSize(data[0], 0))
                            .replace('%2', bytesToSize(data[1], 0))
                        );
                }
                else {
                    ach.bind.call($('.button', $cell), ach.mapToAction[idx]);

                    locFmt = l[16291].replace('[S]', '<span>').replace('[/S]', '</span>');
                    $('.expires-txt', $cell)
                        .removeClass('red')
                        .safeHTML('%n', locFmt, data.expiry.value, data.expiry.utxt);
                }

                $cell.removeClass('hidden');
            }
        }
    }
    maf = ach = undefined;

    // Show dialog
    M.safeShowDialog('achievements', function() {
        $dialog.removeClass('hidden');

        // Init scroll
        var $contentBlock = $dialog.find('.achievements-list');
        var $scrollBlock = $dialog.find('.achievements-scroll');
        var bodyHeight = $('body').height();

        if ($dialog.outerHeight() > bodyHeight) {
            $scrollBlock.css('max-height', bodyHeight - 60);
            $scrollBlock.jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
        }
        else if ($contentBlock.outerHeight() > 666) {
            $scrollBlock.jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
        }
        else {
            deleteScrollPanel($scrollBlock, 'jsp');
        }

        // Dialog aligment
        $dialog.css('margin-top', '-' + $dialog.outerHeight() / 2 + 'px');

        return $dialog;
    });
};

/**
 * Show Invite a friend dialog
 * @param {String} close dialog parameter
 */
mega.achievem.inviteFriendDialog = function inviteFriendDialog(close) {
    var $dialog = $('.fm-dialog.invite-dialog');

    if (close) {
        closeDialog();
        return true;
    }

    $dialog.find('.fm-dialog-close').rebind('click', mega.achievem.inviteFriendDialog);

    var ach = mega.achievem;
    var maf = M.maf;
    maf = maf[ach.ACH_INVITE];

    var locFmt = l[16325].replace(/\[S\]/g, '<span>').replace(/\[\/S\]/g, '</span>');
    $('.header.default', $dialog).safeHTML('%n', locFmt, bytesToSize(maf[0], 0), bytesToSize(maf[1], 0));

    $('.info-body p:first', $dialog).safeHTML(l[16317].replace('[S]', '<strong>').replace('[/S]', '</strong>'));

    // Remove all previously added emails
    $('.fm-dialog.invite-dialog .share-added-contact.token-input-token-invite').remove();

    // Remove success dialog look
    $('.fm-dialog.invite-dialog').removeClass('success');

    // Default buttons states
    $('.button.back', $dialog).addClass('hidden');
    $('.button.send', $dialog).removeClass('hidden').addClass('disabled');
    $('.button.status', $dialog).addClass('hidden');

    // Show dialog
    M.safeShowDialog('invite-friend', function() {
        'use strict';

        $dialog.removeClass('hidden');

        if (!$('.achievement-dialog.input').tokenInput("getSettings")) {
            mega.achievem.initInviteDialogMultiInputPlugin();
        }

        return $dialog;
    });

    // Remove unfinished user inputs
    $('#token-input-ach-invite-dialog-input', $dialog).val('');

    // Set focus on input so user can type asap
    $('.multiple-input .token-input-list-invite', $dialog).click();

    // Show "Invitation Status" button if invitations were sent before
    if (maf && maf.rwd && 0) {
        $('.default-white-button.inline.status', $dialog)
            .removeClass('hidden')
            .rebind('click', function() {
                closeDialog();
                mega.achievem.invitationStatusDialog();
            });
    }
    else {
        $('.default-white-button.inline.status', $dialog).addClass('hidden');
    }
};

mega.achievem.initInviteDialogMultiInputPlugin = function initInviteDialogMultiInputPlugin() {

    // Init textarea logic
    var $dialog = $('.fm-dialog.invite-dialog');
    var $this = $('.achievement-dialog.multiple-input.emails input');
    var $inputWrapper = $('.achievement-dialog.multiple-input');
    var $sendButton = $dialog.find('.default-grey-button.send');
    var contacts = M.getContactsEMails();

    $this.tokenInput(contacts, {
        theme: "invite",
        hintText: l[5908],
        searchingText: "",
        noResultsText: "",
        addAvatar: false,
        autocomplete: null,
        searchDropdown: false,
        emailCheck: true,
        preventDoublet: false,
        tokenValue: "id",
        propertyToSearch: "name",
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
            $('.achievement-dialog.input-info').addClass('red').text(l[7415]);
            $('.achievement-dialog.multiple-input').find('li input').eq(0).addClass('red');
            resetInfoText();
        },
        onDoublet: function(u) {
            $('.achievement-dialog.input-info').addClass('red').text(l[7413]);
            $('.achievement-dialog.multiple-input').find('li input').eq(0).addClass('red');
            resetInfoText();
        },
        onHolder: function() {
            $('.achievement-dialog.input-info').addClass('red').text(l[7414]);
            $('.achievement-dialog.multiple-input').find('li input').eq(0).addClass('red');
            resetInfoText();
        },
        onReady: function() {// Called once on dialog initialization
            var $input = $dialog.find('li input').eq(0);

            $input.rebind('keyup click change', function() {
                var value = $.trim($input.val());
                var emailList = value.split(/[ ;,]+/);
                var $wrapper = $('.multiple-input', $dialog);
                if ($wrapper.find('.share-added-contact').length > 0 || checkMail(value) === false || emailList.length > 1) {
                    $input.removeClass('red');
                    $('.input-info',$dialog).removeClass('red').text(l[9093]);
                    $('.default-grey-button.send', $dialog).removeClass('disabled');
                }
                else {
                    $('.default-grey-button.send', $dialog).addClass('disabled');
                }
                // TODO: scroll more then 64px of .input-field block
            });
            resetInfoText(0);
        },
        onAdd: function() {
            var $inviteDialog = $('.invite-dialog');

            $('.invite-dialog .default-grey-button.send').removeClass('disabled');

            var $inputTokens = $inviteDialog.find('.share-added-contact.token-input-token-invite');
            var itemNum = $inputTokens.length;
            var $multiInput = $inviteDialog.find('.achievement-dialog.multiple-input');
            var h1 = $inputTokens.outerHeight(true);// margin included
            var h2 = $multiInput.height();

            // show scroll box when we have more then 2 rows
            if ((2 <= h2 / h1) && (h2 / h1 < 3)) {
                $multiInput.jScrollPane({
                    enableKeyboardNavigation: false,
                    showArrows: true,
                    arrowSize: 8,
                    animateScroll: true
                });
            }

            resetInfoText(0);
        },
        onDelete: function(item) {
            var $inviteDialog = $('.invite-dialog');
            var $inputTokens = $inviteDialog.find('.share-added-contact.token-input-token-invite');
            var itemNum = $inputTokens.length;
            var $multiInput = $inviteDialog.find('.achievement-dialog.multiple-input');
            var $scrollBox = $('.achievement-dialog.multiple-input .jspPane')[0];
            var h1 = $inputTokens.outerHeight(true);// margin included
            var h2 = 0;

            // Get number of emails
            if (itemNum === 0) {
                $('.invite-dialog .default-grey-button.send').addClass('disabled');
            }
            else {
                $('.invite-dialog .default-grey-button.send').removeClass('disabled');

                // Calculate complete scroll box height
                if ($scrollBox) {
                    h2 = $scrollBox.scrollHeight;
                }
                else { // Just multi input height
                    h2 = $multiInput.height();
                }

                // Remove scroll when we have less then 3 rows
                if (h2 / h1 < 3) {
                    clearScrollPanel('.invite-dialog');
                }
            }
        }
    });

    // Rest input info text and color
    function resetInfoText(timeOut) {

        timeOut = timeOut || 3000;

        setTimeout(function() {
            // Rest input info text and color
            $('.achievement-dialog.input-info')
                .removeClass('red')
                .text(l[9093]);

            $('.achievement-dialog.multiple-input').find('li input').eq(0).removeClass('red');
        }, timeOut);
    }

    // Invite dialog back button click event handler
    $('.fm-dialog.invite-dialog .button.back').rebind('click', function() {

        var $dialog = $('.fm-dialog.invite-dialog');

        // Remove all previously added emails
        $('.share-added-contact.token-input-token-invite', $dialog).remove();

        // Disable Send button
        $('.button.send', $dialog).addClass('disabled');

        // Set focus on input so user can type asap
        $('.multiple-input .token-input-list-invite', $dialog).click();

        $dialog.removeClass('success');
    });

    // Invite dialog send button click event handler
    $('.fm-dialog.invite-dialog .button.send').rebind('click', function() {
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

                if (M.u[u_handle]) {
                    M.inviteContact(M.u[u_handle].m, email, emailText);
                }
                else if (u_type && typeof u_attr === 'object') {
                    M.req({'a': 'upc', 'e': u_attr.email, 'u': email, 'msg': emailText, 'aa': 'a', i: requesti})
                        .dump();
                }
                else {
                    error = true;
                }
            });

            if (!error) {
                $('.fm-dialog.invite-dialog').addClass('success');
                $('.fm-dialog.invite-dialog button.back').removeClass('hidden');
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
    var $dialog = $('.fm-dialog.invitation-dialog');
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

    $dialog.find('.fm-dialog-close').rebind('click', invitationStatusDialog);

    var ach = mega.achievem;
    var maf = M.maf;
    maf = maf[ach.ACH_INVITE];

    var locFmt = l[16283].replace(/\[S\]/g, '<span class="red">').replace(/\[\/S\]/g, '</span>');
    $('.hint', $dialog).safeHTML('%n', locFmt, bytesToSize(maf[0], 0), bytesToSize(maf[1], 0));

    // Due specific M.maf.rwds structure sorting must be done respecting it
    var getSortByMafEmailFn = function() {
        var sortfn;

        sortfn = function(a, b, d) {
            if (typeof a.m[0] == 'string' && typeof b.m[0] == 'string') {
                return a.m[0].localeCompare(b.m[0]) * d;
            }
            else {
                return -1;
            }
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

                $('.icon i', $tmpl).addClass('tick');
            }
            else {// Pending APP Install

                $('.status', $tmpl)
                    .safeHTML('<strong class="orange">@@</span>', l[16104]);// Pending App Install

                $('.icon i', $tmpl).addClass('exclamation-point');
            }

            // Remove reinvite button
            $('.date div', $tmpl).remove();
        }
        else {// Pending

            $('.status', $tmpl)
                .safeHTML('<strong >@@</span>', l[7379]);// Pending

            $('.icon i', $tmpl).addClass('dots');

            // In case that time-limit is not
            $('.date div', $tmpl).rebind('click', function() {
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
    var $contentBlock = $dialog.find('.table-bg');

    if ($contentBlock.height() > 384) {// ToDo: how 384 is calculated?
        $table.jScrollPane({enableKeyboardNavigation: false, showArrows: true, arrowSize: 5});
    }
    else {
        deleteScrollPanel($scrollBlock, 'jsp');
    }

    // Dialog aligment
    $dialog.css('margin-top', '-' + $dialog.outerHeight() / 2 + 'px');

    $('.button.invite-more', $dialog).rebind('click', function() {
        closeDialog();
        mega.achievem.inviteFriendDialog();
        return false;
    });

    $('.button.reinvite-all', $dialog).rebind('click', function() {
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

        $this = $(this);
        var config = getConfig();
        var $elem = $this.find('span');
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

        $('.invitation-dialog.table-cell span', $dialog).removeClass('asc desc');
        $($elem).addClass(sortClass);

        // Repaint dialog
        mega.achievem.invitationStatusDialog();
    });

    var reinvite = function(email, $row) {
        var email = String(email).trim();
        var opc = M.findOutgoingPendingContactIdByEmail(email);

        if (opc) {
            M.reinvitePendingContactRequest(email);
        }
        else {
            console.warn('No outgoing pending contact request for %s', email);
        }

        $('.date div', $row).fadeOut(700);
    };
};

/**
 * Parse account achievements.
 */
mega.achievem.parseAccountAchievements = function parseAccountAchievements() {
    // hide everything until seen on the api reply (maf)
    $('.achievements-table .achievements-cell').addClass('hidden');
    var $items = $('.account.progress-list.achievem .progress-item')
        .not('.baseq').addClass('hidden');
    $items.removeClass('achieved');
    $('.data-block.achievements-data').removeClass('has-completed');
    $('.progress-title span', $items).remove();

    var $achStorage = $('.account.progress-list.achievem.storage');
    var $achTransfer = $('.account.progress-list.achievem.transfer');
    var $achTable = $('.account.data-block .achievements-table');
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
            var selector = ach.mapToElement[idx];
            if (selector) {
                var base = 0;
                var rwds = data.rwds || [data.rwd];
                for (i = rwds.length; i--;) {
                    if (rwds[i] && rwds[i].left > 0) {
                        base++;
                    }
                }
                var storageValue = (data[0] * base);
                var $cell = $('.' + selector, $achTable).closest('.achievements-cell');
                var $storageItem = $('.progress-item.' + selector, $achStorage).removeClass('hidden');
                var $transferItem = $('.progress-item.' + selector, $achTransfer).removeClass('hidden');
                var $achievementsBl = $('.account.achievements-data');
                $storageItem.parent().removeClass('hidden');
                $transferItem.parent().removeClass('hidden');

                storageMaxValue += storageValue;
                $('.progress-txt', $storageItem).text(bytesToSize(data[0] * (base || 1), 0));

                $('.rewards .reward:first-child .reward-txt', $cell).safeHTML(bytesToSize(data[0], 0, 2));
                if (data[1]) {
                    var transferValue = (data[1] * base);

                    transferMaxValue += transferValue;
                    $('.progress-txt', $transferItem).text(bytesToSize(data[1] * (base || 1), 0));

                    if (data.rwd) {
                        if (data.rwd.left > 0) {
                            transferCurrentValue += transferValue;
                            $transferItem.addClass('achieved');
                            $achievementsBl.addClass('has-completed');
                        }


                        if (idx !== ach.ACH_INVITE) {
                            if (data.rwd.e) {
                                $('.progress-title', $transferItem)
                                    .safeAppend('<span class="red-txt">&nbsp;(@@)</span>',
                                        data.rwd.left > 0
                                            ? l[16284].replace('%1', data.rwd.left)
                                            : l[1664]
                                    );
                            }
                        }
                        else {
                            if (base) {
                                ach.bind.call($transferItem, '~invitationStatusDialog');
                                 /* re-enable once the invite status dialog is brought back
                                  $transferItem
                                  .css('cursor', 'pointer')
                                  .attr('title',
                                  l[16285].replace('%1', base));
                                  */
                            }
                        }
                    }

                    $('.rewards .reward:last-child', $cell)
                        .removeClass('hidden')
                        .find('.reward-txt')
                        .safeHTML(bytesToSize(data[1], 0, 2));
                }
                else {
                    $transferItem.addClass('disabled');
                    $('.rewards .reward:last-child', $cell).addClass('hidden');
                }

                if (!$cell.hasClass('localized')) {
                    $cell.addClass('localized');

                    var $desc = $cell.find('.description');
                    var text = String($desc.text()).trim().replace('[%3]', '%3');

                    if (!data[1]) {
                        // one-reward
                        $desc.safeHTML('%n', text, bytesToSize(data[0], 0), data.expiry.value);
                    }
                    else {
                        $desc.safeHTML('%n', text, bytesToSize(data[0], 0),
                            bytesToSize(data[1], 0), data.expiry.value);
                    }
                }

                if (idx === ach.ACH_INVITE) {
                    ach.bind.call($('.button, .achievement-full.title', $cell), ach.mapToAction[idx]);

                    if (data.rwd) {
                        if (storageValue) {
                            storageCurrentValue += storageValue;
                            $storageItem.addClass('achieved');
                        }

                        if (base) {
                            ach.bind.call($storageItem, '~invitationStatusDialog');
                             /* re-enable once the invite status dialog is brought back
                              $storageItem
                              .css('cursor', 'pointer')
                              .attr('title',
                              l[16285].replace('%1', base));
                              */
                        }
                    }
                }
                else if (data.rwd) {
                    // Achieved
                    if (data.rwd.left > 0) {
                        storageCurrentValue += storageValue;
                        $storageItem.addClass('achieved');

                        if ($cell.parent('.available-achievements').length > 0) {
                            $cell.addClass('achieved');
                            $('.completed-achievements').append($cell);
                        }
                    }

                    if (data.rwd.e) {
                        $('.progress-title', $storageItem)
                            .safeAppend('<span class="red-txt">&nbsp;(@@)</span>',
                                data.rwd.left > 0
                                    ? l[16284].replace('%1', data.rwd.left)
                                    : l[1664]
                            );
                    }

                    $('.status', $cell)
                        .safeHTML(
                            '<div class="achievement-complete">@@</div>' +
                            '<div class="achievement-date">@@ <span class="red-txt">(@@)</span></div>' +
                            '<div class="clear"></div>',
                            l[16286], data.rwd.date.toLocaleDateString(),
                            data.rwd.left > 0
                                ? l[16284].replace('%1', data.rwd.left)
                                : l[1664]
                        );


                    if (!data.rwd.e) {
                        $('.status .achievement-date .red-txt', $cell).addClass('hidden');
                    }

                    if (data.rwd.left < 1) {
                        $storageItem.addClass('disabled');
                        $transferItem.addClass('disabled');
                    }
                }
                else {
                    ach.bind.call($('.button, .achievement-full.title', $cell), ach.mapToAction[idx]);
                }
                $cell.removeClass('hidden');
            }
        }
    }

    // For free users only show base quota for storage and remove it for bandwidth.
    // For pro users replace base quota by pro quota
    var $baseq = $('.achievements-block .data-block.storage .baseq').addClass('achieved');
    storageBaseQuota = maf.storage.base;
    $('.progress-txt', $baseq).text(bytesToSize(storageBaseQuota, 0));

    if (u_attr.p) {
        $('.progress-title', $baseq).text(l[16299]);

        transferBaseQuota = maf.transfer.base;
        $baseq = $('.achievements-block .data-block.transfer .baseq').addClass('achieved');
        $('.progress-txt', $baseq).text(bytesToSize(transferBaseQuota, 0));
        $('.progress-title', $baseq).text(l[16299]);
    }
    else {
        storageBaseQuota = maf.storage.base;
        $('.achievements-block .data-block.transfer .baseq').addClass('hidden');
    }

    $('.account.data-block .btn-achievements')
        .removeClass('hidden')
        .rebind('click', function() {
            $('.account.tab-lnk.achievements').trigger('click');
            return false;
        });

    $('.account.plan-info.bandwidth .plan-comment')
        .text(l[16300]
            .replace('%1', bytesToSize(transferBaseQuota, 0))
            .replace('%2', bytesToSize(transferCurrentValue, 0))
        );
    $('.account.plan-info.storage .plan-comment')
        .text(l[16300]
            .replace('%1', bytesToSize(storageBaseQuota, 0))
            .replace('%2', bytesToSize(storageCurrentValue, 0))
        );

    storageCurrentValue += storageBaseQuota;
    transferCurrentValue += transferBaseQuota;

    $('.account.plan-info.bandwidth span').text(bytesToSize(transferCurrentValue, 0));
    $('.account.plan-info.storage span').text(bytesToSize(storageCurrentValue, 0));

    var $achBlock = $('.account.achievements-block');
    if (storageCurrentValue) {
        $('.account.quota-txt.storage', $achBlock).removeClass('hidden')
            .text(bytesToSize(storageCurrentValue, 0));
    }
    else {
        $('.account.quota-txt.storage', $achBlock).addClass('hidden');
    }
    if (transferCurrentValue) {
        $('.account.quota-txt.transfer', $achBlock).removeClass('hidden')
            .text(bytesToSize(transferCurrentValue, 0));
    }
    else {
        $('.account.quota-txt.transfer', $achBlock).addClass('hidden');
    }
};

// No one needs to mess with this externally
Object.freeze(mega.achievem);
