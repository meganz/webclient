/** a class contains the code-behind of business register "registerb" page */
function BusinessRegister() {
    "use strict";
    this.cacheTimeout = 9e5; // 15 min - default threshold to update payment gateway list
    this.planPrice = 9.99; // initial value
    this.minUsers = 3; // minimum number of users
    this.maxUsers = 100; // maximum number of users
    this.isLoggedIn = false;
    this.hasAppleOrGooglePay = false;
    if (mega) {
        if (!mega.cachedBusinessGateways) {
            mega.cachedBusinessGateways = Object.create(null);
        }
    }
}


/** a function to rest business registration page to its initial state*/
BusinessRegister.prototype.initPage = function () {
    "use strict";

    loadingDialog.show();

    var $pageContainer = $('.bus-reg-body');
    var mySelf = this;

    var $nbUsersInput = $pageContainer.find('#business-nbusrs').val('');
    var $cnameInput = $pageContainer.find('#business-cname').val('');
    var $telInput = $pageContainer.find('#business-tel').val('');
    var $fnameInput = $pageContainer.find('#business-fname').val('');
    var $lnameInput = $pageContainer.find('#business-lname').val('');
    var $emailInput = $pageContainer.find('#business-email').val('');
    var $passInput = $pageContainer.find('#business-pass').val('');
    var $rPassInput = $pageContainer.find('#business-rpass').val('');
    $pageContainer.find('.bus-reg-radio-block .bus-reg-radio').removeClass('checkOn').addClass('checkOff');
    $pageContainer.find('.mega-terms.bus-reg-agreement .bus-reg-checkbox').removeClass('checkOn');
    $pageContainer.find('.ok-to-auto.bus-reg-agreement .bus-reg-checkbox').addClass('checkOn');
    $pageContainer.find('.bus-reg-agreement.mega-terms .bus-reg-txt').safeHTML(l['208s']);
    $pageContainer.find('.bus-reg-plan .business-base-plan .left')
        .text(l[19503].replace('[0]', this.minUsers));

    var nbUsersMegaInput = new mega.ui.MegaInputs($nbUsersInput, {
        onHideError: function() {
            $nbUsersInput.removeClass('errored');
            $nbUsersInput.parent().removeClass('error');
        }
    });
    nbUsersMegaInput.showMessage('*' + l[19501]);

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
    var unhidePage = function () {
        $pageContainer.removeClass('hidden');  // viewing the main sign-up part
        $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
        $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part
        $pageContainer.find('#business-nbusrs').focus();
        loadingDialog.hide();
    };

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
            if (!M.account) {
                M.accountData();
            }
        }
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

    $('.bus-reg-btn', $pageContainer).addClass('disabled');

    var fillPaymentGateways = function (status, list) {

        var failureExit = function(msg) {

            msgDialog('warninga', '', msg || l[19342], '', function() {
                loadSubPage('start');
            });
        };

        if (!status) { // failed result from API
            return failureExit();
        }

        // clear the payment block
        $pageContainer.find('.bus-reg-radio-block').empty();

        var $paymentBlock = $('.bus-reg-radio-block', $pageContainer);

        var radioHtml = '<div class="bus-reg-radio payment-[x] checkOff"></div>';
        var textHtml = '<div class="provider">[x]</div>';
        var iconHtml = '<div class="provider-icon [x]"></div>';

        if (!list.length) {
            return failureExit(l[20431]);
        }

        var paymentGatewayToAdd = '';
        for (var k = 0; k < list.length; k++) {
            var payRadio = radioHtml.replace('[x]', list[k].gatewayName);
            var payText = textHtml.replace('[x]', list[k].displayName);
            var payIcon = iconHtml.replace('[x]', list[k].gatewayName);
            paymentGatewayToAdd += payRadio + payText + payIcon;
        }
        if (paymentGatewayToAdd) {
            $paymentBlock.append(paymentGatewayToAdd);
        }


        // setting the first payment provider as chosen
        $($pageContainer.find('.bus-reg-radio-block .bus-reg-radio')[0]).removeClass('checkOff')
            .addClass('checkOn');

        // event handler for radio buttons
        $('.bus-reg-radio', $paymentBlock)
            .off('click.suba').on('click.suba', function businessRegisterationCheckboxClick() {
                var $me = $(this);
                if ($me.hasClass('checkOn')) {
                    return;
                }
                else {
                    $('.bus-reg-radio', $paymentBlock).removeClass('checkOn').addClass('checkOff');
                    $me.removeClass('checkOff').addClass('checkOn');
                }
            });

        // view the page
        unhidePage();
    };

    var updatePriceGadget = function (users) {
        if (!users) {
            users = mySelf.minUsers; // minimum val
        }
        var $gadget = $('.bus-reg-plan', $pageContainer);
        $gadget.find('.business-plan-price span.big').text(mySelf.planPrice.toFixed(2) + ' \u20ac');
        $gadget.find('.business-base-plan span.right')
            .text((mySelf.planPrice * mySelf.minUsers).toFixed(2) + ' \u20ac'); // minimum
        $gadget.find('.business-users-plan span.right')
            .text((mySelf.planPrice * (users - mySelf.minUsers)).toFixed(2) + ' \u20ac');
        $gadget.find('.business-plan-total span.right').text((mySelf.planPrice * users).toFixed(2) + ' \u20ac');

        $gadget.find('.business-users-plan .left').text(l[19504].replace('{0}', users - mySelf.minUsers));
    };

    // event handler for clicking on terms anchor
    $pageContainer.find('.bus-reg-agreement.mega-terms .bus-reg-txt span').off('click')
        .on('click', function termsClickHandler() {
            if (!is_mobile) {
                bottomPageDialog(false, 'terms', false, true);
            }
            else {
                var wentOut = false;
                if (window.open) {
                    var cutPlace = location.href.indexOf('/registerb');
                    var myHost = location.href.substr(0, cutPlace);
                    myHost += '/terms';
                    wentOut = window.open(myHost, 'MEGA LIMITED TERMS OF SERVICE');
                }
                if (!wentOut) {
                    loadSubPage('terms');
                }
            }
            return false;
        });

    // event handler for check box
    $('.bus-reg-agreement', $pageContainer).off('click.suba').on('click.suba',
        function businessRegisterationCheckboxClick() {
            var $me = $(this).find('.bus-reg-checkbox');
            if ($me.hasClass('checkOn')) {
                $me.removeClass('checkOn').addClass('checkOff');
                $('.bus-reg-btn', $pageContainer).addClass('disabled');
            }
            else {
                $me.removeClass('checkOff').addClass('checkOn');
                if ($('.bus-reg-agreement .bus-reg-checkbox.checkOn', $pageContainer).length === 2) {
                    $('.bus-reg-btn', $pageContainer).removeClass('disabled');
                }
                else {
                    $('.bus-reg-btn', $pageContainer).addClass('disabled');
                }
            }
        });

    /**input values validation
     * @param {Object}  $element    the single element to validate, if not passed all will be validated
     * @returns {Boolean}   whether the validation passed or not*/
    var inputsValidator = function ($element) {
        
        var passed = true;

        if (mySelf.isLoggedIn === false) {
            if (!$element || $element.is($passInput) || $element.is($rPassInput)) {

                // Check if the entered passwords are valid or strong enough
                var passwordValidationResult = security.isValidPassword($passInput.val(), $rPassInput.val());

                // If bad result
                if (passwordValidationResult !== true) {

                    // Show error for password field, clear the value and refocus it
                    $passInput.val('').focus().trigger('input');
                    $passInput.megaInputsShowError(l[1102] + ' ' + passwordValidationResult);

                    // Show error for confirm password field and clear the value
                    $rPassInput.val('');
                    $rPassInput.parent().addClass('error');

                    passed = false;
                }
            }
        }
        if (!$element || $element.is($emailInput)) {
            if (!$emailInput.val().trim() || !isValidEmail($emailInput.val())) {
                emailMegaInput.showError(l[7415]);
                $emailInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($lnameInput)) {
            if (!$lnameInput.val().trim()) {
                fnameMegaInput.showError(l[1098] + ' ' + l[1099]);
                lnameMegaInput.showError();
                $lnameInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($fnameInput)) {
            if (!$fnameInput.val().trim()) {
                fnameMegaInput.showError(l[1098] + ' ' + l[1099]);
                lnameMegaInput.showError();
                $fnameInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($telInput)) {
            if (!$telInput.val().trim()) {
                telMegaInput.showError(l[8814]);
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
                nbUsersMegaInput.showError(l[20425]);
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
    $('.bus-reg-info-block input', $pageContainer).off('change.suba').on('change.suba',
        function nbOfUsersChangeEventHandler() {
            var $me = $(this);
            var valid = false;
            if ($me.is($nbUsersInput) && inputsValidator($me)) {
                $me.parent().removeClass('error');
                valid = true;
            }
            if ($me.attr('id') === 'business-nbusrs') {
                updatePriceGadget((valid) ? $me.val() : mySelf.minUsers);
            }
        }
    );

    // event handler for register button, validation + basic check
    $('#business-reg-btn, #business-reg-btn-mob', $pageContainer).off('click.suba').on('click.suba',
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

            mySelf.doRegister($nbUsersInput.val().trim(), $cnameInput.val().trim(),
                $fnameInput.val().trim(), $lnameInput.val().trim(), $telInput.val().trim(), $emailInput.val().trim(),
                $passInput.val());
        }
    );

    M.require('businessAcc_js').done(function afterLoadingBusinessClass() {
        var business = new BusinessAccount();

        business.getListOfPaymentGateways(false).always(fillPaymentGateways);
        business.getBusinessPlanInfo(false).done(function planInfoReceived(st, info) {
            mySelf.planPrice = Number.parseFloat(info.p);
            mySelf.planInfo = info;
            updatePriceGadget($nbUsersInput.val() || 3);

            // testing
            // var userInfo = {
            //    fname: 'khaled',
            //    lname: 'daif',
            //    nbOfUsers: 4
            // };
            // mySelf.goToPayment(userInfo);
            // end of testing
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
BusinessRegister.prototype.doRegister = function (nbusers, cname, fname, lname, tel, email, pass) {
    "use strict";
    if (is_mobile) {
        parsepage(pages['mobile']);
    }
    loadingDialog.show();
    var mySelf = this;

    var afterEmphermalAccountCreation = function (isUpgrade) {
        // at this point i know BusinessAccount Class is required before
        var business = new BusinessAccount();
        var settingPromise = business.setMasterUserAttributes(nbusers, cname, tel, fname, lname,
            email, pass, isUpgrade);
        settingPromise.always(function settingAttrHandler(st, res) {
            if (st === 0) {
                if (res[1] && res[1] === EEXIST) {
                    msgDialog('warninga', l[1578], l[7869], '', function () {
                        loadingDialog.hide();
                        var $emailInput = $('.bus-reg-body #business-email');
                        $emailInput.megaInputsShowError(l[1297]);
                        $emailInput.focus();
                    });
                }
                else {
                    msgDialog('warninga', l[1578], l[19508], '', function () {
                        loadingDialog.hide();
                        mySelf.initPage();
                    });
                }
                return;
            }
            loadingDialog.hide();
            var userInfo = {
                fname: fname,
                lname: lname,
                nbOfUsers: nbusers
            };
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
BusinessRegister.prototype.goToPayment = function (userInfo) {
    "use strict";

    addressDialog.init(this.planInfo, userInfo, this);

};

/**
 * Process the payment
 * @param {Object} payDetails       payment collected details from payment dialog
 * @param {Object} businessPlan     business plan details
 */
BusinessRegister.prototype.processPayment = function (payDetails, businessPlan) {
    "use strict";
    loadingDialog.show();

    var mySelf = this;

    var finalizePayment = function (st, res) {
        if (st === 0) {
            msgDialog('warninga', '', l[19511], '', function () {
                loadingDialog.hide();
                addressDialog.closeDialog();
            });
            return;
        }

        var redirectToPaymentGateway = function() {
            var url = res.EUR['url'];
            window.location = url + '?lang=' + lang;
        };

        var showWarnDialog = false;
        var payMethod = '';

        if (mySelf.hasAppleOrGooglePay) {

            var purchases = M.account.purchases;
            for (var p in purchases) {
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

        
    };

    // at this point i know BusinessAccount class is required before
    var business = new BusinessAccount();
    var payingPromise = business.doPaymentWithAPI(payDetails, businessPlan);

    payingPromise.always(finalizePayment);

};
