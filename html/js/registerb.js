/** a class contains the code-behind of business register "registerb" page */
function BusinessRegister() {
    "use strict";
    this.cacheTimeout = 9e5; // 15 min - default threshold to update payment gateway list
    this.planPrice = 9.99; // initial value
    this.minUsers = 3; // minimum number of users
    this.maxUsers = 300; // maximum number of users
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
BusinessRegister.prototype.initPage = function(preSetNb, preSetName, preSetTel, preSetFname, preSetLname, preSetEmail) {
    "use strict";

    loadingDialog.show();

    var $pageContainer = $('.bus-reg-body');
    var mySelf = this;

    var $nbUsersInput = $('#business-nbusrs', $pageContainer).val(preSetNb || '');
    var $cnameInput = $('#business-cname', $pageContainer).val(preSetName || '');
    var $telInput = $('#business-tel', $pageContainer).val(preSetTel || '');
    var $fnameInput = $('#business-fname', $pageContainer).val(preSetFname || '');
    var $lnameInput = $('#business-lname', $pageContainer).val(preSetLname || '');
    var $emailInput = $('#business-email', $pageContainer).val(preSetEmail || '');
    var $passInput = $('#business-pass', $pageContainer).val('');
    var $rPassInput = $('#business-rpass', $pageContainer).val('');
    var $storageInfo = $('.business-plan-note span', $pageContainer);

    $('.bus-reg-radio-block .bus-reg-radio', $pageContainer).removeClass('radioOn').addClass('radioOff');
    $('.mega-terms.bus-reg-agreement .checkdiv', $pageContainer).removeClass('checkboxOn');
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
        loadingDialog.hide();
    };
    if (d && localStorage.debugNewPrice) {
        mySelf.usedGB = 7420;
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
        mySelf.usedGB = M.account.space_used / 1073741824;

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

        // view the page
        unhidePage();
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

    const updateBreakdown = (users, quota, usrFare, quotaFare) => {
        users = Math.max(users || 0, mySelf.minUsers);
        quota = quota || mySelf.extraStorage;

        const mIntl = mega.intl;
        const intl = mIntl.number;

        const $breakdown = $('.business-plan-breakdown', $pageContainer);
        const $usersRow = $('.bus-plan-nb-users.bus-breakdown-row', $breakdown);
        const $quotaRow = $('.bus-plan-ex-quota.bus-breakdown-row', $breakdown).addClass('hidden');

        let totalUsr;
        let totalQuota = -1;
        let total = 0;

        if (mySelf.localPricesMode) {
            usrFare = usrFare || mySelf.planInfo.bd.us.lp;
            totalUsr = formatCurrency(total = usrFare * users, mySelf.planInfo.l.lc);

            if (quota && !Number.isNaN(quota)) {
                quotaFare = quotaFare || mySelf.planInfo.bd.sto.lp;
                const temp = quotaFare * quota;
                total += temp;
                totalQuota = formatCurrency(temp, mySelf.planInfo.l.lc);
            }
            total = `${formatCurrency(total, mySelf.planInfo.l.lc)}*`;
        }
        else {
            usrFare = usrFare || mySelf.planInfo.bd && mySelf.planInfo.bd.us.p || mySelf.planInfo.p;
            totalUsr = formatCurrency(total = usrFare * users);
            if (quota && !Number.isNaN(quota)) {
                quotaFare = quotaFare || mySelf.planInfo.bd.sto.p;
                const temp = quotaFare * quota;
                total += temp;
                totalQuota = formatCurrency(temp);
            }
            total = formatCurrency(total);
            $('.bus-price-footer-note', $pageContainer).addClass('hidden');
        }

        $('.nb-users-val', $usersRow).text(mega.icu.format(l.users_unit, users));
        $('.nb-users-fare', $usersRow).text(totalUsr);

        if (totalQuota !== -1) {
            $('.ex-quota-val', $quotaRow).text(l.additional_storage.replace('%1', quota));
            $('.ex-quota-fare', $quotaRow).text(totalQuota);
            $quotaRow.removeClass('hidden');
        }

        $('.business-plan-total .bus-total-val', $pageContainer).text(total);

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
        extraFares.storageFare = localPricesMode && mySelf.planInfo.bd.sto.lp || mySelf.planInfo.bd.sto.p;
        extraFares.transFare = localPricesMode && mySelf.planInfo.bd.trns.lp || mySelf.planInfo.bd.trns.p;
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

        const euroPriceText = formatCurrency(mySelf.planInfo.bd.us.p);
        let priceText = euroPriceText;
        let currncyAbbrv = '';

        if (localPricesMode) {

            priceText = formatCurrency(userFare, mySelf.planInfo.l.lc, 'narrowSymbol');
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
                    .replace('%2', intl.format(mySelf.planInfo.bd.sto.p)));

            const neededQuota = mySelf.usedGB - extraFares.storageBase;
            if (neededQuota > 0) {
                mySelf.extraStorage = Math.ceil(neededQuota / 1024);
                const $extraStroage = $('.bus-addition-storage-block', $pageContainer).removeClass('hidden');
                $('.bus-add-storage-body', $extraStroage)
                    .text(l.additional_storage.replace('%1', mySelf.extraStorage));
                $('.bus-add-storage-foot', $extraStroage)
                    .text(l.additional_storage_desc.replace('%1', extraFares.storageBase / 1024));
                quota = mySelf.extraStorage;

                mySelf.planInfo.quotaFare = mySelf.planInfo.bd.sto.p;
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

                // Check if the entered passwords are valid or strong enough
                var passwordValidationResult = security.isValidPassword($passInput.val(), $rPassInput.val());

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

        business.getListOfPaymentGateways(false).always(fillPaymentGateways);
        business.getBusinessPlanInfo(false).then((info) => {
            mySelf.planPrice = Number.parseFloat(info.p);
            mySelf.planInfo = info;
            mySelf.minUsers = info.minu || 3;
            updatePriceGadget($nbUsersInput.val() || mySelf.minUsers);
        });
    });
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
                quota: mySelf.extraStorage
            };
            if (pMethod !== 'voucher') {
                mySelf.planInfo.usedGatewayId = $paymentMethod.attr('prov-id');
                mySelf.planInfo.usedGateName = $paymentMethod.attr('gate-n');
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

/**
 * Process the payment
 * @param {Object} payDetails       payment collected details from payment dialog
 * @param {Object} businessPlan     business plan details
 */
BusinessRegister.prototype.processPayment = function(payDetails, businessPlan) {
    "use strict";
    loadingDialog.show();

    new BusinessAccount().doPaymentWithAPI(payDetails, businessPlan).then(({result, saleId}) => {

        const redirectToPaymentGateway = () => {
            const isStrip = businessPlan.usedGatewayId ?
                (businessPlan.usedGatewayId | 0) === addressDialog.gatewayId_stripe : false;

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
