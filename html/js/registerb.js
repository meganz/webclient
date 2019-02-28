/** a class contains the code-behind of business register "registerb" page */
function BusinessRegister() {
    "use strict";
    this.cacheTimeout = 9e5; // 15 min - default threshold to update payment gateway list
    this.planPrice = 9.99; // initial value
    this.minUsers = 3; // minimum number of users
    this.maxUsers = 100; // maximum number of users
    this.isLoggedIn = false;
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

    // we will need it to evaluate the password
    M.require('zxcvbn_js');

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
    $('.new-registration.suba', $pageContainer).removeClass('good1 good2 good3 good4 good5');
    $('.password-stutus-txt', $pageContainer).addClass('hidden');
    $pageContainer.find('.bus-reg-radio-block .bus-reg-radio').removeClass('checkOn').addClass('checkOff');
    $pageContainer.find('.mega-terms.bus-reg-agreement .bus-reg-checkbox').removeClass('checkOn');
    $pageContainer.find('.ok-to-auto.bus-reg-agreement .bus-reg-checkbox').addClass('checkOn');
    $pageContainer.find('.bus-reg-agreement.mega-terms .bus-reg-txt').safeHTML(l['208s']);
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

    // check if this is logged in user
    if (u_type) {
        if (u_attr && u_attr.b) {
            if (u_attr.b.s !== -1) {
                return loadSubPage("start");
            }
            else {
                var totalActiveSubUsers = 0;
                for (var subb in M.suba) {
                    if (M.suba[subb].s === 0) {
                        totalActiveSubUsers++;
                    }
                }

                $nbUsersInput.val(Math.max(totalActiveSubUsers, this.minUsers));
                $nbUsersInput.prop('disabled', true);
                $cnameInput.prop('disabled', true);
                $telInput.prop('disabled', true);

                mega.attr.get(u_attr.b.bu, '%name', -1, undefined,
                    function(res, ctx) {
                        $cnameInput.prop('disabled', false);
                        if (typeof res !== 'number' && ctx.ua === "%name") {
                            $cnameInput.val(from8(base64urldecode(res)));
                        }
                    });

                mega.attr.get(u_attr.b.bu, '%phone', -1, undefined,
                    function(res, ctx) {
                        $telInput.prop('disabled', false);
                        if (typeof res !== 'number' && ctx.ua === "%phone") {
                            $telInput.val(from8(base64urldecode(res)));
                        }
                    });
            }
        }
        $emailInput.val(u_attr['email']);
        $emailInput.prop('disabled', true);
        $fnameInput.val(u_attr['firstname']);
        if (u_attr['firstname']) {
            $fnameInput.prop('disabled', true);
        }
        $lnameInput.val(u_attr['lastname']);
        if (u_attr['lastname']) {
            $lnameInput.prop('disabled', true);
        }

        // hiding element we dont need for logged-in users
        $pageContainer.find('.bus-reg-input.pass-1st').addClass('hidden');
        $pageContainer.find('.bus-reg-input.pass-2nd').addClass('hidden');
        $pageContainer.find('.new-registration.suba').addClass('hidden');

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
            bottomPageDialog(false, 'terms', false, true);
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
        if (!$element || $element.is($nbUsersInput)) {
            var nbUsersTrimmed = $nbUsersInput.val().trim();
            if (!nbUsersTrimmed || nbUsersTrimmed < mySelf.minUsers) {
                $nbUsersInput.parent().addClass('error').find('.error-message').text(l[19501]);
                $nbUsersInput.focus();
                passed = false;
            }
            else if (nbUsersTrimmed && nbUsersTrimmed > mySelf.maxUsers) {
                $nbUsersInput.parent().addClass('error').find('.error-message').text(l[20425]);
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
            if (!$emailInput.val().trim() || !isValidEmail($emailInput.val())) {
                $emailInput.parent().addClass('error').find('.error-message').text(l[7415]);
                $emailInput.focus();
                passed = false;
            }
        }
        if (mySelf.isLoggedIn === false) {
            if (!$element || $element.is($passInput)) {
                if ($element && !$passInput.val()) {
                    $('.password-stutus-txt', $pageContainer).addClass('hidden');
                    $passInput.parent().removeClass('error');
                    $('.new-registration.suba', $pageContainer).removeClass('good1 good2 good3 good4 good5');
                }
                else if (!$passInput.val()) {
                    $passInput.parent().addClass('error').find('.error-message').text(l[1104]);
                    $('.password-stutus-txt', $pageContainer).removeClass('hidden');
                    $passInput.focus();
                    passed = false;
                }
                else if (typeof zxcvbn !== 'undefined') {
                    passed = passed && mySelf.ratePasswordStrength($pageContainer, $passInput.val());
                    if (!passed) {
                        $passInput.parent().addClass('error').find('.error-message').text(l[1104]);
                        $('.password-stutus-txt', $pageContainer).removeClass('hidden');
                        $passInput.focus();
                    }
                }
                else { // the possibility to get to this else is almost 0 ,
                    // however it's added to eliminate any chances of problems
                    M.require('zxcvbn_js').done(function () {
                        inputsValidator($element); // recall me after loading
                    });
                }
            }
            if (!$element || $element.is($rPassInput)) {
                if (!$rPassInput.val()) {
                    $rPassInput.parent().addClass('error').find('.error-message').text(l[1104]);
                    $rPassInput.focus();
                    passed = false;
                }
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

    // event handler for password key-up
    $('#business-pass', $pageContainer).off('keyup.suba').on('keyup.suba',
        function passwordFieldKeyupHandler() {
            var $me = $(this);
            if (inputsValidator($me)) {
                $me.parent().removeClass('error');
            }
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
                        $emailInput.parent().addClass('error').find('.error-message').text(l[1297]);
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

    var finalizePayment = function (st, res) {
        if (st === 0) {
            msgDialog('warninga', '', l[19511], '', function () {
                loadingDialog.hide();
                addressDialog.closeDialog();
            });
            return;
        }
        var url = res.EUR['url'];
        window.location = url + '?lang=' + lang;
    };

    // at this point i know BusinessAccount class is required before
    var business = new BusinessAccount();
    var payingPromise = business.doPaymentWithAPI(payDetails, businessPlan);

    payingPromise.always(finalizePayment);

};

/**
 * evaluate password strength and change ui elements on business register page
 * @param {Object} $container       jQuery page container
 * @param {String} password         password to evaluate
 */
BusinessRegister.prototype.ratePasswordStrength = function ($container, password) {
    "use strict";

    var $passInputContianer = $('.bus-reg-input.pass-1st', $container).removeClass('weak-password strong-password');
    var $passStrengthContainer = $('.new-registration.suba', $container).removeClass('good1 good2 good3 good4 good5');
    var $passStrengthPad = $('.new-reg-status-pad', $passStrengthContainer);
    var $passStrengthDesc = $('.new-reg-status-description', $passStrengthContainer);

    var passwordScore = zxcvbn(password).score;
    var passwordLength = password.length;

    var overallResult = true;

    if (passwordLength < security.minPasswordLength) {
        $passInputContianer.addClass('weak-password');
        $passStrengthContainer.addClass('good1');
        $passStrengthPad.safeHTML('<strong>@@</strong> @@', l[1105], l[18700]);   // Too short
        $passStrengthDesc.text(l[18701]);
        overallResult = false;
    }
    else if (passwordScore >= 4) {
        $passInputContianer.addClass('strong-password');
        $passStrengthContainer.addClass('good5');
        $passStrengthPad.safeHTML('<strong>@@</strong> @@', l[1105], l[1128]); // Strong
        $passStrengthDesc.text(l[1123]);
    }
    else if (passwordScore === 3) {
        $passInputContianer.addClass('strong-password');
        $passStrengthContainer.addClass('good4');
        $passStrengthPad.safeHTML('<strong>@@</strong> @@', l[1105], l[1127]); // Good
        $passStrengthDesc.text(l[1122]);
    }
    else if (passwordScore === 2) {
        $passInputContianer.addClass('strong-password');
        $passStrengthContainer.addClass('good3');
        $passStrengthPad.safeHTML('<strong>@@</strong> @@', l[1105], l[1126]); // Medium
        $passStrengthDesc.text(l[1121]);
    }
    else if (passwordScore === 1) {
        $passStrengthContainer.addClass('good2');
        $passStrengthPad.safeHTML('<strong>@@</strong> @@', l[1105], l[1125]); // Weak
        $passStrengthDesc.text(l[1120]);
    }
    else {
        $passInputContianer.addClass('weak-password');
        $passStrengthContainer.addClass('good1');
        $passStrengthPad.safeHTML('<strong>@@</strong> @@', l[1105], l[1124]); // Very Weak
        $passStrengthDesc.text(l[1119]);
    }
    if (passwordScore < security.minPasswordScore) {
        overallResult = false;
    }

    return overallResult;
};
