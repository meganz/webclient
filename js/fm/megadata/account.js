MegaData.prototype.accountData = function(cb, blockui, force) {
    "use strict";

    var account = Object(this.account);
    var reuseData = (account.lastupdate > Date.now() - 10000) && !force;

    if (reuseData && (!account.stats || !account.stats[M.RootID])) {
        if (d) {
            console.error('Track down how we get here...', M.RootID, account.stats && Object.keys(account.stats));
        }
        reuseData = false;
    }

    if (reuseData && cb) {
        cb(account);
    }
    else {
        var uqres = false;
        var pstatus = Object(window.u_attr).p;
        var mRootID = M.RootID;

        if (!window.fminitialized) {
            console.warn('You should not use this function outside the fm...');
        }
        console.assert(mRootID, 'I told you...');

        if (blockui) {
            loadingDialog.show();
        }

        api_req({ a: 'uq', strg: 1, xfer: 1, pro: 1, v: 1, b: (u_attr.b || Object.create(null)).m || 0 }, {
            account: account,
            callback: function(res, ctx) {
                loadingDialog.hide();

                if (typeof res === 'object') {
                    for (var i in res) {
                        ctx.account[i] = res[i];
                    }
                    ctx.account.type = res.utype;
                    // ctx.account.stime = res.scycle;
                    // ctx.account.scycle = res.snext;
                    ctx.account.expiry = res.suntil;
                    ctx.account.space = Math.round(res.mstrg);
                    ctx.account.space_used = Math.round(res.cstrg);
                    ctx.account.bw = Math.round(res.mxfer);
                    ctx.account.servbw_used = Math.round(res.csxfer);
                    ctx.account.downbw_used = Math.round(res.caxfer);
                    ctx.account.servbw_limit = Math.round(res.srvratio);
                    ctx.account.isFull = res.cstrg / res.mstrg >= 1;
                    ctx.account.isAlmostFull = res.cstrg / res.mstrg >= res.uslw / 10000;
                    // Business base/extra quotas:
                    if (res.utype === 100) {
                        ctx.account.space_bus_base = res.b ? res.b.bstrg : undefined; // unit TB
                        ctx.account.space_bus_ext = res.b ? res.b.estrg : undefined; // unit TB
                        ctx.account.tfsq_bus_base = res.b ? res.b.bxfer : undefined; // unit TB
                        ctx.account.tfsq_bus_ext = res.b ? res.b.exfer : undefined; // unit TB
                        ctx.account.tfsq_bus_used = res.b ? res.b.xfer : undefined; // unit B
                        ctx.account.space_bus_used = res.b ? res.b.strg : undefined; // unit B
                    }

                    if (res.nextplan) {
                        ctx.account.nextplan = res.nextplan;
                    }

                    if (res.mxfer === undefined) {
                        delete ctx.account.mxfer;
                    }

                    // If a subscription, get the timestamp it will be renewed
                    if (res.stype === 'S') {
                        ctx.account.srenew = res.srenew;
                    }

                    if (!Object(res.balance).length) {
                        ctx.account.balance = [['0.00', 'EUR']];
                    }

                    uqres = res;
                }
            }
        });

        api_req({a: 'uavl'}, {
            account: account,
            callback: function(res, ctx) {
                if (typeof res !== 'object') {
                    res = [];
                }
                ctx.account.vouchers = voucherData(res);
            }
        });

        api_req({a: 'maf', v: mega.achievem.RWDLVL}, {
            account: account,
            callback: function(res, ctx) {
                if (typeof res === 'object') {
                    ctx.account.maf = res;
                }
            }
        });
        if (!is_chatlink) {
            api_req({a: 'uga', u: u_handle, ua: '^!rubbishtime', v: 1}, {
                account: account,
                callback: function(res, ctx) {
                    if (typeof res === 'object') {
                        ctx.account.ssrs = base64urldecode(String(res.av || res)) | 0;
                    }
                }
            });
        }
        api_req({a: 'utt'}, {
            account: account,
            callback: function(res, ctx) {
                if (typeof res !== 'object') {
                    res = [];
                }
                ctx.account.transactions = res;
            }
        });

        // getting contact link [QR]
        // api_req : a=clc     contact link create api method
        //           f=1       a flag to tell the api to create a new link if it doesnt exist.
        //                     but if a previous link was deleted, then dont return any thing (empty)
        api_req({ a: 'clc', f: 1 }, {
            account: account,
            callback: function (res, ctx) {
                if (typeof res !== 'string') {
                    res = '';
                }
                else {
                    res = 'C!' + res;
                }
                ctx.account.contactLink = res;
            }
        });


        // Get (f)ull payment history
        // [[payment id, timestamp, price paid, currency, payment gateway id, payment plan id, num of months purchased]]
        api_req({a: 'utp', f: 1}, {
            account: account,
            callback: function(res, ctx) {
                if (typeof res !== 'object') {
                    res = [];
                }
                ctx.account.purchases = res;
            }
        });

        /* x: 1, load the session ids
         useful to expire the session from the session manager */
        api_req({a: 'usl', x: 1}, {
            account: account,
            callback: function(res, ctx) {
                if (typeof res !== 'object') {
                    res = [];
                }
                ctx.account.sessions = res;
            }
        });

        api_req({a: 'ug'}, {
            cb: cb,
            account: account,
            callback: function(res, ctx) {
                let tmUpdate = false;

                if (typeof res === 'object') {
                    if (res.p) {
                        u_attr.p = res.p;
                        if (u_attr.p) {
                            tmUpdate = true;
                        }
                    }
                    else {
                        delete u_attr.p;
                        if (pstatus) {
                            tmUpdate = true;
                        }
                    }
                    if (res.b) {
                        u_attr.b = res.b;
                        tmUpdate = true;
                    }
                    if (res.uspw) {
                        u_attr.uspw = res.uspw;
                    }
                    else {
                        delete u_attr.uspw;
                    }
                    if (res.mkt) {
                        u_attr.mkt = res.mkt;
                        if (Array.isArray(u_attr.mkt.dc) && u_attr.mkt.dc.length) {
                            delay('ShowDiscountOffer', pro.propay.showDiscountOffer, 7000);
                        }
                    }
                    else {
                        delete u_attr.mkt;
                    }
                    if (res['^!discountoffers']) {
                        u_attr['^!discountoffers'] = base64urldecode(res['^!discountoffers']);
                    }
                }

                if (!ctx.account.downbw_used) {
                    ctx.account.downbw_used = 0;
                }

                if (pstatus !== u_attr.p) {
                    ctx.account.justUpgraded = Date.now();

                    M.checkStorageQuota(2);

                    // If pro status change is recognised revoke storage quota cache
                    M.storageQuotaCache = null;
                }

                if (tmUpdate) {
                    topmenuUI();
                }

                if (uqres) {
                    if (!u_attr.p) {
                        if (uqres.tal) {
                            ctx.account.bw = uqres.tal;
                        }
                        ctx.account.servbw_used = 0;
                    }

                    if (uqres.tah) {
                        var bwu = 0;

                        for (var w in uqres.tah) {
                            bwu += uqres.tah[w];
                        }

                        ctx.account.downbw_used += bwu;
                    }
                }

                // Prepare storage footprint stats.
                var cstrgn = ctx.account.cstrgn = Object(ctx.account.cstrgn);
                var stats = ctx.account.stats = Object.create(null);
                var groups = [M.RootID, M.InboxID, M.RubbishID];
                var root = array.to.object(groups);
                var exp = Object(M.su.EXP);

                groups = groups.concat(['inshares', 'outshares', 'links']);
                for (var i = groups.length; i--;) {
                    stats[groups[i]] = array.to.object(['items', 'bytes', 'files', 'folders', 'vbytes', 'vfiles'], 0);
                    // stats[groups[i]].nodes = [];
                }

                // Add pending out-shares that has no user on cstrgn variable
                const ps = Object.keys(M.ps || {});
                if (ps.length) {
                    cstrgn = {
                        ...cstrgn,
                        ...ps
                            .map(h => M.getNodeByHandle(h))
                            .reduce((o, n) => {
                                o[n.h] = [n.tb || 0, n.tf || 0, n.td || 0, n.tvb || 0, n.tvf || 0];
                                return o;
                            }, {})
                    };
                }

                for (var handle in cstrgn) {
                    var data = cstrgn[handle];
                    var target = 'outshares';

                    if (root[handle]) {
                        target = handle;
                    }
                    else if (M.c.shares[handle]) {
                        target = 'inshares';
                    }
                    // stats[target].nodes.push(handle);

                    if (exp[handle] && !M.getNodeShareUsers(handle, 'EXP').length) {
                        continue;
                    }

                    stats[target].items++;
                    stats[target].bytes += data[0];
                    stats[target].files += data[1];
                    stats[target].folders += data[2];
                    stats[target].vbytes += data[3];
                    stats[target].vfiles += data[4];
                }

                // calculate root's folders size
                if (M.c[M.RootID]) {
                    var t = Object.keys(M.c[M.RootID]);
                    var s = Object(stats[M.RootID]);

                    s.fsize = s.bytes;
                    for (var i = t.length; i--;) {
                        var node = M.d[t[i]] || false;

                        if (!node.t) {
                            s.fsize -= node.s;
                        }
                    }
                }

                // calculate public links items/size
                var links = stats.links;
                Object.keys(exp)
                    .forEach(function(h) {
                        if (M.d[h]) {
                            if (M.d[h].t) {
                                links.folders++;
                                links.bytes += M.d[h].tb || 0;
                            }
                            else {
                                links.bytes += M.d[h].s || 0;
                                links.files++;
                            }
                        }
                        else {
                            if (d) {
                                console.error('Not found public node ' + h);
                            }
                            links.files++;
                        }
                    });

                ctx.account.lastupdate = Date.now();

                if (d) {
                    console.log('stats', JSON.stringify(stats));
                }

                if (!ctx.account.bw) {
                    ctx.account.bw = 1024 * 1024 * 1024 * 1024 * 1024 * 10;
                }
                if (!ctx.account.servbw_used) {
                    ctx.account.servbw_used = 0;
                }
                if (!ctx.account.downbw_used) {
                    ctx.account.downbw_used = 0;
                }

                M.account = ctx.account;

                if (res.ut) {
                    localStorage.apiut = res.ut;
                }

                // transfers quota
                var tfsq = {max: account.bw, used: account.downbw_used};

                if (u_attr.p) {
                    tfsq.used += account.servbw_used;
                }
                else if (M.maf) {
                    tfsq.used += account.servbw_used;
                    var max = (M.maf.transfer.base + M.maf.transfer.current);
                    if (max) {
                        // has achieved quota
                        tfsq.ach = true;
                        tfsq.max = max;
                    }
                }

                tfsq.left = Math.max(tfsq.max - tfsq.used, 0);
                tfsq.perc = Math.floor(tfsq.used * 100 / tfsq.max);

                M.account.tfsq = tfsq;

                if (mRootID !== M.RootID) {
                    // TODO: Check if this really could happen and fix it...
                    console.error('mRootID changed while loading...', mRootID, M.RootID);
                }

                if (ctx.cb) {
                    ctx.cb(ctx.account);
                }
            }
        });
    }
};

MegaData.prototype.refreshSessionList = function(callback) {
    "use strict";

    if (d) {
        console.log('Refreshing session list');
    }
    if (M.account) {
        api_req({a: 'usl', x: 1}, {
            account: M.account,
            callback: function(res, ctx) {
                if (typeof res !== 'object') {
                    res = [];
                }
                else {
                    res.sort(function(a, b) {
                        if (a[0] < b[0]) {
                            return 1;
                        }
                        else {
                            return -1;
                        }
                    });
                }

                ctx.account.sessions = res;
                M.account = ctx.account;
                if (typeof callback === 'function') {
                    callback();
                }
            }
        });
    }
    else {
        M.accountData(callback);
    }
};

/**
 * Show the Master/Recovery Key dialog
 * @param {Number} [version] Dialog version, 1: post-register, otherwise default one.
 */
MegaData.prototype.showRecoveryKeyDialog = function(version) {
    'use strict';

    var $dialog = $('.mega-dialog.recovery-key-dialog').removeClass('post-register');
    $('i.js-key', $dialog).removeClass('shiny');

    // TODO: Implement this on mobile
    if (!$dialog.length) {
        if (d) {
            console.debug('recovery-key-dialog not available...');
        }
        return;
    }

    M.safeShowDialog('recovery-key-dialog', function() {

        $('.skip-button, button.js-close', $dialog).removeClass('hidden').rebind('click', closeDialog);
        $('.copy-recovery-key-button', $dialog).removeClass('hidden').rebind('click', function() {
            // Export key showing a toast message
            u_exportkey(l[6040]);
        });
        $('footer', $dialog).removeClass('hidden');
        $('.content-block', $dialog).removeClass('dialog-bottom');
        $('header.graphic', $dialog).removeClass('hidden');

        switch (version) {
            case 1:
                $('.skip-button', $dialog).removeClass('hidden');
                $('button.js-close', $dialog).addClass('hidden');
                $('.copy-recovery-key-button', $dialog).addClass('hidden');
                $('i.js-key', $dialog).addClass('shiny');
                $dialog.addClass('post-register').rebind('dialog-closed', function() {
                    eventlog(localStorage.recoverykey ? 99718 : 99719);
                    $dialog.unbind('dialog-closed');
                });
                break;
            case 2:
                $('.skip-button', $dialog).addClass('hidden');
                $('button.js-close', $dialog).removeClass('hidden');
                $('.copy-recovery-key-button', $dialog).addClass('hidden');
                $('footer', $dialog).addClass('hidden');
                $('.content-block', $dialog).addClass('dialog-bottom');
                $('i.js-key', $dialog).addClass('shiny');
                $('header.graphic', $dialog).addClass('hidden');
                $dialog.addClass('post-register');
                break;
        }

        $('.save-recovery-key-button', $dialog).rebind('click', function() {
            if ($dialog.hasClass('post-register')) {
                M.safeShowDialog('recovery-key-info', function() {
                    // Show user recovery key info warning
                    $dialog.addClass('hidden').removeClass('post-register');
                    $dialog = $('.mega-dialog.recovery-key-info');

                    // On button click close dialog
                    $('.close-dialog, button.js-close', $dialog).rebind('click', closeDialog);

                    return $dialog;
                });
            }

            // Save Recovery Key to disk.
            u_savekey();

            // Show toast message.
            showToast('recoveryKey', l[8922]);
        });

        // Automatically select all string when key is clicked.
        $('#backup_keyinput_2fa', $dialog).rebind('click.backupRecoveryKey', function() {
            this.select();
        });

        // Update localStorage.recoveryKey when user copied his/her key.
        $('#backup_keyinput_2fa', $dialog).rebind('copy.backupRecoveryKey', function() {

            var selection = document.getSelection();

            // If user is fully selected key and copy it completely.
            if (selection.toString() === this.value) {

                mBroadcaster.sendMessage('keyexported');

                if (!localStorage.recoverykey) {
                    localStorage.recoverykey = 1;
                    $('body').addClass('rk-saved');
                }
            }

        });

        $('a.toResetLink', $dialog).rebind('click', function() {
            loadingDialog.show();

            M.req({a: 'erm', m: u_attr.email, t: 9}).always(function(res) {
                closeDialog();
                loadingDialog.hide();

                if (res === ENOENT) {
                    msgDialog('warningb', l[1513], l[1946]);
                }
                else if (res === 0) {
                    if (!is_mobile) {
                        fm_showoverlay();
                        $('.mega-dialog.account-reset-confirmation').removeClass('hidden');
                    }
                    else {
                        msgDialog('info', '', l[735]);
                    }
                }
                else {
                    msgDialog('warningb', l[135], l[200]);
                }
            });

            return false;
        });

        $('.recovery-key.input-wrapper input', $dialog).val(a32_to_base64(u_k));

        return $dialog;
    });
};

MegaData.prototype.hideClickHint = function() {
    'use strict';

    if (mega.cttHintTimer) {
        clearTimeout(mega.cttHintTimer);
        delete mega.cttHintTimer;
    }

    // implicitly invoking this function will cause that the hint won't be seen anymore.
    onIdle(function() {
        mega.config.set('ctt', 1);
    });

    $('.show-hints').removeAttr('style');
    $('.dropdown.click-hint').addClass('hidden').removeAttr('style');
};

MegaData.prototype.showClickHint = function(force) {
    'use strict';

    // Temporarily disabled. This will be added back in future with new design changes.
    return false;

    this.hideClickHint();

    // if the click-tooltip was not seen already
    if (force || !mega.config.get('ctt')) {
        mega.cttHintTimer = setTimeout(function() {
            $('.show-hints').fadeIn(300, function() {
                $(this).removeClass('hidden');

                var $hint = $('.dropdown.click-hint');
                var $thumb = $('.hint-thumb', $hint);
                $hint.position({
                    of: this,
                    my: 'left top-5px',
                    at: 'left+27px top'
                });
                $hint.fadeIn(450, function() {
                    $(this).removeClass('hidden');
                    $('.close-button', $hint).rebind('click', M.hideClickHint.bind(M));
                });

                var imageSwapTimer = setInterval(function() {
                    if (!mega.cttHintTimer) {
                        return clearInterval(imageSwapTimer);
                    }
                    if ($thumb.hasClass('left-click')) {
                        $thumb.switchClass("left-click", "right-click", 1000, "easeInOutQuad");
                    }
                    else {
                        $thumb.switchClass("right-click", "left-click", 1000, "easeInOutQuad");
                    }
                }, 5e3);
            }).rebind('click', M.showClickHint.bind(M, true));
        }, force || 300);
    }

    return false;
};

MegaData.prototype.showPaymentCardBanner = function(status) {
    'use strict';

    if (is_mobile) {
        mobile.alertBanner.close();
    }
    else {
        $('.fm-notification-block.payment-card-status').removeClass('visible');
    }

    if (!status) {
        return;
    }
    if (status === 1) {

        mega.attr.get(u_handle, 'cardalmostexp', -2, true).always((res) => {
            if (res !== '1') {

                if (is_mobile) {
                    const $banner = mobile.alertBanner.showWarning(l.payment_card_almost_exp);
                    $banner.$alertBanner.rebind('tap', loadSubPage.bind(null, 'fm/account/paymentcard'));

                    $banner.$alertBannerCloseButton.rebind('tap', () => {
                        mobile.alertBanner.close();
                        mega.attr.set('cardalmostexp', '1', -2, true);
                        return false;
                    });
                }
                else {
                    const $banner = $('.fm-notification-block.payment-card-almost-expired').addClass('visible');

                    $('i.close-banner', $banner).rebind('click', () => {
                        $banner.removeClass('visible');
                        mega.attr.set('cardalmostexp', '1', -2, true);
                    });

                    $('a', $banner)
                        // .rebind('click', loadSubPage.bind(null, 'fm/account/plan/account-card-info'));
                        .rebind('click', loadSubPage.bind(null, 'fm/account/plan/account-card-info'));
                }

            }
        });
    }

    else if (status === 2) {

        if (is_mobile) {
            const $banner = mobile.alertBanner.showError(l.payment_card_exp);
            $banner.$alertBanner.rebind('tap', loadSubPage.bind(null, 'fm/account/paymentcard'));

            mobile.messageOverlay.show(
                l.payment_card_exp_title,
                l.payment_card_exp_desc,
                'sprite-fm-illustration img-dialog-payment-card-exp',
                [l[148], l[707]])
                .then(loadSubPage.bind(null, 'fm/account/paymentcard'));
        }

        else {
            const $banner = $('.fm-notification-block.payment-card-expired').addClass('visible');

            $('i.close-banner', $banner).rebind('click', () => {
                $banner.removeClass('visible');
            });

            $('a', $banner)
                .rebind('click', loadSubPage.bind(null, 'fm/account/plan/account-card-info'));

            const $dialog = $('.payment-reminder.payment-card-expired');

            $('.close', $dialog).rebind('click', closeDialog);


            $('.update-payment-card', $dialog)
                .rebind('click', () => {
                    closeDialog();
                    loadSubPage('fm/account/plan/account-card-info');
                });

            M.safeShowDialog('expired-card-dialog', $dialog);
        }
    }
};


/**
 * Show storage overquota dialog
 * @param {*} quota Storage quota data, as returned from M.getStorageQuota()
 * @param {Object} [options] Additional options
 */
MegaData.prototype.showOverStorageQuota = function(quota, options) {
    'use strict';

    var promise = new MegaPromise();
    if (quota === undefined && options === undefined) {
        return promise.reject();
    }

    if (!pro.membershipPlans || !pro.membershipPlans.length) {
        pro.loadMembershipPlans(function() {
            M.showOverStorageQuota(quota, options);
        });
        // no caller relay on the promise really, 1 call has .always
        return promise.reject();
    }

    if (quota && quota.isFull && Object(u_attr).uspw) {
        // full quota, and uspw exist --> overwrite the full quota warning.
        quota = EPAYWALL;
    }

    var $strgdlg = $('.mega-dialog.storage-dialog').removeClass('full almost-full');
    var $strgdlgBodyFull = $('.fm-dialog-body.storage-dialog.full', $strgdlg).removeClass('odq');
    var $strgdlgBodyAFull = $('.fm-dialog-body.storage-dialog.almost-full', $strgdlg);

    var prevState = $('.fm-main').is('.almost-full, .full');
    $('.fm-main').removeClass('fm-notification almost-full full');
    var $odqWarn = $('.odq-warning', $strgdlgBodyFull).addClass('hidden');
    var $fullExtras = $('.full-extras', $strgdlgBodyFull).removeClass('hidden');
    var $upgradeBtn = $('.choose-plan span', $strgdlg).text(l[8696]);


    if (quota === EPAYWALL) { // ODQ paywall

        if (!M.account) {
            M.accountData(function() {
                M.showOverStorageQuota(quota, options);
            });
            return promise.reject();
        }
        $('.fm-main').addClass('fm-notification full');

        $strgdlg.addClass('full');
        $('.body-header', $strgdlgBodyFull).text(l[23519]);

        var dlgTexts = odqPaywallDialogTexts(u_attr || {}, M.account);
        $('.body-p.long', $strgdlgBodyFull).safeHTML(dlgTexts.dialogText);

        $strgdlgBodyFull.addClass('odq');
        $odqWarn.removeClass('hidden');
        $fullExtras.addClass('hidden');
        $upgradeBtn.text(l[5549]);
        $('.storage-dialog.body-p', $odqWarn).safeHTML(dlgTexts.dlgFooterText);

        $('.fm-notification-block.full').safeHTML(
            `<i class="notification-block-icon sprite-fm-mono icon-offline"></i>
            <span>${dlgTexts.fmBannerText}</span>`);
    }
    else {
        if (quota === -1) {
            quota = { percent: 100 };
            quota.isFull = quota.isAlmostFull = true;
            options = { custom: 1 };
        }

        var maxStorage = bytesToSize(pro.maxPlan[2] * 1024 * 1024 * 1024, 0) +
            ' (' + pro.maxPlan[2] + ' ' + l[17696] + ')';

        $('.body-p.long', $strgdlgBodyFull).safeHTML(l[22674].replace('%1', maxStorage).
            replace('%2', bytesToSize(pro.maxPlan[3] * 1024 * 1024 * 1024, 0)));

        if (Object(u_attr).p) {
            // update texts with "for free accounts" sentences removed.

            $('.body-header', $strgdlgBodyFull).safeHTML(l[16360]);

            $('.no-achievements-bl .body-p', $strgdlgBodyAFull).safeHTML(l[16361]);
            $('.achievements-bl .body-p', $strgdlgBodyAFull).safeHTML(l[16361] + ' ' + l[16314]);
        }
        else {
            var minStorage = l[22669].replace('%1', pro.minPlan[5]).replace('%2', pro.minPlan[2] + ' ' + l[17696])
                .replace('%3', bytesToSize(pro.minPlan[3] * 1024 * 1024 * 1024, 0));

            $('.no-achievements-bl .body-p', $strgdlgBodyAFull).safeHTML(minStorage);
            $('.achievements-bl .body-p', $strgdlgBodyAFull).safeHTML(minStorage + ' ' + l[16314]);
        }

        var myOptions = Object(options);
        if (quota.isFull) {
            $strgdlg.addClass('full');
            $('.fm-main').addClass('fm-notification full');
            $('header h2', $strgdlgBodyFull).text(myOptions.title || l[16302]);
            $('.body-header', $strgdlgBodyFull).safeHTML(myOptions.body || l[16360]);
        }
        else if (quota.isAlmostFull || myOptions.custom) {
            if (quota.isAlmostFull) {
                $('.fm-main').addClass('fm-notification almost-full');
                if (mega.tpw.initialized && mega.tpw.isWidgetVisibile()) {
                    mega.tpw.showAlmostOverquota();
                }
            }
            $strgdlg.addClass('almost-full');
            $('header h2.almost-full', $strgdlg).text(myOptions.title || l[16312]);
            if (myOptions.body) {
                $('.body-header', $strgdlgBodyAFull).safeHTML(myOptions.body);
            }

            // Storage chart and info
            var strQuotaLimit = bytesToSize(quota.mstrg, 0).split(' ');
            var strQuotaUsed = bytesToSize(quota.cstrg);
            var $storageChart = $('.fm-account-blocks.storage', $strgdlg);

            var fullDeg = 360;
            var deg = fullDeg * quota.percent / 100;

            // Used space chart
            if (quota.percent < 50) {
                $('.left-chart span', $storageChart).css('transform', 'rotate(180deg)');
                $('.right-chart span', $storageChart).css('transform', `rotate(${180 - deg}deg)`);
                $('.right-chart', $storageChart).addClass('low-percent-clip');
                $('.left-chart', $storageChart).addClass('low-percent-clip');
            }
            else {
                $('.left-chart span', $storageChart).css('transform', 'rotate(180deg)');
                $('.right-chart span', $storageChart).css('transform', `rotate(${(deg - 180) * -1}deg)`);
                $('.right-chart', $storageChart).removeClass('low-percent-clip');
                $('.left-chart', $storageChart).removeClass('low-percent-clip');
            }

            $('.chart.data .size-txt', $strgdlg).text(strQuotaUsed);
            $('.chart.data .pecents-txt', $strgdlg).text(strQuotaLimit[0]);
            $('.chart.data .gb-txt', $strgdlg).text(strQuotaLimit[1]);
            $('.chart.body .perc-txt', $strgdlg).text(quota.percent + '%');

        }
        else {
            if ($strgdlg.is(':visible')) {
                window.closeDialog();
            }
            $('.fm-main').removeClass('fm-notification almost-full full');
            return promise.reject();
        }
        $('.fm-notification-block.full')
            .safeHTML(
                `<i class="notification-block-icon sprite-fm-mono icon-offline"></i>
                <span>${l[22667].replace('%1', maxStorage)}</span>`);

        $('.fm-notification-block.almost-full')
            .safeHTML(
                `<i class="notification-block-icon sprite-fm-mono icon-offline"></i>
                <span>${l[22668].replace('%1', maxStorage)}</span>
                <i class="fm-notification-close sprite-fm-mono icon-close-component"></i>`);

    }

    if (u_type === 0) {
        $('.get-bonuses', $strgdlg).addClass('disabled');
    }

    var closeDialog = function() {
        $strgdlg.off('dialog-closed');
        window.closeDialog();
        promise.resolve();
    };

    $strgdlg.rebind('dialog-closed', closeDialog);

    $('button', $strgdlg).rebind('click', function() {
        var $this = $(this);
        if ($this.hasClass('disabled')) {
            return false;
        }
        closeDialog();

        if ($this.hasClass('choose-plan')) {
            loadSubPage('pro');
        }
        else if ($this.hasClass('get-bonuses')) {
            mega.achievem.achievementsListDialog();
        }

        return false;
    });
    $('button.js-close, button.skip', $strgdlg).rebind('click', closeDialog);

    $('.fm-notification-block .fm-notification-close')
        .rebind('click', function() {
            $('.fm-main').removeClass('fm-notification almost-full full');
            $.tresizer();
        });

    mega.achievem.enabled()
        .done(function() {
            $strgdlg.addClass('achievements');
        });

    clickURLs();

    if (quota && quota.isFull && page === 'fm/dashboard') {
        $('a.dashboard-link', $strgdlg).rebind('click.dashboard', e => {
            e.preventDefault();
            closeDialog();
        });
    }

    $('a.gotorub').attr('href', '/fm/' + M.RubbishID)
        .rebind('click', function() {
            closeDialog();
            loadSubPage('fm/' + M.RubbishID);
            return false;
        });

    if (Object(u_attr).p) {
        $upgradeBtn.text(l[16386]);
    }

    // if another dialog wasn't opened previously
    if (!prevState || Object(options).custom || quota === EPAYWALL) {
        M.safeShowDialog('over-storage-quota', $strgdlg);
    }
    else {
        promise.reject();
    }

    if (!prevState) {
        // On the banner appearance or disappearance, lets resize height of fm.
        $.tresizer();
    }

    return promise;
};

// ---------------------------------------------------------------------------

function voucherData(arr) {
    var vouchers = [];
    var varr = arr[0];
    var tindex = {};
    for (var i in arr[1]) {
        tindex[arr[1][i][0]] = arr[1][i];
    }
    for (var i in varr) {
        var redeemed = 0;
        var cancelled = 0;
        var revoked = 0;
        var redeem_email = '';
        if ((varr[i].rdm) && (tindex[varr[i].rdm])) {
            redeemed = tindex[varr[i].rdm][1];
            redeem_email = tindex[varr[i].rdm][2];
        }
        if (varr[i].xl && tindex[varr[i].xl]) {
            cancelled = tindex[varr[i].xl][1];
        }
        if (varr[i].rvk && tindex[varr[i].rvk]) {
            revoked = tindex[varr[i].rvk][1];
        }
        vouchers.push({
            id: varr[i].id,
            amount: varr[i].g,
            currency: varr[i].c,
            iss: varr[i].iss,
            date: tindex[varr[i].iss][1],
            code: varr[i].v,
            redeemed: redeemed,
            redeem_email: redeem_email,
            cancelled: cancelled,
            revoked: revoked
        });
    }
    return vouchers;
}

mBroadcaster.once('fm:initialized', () => {
    'use strict';

    if (u_attr && (u_attr.p || u_attr.b)) {

        if (M.account) {
            M.showPaymentCardBanner(M.account.cce);
        }
        else {
            M.req({ a: 'uq', pro: 1 }).then((res) => {
                if (typeof res === 'object' && res.cce) {
                    M.showPaymentCardBanner(res.cce);
                }
            });
        }
    }
});
