function RepayPage() {
    "use strict";
    this.noOverduePaymentErrorCode = -1;
    this.unknownErrorCode = -99;
}

RepayPage.prototype.initPage = function() {
    "use strict";

    // if mobile we view the related header for top-mobile.html and hide navigation div of desktop
    if (is_mobile) {

        mega.ui.header.update();

        $('.mobile.bus-repay').removeClass('hidden');
        $('.mobile.fm-header').addClass('hidden');
        $('.mobile.fm-header.fm-hr').removeClass('hidden');
    }

    // If u_attr not set, or
    // If Business account and (not the master Business account, or not expired or in grace period), or
    // If Pro Flexi account and (not expired or in grace period)
    if (!u_attr ||
        (u_attr.b && (!u_attr.b.m || !pro.isExpiredOrInGracePeriod(u_attr.b.s))) ||
        (u_attr.pf && !pro.isExpiredOrInGracePeriod(u_attr.pf.s))) {

        loadSubPage('start');
        return;
    }

    if (!u_attr.email || isEphemeral()) {
        return loadSubPage('registerb');
    }


    var mySelf = this;

    loadingDialog.show();

    // If necessary attributes are not loaded, load them then comeback.
    if (!u_attr.pf && (!u_attr['%name'] || !u_attr['%email'])) {

        Promise.allSettled([
            u_attr['%name'] || mega.attr.get(u_attr.b.bu, '%name', -1),
            u_attr['%email'] || mega.attr.get(u_attr.b.bu, '%email', -1)
        ]).then(([{value: name}, {value: email}]) => {

            name = u_attr['%name'] = name && from8(base64urldecode(name) || name) || '';
            email = u_attr['%email'] = email && from8(base64urldecode(email) || email) || u_attr.email;

            assert(name && email, `Invalid account state (${name}:${email})`);

            mySelf.initPage();

        }).catch((ex) => {
            loadingDialog.hide();
            msgDialog('warninga', l[135], l[47], ex);
        });
        return false;
    }

    const $repaySection = $('.main-mid-pad.bus-repay');
    const $leftSection = $('.main-left-block', $repaySection);
    const $rightSection = $('.main-right-block', $repaySection);
    const $paymentBlock = $('.bus-reg-radio-block', $leftSection);

    const $repayBtn = $('.repay-btn', $repaySection).addClass('disabled');
    const $revertToFreeBtn = $('.revert-to-free-btn', $repaySection);

    $('.bus-reg-agreement.mega-terms .bus-reg-txt', $leftSection).safeHTML(l['208s']);

    // If Pro Flexi, show the icon and text
    if (u_attr.pf) {
        $('.plan-icon', $rightSection)
            .removeClass('icon-crests-business-details')
            .addClass('icon-crests-pro-flexi-details');
        $('.business-plan-title', $rightSection).text(l.pro_flexi_name);
        $('.bus-reg-agreement.ok-to-auto .radio-txt', $leftSection).text(l.setup_monthly_payment_pro_flexi);
        $('.dialog-subtitle', $repaySection).text(l.reactivate_pro_flexi_subscription);

        // Show the 'Revert to free account' button and add click handler for it
        $revertToFreeBtn.removeClass('hidden');
        $revertToFreeBtn.rebind('click.revert', () => {

            const title = l.revert_to_free_confirmation_question;
            const message = l.revert_to_free_confirmation_info;

            if (is_mobile) {
                parsepage(pages.mobile);
            }

            msgDialog('confirmation', '', title, message, (e) => {
                if (e) {
                    loadingDialog.show();

                    // Downgrade the user to Free
                    api.req({a: 'urpf', r: 1})
                        .catch(dump)
                        .finally(() => {

                            // Reset account cache so all account data will be refetched
                            if (M.account) {
                                M.account.lastupdate = 0;
                            }

                            loadSubPage('fm/account/plan');
                        });
                }
                else if (is_mobile) {

                    // Close button for mobile we need to reload as loadSubPage on the same page doesn't work
                    location.reload();
                }
            });
        });
    }

    // event handler for repay button
    $repayBtn.rebind('click', function repayButtonHandler() {
        if ($(this).hasClass('disabled')) {
            return false;
        }

        if (is_mobile) {
            parsepage(pages.mobile);
        }

        const $selectedProvider = $('.bus-reg-radio-option .bus-reg-radio.radioOn', $repaySection);

        mySelf.planInfo.usedGatewayId = $selectedProvider.attr('prov-id');
        mySelf.planInfo.usedGateName = $selectedProvider.attr('gate-n');

        addressDialog.init(mySelf.planInfo, mySelf.userInfo, new BusinessRegister());
        return false;
    });

    // event handler for radio buttons
    $('.bus-reg-radio-option', $paymentBlock)
        .rebind('click.suba', function businessRepayCheckboxClick() {
            var $me = $(this);
            $me = $('.bus-reg-radio', $me);
            if ($me.hasClass('radioOn')) {
                return;
            }
            $('.bus-reg-radio', $paymentBlock).removeClass('radioOn').addClass('radioOff');
            $me.removeClass('radioOff').addClass('radioOn');
        });

    $('.bus-reg-agreement.mega-terms .checkdiv', $leftSection)
        .removeClass('checkboxOn').addClass('checkboxOff');

    // event handler for check box
    $('.bus-reg-agreement', $leftSection).rebind(
        'click.suba',
        function businessRepayCheckboxClick() {
            var $me = $('.checkdiv', $(this));
            if ($me.hasClass('checkboxOn')) {
                $me.removeClass('checkboxOn').addClass('checkboxOff');
                $repayBtn.addClass('disabled');
            }
            else {
                $me.removeClass('checkboxOff').addClass('checkboxOn');
                if ($('.bus-reg-agreement .checkdiv.checkboxOn', $leftSection).length === 2) {
                    $repayBtn.removeClass('disabled');
                }
                else {
                    $repayBtn.addClass('disabled');
                }
            }
        });

    const fillPaymentGateways = function(status, list) {

        const failureExit = msg => {
            loadingDialog.hide();
            msgDialog('warninga', '', msg || l[19342], '', loadSubPage.bind(null, 'start'));
        };

        if (!status) { // failed result from API
            return failureExit();
        }

        // clear the payment block
        const $paymentBlock = $('.bus-reg-radio-block', $repaySection).empty();

        const icons = {
            ecpVI: 'sprite-fm-uni icon-visa-border',
            ecpMC: 'sprite-fm-uni icon-mastercard-border',
            Stripe2: 'sprite-fm-theme icon-stripe',
            stripeVI: 'sprite-fm-uni icon-visa-border',
            stripeMC: 'sprite-fm-uni icon-mastercard-border',
            stripeAE: 'sprite-fm-uni icon-amex',
            stripeJC: 'sprite-fm-uni icon-jcb',
            stripeUP: 'sprite-fm-uni icon-union-pay',
            stripeDD: 'provider-icon stripeDD'
        };

        const radioHtml = '<div class="bus-reg-radio-option"> ' +
            '<div class="bus-reg-radio payment-[x] radioOff" prov-id="[Y]" gate-n="[Z]"></div>';
        const textHtml = '<div class="provider">[x]</div>';
        const iconHtml = `<div class="payment-icon">
                            <i class="[x]"></i>
                        </div></div>`;

        if (!list.length) {
            if (u_attr.b) {
                return failureExit(l[20431]);
            }
            return failureExit(l.no_payment_providers);
        }

        let paymentGatewayToAdd = '';
        for (let k = 0; k < list.length; k++) {
            const payRadio = radioHtml.replace('[x]', list[k].gatewayName).replace('[Y]', list[k].gatewayId).
                replace('[Z]', list[k].gatewayName);
            const payText = textHtml.replace('[x]', list[k].displayName);
            const payIcon = iconHtml.replace('[x]', icons[list[k].gatewayName]);
            paymentGatewayToAdd += payRadio + payText + payIcon;
        }
        if (paymentGatewayToAdd) {
            $paymentBlock.safeAppend(paymentGatewayToAdd);
        }

        // setting the first payment provider as chosen
        $('.bus-reg-radio-block .bus-reg-radio', $repaySection).first().removeClass('radioOff')
            .addClass('radioOn');

        // event handler for radio buttons
        $('.bus-reg-radio-option', $paymentBlock)
            .rebind('click.suba', function businessRegCheckboxClick() {
                const $me = $('.bus-reg-radio', $(this));
                if ($me.hasClass('radioOn')) {
                    return;
                }
                $('.bus-reg-radio', $paymentBlock).removeClass('radioOn').addClass('radioOff');
                $me.removeClass('radioOff').addClass('radioOn');
            });

        // view the page
        loadingDialog.hide();
        $repaySection.removeClass('hidden');
    };

    M.require('businessAcc_js').done(function() {
        var business = new BusinessAccount();
        var overduePromise = business.getOverduePayments();

        var failHandler = function(st, res) {
            var msg = l[20671];
            var title = l[6859];
            if (res !== mySelf.noOverduePaymentErrorCode) {
                msg = l[20672];
                title = l[1578];
            }
            msgDialog('warninga', title, msg, '', function() {
                loadingDialog.hide();
                loadSubPage('');
            });
        };

        overduePromise.fail(failHandler);

        overduePromise.done(function(st, res) {
            // validations of API response
            if (st !== 1 || !res || !res.t || !res.inv || !res.inv.length) {
                return failHandler(0, mySelf.unknownErrorCode);
            }

            const mIntl = mega.intl;
            const intl = mIntl.number;
            const sep = mIntl.decimalSeparator;

            const applyFormat = (val) => {
                if (sep !== res.l.sp[0]) {
                    const reg1 = new RegExp(`\\${sep}`, 'g');
                    const reg2 = new RegExp(`\\${res.l.sp[1]}`, 'g');
                    val = val.replace(reg1, '-')
                        .replace(reg2, res.l.sp[0])
                        .replace(/-/g, res.l.sp[1]);
                }

                val = res.l.pl ? `${res.l.cs}${val}`
                    : `${val}${res.l.cs}`;

                return val;
            };

            // Debug...
            if (d && localStorage.debugNewPrice) {
                res.nb = 7; // nb of users
                res.nbdu = 3; // deactivated billed users
                res.nbt = 2; // extra transfer blocks
                res.nbs = 1; // extra storage blocks
                res.lt = 104; // local price for total
                res.let = 71.5; // local price of expired amount
                res.t = 80; // total in euros
                res.et = 55;
                res.list = { 'u': [3, 15, 19.5], 's': [1, 2.5, 3.23], 't': [1, 2.5, 3.23] };
                res.inv[0].nb = 4;
                res.inv[0].nbt = 1; // extra transfer blocks
                res.inv[0].nbs = 1; // extra storage blocks
                res.inv[0].nbdu = 1; // deactivated billed users
                res.inv[0].v = 1; // version
                res.inv[0].list = { 'u': [4, 20, 26.1], 's': [1, 2.5, 3.23], 't': [1, 2.5, 3.23] };
                res.inv[0].lp = 32.56;
                res.inv[0].tot = 25;
                res.inv[0].d = 'ABC Limited'; // company

                res.l = { // (NEW FIELD)
                    "cs": "$",          // currency symbol
                    "n": "NZD",         // currency name
                    "sp": [".", ","], // decimal and thousands separator
                    "pl": 1 // 1=currency symbol before number, 0=after
                };
            }
            // end of Debug

            let futureAmount = res.et && `${intl.format(res.et)} \u20ac`;
            let totalAmount = res.t && `${intl.format(res.t)} \u20ac`;
            let dueAmount = res.inv[0].tot && `${intl.format(res.inv[0].tot)} \u20ac`;

            const $rightBlock = $('.main-right-block', $repaySection);

            // check if we have V1 (new version) of bills
            if (typeof res.nbdu !== 'undefined' && res.inv[0].v) {
                let localPrice = false;
                if (res.let) {
                    futureAmount = applyFormat(intl.format(res.let));
                    localPrice = true;
                }
                if (res.lt) {
                    totalAmount = applyFormat(intl.format(res.lt));
                    localPrice = true;
                }
                if (res.inv && res.inv[0] && res.inv[0].lp) {
                    dueAmount = applyFormat(intl.format(res.inv[0].lp));
                    localPrice = true;
                }
                if (localPrice) {
                    $('.repay-breakdown-footer', $rightBlock).removeClass('hidden');
                }
            }


            if (!totalAmount || !dueAmount) {
                console.error(`Fatal error in invoice, we dont have essential attributes ${JSON.stringify(res)}`);
                return failHandler(0, mySelf.unknownErrorCode);
            }

            const showDetails = function() {
                const $me = $(this);
                if ($me.hasClass('expand')) {
                    $me.removeClass('expand');
                    $me.nextUntil('.repay-breakdown-tb-content, .repay-breakdown-tb-total', '.repay-extra-details')
                        .removeClass('expand');
                    $('.content-desc-container', $me).removeClass('icon-arrow-up-after')
                        .addClass('icon-arrow-down-after');
                }
                else {
                    $me.addClass('expand');
                    $me.nextUntil('.repay-breakdown-tb-content, .repay-breakdown-tb-total', '.repay-extra-details')
                        .addClass('expand');
                    $('.content-desc-container', $me).removeClass('icon-arrow-down-after')
                        .addClass('icon-arrow-up-after');
                }
            };

            var nbOfUsers = 3; // fallback to static value

            var $overduePaymentRow = $('.repay-breakdown-tb-content', $rightBlock);
            var $overduePaymentHeader = $('.repay-breakdown-tb-header', $rightBlock);

            if ($overduePaymentRow.length > 1) {
                var $rowBk = $($overduePaymentRow[0]).clone();
                $overduePaymentRow.remove();
                $rowBk.insertAfter($overduePaymentHeader);
                $overduePaymentRow = $rowBk;
            }

            var rowTemplate = $overduePaymentRow.clone();

            var $overdueExtraRow = $('tr.repay-extra-details', $rightBlock);
            const $extraRowTemplate = $overdueExtraRow.length > 1 ? $($overdueExtraRow[0]).clone()
                : $overdueExtraRow.clone();
            $overdueExtraRow.remove();

            // adding due invoice row
            nbOfUsers = res.inv[0].nb;

            $('.content-desc', $overduePaymentRow).text(u_attr['%name'] || ' ');
            $('.content-date', $overduePaymentRow).text(time2date(res.inv[0].ts, 1));
            $('.content-amou', $overduePaymentRow).text(dueAmount);

            const addDetailsRow = ($template, text, item, $parent) => {
                if (item && item[0] && item[1] && text && $template && $parent) {
                    const $row = $template.clone();
                    $('.repay-extra-desc', $row).text(mega.icu.isICUPlural(text)
                        ? mega.icu.format(text, item[0]) : text.replace('%1', item[0]));
                    $('.repay-extra-val', $row).text(item[2] ? applyFormat(intl.format(item[2]))
                        : `${intl.format(item[1])} \u20ac`);
                    $row.insertAfter($parent);
                }
            };

            if (res.inv[0].list) {
                addDetailsRow($extraRowTemplate, l.additional_transfer, res.inv[0].list.t, $overduePaymentRow);
                addDetailsRow($extraRowTemplate, l.additional_storage, res.inv[0].list.s, $overduePaymentRow);

                // If Pro Flexi, expand any rows by default, hide arrows and don't make clickable
                if (u_attr.pf) {
                    $overduePaymentRow.addClass('expand');
                    $overduePaymentRow
                        .nextUntil('.repay-breakdown-tb-content, .repay-breakdown-tb-total', '.repay-extra-details')
                        .addClass('expand');
                    $('.content-desc-container', $overduePaymentRow)
                        .removeClass('icon-arrow-down-after icon-arrow-up-after');
                }
                else {
                    // For Business, add a users row and make the row clickable
                    addDetailsRow($extraRowTemplate, l.users_unit, res.inv[0].list.u, $overduePaymentRow);
                    $overduePaymentRow.rebind('click.repay', showDetails);
                }
            }

            // Show the previous & current invoice rows for Pro Flexi as well
            if ((res.nb || u_attr.pf) && futureAmount) {
                const $futurePaymentRow = rowTemplate.clone();
                nbOfUsers = res.nb;

                $('.content-desc', $futurePaymentRow).text(u_attr['%name'] || ' ');
                $('.content-date', $futurePaymentRow).text(time2date(Date.now() / 1000, 1));
                $('.content-amou', $futurePaymentRow).text(futureAmount);

                $futurePaymentRow.insertAfter($overduePaymentHeader);

                addDetailsRow($extraRowTemplate, l.additional_transfer, res.list.t, $futurePaymentRow);
                addDetailsRow($extraRowTemplate, l.additional_storage, res.list.s, $futurePaymentRow);

                // If Pro Flexi, expand any rows by default, hide arrows and don't make clickable
                if (u_attr.pf) {
                    $futurePaymentRow.addClass('expand');
                    $futurePaymentRow
                        .nextUntil('.repay-breakdown-tb-content, .repay-breakdown-tb-total', '.repay-extra-details')
                        .addClass('expand');
                    $('.content-desc-container', $futurePaymentRow)
                        .removeClass('icon-arrow-down-after icon-arrow-up-after');
                }
                else {
                    // For Business, add a users row and make the row clickable
                    addDetailsRow($extraRowTemplate, l.users_unit, res.list.u, $futurePaymentRow);
                    $futurePaymentRow.rebind('click.repay', showDetails);
                }
            }

            $('.repay-td-total', $rightBlock).text(totalAmount);

            // If Pro Flexi, don't show the Account information section, also hide billing description row header
            if (u_attr.pf) {
                $('.js-account-info-section', $leftSection).addClass('hidden');
                $('.js-repay-header-description', $overduePaymentHeader).text('');
            }

            $('#repay-business-cname', $leftSection).text(u_attr['%name']);
            $('#repay-business-email', $leftSection).text(u_attr['%email']);

            let nbUsersText = mega.icu.format(l.users_unit, nbOfUsers);
            if (res.nbdu) {
                const activeUsers = nbOfUsers - res.nbdu;
                const inactiveUsersString = mega.icu.format(l.inactive_users_detail, res.nbdu);
                nbUsersText += ` ${mega.icu.format(l.users_detail, activeUsers).replace('[X]', inactiveUsersString)}`;
                $('.repay-nb-users-info', $leftSection).removeClass('hidden');
            }
            $('#repay-business-nb-users', $leftSection).text(nbUsersText);

            business.getListOfPaymentGateways(false).always(fillPaymentGateways);

            business.getBusinessPlanInfo(false, u_attr.pf)
                .then((plan) => {
                    mySelf.planInfo = plan;
                    mySelf.planInfo.pastInvoice = res.inv[0];
                    mySelf.planInfo.currInvoice = {et: res.et || 0, t: res.t};
                    mySelf.userInfo = {
                        fname: '',
                        lname: '',
                        nbOfUsers: res.nb || 0
                    };
                })
                .catch(tell);
        });
    });
};
