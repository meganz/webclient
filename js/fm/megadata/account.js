MegaData.prototype.accountData = function(cb, blockui, force) {
    "use strict";

    const account = Object(this.account);
    let reuseData = account.lastupdate > Date.now() - 10000 && !force;

    if (reuseData && (!account.stats || !account.stats[M.RootID])) {
        if (d) {
            console.error('Track down how we get here...', M.RootID, account.stats && Object.keys(account.stats));
        }
        reuseData = false;
    }

    if (reuseData && cb) {
        return cb(account);
    }

    const promises = [];
    const mRootID = M.RootID;
    const pstatus = Object(window.u_attr).p;

    const sendAPIRequest = (payload, always, handler) => {
        if (typeof always === 'function') {
            handler = always;
            always = false;
        }
        const promise = api.req(payload)
            .then(({result}) => {
                return handler(result);
            })
            .catch((ex) => {
                if (always) {
                    return handler(ex);
                }
                throw ex;
            });
        const slot = promises.push(promise) - 1;

        Object.defineProperty(promises, `<${slot}>`, {value: payload.a});
    };

    if (d) {
        if (!window.fminitialized) {
            console.warn('You should not use this function outside the fm...');
        }
        console.assert(mRootID, 'I told you...');
    }

    if (blockui) {
        loadingDialog.show();
    }

    // Fetch extra storage/transfer base data Pro Flexi or Business master
    const b = typeof u_attr !== 'undefined' && (u_attr.pf || u_attr.b && u_attr.b.m) ? 1 : 0;

    /** DO NOT place any sendAPIRequest() call before, this 'uq' MUST BE the FIRST one */

    sendAPIRequest({a: 'uq', strg: 1, xfer: 1, pro: 1, v: 1, b}, (res) => {
        Object.assign(account, res);

        account.type = res.utype;
        // account.stime = res.scycle;
        // account.scycle = res.snext;
        account.expiry = res.suntil;
        account.space = Math.round(res.mstrg);
        account.space_used = Math.round(res.cstrg);
        account.bw = Math.round(res.mxfer);
        account.servbw_used = Math.round(res.csxfer);
        account.downbw_used = Math.round(res.caxfer);
        account.servbw_limit = Math.round(res.srvratio);
        account.isFull = res.cstrg / res.mstrg >= 1;
        account.isAlmostFull = res.cstrg / res.mstrg >= res.uslw / 10000;

        // Business base/extra quotas:
        if (res.utype === pro.ACCOUNT_LEVEL_BUSINESS || res.utype === pro.ACCOUNT_LEVEL_PRO_FLEXI) {
            account.space_bus_base = res.b ? res.b.bstrg : undefined; // unit TB
            account.space_bus_ext = res.b ? res.b.estrg : undefined; // unit TB
            account.tfsq_bus_base = res.b ? res.b.bxfer : undefined; // unit TB
            account.tfsq_bus_ext = res.b ? res.b.exfer : undefined; // unit TB
            account.tfsq_bus_used = res.b ? res.b.xfer : undefined; // unit B
            account.space_bus_used = res.b ? res.b.strg : undefined; // unit B
        }

        if (res.nextplan) {
            account.nextplan = res.nextplan;
        }

        if (res.mxfer === undefined) {
            delete account.mxfer;
        }

        // If a subscription, get the timestamp it will be renewed
        if (res.stype === 'S') {
            account.srenew = res.srenew;
        }

        if (!Object(res.balance).length) {
            account.balance = [['0.00', 'EUR']];
        }

        return res;
    });

    sendAPIRequest({a: 'uavl'}, true, (res) => {
        if (!Array.isArray(res)) {
            res = [];
        }
        account.vouchers = voucherData(res);
    });

    sendAPIRequest({a: 'maf', v: mega.achievem.RWDLVL}, (res) => {

        account.maf = res;
    });

    if (!is_chatlink) {

        sendAPIRequest({a: 'uga', u: u_handle, ua: '^!rubbishtime', v: 1}, (res) => {

            account.ssrs = base64urldecode(String(res.av || res)) | 0;
        });
    }

    sendAPIRequest({a: 'utt'}, true, (res) => {
        if (!Array.isArray(res)) {
            res = [];
        }
        account.transactions = res;
    });

    // getting contact link [QR]
    // api_req : a=clc     contact link create api method
    //           f=1       a flag to tell the api to create a new link if it doesnt exist.
    //                     but if a previous link was deleted, then dont return any thing (empty)
    sendAPIRequest({a: 'clc', f: 1}, ([, res]) => {

        account.contactLink = typeof res === 'string' ? `C!${res}` : '';
    });

    // Get (f)ull payment history
    // [[payment id, timestamp, price paid, currency, payment gateway id, payment plan id, num of months purchased]]
    sendAPIRequest({a: 'utp', f: 1}, true, (res) => {
        if (!Array.isArray(res)) {
            res = [];
        }
        account.purchases = res;
    });

    /* x: 1, load the session ids
     useful to expire the session from the session manager */
    sendAPIRequest({a: 'usl', x: 1}, true, (res) => {
        if (!Array.isArray(res)) {
            res = [];
        }
        account.sessions = res;
    });


    /**
     * DO NOT place any sendAPIRequest() call AFTER, this 'ug' MUST BE the LAST one!
     */
    /* eslint-disable complexity -- @todo revamp the below mumbo-jumbo */

    promises.push(M.getAccountDetails());

    Promise.allSettled(promises)
        .then((res) => {
            let tmUpdate = false;

            for (let i = res.length; i--;) {
                if (res[i].status !== 'fulfilled') {
                    const a = promises[`<${i}>`];

                    console.warn(`API Request ${a} failed...`, res[i].reason);
                }
            }

            // get 'uq' reply.
            const uqres = res[0].value;

            // override with 'ug' reply.
            res = res.pop().value;

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
                if (res.pf) {
                    u_attr.pf = res.pf;
                    tmUpdate = true;
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

            if (!account.downbw_used) {
                account.downbw_used = 0;
            }

            if (pstatus !== u_attr.p) {
                account.justUpgraded = Date.now();

                M.checkStorageQuota(2);

                // If pro status change is recognised revoke storage quota cache
                M.storageQuotaCache = null;
            }

            if (tmUpdate) {
                onIdle(topmenuUI);
            }

            if (uqres) {
                if (!u_attr.p) {
                    if (uqres.tal) {
                        account.bw = uqres.tal;
                    }
                    account.servbw_used = 0;
                }

                if (uqres.tah) {
                    let bwu = 0;

                    for (const w in uqres.tah) {
                        bwu += uqres.tah[w];
                    }

                    account.downbw_used += bwu;
                }
            }

            // Prepare storage footprint stats.
            let cstrgn = account.cstrgn = Object(account.cstrgn);
            const stats = account.stats = Object.create(null);
            let groups = [M.RootID, M.InboxID, M.RubbishID];
            const root = array.to.object(groups);
            const exp = Object(M.su.EXP);

            groups = [...groups, 'inshares', 'outshares', 'links'];
            for (let i = groups.length; i--;) {
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

            for (const handle in cstrgn) {
                const data = cstrgn[handle];
                let target = 'outshares';

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
                const t = Object.keys(M.c[M.RootID]);
                const s = Object(stats[M.RootID]);

                s.fsize = s.bytes;
                for (let i = t.length; i--;) {
                    const node = M.d[t[i]] || false;

                    if (!node.t) {
                        s.fsize -= node.s;
                    }
                }
            }

            // calculate public links items/size
            const {links} = stats;
            Object.keys(exp)
                .forEach((h) => {
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
                            console.error(`Not found public node ${h}`);
                        }
                        links.files++;
                    }
                });

            account.lastupdate = Date.now();

            if (d) {
                console.log('stats', JSON.stringify(stats));
            }

            if (!account.bw) {
                account.bw = 1024 * 1024 * 1024 * 1024 * 1024 * 10;
            }
            if (!account.servbw_used) {
                account.servbw_used = 0;
            }
            if (!account.downbw_used) {
                account.downbw_used = 0;
            }

            M.account = account;

            // transfers quota
            const tfsq = {max: account.bw, used: account.downbw_used};

            if (u_attr.p) {
                tfsq.used += account.servbw_used;
            }
            else if (M.maf) {
                tfsq.used += account.servbw_used;
                const max = M.maf.transfer.base + M.maf.transfer.current;
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

            if (typeof cb === 'function') {

                cb(account);
            }
        })
        .catch(reportError)
        .finally(() => {
            loadingDialog.hide();
        });
};

MegaData.prototype.refreshSessionList = function(callback) {
    "use strict";

    if (d) {
        console.log('Refreshing session list');
    }

    const {account} = this;

    if (account) {
        api.req({a: 'usl', x: 1})
            .then(({result}) => {
                if (Array.isArray(result)) {
                    result.sort((a, b) => a[0] < b[0] ? 1 : -1);
                }
                else {
                    result = [];
                }

                account.sessions = result;
            })
            .finally(() => {
                if (typeof callback === 'function') {
                    callback();
                }
            });
    }
    else {
        M.accountData(callback);
    }
};


/**
 * Retrieve general user information once a session has been established.
 * The webclient calls this method after every 'us' request and also upon any session resumption (page reload).
 * Only account information that would be useful for clients in the general pages of the site/apps is returned,
 * with other more specific commands available when the user wants
 * to delve deeper in the account sections of the site/apps.
 * @return {Promise<Object>} user get result
 */
MegaData.prototype.getAccountDetails = function() {
    'use strict';

    return api.req({a: 'ug'})
        .then(({result}) => {
            const {u_attr} = window;

            if (u_attr && typeof result === 'object') {
                const upd = `b,mkt,p,pf,uspw`.split(',');

                for (let i = upd.length; i--;) {
                    const k = upd[i];

                    if (result[k]) {
                        u_attr[k] = result[k];
                    }
                    else {
                        delete u_attr[k];
                    }
                }

                if (result.ut) {
                    localStorage.apiut = result.ut;
                }

                Object.defineProperty(u_attr, 'flags', {
                    configurable: true,
                    value: freeze(result.flags || {})
                });
                mBroadcaster.sendMessage('global-mega-flags', u_attr.flags);
            }

            return result;
        });
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

    M.safeShowDialog('recovery-key-dialog', () => {

        $('.skip-button, button.js-close', $dialog).removeClass('hidden').rebind('click', closeDialog);
        $('.copy-recovery-key-button', $dialog).removeClass('hidden').rebind('click', () => {
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
                $dialog.addClass('post-register').rebind('dialog-closed', () => {
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

        $('.save-recovery-key-button', $dialog).rebind('click', () => {
            if ($dialog.hasClass('post-register')) {
                M.safeShowDialog('recovery-key-info', () => {
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

        $('a.toResetLink', $dialog).rebind('click', () => {
            closeDialog();
            loadingDialog.show();

            api.req({a: 'erm', m: u_attr.email, t: 9})
                .then(({result}) => {
                    assert(result === 0);
                    if (is_mobile) {
                        msgDialog('info', '', l[735]);
                    }
                    else {
                        fm_showoverlay();
                        $('.mega-dialog.account-reset-confirmation').removeClass('hidden');
                    }
                })
                .catch((ex) => {
                    if (ex === ENOENT) {
                        return msgDialog('warningb', l[1513], l[1946]);
                    }
                    tell(ex);
                })
                .finally(() => {
                    loadingDialog.hide();
                });

            return false;
        });

        $('.recovery-key.input-wrapper input', $dialog).val(a32_to_base64(u_k));

        return $dialog;
    });
};

/**
 * Show the Contact Verification dialog
 * @return {Object} contact verification dialog
 */
MegaData.prototype.showContactVerificationDialog = function() {
    'use strict';

    var $dialog = $('.mega-dialog.contact-verification-dialog');

    // TODO: Implement this on mobile
    if (!$dialog.length) {
        if (d) {
            console.debug('contact-verification-dialog not available...');
        }
        return;
    }
    $('button.js-close', $dialog).removeClass('hidden').rebind('click', closeDialog);

    // Don't show to new user
    if (u_attr.since > 1697184000 || mega.keyMgr.getWarningValue('cvd')
        || mega.keyMgr.getWarningValue('cv') !== false) {
        return;
    }

    M.safeShowDialog('contact-verification-dialog', () => {
        // Set warning value for contact verificaiton dialog
        mega.keyMgr.setWarningValue('cvd', '1');

        // Automatically select all string when key is clicked.
        $('.dialog-approve-button', $dialog).rebind('click.cv', () => {
            $('.fm-account-contact-chats', accountUI.$contentBlock).removeClass('hidden');
            closeDialog();
            M.openFolder('account/contact-chats/contact-verification-settings', true);
        });
        return $dialog;
    });
};


MegaData.prototype.showPaymentCardBanner = function(status) {
    'use strict';

    const $banner = $('.fm-notification-block.payment-card-status')
        .removeClass('payment-card-almost-expired payment-card-expired visible');
    if (!status) {
        return;
    }

    let bannerTitle;
    let bannerDialog = u_attr && u_attr.b ? l.payment_card_update_details_b : l.payment_card_update_details;
    let isExpiredClassName = 'payment-card-almost-expired';
    // Expired
    if (status === 'exp') {
        bannerTitle = l.payment_card_exp_title;
        bannerDialog = u_attr && u_attr.b ? l.payment_card_at_risk_b : l.payment_card_at_risk;

        isExpiredClassName = 'payment-card-expired';
        const $dialog = $('.payment-reminder.payment-card-expired');

        $('.close', $dialog).rebind('click', closeDialog);

        $('.update-payment-card', $dialog)
            .rebind('click', () => {
                closeDialog();
                loadSubPage('fm/account/plan/account-card-info');
            });

        M.safeShowDialog('expired-card-dialog', $dialog);
    }
    // Expires this month
    else if (status === 'expThisM') {
        bannerTitle = l.payment_card_almost_exp;
    }
    // Expires next month (only show from the 15th of the current month)
    else if (status === 'expNextM') {
        bannerTitle = l.payment_card_exp_nxt_mnth;
    }
    else {
        return;
    }

    $('a', $banner).rebind('click', loadSubPage.bind(null, 'fm/account/plan/account-card-info'));

    $banner.addClass(`visible ${isExpiredClassName}`);
    $('.banner-title', $banner).text(bannerTitle);
    $('.banner-txt', $banner).text(bannerDialog);
};


/**
 * Show storage overquota dialog
 * @param {*} quota Storage quota data, as returned from M.getStorageQuota()
 * @param {Object} [options] Additional options
 */
MegaData.prototype.showOverStorageQuota = function(quota, options) {
    'use strict';

    if (quota === undefined && options === undefined) {
        return Promise.reject(EARGS);
    }

    if (!pro.membershipPlans || !pro.membershipPlans.length) {
        return new Promise((resolve, reject) => {
            pro.loadMembershipPlans(() => {
                if (!pro.membershipPlans || !pro.membershipPlans.length) {
                    reject(EINCOMPLETE);
                }
                else {
                    M.showOverStorageQuota(quota, options).then(resolve).catch(reject);
                }
            });
        });
    }
    const {promise} = mega;

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

        if (!this.account) {
            return new Promise((resolve, reject) => {
                this.accountData(() => {
                    if (!this.account) {
                        return reject(EINTERNAL);
                    }
                    this.showOverStorageQuota(quota, options).then(resolve).catch(reject);
                });
            });
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
            var strQuotaLimit = bytesToSize(quota.mstrg, 0).split('\u00A0');
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

            return Promise.reject();
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

        if (M.account && M.account.cce) {
            M.showPaymentCardBanner(M.account.cce);
        }
        else {
            M.updatePaymentCardState().catch(dump);
        }
    }
});
