/** a class contains the code-behind of business register "registerb" page */
function BusinessRegister() {
    "use strict";
    this.cacheTimeout = 9e5; // 15 min - default threshold to update payment gateway list
    this.planPrice = 9.99; // initial value
    this.minUsers = 3; // minimum number of users
    this.maxUsers = 300; // maximum number of users
    this.isBusinessUse = true; // Purchase is for business use by default
    this.isLoggedIn = false;
    this.hasAppleOrGooglePay = false;
    if (mega) {
        if (!mega.cachedBusinessGateways) {
            mega.cachedBusinessGateways = Object.create(null);
        }
    }
}


/** a function to rest business registration page to its initial state*/
/* eslint-disable-next-line complexity */
BusinessRegister.prototype.initPage = function(
    preSetNb, preSetName, preSetTel, preSetFname, preSetLname, preSetEmail, extra) {
    "use strict";

    // Distinct subject so accountData's finally-hide of the default 'common' subject can't
    // clear the spinner while our gateway list + initial utqa promises are still in flight.
    loadingDialog.show('registerb-init');
    extra = extra || Object.create(null);

    var $pageContainer = $('.bus-reg-body');
    var mySelf = this;

    var $nbUsersInput = $('#business-nbusrs', $pageContainer).val(preSetNb || '');
    var $cnameInput = $('#business-cname', $pageContainer).val(preSetName || '');
    var $telInput = $('#business-tel', $pageContainer).val(preSetTel || '');
    var $fnameInput = $('#business-fname', $pageContainer).val(preSetFname || '');
    var $lnameInput = $('#business-lname', $pageContainer).val(preSetLname || '');
    var $emailInput = $('#business-email', $pageContainer).val(preSetEmail || '');
    var $passInput = $('#business-pass', $pageContainer);
    var $rPassInput = $('#business-rpass', $pageContainer);

    if (!extra.skipPasswordReset) {
        $passInput.val('');
        $rPassInput.val('');
    }

    var $storageInfo = $('.business-plan-note span', $pageContainer);

    const $termsCheckbox = $('.mega-terms.bus-reg-agreement .checkdiv', $pageContainer);
    if (extra.skipTermsReset) {
        $termsCheckbox.addClass('checkboxOn').removeClass('checkboxOff');
    }
    else {
        $termsCheckbox.removeClass('checkboxOn');
    }

    $('.bus-reg-radio-block .bus-reg-radio', $pageContainer).removeClass('radioOn').addClass('radioOff');
    $('.ok-to-auto.bus-reg-agreement .checkdiv', $pageContainer).addClass('checkboxOn');
    $('.bus-reg-agreement.mega-terms .radio-txt', $pageContainer).safeHTML(l['208s']);
    $('.bus-reg-plan .business-base-plan .left', $pageContainer)
        .text(l[19503].replace('[0]', this.minUsers));
    $storageInfo.text(l[23789].replace('%1', '15 ' + l[20160]));

    var nbUsersMegaInput = new mega.ui.MegaInputs($nbUsersInput);
    nbUsersMegaInput.showMessage('*' + l[19501], true);

    $nbUsersInput.rebind('keypress.business paste.business', e => {
        // Firefox fix bug on allowing strings on input type number applies to Webkit also
        if (e.type === 'paste') {
            var ptext = e.originalEvent.clipboardData.getData('text');
            if (isNaN(ptext)) {
                return false;
            }
        }
        if (e.type === 'keypress' && isNaN(e.key)) {
            return false;
        }
    });

    $nbUsersInput.rebind('wheel.registerb', function(e) {
        e.preventDefault();
    });

    var cnameMegaInput = new mega.ui.MegaInputs($cnameInput);
    var telMegaInput = new mega.ui.MegaInputs($telInput);
    var fnameMegaInput = new mega.ui.MegaInputs($fnameInput);
    var lnameMegaInput = new mega.ui.MegaInputs($lnameInput);
    var emailMegaInput = new mega.ui.MegaInputs($emailInput);
    var passMegaInput = new mega.ui.MegaInputs($passInput);
    var rPassMegaInput = new mega.ui.MegaInputs($rPassInput);

    // Remove error on firstname and lastname at same time.
    $fnameInput.rebind('input.hideErrorName', function() {
        lnameMegaInput.hideError();
    });

    $lnameInput.rebind('input.hideErrorName', function() {
        fnameMegaInput.hideError();
    });

    // Remove error on password and repeat password at same time.
    $passInput.rebind('input.hideErrorPass', function() {
        rPassMegaInput.hideError();
    });

    $rPassInput.rebind('input.hideErrorPass', function() {
        passMegaInput.hideError();
    });

    // hiding everything to get ready first
    $pageContainer.addClass('hidden');  // hiding the main sign-up part
    $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
    $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part

    // function to show first step of registration
    var unhidePage = function() {
        $pageContainer.removeClass('hidden');  // viewing the main sign-up part
        $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
        $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part
        $pageContainer.find('#business-nbusrs').focus();
        loadingDialog.hide('registerb-init');
    };
    let applyDebugNewPrice = false;
    if (d && localStorage.debugNewPrice) {
        const parsed = tryCatch(() => JSON.parse(localStorage.debugNewPrice), false)() || {};

        applyDebugNewPrice = true;
        mySelf.usedGB = parsed.usedGB || 9000;
        mySelf.usedTransferGB = parsed.usedTransferGB || 9000; // > usedGB, to exercise excess-transfer-at-signup
    }

    // check if this is logged in user
    if (u_type) {
        if (u_attr && u_attr.b) {
            if (u_attr.b.s !== -1 && u_attr.b.s !== 2) {
                return loadSubPage('');
            }
            else {
                return loadSubPage('repay');
            }
        }
        else if (u_attr && u_attr.p && u_attr.p !== 100) {
            mySelf.hasAppleOrGooglePay = true;
        }
        if (!M.account) {
            M.accountData(mySelf.initPage.bind(
                mySelf,
                mySelf.preSetNb,
                mySelf.preSetName,
                mySelf.preSetTel,
                mySelf.preSetFname,
                mySelf.preSetLname,
                mySelf.preSetEmail
            ));
            return false;
        }
        mySelf.usedGB = (applyDebugNewPrice && mySelf.usedGB)
            || M.account.space_used / 1073741824;

        mySelf.usedTransferGB = (applyDebugNewPrice && mySelf.usedTransferGB)
            || (M.account.tfsq && M.account.tfsq.used || 0) / pro.BYTES_PER_GB;

        $emailInput.val(u_attr['email']);
        $emailInput.prop('disabled', true);
        $emailInput.blur();
        $fnameInput.val(u_attr['firstname']);
        if (u_attr['firstname']) {
            $fnameInput.prop('disabled', true);
            $fnameInput.blur();
        }
        $lnameInput.val(u_attr['lastname']);
        if (u_attr['lastname']) {
            $lnameInput.prop('disabled', true);
            $lnameInput.blur();
        }

        // hiding element we dont need for logged-in users
        $passInput.parent().addClass('hidden');
        $rPassInput.parent().addClass('hidden');

        this.isLoggedIn = true;
    }

    $('.bus-reg-btn, .bus-reg-btn-2', $pageContainer).addClass('disabled');

    var fillPaymentGateways = function(status, list) {

        var failureExit = function(msg) {

            msgDialog('warninga', '', msg || l[19342], '', function() {
                loadSubPage('start');
            });
        };

        if (!status) { // failed result from API
            return failureExit();
        }

        // clear the payment block
        var $paymentBlock = $('.bus-reg-radio-block', $pageContainer).empty();

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

        var radioHtml = '<div class="bus-reg-radio-option"> ' +
            '<div class="bus-reg-radio payment-[x] radioOff" prov-id="[Y]" gate-n="[Z]"></div>';
        var textHtml = '<div class="provider">[x]</div>';
        var iconHtml = `<div class="payment-icon">
                            <i class="[x]"></i>
                        </div></div>`;

        if (!list.length) {
            return failureExit(l[20431]);
        }

        mySelf.paymentGateways = list;

        if (!window.businessVoucher) {
            var paymentGatewayToAdd = '';
            for (var k = 0; k < list.length; k++) {
                var payRadio = radioHtml.replace('[x]', list[k].gatewayName).replace('[Y]', list[k].gatewayId).
                    replace('[Z]', list[k].gatewayName);
                var payText = textHtml.replace('[x]', list[k].displayName);
                var payIcon = iconHtml.replace('[x]', icons[list[k].gatewayName]);
                paymentGatewayToAdd += payRadio + payText + payIcon;
            }
            if (paymentGatewayToAdd) {
                $paymentBlock.safeAppend(paymentGatewayToAdd);
            }
        }
        $paymentBlock.safeAppend(
            radioHtml.replace('[x]', 'Voucher') + textHtml.replace('[x]', l[23494]) + '</div>'
        );

        // setting the first payment provider as chosen
        $('.bus-reg-radio-block .bus-reg-radio', $pageContainer).first().removeClass('radioOff')
            .addClass('radioOn');

        // event handler for radio buttons
        $('.bus-reg-radio-option', $paymentBlock)
            .rebind('click.suba', function businessRegisterationCheckboxClick() {
                const $me = $('.bus-reg-radio', $(this));
                if ($me.hasClass('radioOn')) {
                    return;
                }
                $('.bus-reg-radio', $paymentBlock).removeClass('radioOn').addClass('radioOff');
                $me.removeClass('radioOff').addClass('radioOn');
            });

        mySelf.initUseTypeTabs($pageContainer);
    };

    const isValidBillingData = () => {
        return mySelf.planInfo.bd &&
            mySelf.planInfo.bd.us && (mySelf.planInfo.bd.us.p || mySelf.planInfo.bd.us.lp) &&
            mySelf.planInfo.bd.sto && (mySelf.planInfo.bd.sto.p || mySelf.planInfo.bd.sto.lp) &&
            mySelf.planInfo.bd.sto.s &&
            mySelf.planInfo.bd.trns && (mySelf.planInfo.bd.trns.p || mySelf.planInfo.bd.trns.lp) &&
            mySelf.planInfo.bd.trns.t &&
            mySelf.planInfo.bd.ba.s && mySelf.planInfo.bd.ba.t;
    };

    const isUsageCharges = () => {
        return mySelf.planInfo.bd.ba.s > 0 && mySelf.planInfo.bd.ba.t > 0 && mySelf.planInfo.bd.sto.s > 0
            && mySelf.planInfo.bd.trns.t > 0;
    };

    const isLocalInfoValid = () => {
        return mySelf.planInfo.l && mySelf.planInfo.l.lcs && mySelf.planInfo.l.lc;
    };

    // business charges the greater of the two overages, at the storage fare
    const extraQuota = () => Math.max(mySelf.extraStorage | 0, mySelf.extraTransfer | 0);

    const updateBreakdown = (users, quota, usrFare, quotaFare) => {
        users = Math.max(users || 0, mySelf.minUsers);
        quota = quota || extraQuota();

        const mIntl = mega.intl;
        const intl = mIntl.number;

        const $breakdown = $('.business-plan-breakdown', $pageContainer);
        const $usersRow = $('.bus-plan-nb-users.bus-breakdown-row', $breakdown);
        const $quotaRow = $('.bus-plan-ex-quota.bus-breakdown-row', $breakdown).addClass('hidden');
        const $taxRow = $('.bus-plan-tax.bus-breakdown-row', $breakdown).addClass('hidden');

        let totalUsr;
        let totalQuota = -1;
        let total = 0;

        const euroUserPrice = (mySelf.planInfo.bd && (mySelf.planInfo.bd.us.pn || mySelf.planInfo.bd.us.p))
            || (mySelf.planInfo.pn || mySelf.planInfo.p);
        const localUserPrice = mySelf.planInfo.bd.us.lpn || mySelf.planInfo.bd.us.lp || euroUserPrice;

        const euroQuotaPrice = quotaFare || mySelf.planInfo.bd.sto.pn || mySelf.planInfo.bd.sto.p;
        const localQuotaPrice = quotaFare || mySelf.planInfo.bd.sto.lpn || mySelf.planInfo.bd.sto.lp || euroQuotaPrice;

        if (mySelf.localPricesMode) {
            usrFare = usrFare || mySelf.planInfo.bd.us.lp;
            totalUsr = localUserPrice * users;
            total += usrFare * users;

            if (quota && !Number.isNaN(quota)) {
                const temp = euroQuotaPrice * quota;
                total += mySelf.planInfo.bd.sto.lp * quota;
                totalQuota = temp;
            }
        }
        else {
            usrFare = usrFare || mySelf.planInfo.bd && mySelf.planInfo.bd.us.p || mySelf.planInfo.p;
            totalUsr = euroUserPrice * users;
            total += usrFare * users;
            if (quota && !Number.isNaN(quota)) {
                const temp = localQuotaPrice * quota;
                total += mySelf.planInfo.bd.sto.p * quota;
                totalQuota = temp;
            }
            $('.bus-price-footer-note', $pageContainer).addClass('hidden');
        }

        $('.nb-users-val', $usersRow).text(mega.icu.format(l.users_unit, users));
        $('.nb-users-fare', $usersRow).text(formatCurrency(totalUsr, mySelf.planObj.currency));

        if (totalQuota !== -1) {
            $('.ex-quota-val', $quotaRow).text(l.additional_storage.replace('%1', quota));
            $('.ex-quota-fare', $quotaRow).text(formatCurrency(totalQuota, mySelf.planObj.currency));
            $quotaRow.removeClass('hidden');
        }

        const {taxInfo} = mySelf.planObj;

        if (taxInfo) {
            $('.plan-tax-val', $taxRow).text(l.tax_name_percentage
                .replace('%1', pro.taxInfo.taxName)
                .replace('%2', formatPercentage(pro.taxInfo.taxPercent)));
            $('.plan-tax-amount', $taxRow).text(
                formatCurrency(pro.taxInfo.taxPercent * (totalUsr + Math.max(totalQuota, 0)), mySelf.planInfo.l.lc));
            $taxRow.removeClass('hidden');
        }

        $('.business-plan-total .bus-total-val', $pageContainer).text(formatCurrency(total, mySelf.planObj.currency)
            + (mySelf.planObj.currency === 'EUR' ? '' : '*'));
    };

    const updatePriceGadget = function(users, quota) {
        if (!users) {
            users = mySelf.minUsers; // minimum val
        }
        const intl = mega.intl.number;
        const extraFares = Object.create(null);
        extraFares.storageFare = -1;
        extraFares.transFare = -1;
        extraFares.storageBase = -1;
        extraFares.transBase = -1;
        let localPricesMode = false;
        let quotaInfoPresent = false;

        if (typeof mySelf.planInfo.bd === 'undefined' || !isValidBillingData()) {

            // opps, bd is not available, new version of api cannot allow this.
            console.error('"bd" is not present or not valid. Something is wrong.');
            return false;
        }

        // hooray, new billing data.
        localPricesMode = mySelf.planInfo.bd.us.lp && mySelf.planInfo.bd.sto.lp && mySelf.planInfo.bd.trns.lp;
        localPricesMode = localPricesMode && isLocalInfoValid();

        const userFare = localPricesMode && mySelf.planInfo.bd.us.lp || mySelf.planInfo.bd.us.p;

        const netUserFare = localPricesMode
            && (mySelf.planInfo.bd.us.lpn || mySelf.planInfo.bd.us.lp)
            || (mySelf.planInfo.bd.us.pn || mySelf.planInfo.bd.us.p);

        extraFares.storageFare = localPricesMode
            && (mySelf.planInfo.bd.sto.lpn || mySelf.planInfo.bd.sto.lp)
            || (mySelf.planInfo.bd.sto.pn || mySelf.planInfo.bd.sto.p);

        extraFares.transFare = localPricesMode
            && (mySelf.planInfo.bd.trns.lpn || mySelf.planInfo.bd.trns.lp)
            || (mySelf.planInfo.bd.trns.pn || mySelf.planInfo.bd.trns.p);

        extraFares.storageBase = mySelf.planInfo.bd.ba.s;
        extraFares.transBase = mySelf.planInfo.bd.ba.t;
        quotaInfoPresent = isUsageCharges();

        // setting the vals in the plan for payments.
        mySelf.planInfo.userFare = mySelf.planInfo.bd.us.p;


        const $gadget = $('.bus-reg-plan', $pageContainer);
        const $perUser = $('.business-plan-peruser', $gadget);
        const $perUse = $('.business-plan-peruse', $gadget).addClass('hidden');
        const $euroPriceBl = $('.bus-user-price-euro', $gadget).addClass('hidden');
        const $baseQuotaNote = $('.business-plan-quota-note', $gadget).addClass('hidden');

        const euroPriceText = formatCurrency(mySelf.planInfo.bd.us.pn || mySelf.planInfo.bd.us.p);
        let priceText = euroPriceText;
        let currncyAbbrv = '';

        if (localPricesMode) {
            priceText = formatCurrency(netUserFare, mySelf.planInfo.l.lc, 'narrowSymbol');
            currncyAbbrv = mySelf.planInfo.l.lc;

            $euroPriceBl.removeClass('hidden');
        }

        $('.bus-user-price-val', $perUser).text(priceText);
        $('.bus-user-price-val-euro', $perUser).text(euroPriceText);
        $('.bus-user-price-unit', $perUser).text(l.per_user.replace('%1', currncyAbbrv));

        if (quotaInfoPresent) {
            $('.bus-user-price-val', $perUse).text(l[5816].replace('[X]', extraFares.storageBase / 1024));
            $('.bus-quota-note-body', $baseQuotaNote)
                .text(l.base_stroage_note_desc.replace('%1', extraFares.storageBase / 1024)
                    .replace('%2', intl.format(mySelf.planInfo.bd.sto.pn || mySelf.planInfo.bd.sto.p)));

            const neededQuota = mySelf.usedGB - extraFares.storageBase;
            if (neededQuota > 0) {
                mySelf.extraStorage = Math.ceil(neededQuota / 1024);
            }

            const neededTransfer = mySelf.usedTransferGB - extraFares.transBase;
            if (neededTransfer > 0) {
                mySelf.extraTransfer = Math.ceil(neededTransfer / 1024);
            }

            const $extraStorage = $('.bus-addition-storage-block', $pageContainer).addClass('hidden');
            const $extraTransfer = $('.bus-addition-transfer-block', $pageContainer).addClass('hidden');

            // only surface the block for whichever overage is higher
            if (mySelf.extraStorage || mySelf.extraTransfer) {
                quota = extraQuota();
                mySelf.planInfo.quotaFare = mySelf.planInfo.bd.sto.p;

                if ((mySelf.extraTransfer | 0) > (mySelf.extraStorage | 0)) {
                    $extraTransfer.removeClass('hidden');
                    $('.bus-add-transfer-body', $extraTransfer)
                        .text(l.additional_transfer.replace('%1', mySelf.extraTransfer));
                    $('.bus-add-transfer-foot', $extraTransfer)
                        .text(l.additional_transfer_desc.replace('%1', extraFares.transBase / 1024));
                }
                else {
                    $extraStorage.removeClass('hidden');
                    $('.bus-add-storage-body', $extraStorage)
                        .text(l.additional_storage.replace('%1', mySelf.extraStorage));
                    $('.bus-add-storage-foot', $extraStorage)
                        .text(l.additional_storage_desc.replace('%1', extraFares.storageBase / 1024));
                }
            }

            $perUse.removeClass('hidden');
            $baseQuotaNote.removeClass('hidden');
        }

        mySelf.localPricesMode = localPricesMode;
        updateBreakdown(users, quota, userFare, extraFares.storageFare);
    };

    // event handler for check box
    $('.bus-reg-agreement', $pageContainer).rebind(
        'click.suba',
        function businessRegisterationCheckboxClick() {
            var $me = $('.checkdiv', $(this));
            if ($me.hasClass('checkboxOn')) {
                $me.removeClass('checkboxOn').addClass('checkboxOff');
                $('.bus-reg-btn, .bus-reg-btn-2', $pageContainer).addClass('disabled');
            }
            else {
                $me.removeClass('checkboxOff').addClass('checkboxOn');
                if ($('.bus-reg-agreement .checkdiv.checkboxOn', $pageContainer).length === 2) {
                    $('.bus-reg-btn, .bus-reg-btn-2', $pageContainer).removeClass('disabled');
                }
                else {
                    $('.bus-reg-btn, .bus-reg-btn-2', $pageContainer).addClass('disabled');
                }
            }
        });

    if (extra.skipTermsReset) {
        const $busRegBtns = $('.bus-reg-btn, .bus-reg-btn-2', $pageContainer);
        if ($('.bus-reg-agreement .checkdiv.checkboxOn', $pageContainer).length === 2) {
            $busRegBtns.removeClass('disabled');
        }
        else {
            $busRegBtns.addClass('disabled');
        }
    }

    // event handlers for focus and blur on checkBoxes
    var $regChk = $('.checkdiv input', $pageContainer);
    $regChk.rebind(
        'focus.chkRegisterb',
        function regsiterbInputFocus() {
            $(this).parent().addClass('focused');
        }
    );

    $regChk.rebind(
        'blur.chkRegisterb',
        function regsiterbInputBlur() {
            $(this).parent().removeClass('focused');
        }
    );

    /**input values validation
     * @param {Object}  $element    the single element to validate, if not passed all will be validated
     * @returns {Boolean}   whether the validation passed or not*/
    var inputsValidator = function($element) {

        var passed = true;

        if (mySelf.isLoggedIn === false) {
            if (!$element || $element.is($passInput) || $element.is($rPassInput)) {

                const password = $passInput.val();
                const confirmPassword = $rPassInput.val();

                // Check if the entered passwords are valid or strong enough
                var passwordValidationResult = (password && confirmPassword)
                    ? security.isValidPassword(password, confirmPassword)
                    : l[9066];

                // If bad result
                if (passwordValidationResult !== true) {

                    // Show error for password field, clear the value and refocus it
                    $passInput.val('').focus().trigger('input');
                    $passInput.megaInputsShowError(passwordValidationResult);

                    // Show error for confirm password field and clear the value
                    $rPassInput.val('');
                    $rPassInput.parent().addClass('error');

                    passed = false;
                }
            }
        }
        if (!$element || $element.is($emailInput)) {
            if (!$emailInput.val().trim() || !isValidEmail($emailInput.val())) {
                emailMegaInput.showError($emailInput.val().trim() ? l[7415] : l.err_no_email);
                $emailInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($lnameInput)) {
            if (!$lnameInput.val().trim()) {
                fnameMegaInput.showError(l.err_missing_name);
                lnameMegaInput.showError();
                $lnameInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($fnameInput)) {
            if (!$fnameInput.val().trim()) {
                fnameMegaInput.showError(l.err_missing_name);
                lnameMegaInput.showError();
                $fnameInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($telInput)) {
            const telVal = $telInput.val().trim();
            if (!M.validatePhoneNumber(telVal)) {
                telMegaInput.showError(telVal ? l.err_invalid_ph : l.err_no_ph);
                $telInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($cnameInput)) {
            if (!$cnameInput.val().trim()) {
                cnameMegaInput.showError(l[19507]);
                $cnameInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($nbUsersInput)) {
            var nbUsersTrimmed = $nbUsersInput.val().trim();
            if (!nbUsersTrimmed || nbUsersTrimmed < mySelf.minUsers) {
                nbUsersMegaInput.showError('*' + l[19501]);
                $nbUsersInput.focus();
                passed = false;
            }
            else if (nbUsersTrimmed && nbUsersTrimmed > mySelf.maxUsers) {
                nbUsersMegaInput.showError(mega.icu.format(l[20425], mySelf.maxUsers));
                $nbUsersInput.focus();
                passed = false;
            }
            else {
                nbUsersMegaInput.showMessage('*' + l[19501]);
            }
        }

        return passed;
    };


    // event handler for change on inputs
    $('.bus-reg-info-block input', $pageContainer).rebind(
        'input.suba',
        function nbOfUsersChangeEventHandler() {
            var $me = $(this);
            var valid = false;
            if ($me.is($nbUsersInput) && inputsValidator($me)) {
                $me.parent().removeClass('error');
                valid = true;
            }
            if ($me.attr('id') === 'business-nbusrs') {
                updateBreakdown(valid ? $me.val() : mySelf.minUsers);
            }
        }
    );

    // event handler for register button, validation + basic check
    var $regBtns = $('#business-reg-btn, #business-reg-btn-mob', $pageContainer);
    $regBtns.rebind(
        'click.regBtns',
        function registerBusinessAccButtonClickHandler() {

            if ($(this).hasClass('disabled')) {
                return false;
            }
            if (!inputsValidator()) {
                return false;
            }
            if (!u_type) {
                api_req({ a: 'ucr' });
            }

            mySelf.doRegister(
                $nbUsersInput.val().trim(),
                $cnameInput.val().trim(),
                $fnameInput.val().trim(),
                $lnameInput.val().trim(),
                M.validatePhoneNumber($telInput.val().trim()),
                $emailInput.val().trim(),
                $passInput.val());
        }
    );

    $regBtns.rebind(
        'keydown.regBtns',
        function regBusinessKeyDownHandler(e) {
            if (e.keyCode === 9) {
                e.preventDefault();
                $nbUsersInput.focus();
            }
            else if (e.keyCode === 32 || e.keyCode === 13) {
                e.preventDefault();
                $(this).triggerHandler('click');
            }
            return false;
        }
    );

    // event handlers for focus and blur on registerBtn
    $regBtns.rebind(
        'focus.regBtns',
        function regsiterbBtnFocus() {
            $(this).addClass('focused');
        }
    );

    $regBtns.rebind(
        'blur.regBtns',
        function regsiterbBtnBlur() {
            $(this).removeClass('focused');
        }
    );


    M.require('businessAcc_js').done(function afterLoadingBusinessClass() {
        var business = new BusinessAccount();

        const gatewaysReady = new Promise((resolve, reject) => {
            business.getListOfPaymentGateways(false).always((status, list) => {
                // fillPaymentGateways shows its own msgDialog + loadSubPage('start') on failure;
                // reject with {handled: true} so the outer .catch below skips a duplicate dialog.
                tryCatch(() => {
                    fillPaymentGateways(status, list);
                    if (status && list && list.length) {
                        resolve();
                    }
                    else {
                        reject({handled: true});
                    }
                }, reject)();
            });
        });

        const planReady = Promise.all([
            pro.propay.billing.getInitialCountry(),
            pro.propay.billing.getTngrRes(),
            pro.propay.billing.initAttempts(true),
        ]).then(([country]) => {
            mySelf.lastPricedCountry = country;
            // Assign country before reading the tax number so getTaxNumberForApiReq's stale-context
            // guard returns '' when the singleton's tn was validated for a different country.
            pro.propay.billing.country = country;
            const initialTaxNumber = pro.propay.billing.getTaxNumberForApiReq();
            addressDialog.lastBusUtqaTaxNum = initialTaxNumber || addressDialog.lastBusUtqaTaxNum || '';
            return business.getBusinessPlanInfo(
                !!country, false, country || undefined, initialTaxNumber,
                pro.propay.billing.getStateForApiReq(country)
            );
        }).then((info) => {
            mySelf.planPrice = Number.parseFloat(info.p);
            mySelf.planInfo = info;
            // Drop the cached plan built with the previous page's tax context (e.g. HK from
            // /pricing) so createBusinessPlanObject rebuilds using the fresh utqa's taxInfo.
            if (pro.planObjects && pro.planObjects.planKeys) {
                delete pro.planObjects.planKeys[info.id + info.it];
            }
            mySelf.planObj = pro.planObjects.createBusinessPlanObject(info);
            mySelf.minUsers = info.minu || 3;
            updatePriceGadget($nbUsersInput.val() || mySelf.minUsers);
            pro.propay.billing.applyExhaustedLockout();
        });

        // Reveal the form only once BOTH prerequisites have landed. Either rejection leaves the
        // loading dialog up until msgDialog + loadSubPage('start') navigates away.
        Promise.all([gatewaysReady, planReady]).then(unhidePage).catch((ex) => {
            dump(ex);
            if (ex && ex.handled) {
                return;
            }
            msgDialog('warninga', '', l[19342], '', () => loadSubPage('start'));
        });

        mySelf.getCountry = () => {
            const $dialogCountry = addressDialog && addressDialog.$dialog
                && $('.countries .option[data-state="active"]', addressDialog.$dialog);
            const dialogCountry = $dialogCountry && $dialogCountry.attr('data-value');
            return dialogCountry
                || pro.propay.billing.country
                || u_attr && (u_attr.country || u_attr.ipcc)
                || pro.propay.billing.defaultCountry
                || '';
        };

        mySelf.refreshPricing = (countryCode, taxNumber, state) => {
            const last = mySelf.lastUtqa;
            if (last && last.country === countryCode && last.taxNumber === taxNumber && last.state === state) {
                return Promise.resolve();
            }
            mySelf.lastUtqa = {country: countryCode, taxNumber, state};
            addressDialog.lastBusUtqaTaxNum = taxNumber || '';

            return business.getBusinessPlanInfo(true, false, countryCode, taxNumber, state).then((info) => {
                mySelf.lastPricedCountry = countryCode || '';
                mySelf.planPrice = Number.parseFloat(info.p);
                if (mySelf.planInfo) {
                    Object.assign(mySelf.planInfo, info);
                }
                else {
                    mySelf.planInfo = info;
                }
                // createBusinessPlanObject caches by `id + it`; drop the cached entry so the
                // rebuilt planObj reflects the new taxInfo.
                if (pro.planObjects && pro.planObjects.planKeys) {
                    delete pro.planObjects.planKeys[mySelf.planInfo.id + mySelf.planInfo.it];
                }
                mySelf.planObj = pro.planObjects.createBusinessPlanObject(mySelf.planInfo);
                updatePriceGadget($nbUsersInput.val() || mySelf.minUsers);
                if (addressDialog && addressDialog.businessRegPage === mySelf
                    && typeof addressDialog.updateBusinessPrice === 'function') {
                    addressDialog.updateBusinessPrice();
                }
            }).catch(dump);
        };

        // applyPersonalUse's refresh must target this initPage's live $pageContainer.
        addressDialog.businessRegPage = mySelf;
    });
};

/**
 * Mount the personal / business use tabs on the registerb page (aligned with propay billing).
 * @param {jQuery} $pageContainer - The registerb page root element to search for the tab mount
 * @returns {void}
 */
BusinessRegister.prototype.initUseTypeTabs = function($pageContainer) {
    "use strict";
    const mount = $pageContainer && $pageContainer.length && $pageContainer[0]
        .querySelector('.bus-reg-use-type-tab-mount');

    if (!mount || mount.dataset.busRegUseTabsInit === '1' || typeof MegaTabGroup === 'undefined') {
        return;
    }

    mount.dataset.busRegUseTabsInit = '1';
    mount.textContent = '';

    const tabGroupWrap = document.createElement('div');
    tabGroupWrap.className = 'mega-component tab-group bus-reg-use-type-tab-group';
    mount.appendChild(tabGroupWrap);

    const lastSelected = sessionStorage.getItem('pro.purchaseBusinessUse');
    const businessSelected = lastSelected
        ? lastSelected === 'true'
        : true;

    pro.propay.billing.isBusinessUse = businessSelected;

    this.useTypeTabGroup = new MegaTabGroup({
        tabs: [
            {
                parentNode: tabGroupWrap,
                text: l.personal_use,
                tabid: 'personal',
                selected: !businessSelected,
                onClick: () => pro.propay.billing.applyPersonalUse(),
            },
            {
                parentNode: tabGroupWrap,
                text: l.business_use,
                tabid: 'business',
                selected: businessSelected,
                onClick: () => pro.propay.billing.applyBusinessUse(),
            },
        ],
    });

    // Share the tab group with pro.propay.billing so switchToPersonalUse (triggered from the
    // tax-validation tooltip when the user runs out of attempts) can flip the selected tab.
    pro.propay.billing.useTypeTabGroup = this.useTypeTabGroup;
};

/**
 * register new business account, values must be validated
 * @param {Number} nbusers      number of users in this business account
 * @param {String} cname        company name
 * @param {String} fname        first name of account owner
 * @param {String} lname        last name of account holder
 * @param {String} tel          telephone
 * @param {String} email        email
 * @param {String} pass         password
 */
BusinessRegister.prototype.doRegister = function(nbusers, cname, fname, lname, tel, email, pass) {
    "use strict";
    var $paymentMethod = $('.bus-reg-radio-option .bus-reg-radio.radioOn', '.bus-reg-body');
    var pMethod;
    if ($paymentMethod.hasClass('payment-Voucher')) {
        pMethod = 'voucher';
    }

    if (is_mobile) {
        parsepage(pages['mobile']);
    }
    loadingDialog.show();
    var mySelf = this;

    var afterEmphermalAccountCreation = function(isUpgrade) {
        // at this point i know BusinessAccount Class is required before
        var business = new BusinessAccount();
        var settingPromise = business.setMasterUserAttributes(nbusers, cname, tel, fname, lname,
            email, pass, isUpgrade);
        settingPromise.always(function settingAttrHandler(st, res) {
            if (st === 0) {
                if (res === EEXIST) {
                    msgDialog(
                        'warninga',
                        l[1578],
                        l[7869],
                        '',
                        function() {
                            loadingDialog.hide();
                            if (is_mobile) {
                                parsepage(pages['registerb']);
                                mySelf.initPage(nbusers, cname, tel, fname, lname, email);

                            }
                            var $emailInput = $('.bus-reg-body #business-email');
                            $emailInput.megaInputsShowError(l[1297]);
                            $emailInput.focus();
                        }
                    );
                }
                else {
                    msgDialog('warninga', l[1578], l[19508], res < 0 ? api_strerror(res) : res, () => {
                        parsepage(pages.registerb);
                        loadingDialog.hide();
                        mySelf.initPage(nbusers, cname, tel, fname, lname, email);
                    });
                }
                loadingDialog.hide();
                return;
            }
            loadingDialog.hide();
            var userInfo = {
                fname: fname,
                lname: lname,
                nbOfUsers: nbusers,
                pMethod: pMethod,
                isUpgrade: isUpgrade,
                transferQuota: mySelf.extraTransfer,
                storageQuota: mySelf.extraStorage,
            };
            if (pMethod !== 'voucher') {
                mySelf.planInfo.usedGatewayId = $paymentMethod.attr('prov-id');
                mySelf.planInfo.usedGateName = $paymentMethod.attr('gate-n');
            }
            if (addressDialog) {
                addressDialog.businessRegisterData = {nbusers, cname, fname, lname, tel, email};
            }
            mySelf.goToPayment(userInfo);
        });
    };


    // call create ephemeral account function in security package
    if (!this.isLoggedIn || !u_type) {
        security.register.createEphemeralAccount(afterEmphermalAccountCreation);
    }
    else {
        afterEmphermalAccountCreation(true);
    }

};

/**
 * show the payment dialog
 * @param {Object} userInfo     user info (fname, lname and nbOfUsers)
 */
BusinessRegister.prototype.goToPayment = function(userInfo) {
    "use strict";
    if (userInfo.pMethod === 'voucher') {
        if (!userInfo.isUpgrade) {
            window.bCreatedVoucher = true;
        }
        window.busUpgrade = this.isLoggedIn;
        loadSubPage('redeem');
    }
    else {
        addressDialog.init(this.planInfo, userInfo, this);
    }

};

BusinessRegister.prototype.getSelectedGateway = function() {
    "use strict";
    if (!this.paymentGateways || !this.planInfo) {
        return null;
    }
    return this.paymentGateways.find(gateway => gateway.gatewayName === this.planInfo.usedGateName) || null;
};

/**
 * Process the payment
 * @param {Object} payDetails       payment collected details from payment dialog
 * @param {Object} businessPlan     business plan details
 */
BusinessRegister.prototype.processPayment = function(payDetails, businessPlan) {
    "use strict";
    loadingDialog.show();
    const ba = new BusinessAccount();

    ba.doPaymentWithAPI(payDetails, businessPlan).then(({result, saleId}) => {

        const redirectToPaymentGateway = () => {
            const isStrip = businessPlan.usedGatewayId ?
                (businessPlan.usedGatewayId | 0) === addressDialog.gatewayId_stripe : false;

            // if u_attr.pf, then it is pro flexi repay
            addressDialog.businessPurchase = u_attr && !u_attr.pf;
            addressDialog.processUtcResult(result, isStrip, saleId);
        };

        let showWarnDialog = false;
        let payMethod = '';

        if (this.hasAppleOrGooglePay) {

            const purchases = M.account.purchases;
            for (let p in purchases) {
                if (purchases[p][4] === 2) {
                    showWarnDialog = true;
                    payMethod = 'Apple';
                    break;
                }
                else if (purchases[p][4] === 3) {
                    showWarnDialog = true;
                    payMethod = 'Google';
                    break;
                }
                else if (purchases[p][4] === 13) {
                    showWarnDialog = true;
                    payMethod = 'Windows Phone';
                    break;
                }
            }
        }

        if (showWarnDialog) {
            msgDialog('warninga', l[6859], l[20429].replace('{0}', payMethod), '', redirectToPaymentGateway);
        }
        else {
            redirectToPaymentGateway();
        }
    }).catch((ex) => {

        msgDialog('warninga', '', l[19511], ex < 0 ? api_strerror(ex) : ex, () => addressDialog.closeDialog());

    }).finally(() => loadingDialog.hide());
};
