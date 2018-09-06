/** a class contains the code-behind of business register "registerb" page */
function BusinessRegister() {
    this.cacheTimeout = 9e5; // 15 min - default threshold to update payment gateway list
    this.planPrice = 9.99; // initial value
    this.minUsers = 3; // minimum number of users
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
    $pageContainer.find('.bus-reg-agreement .bus-reg-checkbox').removeClass('checkOn');
    $pageContainer.find('.bus-reg-input').removeClass('error');
    $pageContainer.find('.bus-reg-plan .business-base-plan .left')
        .text(l[19503].replace('[0]', this.minUsers));

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

    var fillPaymentGateways = function (st, list) {
        "use strict";

        var failureExit = function () {
            msgDialog('warninga', '', l[19342], '', function () {
                loadSubPage('start');
            });
        };

        if (!st) { // failed result from API
            return failureExit();
        }

        // clear the payment block
        $pageContainer.find('.bus-reg-radio-block').empty();

        var $paymentBlock = $('.bus-reg-radio-block', $pageContainer);

        var radioHtml = '<div class="bus-reg-radio payment-[x] checkOff"></div>';
        var textHtml = '<div class="provider">[x]</div>';
        var iconHtml = '<div class="provider-icon [x]"></div>';

        if (!list.length) {
            return failureExit();
        }

        for (var k = 0; k < list.length; k++) {
            var payRadio = radioHtml.replace('[x]', list[k].gatewayName);
            var payText = textHtml.replace('[x]', list[k].displayName);
            var payIcon = iconHtml.replace('[x]', list[k].gatewayName);
            $paymentBlock.append(payRadio + payText + payIcon);
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
        $gadget.find('.business-plan-price span.big').text(mySelf.planPrice.toFixed(3) + ' €');
        $gadget.find('.business-base-plan span.right')
            .text((mySelf.planPrice * mySelf.minUsers).toFixed(2) + ' €'); // minimum
        $gadget.find('.business-users-plan span.right')
            .text((mySelf.planPrice * (users - mySelf.minUsers)).toFixed(2) + ' €');
        $gadget.find('.business-plan-total span.right').text((mySelf.planPrice * users).toFixed(2) + ' €');

        $gadget.find('.business-users-plan .left').text(l[19504].replace('{0}', users - mySelf.minUsers));
    };

    // event handler for check box
    $('.bus-reg-agreement .bus-reg-checkbox', $pageContainer).off('click.suba').on('click.suba',
        function businessRegisterationCheckboxClick() {
            var $me = $(this);
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
        if (!$element || $element.is($nbUsersInput)) {
            if (!$nbUsersInput.val().trim() || $nbUsersInput.val() < mySelf.minUsers) {
                $nbUsersInput.parent().addClass('error').find('.error-message').text(l[19501]);
                $nbUsersInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($cnameInput)) {
            if (!$cnameInput.val().trim()) {
                $cnameInput.parent().addClass('error').find('.error-message').text(l[19507]);
                $cnameInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($telInput)) {
            if (!$telInput.val().trim()) {
                $telInput.parent().addClass('error').find('.error-message').text(l[8814]);
                $telInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($fnameInput)) {
            if (!$fnameInput.val().trim()) {
                $fnameInput.parent().addClass('error').find('.error-message').text(l[1098]);
                $fnameInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($lnameInput)) {
            if (!$lnameInput.val().trim()) {
                $lnameInput.parent().addClass('error').find('.error-message').text(l[1098]);
                $lnameInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($emailInput)) {
            if (!$emailInput.val().trim() || checkMail($emailInput.val())) {
                $emailInput.parent().addClass('error').find('.error-message').text(l[7415]);
                $emailInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($passInput)) {
            if (!$passInput.val()) {
                $passInput.parent().addClass('error').find('.error-message').text(l[1104]);
                $passInput.focus();
                passed = false;
            }
        }
        if (!$element || $element.is($rPassInput)) {
            if (!$rPassInput.val()) {
                $rPassInput.parent().addClass('error').find('.error-message').text(l[1104]);
                $rPassInput.focus();
                passed = false;
            }
        }
        if (passed && !$element) {
            if ($passInput.val() !== $rPassInput.val()) {
                $rPassInput.parent().addClass('error').find('.error-message').text(l[1107]);
                $rPassInput.focus();
                passed = false;
            }
        }

        return passed;
    };


    // event handler for change on inputs
    $('.bus-reg-info-block input', $pageContainer).off('change.suba').on('change.suba',
        function nbOfUsersChangeEventHandler() {
            var $me = $(this);
            var valid = false;
            if (inputsValidator($me)) {
                $me.parent().removeClass('error');
                valid = true;
            }
            if ($me.attr('id') === 'business-nbusrs') {
                updatePriceGadget((valid) ? $me.val() : mySelf.minUsers);
            }
        }
    );

    // event handler for register button, validation + basic check
    $('#business-reg-btn', $pageContainer).off('click.suba').on('click.suba',
        function registerBusinessAccButtonClickHandler() {

            if ($(this).hasClass('disabled')) {
                return false;
            }
            if (!inputsValidator()) {
                return false;
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
            mySelf.planPrice = info.mbp / 3;
            updatePriceGadget(3);
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

    loadingDialog.show();
    var mySelf = this;

    var afterEmphermalAccountCreation = function () {
        // at this point i know BusinessAccount Class is required before
        var business = new BusinessAccount();
        var settingPromise = business.setMasterUserAttributes(nbusers, cname, tel, fname, lname, email, pass);
        settingPromise.always(function settingAttrHandler(st, res) {
            if (st === 0) {
                msgDialog('warninga', '', l[19508], '', function () {
                    loadingDialog.hide();
                    mySelf.initPage();
                });
                return;
            }
            loadingDialog.hide();
            mySelf.goToPayment();
        });
    };


    // call create ephemeral account function in security package
    security.register.createEphemeralAccount(afterEmphermalAccountCreation);

};

BusinessRegister.prototype.goToPayment = function () {
    "use strict";
    return;
};