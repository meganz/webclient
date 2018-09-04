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

    var $pageContainer = $('.bus-reg-body');
    var mySelf = this;

    $pageContainer.find('#business-nbusrs').val('');
    $pageContainer.find('#business-cname').val('');
    $pageContainer.find('#business-tel').val('');
    $pageContainer.find('#business-fname').val('');
    $pageContainer.find('#business-lname').val('');
    $pageContainer.find('#business-email').val('');
    $pageContainer.find('#business-pass').val('');
    $pageContainer.find('#business-rpass').val('');
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
            }
            else {
                $me.removeClass('checkOff').addClass('checkOn');
            }
        });


    // event handler for blur on number of users input
    $('#business-nbusrs', $pageContainer).off('blur.suba').on('blur.suba',
        function nbOfUsersBlurEventHandler() {
            var $me = $(this);
            var usr = 3;
            if (!$me.val() || $me.val() < 3) {
                var $meParent = $me.parent().addClass('error');
                $meParent.find('.error-message').text(l[19501]);
            }
            else {
                $me.parent().removeClass('error');
                usr = $me.val();
            }
            updatePriceGadget(usr);
        });


    M.require('businessAcc_js').done(function afterLoadingBusinessClass() {
        var business = new BusinessAccount();

        business.getListOfPaymentGateways(false).always(fillPaymentGateways);
        business.getBusinessPlanInfo(false).done(function planInfoReceived(st, info) {
            mySelf.planPrice = info.mbp / 3;
            updatePriceGadget(3);
        });
    });
    
};


