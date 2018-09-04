/** a class contains the code-behind of business register "registerb" page */
function BusinessRegister() {
    this.cacheTimeout = 9e5; // 15 min - default threshold to update payment gateway list
    this.planPrice = 29.99; // initial value
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

    // hiding everything to get ready first
    $pageContainer.addClass('hidden');  // hiding the main sign-up part
    $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
    $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part

    // function to show first step of registration
    var unhidePage = function () {
        $pageContainer.removeClass('hidden');  // viewing the main sign-up part
        $('.bus-confirm-body.confirm').addClass('hidden'); // hiding confirmation part
        $('.bus-confirm-body.verfication').addClass('hidden'); // hiding verification part
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
            foundOnePaymentGatewayAtLeast = true;
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
            users = 3; // minimum val
        }
        var $gadget = $('.bus-reg-plan', $pageContainer);
        $gadget.find('.business-plan-price span.big').text(mySelf.planPrice);
        $gadget.find('.business-base-plan span.right').text(mySelf.planPrice * 3); // minimum
        $gadget.find('.business-users-plan span.right').text(mySelf.planPrice * (users - 3));
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
            if ($me.val()) {

            }
        });

    

    M.require('businessAcc_js').done(function afterLoadingBusinessClass() {
        var business = new BusinessAccount();

        business.getListOfPaymentGateways(false).always(fillPaymentGateways);
    });
    
};

